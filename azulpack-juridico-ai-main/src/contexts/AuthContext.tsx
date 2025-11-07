import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; data?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  // Não navegamos dentro do provedor para evitar navegações/reloads inesperados
  // (por ex. quando o Supabase emite refresh/token events ao alternar abas).
  // A navegação deve ser feita pelo componente que chama signIn/signOut.

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Não navegamos aqui. O onAuthStateChange atualiza o estado.
    // O componente que chamar signIn pode fazer a navegação após receber sucesso.
    if (error) {
      setLoading(false); // Se o login falhar, para o loading.
    }

    return { error, data };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // Não navegamos aqui para evitar reloads inesperados. Quem chamar signOut
    // deve tratar a navegação (ex: ir para /auth) após receber confirmação.
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
