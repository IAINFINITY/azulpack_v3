import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center gradient-bg p-4">
      <div className="text-center">
        <h1 className="mb-4 text-8xl font-bold text-primary">404</h1>
        <h2 className="mb-2 text-3xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mb-8 text-lg text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-smooth shadow-elegant"
        >
          Voltar para Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
