import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Atualiza a sessão e o usuário em qualquer mudança de estado de autenticação.
        setSession(session);
        setUser(session?.user ?? null);

        // Se o usuário fez login ou se deslogou, o estado de carregamento é ativado para transição.
        // Para eventos de restauração de sessão (TOKEN_REFRESHED, INITIAL_SESSION),
        // o carregamento é mantido como `false` para evitar redirecionamentos indesejados.
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(true);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // Verifica a sessão inicial ao carregar a aplicação.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Ao obter a sessão inicial, verifica o papel do usuário sem ativar o loading global,
        // para evitar que o ProtectedRoute redirecione o usuário indevidamente.
        checkUserRole(session.user.id);
      }
      // O estado de carregamento inicial é finalizado aqui, após a primeira verificação.
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!data && !error);
    } catch (error) {
      console.error('Erro ao verificar papel do usuário', error);
      // Mantém o valor atual de isAdmin em caso de erro para evitar redirecionos indevidos
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true); // Ativa o loading antes de tentar o login
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      // A navegação será gerenciada pelo ProtectedRoute
      // O onAuthStateChange cuidará de setLoading(false) após checkUserRole
      navigate('/');
    }

    return { error };
  };

  const signOut = async () => {
    setLoading(true); // Ativa o loading antes de deslogar
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
