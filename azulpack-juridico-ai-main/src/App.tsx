import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import ProcessList from "./pages/ProcessList";
import ProcessDetail from "./pages/ProcessDetail";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import { useEffect, useRef } from "react";

// Instância global do React Query
const queryClient = new QueryClient();

// ✅ Componente responsável por manter a rota atual ao recarregar ou trocar de aba
const RoutePersistence = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      try {
        const saved = localStorage.getItem("last_path");

        // Só navega para a rota salva se a rota atual for a raiz ou a página de autenticação.
        // Isso evita navegações indesejadas quando uma página específica é recarregada (ex: após troca de aba).
        // Garante que a rota salva não é a atual e não é a página de autenticação.
        if (saved && (location.pathname === "/" || location.pathname === "/auth") && saved !== location.pathname && saved !== "/auth") {
          navigate(saved, { replace: true });
        }
      } catch (err) {
        console.warn("RoutePersistence: falha ao recuperar rota anterior", err);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("last_path", location.pathname + location.search);
    } catch (err) {
      console.warn("RoutePersistence: falha ao salvar rota", err);
    }
  }, [location.pathname, location.search]);

  return null;
};

// ✅ Estrutura principal da aplicação
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        {/* Mantém a rota ao recarregar ou trocar de aba */}
        <RoutePersistence />

        {/* Definição de rotas principais */}
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProcessList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/processo/:id"
            element={
              <ProtectedRoute>
                <ProcessDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
