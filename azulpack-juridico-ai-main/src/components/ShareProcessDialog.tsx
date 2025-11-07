import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Share2, Loader2, X } from 'lucide-react';

interface ShareProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processoId: number;
}

interface SharedUser {
  id: string;
  email: string;
  shared_at: string;
}

const ShareProcessDialog = ({ open, onOpenChange, processoId }: ShareProcessDialogProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const { toast } = useToast();

  const loadSharedUsers = async () => {
    setLoadingShares(true);
    try {
      const { data: shares, error } = await supabase
        .from('processo_compartilhamentos')
        .select('id, shared_with_user_id, created_at')
        .eq('processo_id', processoId);

      if (error) throw error;

      if (shares && shares.length > 0) {
        const { data: emailsData } = await supabase.functions.invoke('get-user-emails', {
          body: { userIds: shares.map(s => s.shared_with_user_id) }
        });

        const mappings = emailsData?.mappings || [];
        const emailMap: Record<string, string> = {};
        mappings.forEach((mapping: any) => {
          emailMap[mapping.user_id] = mapping.email;
        });

        const usersWithEmails = shares.map(share => ({
          id: share.id,
          email: emailMap[share.shared_with_user_id] || 'Email não encontrado',
          shared_at: share.created_at
        }));

        setSharedUsers(usersWithEmails);
      } else {
        setSharedUsers([]);
      }
    } catch (error: any) {
      console.error('Erro ao carregar compartilhamentos:', error);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleShare = async () => {
    if (!email.trim()) {
      toast({
        title: 'Email obrigatório',
        description: 'Por favor, insira o email do usuário',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Buscar usuário pelo email
      const { data: userData } = await supabase.functions.invoke('get-user-emails', {
        body: { userEmails: [email.trim()] }
      });

      if (!userData?.users || userData.users.length === 0) {
        toast({
          title: 'Usuário não encontrado',
          description: 'Não existe usuário cadastrado com este email',
          variant: 'destructive'
        });
        return;
      }

      const userId = userData.users[0].id;

      // Verificar se é o próprio dono
      const { data: processo } = await supabase
        .from('processos')
        .select('user_id')
        .eq('id', processoId)
        .single();

      if (processo?.user_id === userId) {
        toast({
          title: 'Ação inválida',
          description: 'Você não pode compartilhar um processo consigo mesmo',
          variant: 'destructive'
        });
        return;
      }

      // Compartilhar processo
      const { error } = await supabase
        .from('processo_compartilhamentos')
        .insert({
          processo_id: processoId,
          shared_by_user_id: (await supabase.auth.getUser()).data.user?.id,
          shared_with_user_id: userId
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Processo já compartilhado',
            description: 'Este processo já foi compartilhado com este usuário',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Processo compartilhado',
        description: `O processo foi compartilhado com ${email}`
      });

      setEmail('');
      loadSharedUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao compartilhar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('processo_compartilhamentos')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: 'Compartilhamento removido'
      });

      loadSharedUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover compartilhamento',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (isOpen) loadSharedUsers();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar Processo</DialogTitle>
          <DialogDescription>
            Compartilhe este processo com outros usuários do sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do usuário</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleShare()}
              />
              <Button onClick={handleShare} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {loadingShares ? (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : sharedUsers.length > 0 ? (
            <div className="space-y-2">
              <Label>Compartilhado com:</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sharedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                    <span className="text-sm">{user.email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveShare(user.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum compartilhamento ativo
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareProcessDialog;
