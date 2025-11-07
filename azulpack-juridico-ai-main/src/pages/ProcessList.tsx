import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import ProcessCard from '@/components/ProcessCard';
import NewProcessDialog from '@/components/NewProcessDialog';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ProcessList = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [processos, setProcessos] = useState<any[]>([]);
  const [filteredProcessos, setFilteredProcessos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isListView, setIsListView] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProcessos = async (userId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('processos')
        .select('*');
      
      // Se for admin e um usuário específico foi selecionado, filtrar por esse usuário
      // Se não for admin, ou se for admin mas nenhum usuário foi selecionado, mostrar apenas os próprios
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      } else {
        // Admin sem filtro: mostrar apenas os próprios processos por padrão
        query = query.eq('user_id', user?.id);
      }
      
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setProcessos(data || []);
      setFilteredProcessos(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar processos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchProcessos(selectedUserId || undefined);
    }
  }, [authLoading, user, selectedUserId]);

  const handleSearch = (query: string) => {
    if (!query) {
      setFilteredProcessos(processos);
      return;
    }
    const filtered = processos.filter(p => 
      p.titulo?.toLowerCase().includes(query.toLowerCase()) ||
      p.numero_processo?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredProcessos(filtered);
  };

  const handleFilterStatus = (status: string) => {
    if (status === 'all') {
      setFilteredProcessos(processos);
      return;
    }
    const filtered = processos.filter(p => p.status === status);
    setFilteredProcessos(filtered);
  };

  const handleFilterEmpresa = (empresa: string) => {
    if (empresa === 'all') {
      setFilteredProcessos(processos);
      return;
    }
    const filtered = processos.filter(p => 
      p.empresas_envolvidas?.includes(empresa)
    );
    setFilteredProcessos(filtered);
  };

  const handleFilterEtiqueta = (etiqueta: string) => {
    // Implementar filtro de etiqueta
  };

  const handleFilterUsuario = (userId: string) => {
    if (userId === 'all' || userId === '') {
      setSelectedUserId(user?.id || null);
    } else {
      setSelectedUserId(userId);
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Header
        onSearch={handleSearch}
        onFilterStatus={handleFilterStatus}
        onFilterEmpresa={handleFilterEmpresa}
        onFilterEtiqueta={handleFilterEtiqueta}
        onFilterUsuario={handleFilterUsuario}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Meus Processos</h2>
            <p className="text-muted-foreground mt-1">Gerencie todos os seus processos jurídicos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card rounded-lg border p-1 shadow-sm">
              <Button
                variant={isListView ? 'ghost' : 'secondary'}
                size="sm"
                onClick={() => setIsListView(false)}
                className="transition-smooth"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Grade
              </Button>
              <Button
                variant={isListView ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setIsListView(true)}
                className="transition-smooth"
              >
                <List className="h-4 w-4 mr-2" />
                Lista
              </Button>
            </div>
            <NewProcessDialog onProcessCreated={fetchProcessos} />
          </div>
        </div>

        <div className={isListView ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
          {filteredProcessos.map((processo) => (
            <ProcessCard
              key={processo.id}
              id={processo.id}
              titulo={processo.titulo}
              numero_processo={processo.numero_processo}
              status={processo.status}
              empresas_envolvidas={processo.empresas_envolvidas}
              etiquetas={processo.etiquetas}
              created_at={processo.created_at}
              isListView={isListView}
            />
          ))}
        </div>

        {filteredProcessos.length === 0 && (
          <div className="text-center py-20">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Nenhum processo encontrado</h3>
            <p className="text-muted-foreground mb-6">Comece criando seu primeiro processo</p>
            <NewProcessDialog onProcessCreated={fetchProcessos} />
          </div>
        )}
      </main>
    </div>
  );
};

export default ProcessList;
