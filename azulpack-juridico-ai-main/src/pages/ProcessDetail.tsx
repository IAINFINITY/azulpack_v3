import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, MessageSquare, Loader2, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import ChatDialog from '@/components/ChatDialog';
import ShareProcessDialog from '@/components/ShareProcessDialog';

const ProcessDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processo, setProcesso] = useState<any>(null);
  const [resumo, setResumo] = useState('');
  const [defesa, setDefesa] = useState('');
  const [analise, setAnalise] = useState('');
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [loadingDefesa, setLoadingDefesa] = useState(false);
  const [loadingAnalise, setLoadingAnalise] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    fetchProcesso();
  }, [id]);

  const fetchProcesso = async () => {
    const { data, error } = await supabase
      .from('processos')
      .select('*')
      .eq('id', Number(id))
      .single();

    if (error) {
      toast({
        title: 'Erro ao carregar processo',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    setProcesso(data);
    if (data.resumo) setResumo(data.resumo);
    if (data.defesa) setDefesa(data.defesa);
  };

  const callWebhook = async (action: string) => {
    try {
      const response = await fetch('https://webhooks-n8n.iainfinity.app/webhook/azulpack_chat_ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          process_id: Number(id),
          action: action
        })
      });

      const text = await response.text();
      return text;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const handleGerarResumo = async () => {
    setLoadingResumo(true);
    try {
      const result = await callWebhook('createSummary');
      setResumo(result);
      
      await supabase
        .from('processos')
        .update({ resumo: result })
        .eq('id', Number(id));

      toast({
        title: 'Resumo gerado com sucesso'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar resumo',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoadingResumo(false);
    }
  };

  const handleGerarDefesa = async () => {
    setLoadingDefesa(true);
    try {
      const result = await callWebhook('createDefense');
      setDefesa(result);
      
      await supabase
        .from('processos')
        .update({ defesa: result })
        .eq('id', Number(id));

      toast({
        title: 'Defesa gerada com sucesso'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar defesa',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoadingDefesa(false);
    }
  };

  const handleAnalisarDefesa = async () => {
    setLoadingAnalise(true);
    try {
      const result = await callWebhook('analisarDefesa');
      setAnalise(result);

      toast({
        title: 'Análise concluída'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao analisar defesa',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoadingAnalise(false);
    }
  };

  if (!processo) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="hover:bg-card/50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Processos
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShareOpen(true)}
            className="shadow-sm"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar
          </Button>
        </div>

        <Card className="mb-6 shadow-elegant border-border/50">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold mb-2">{processo.titulo}</CardTitle>
                <CardDescription className="text-base">{processo.numero_processo}</CardDescription>
              </div>
              <Badge className="text-sm px-3 py-1">
                {processo.status}
              </Badge>
            </div>
            {processo.empresas_envolvidas && processo.empresas_envolvidas.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {processo.empresas_envolvidas.map((emp: string, i: number) => (
                  <Badge key={i} variant="outline">{emp}</Badge>
                ))}
              </div>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Seção de Resumo */}
          <Card className="shadow-elegant border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Resumo do Processo</CardTitle>
                  <CardDescription>Gere um resumo automático usando IA</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleGerarResumo} 
                disabled={loadingResumo} 
                className="w-full h-11 font-medium transition-smooth"
              >
                {loadingResumo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando Resumo...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Resumo
                  </>
                )}
              </Button>
              {resumo && (
                <div className="whitespace-pre-wrap text-sm leading-relaxed p-5 border rounded-lg bg-muted/50 backdrop-blur">
                  {resumo}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seção de Defesa e Análise */}
          <Card className="shadow-elegant border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <MessageSquare className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle>Defesa e Análise</CardTitle>
                    <CardDescription>Gere e analise a defesa do processo</CardDescription>
                  </div>
                </div>
                <Button 
                  onClick={() => setChatOpen(true)} 
                  size="sm" 
                  variant="outline"
                  className="transition-smooth"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat IA
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="defesa" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-11">
                  <TabsTrigger value="defesa" className="font-medium">Gerar Defesa</TabsTrigger>
                  <TabsTrigger value="analise" className="font-medium">Analisar Defesa</TabsTrigger>
                </TabsList>
                
                <TabsContent value="defesa" className="space-y-4 mt-4">
                  <Button 
                    onClick={handleGerarDefesa} 
                    disabled={loadingDefesa} 
                    className="w-full h-11 font-medium transition-smooth"
                  >
                    {loadingDefesa ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando Defesa...
                      </>
                    ) : (
                      'Gerar Defesa Completa'
                    )}
                  </Button>
                  {defesa && (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed p-5 border rounded-lg bg-muted/50 backdrop-blur min-h-[300px]">
                      {defesa}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="analise" className="space-y-4 mt-4">
                  <Button 
                    onClick={handleAnalisarDefesa} 
                    disabled={loadingAnalise} 
                    className="w-full h-11 font-medium transition-smooth"
                  >
                    {loadingAnalise ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analisando Defesa...
                      </>
                    ) : (
                      'Analisar Defesa Gerada'
                    )}
                  </Button>
                  {analise && (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed p-5 border rounded-lg bg-muted/50 backdrop-blur min-h-[300px]">
                      {analise}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <ChatDialog open={chatOpen} onOpenChange={setChatOpen} />
        <ShareProcessDialog 
          open={shareOpen} 
          onOpenChange={setShareOpen} 
          processoId={Number(id)} 
        />
      </div>
    </div>
  );
};

export default ProcessDetail;
