import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, LogOut, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  onSearch: (query: string) => void;
  onFilterStatus: (status: string) => void;
  onFilterEmpresa: (empresa: string) => void;
  onFilterEtiqueta: (etiqueta: string) => void;
  onFilterUsuario?: (userId: string) => void;
}

const Header = ({ onSearch, onFilterStatus, onFilterEmpresa, onFilterEtiqueta, onFilterUsuario }: HeaderProps) => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string; email: string }>>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsuarios();
    }
  }, [isAdmin]);

  const fetchUsuarios = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('user_id, nome');
      
      if (error) throw error;

      // Buscar emails dos usuários usando a edge function
      const { data: response, error: emailError } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds: profiles?.map(p => p.user_id) }
      });
      
      if (emailError) {
        console.error('Erro ao buscar emails:', emailError);
      }

      const emailMap = response?.emailMappings || {};

      const usuariosMap = profiles?.map(profile => ({
        id: profile.user_id,
        nome: profile.nome || emailMap[profile.user_id]?.split('@')[0] || 'Usuário',
        email: emailMap[profile.user_id] || ''
      })) || [];

      setUsuarios(usuariosMap);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 p-2 flex items-center justify-center">
              <img src="https://raw.githubusercontent.com/IAINFINITY/links/main/simbolo-de-direito-logo-png_seeklogo-264574.png" alt="Logo Azul Pack Jurídico" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Azul Pack Jurídico</h1>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Buscar por título ou número do processo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 border-border/50 bg-background/50"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            <Select onValueChange={onFilterStatus}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="Em andamento">Em andamento</SelectItem>
                <SelectItem value="Concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={onFilterEmpresa}>
              <SelectTrigger className="w-[170px] h-10">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Empresas</SelectItem>
                <SelectItem value="Azul Pack Bags">Azul Pack Bags</SelectItem>
                <SelectItem value="Azul Pack Films">Azul Pack Films</SelectItem>
                <SelectItem value="Azul Pack Tech Agro">Azul Pack Tech Agro</SelectItem>
                <SelectItem value="Azul Pack Tech Ground">Azul Pack Tech Ground</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && onFilterUsuario && (
              <Select onValueChange={onFilterUsuario}>
                <SelectTrigger className="w-[170px] h-10">
                  <SelectValue placeholder="Usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Meus processos</SelectItem>
                  {usuarios.map(usuario => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nome || usuario.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="h-8 w-px bg-border mx-1" />

            <span className="text-sm text-muted-foreground hidden lg:block max-w-[150px] truncate">
              {user?.email}
            </span>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 transition-smooth">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {user?.email?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin/dashboard')} className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
