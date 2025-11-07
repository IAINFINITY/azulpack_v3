import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload as TusUpload } from 'tus-js-client';

const EMPRESAS_DISPONIVEIS = [
  'Azul Pack Bags',
  'Azul Pack Films',
  'Azul Pack Tech Agro',
  'Azul Pack Tech Ground'
];

// Supabase constants (public anon key and URL)
const SUPABASE_URL = "https://auaqotbuexfytlcucamb.supabase.co";
const SUPABASE_STORAGE_URL = "https://auaqotbuexfytlcucamb.storage.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1YXFvdGJ1ZXhmeXRsY3VjYW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTg4NTEsImV4cCI6MjA3Nzc3NDg1MX0.RonHkXyKe5pdjft_ESYYoMkcraabd4uRgPhFoEMBHpc";

interface NewProcessDialogProps {
  onProcessCreated: () => void;
}

const NewProcessDialog = ({ onProcessCreated }: NewProcessDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([]);
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState('Em andamento');
  const [files, setFiles] = useState<FileList | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleEmpresaToggle = (empresa: string) => {
    setEmpresasSelecionadas(prev => 
      prev.includes(empresa) 
        ? prev.filter(e => e !== empresa)
        : [...prev, empresa]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: 'Erro de autenticação',
        description: 'Usuário não autenticado. Faça login novamente.',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);

    try {
      const arquivosUrls: string[] = [];

      // Upload de arquivos usando TUS (resumable) para arquivos grandes
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          // Para arquivos >6MB usar upload resumable (TUS protocol)
          if (file.size > 6 * 1024 * 1024) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão inválida para upload');

            const publicUrl = await new Promise<string>((resolve, reject) => {
              const upload = new TusUpload(file, {
                endpoint: `${SUPABASE_STORAGE_URL}/storage/v1/upload/resumable`,
                uploadDataDuringCreation: true,
                headers: {
                  authorization: `Bearer ${session.access_token}`,
                  apikey: SUPABASE_ANON_KEY,
                },
                metadata: {
                  bucketName: 'arquivos',
                  objectName: filePath,
                  contentType: file.type || 'application/pdf',
                  cacheControl: '3600',
                },
                chunkSize: 2 * 1024 * 1024, // Reduzido para 2MB
                retryDelays: [0, 1000, 3000, 5000, 10000],
                removeFingerprintOnSuccess: true,
                onError: (err) => {
                  console.error('Erro no upload resumable:', err);
                  reject(err);
                },
                onSuccess: () => {
                  const { data: { publicUrl } } = supabase.storage
                    .from('arquivos')
                    .getPublicUrl(filePath);
                  resolve(publicUrl);
                },
              });
              upload.start();
            });

            arquivosUrls.push(publicUrl);
          } else {
            // Upload padrão para arquivos pequenos
            const { error: uploadError } = await supabase.storage
              .from('arquivos')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('Erro no upload padrão:', uploadError);
              throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
              .from('arquivos')
              .getPublicUrl(filePath);
            arquivosUrls.push(publicUrl);
          }

          // Mantemos apenas o upload para Storage; envio binário ao webhook será feito abaixo via FormData

        }
      }

      // Criar processo
      const { data: processo, error } = await supabase
        .from('processos')
        .insert({
          titulo,
          numero_processo: numeroProcesso,
          empresas_envolvidas: empresasSelecionadas,
          descricao,
          status,
          arquivos_url: arquivosUrls,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar processo:', error);
        throw error;
      }

      // Chamar webhook com arquivos em formato binário via FormData
      console.log('Chamando webhook com process_id:', processo.id);
      const formData = new FormData();
      formData.append('process_id', String(processo.id));
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          formData.append('file', files[i], files[i].name);
        }
      }

      const webhookResponse = await fetch('https://webhooks-n8n.iainfinity.app/webhook/azulpack_file', {
        method: 'POST',
        body: formData,
      });

      console.log('Webhook response status:', webhookResponse.status);
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('Webhook error:', errorText);
        throw new Error(`Webhook falhou: ${webhookResponse.status} - ${errorText}`);
      }

      toast({
        title: 'Processo criado com sucesso',
        description: 'O processo foi criado e o webhook foi acionado.'
      });

      setOpen(false);
      onProcessCreated();
      
      // Limpar form
      setTitulo('');
      setNumeroProcesso('');
      setEmpresasSelecionadas([]);
      setDescricao('');
      setStatus('Em andamento');
      setFiles(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao criar processo',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Processo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Processo</DialogTitle>
          <DialogDescription>Preencha os dados do processo jurídico</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título do Processo</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero">Número do Processo</Label>
            <Input
              id="numero"
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Empresas Envolvidas</Label>
            <div className="space-y-2 p-3 border rounded-md">
              {EMPRESAS_DISPONIVEIS.map((empresa) => (
                <div key={empresa} className="flex items-center space-x-2">
                  <Checkbox
                    id={empresa}
                    checked={empresasSelecionadas.includes(empresa)}
                    onCheckedChange={() => handleEmpresaToggle(empresa)}
                  />
                  <label
                    htmlFor={empresa}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {empresa}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição do Processo</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status do Processo</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Em andamento">Em andamento</SelectItem>
                <SelectItem value="Concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="files">Arquivos do Processo (PDF)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="files"
                type="file"
                accept=".pdf"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="cursor-pointer"
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Processo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewProcessDialog;
