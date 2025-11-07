import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const getActionDescription = (action: string, entityType: string, details: any) => {
  if (entityType === 'processos') {
    if (action === 'INSERT') return 'Criou Processo';
    if (action === 'DELETE') return 'Excluiu Processo';
    if (action === 'UPDATE') {
      // Verifica qual campo foi atualizado
      if (details?.resumo) return 'Gerou Resumo';
      if (details?.defesa) return 'Gerou Defesa';
      if (details?.analise_defesa) return 'Gerou Análise';
      return 'Atualizou Processo';
    }
  }
  
  // Mapeamento padrão para outras entidades
  const actionMap: Record<string, string> = {
    'INSERT': 'Criou',
    'UPDATE': 'Atualizou',
    'DELETE': 'Excluiu'
  };
  
  return actionMap[action] || action;
};

const AdminDashboard = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    } else if (!loading && isAdmin) {
      fetchUsers();
      fetchActivities();
    }
  }, [loading, isAdmin]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*');

    if (!error && data) {
      const usersWithRoles = await Promise.all(
        data.map(async (user) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.user_id)
            .single();
          
          return { ...user, role: roleData?.role || 'user' };
        })
      );
      setUsers(usersWithRoles);
    }
  };

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('user_activity_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      // Coletar IDs de processos e usuários
      const processIds = Array.from(new Set(
        data
          .filter((a: any) => a.entity_type === 'processos' && a.entity_id)
          .map((a: any) => parseInt(a.entity_id))
          .filter((n: any) => !Number.isNaN(n))
      ));

      // Buscar processos em lote
      const { data: processosBatch } = processIds.length
        ? await supabase.from('processos').select('id, titulo, numero_processo, user_id').in('id', processIds)
        : { data: [] as any };

      const processoMap = new Map<number, { titulo: string | null, numero_processo: string | null, user_id: string | null }>();
      (processosBatch || []).forEach((p: any) => processoMap.set(p.id, p));

      // Coletar todos os user_ids (do histórico e dos processos)
      const userIds = new Set<string>();
      data.forEach((a: any) => { if (a.user_id) userIds.add(a.user_id); });
      (processosBatch || []).forEach((p: any) => { if (p.user_id) userIds.add(p.user_id); });
      const userIdsArray = Array.from(userIds);

      // Buscar perfis em lote (nome)
      const { data: profilesBatch } = userIdsArray.length
        ? await supabase.from('user_profiles').select('user_id, nome').in('user_id', userIdsArray)
        : { data: [] as any };
      const profileMap = new Map<string, { nome: string | null }>();
      (profilesBatch || []).forEach((up: any) => profileMap.set(up.user_id, { nome: up.nome }));

      // Buscar emails via Edge Function (apenas admins)
      let emailMap = new Map<string, string | null>();
      try {
        if (userIdsArray.length) {
          const { data: invokeResult, error: invokeError } = await supabase.functions.invoke('get-user-emails', {
            body: { userIds: userIdsArray }
          });
          if (!invokeError && invokeResult?.mappings) {
            emailMap = new Map<string, string | null>(invokeResult.mappings.map((m: any) => [m.user_id, m.email]));
          }
        }
      } catch {}

      // Montar atividades enriquecidas
      const enrichedActivities = data.map((activity: any) => {
        let processoNome = '-';
        let userDisplay = '-';

        // Nome do processo
        if (activity.entity_type === 'processos' && activity.entity_id) {
          const p = processoMap.get(parseInt(activity.entity_id));
          if (p) {
            processoNome = p.titulo || p.numero_processo || '-';
          }
        }

        // Usuário: prioriza nome do perfil; se não houver, email; senão ID abreviado
        const uid = activity.user_id || (activity.entity_type === 'processos' && activity.entity_id ? processoMap.get(parseInt(activity.entity_id))?.user_id : null);
        if (uid) {
          const nome = profileMap.get(uid)?.nome || null;
          const email = emailMap.get(uid) || null;
          userDisplay = nome || email || (uid.substring(0, 8) + '...');
        }

        return { 
          ...activity, 
          user_display: userDisplay, 
          processo_nome: processoNome,
          action_display: getActionDescription(activity.action, activity.entity_type, activity.details)
        };
      });

      setActivities(enrichedActivities);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(`https://auaqotbuexfytlcucamb.supabase.co/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          nome: newUserEmail.split('@')[0]
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      toast({
        title: 'Usuário criado com sucesso',
        description: `${newUserEmail} foi adicionado como ${newUserRole === 'admin' ? 'Administrador' : 'Usuário'}`
      });

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    setLoadingAction(true);
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) throw error;

      toast({
        title: 'Usuário excluído com sucesso'
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" onClick={() => navigate('/')} className="hover:bg-card/50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
          <h1 className="text-4xl font-bold">Dashboard Administrativo</h1>
          <p className="text-muted-foreground mt-2">Gerencie usuários e monitore atividades do sistema</p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-card">
            <TabsTrigger value="users" className="font-medium">Cadastrar Usuários</TabsTrigger>
            <TabsTrigger value="activity" className="font-medium">Histórico de Ações</TabsTrigger>
            <TabsTrigger value="access" className="font-medium">Controle de Acessos</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card className="shadow-elegant border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Cadastrar Novo Usuário</CardTitle>
                    <CardDescription>Crie novos usuários e defina suas permissões</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Tipo de Usuário</Label>
                    <Select value={newUserRole} onValueChange={(value: 'admin' | 'user') => setNewUserRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={loadingAction}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {loadingAction ? 'Criando...' : 'Criar Usuário'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card className="shadow-elegant border-border/50">
              <CardHeader>
                <CardTitle>Histórico de Ações dos Usuários</CardTitle>
                <CardDescription>Últimas 50 ações realizadas no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome do Processo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity: any) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          {new Date(activity.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>{activity.user_display || '-'}</TableCell>
                        <TableCell>{activity.action_display || activity.action}</TableCell>
                        <TableCell>{activity.entity_type}</TableCell>
                        <TableCell>{activity.processo_nome || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="mt-6">
            <Card className="shadow-elegant border-border/50">
              <CardHeader>
                <CardTitle>Controle de Acessos</CardTitle>
                <CardDescription>Gerencie os usuários cadastrados no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email (User ID)</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.nome}</TableCell>
                        <TableCell className="font-mono text-xs">{user.user_id}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${user.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                            {user.role === 'admin' ? 'Admin' : 'Usuário'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.user_id)}
                            disabled={loadingAction}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
