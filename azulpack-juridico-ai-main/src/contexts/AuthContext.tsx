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
    // O estado `loading` começa como `true`.
    // O listener onAuthStateChange será a única fonte de verdade para o estado de autenticação.
    // Ele é chamado imediatamente na inicialização com a sessão atual (se houver)
    // e sempre que o estado de autenticação mudar.

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Se há uma sessão (seja no carregamento inicial, login ou refresh),
          // verificamos o papel do usuário. A função checkUserRole
          // será responsável por finalizar o loading.
          await checkUserRole(session.user.id);
        } else {
          // Se não há sessão (usuário deslogado ou sessão expirada),
          // o usuário não é admin e o carregamento pode ser finalizado.
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!data);
    } catch (error) {
      console.error('Erro ao verificar papel do usuário', error);
      setIsAdmin(false);
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

    // O onAuthStateChange vai lidar com a atualização do estado e o fim do loading.
    if (!error) {
      navigate('/');
    } else {
      setLoading(false); // Se o login falhar, para o loading.
    }

    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // O onAuthStateChange cuidará de limpar o estado e finalizar o loading.
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
