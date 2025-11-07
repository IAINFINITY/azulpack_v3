const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center gradient-bg p-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-card border-2 border-primary/20 p-4 flex items-center justify-center shadow-elegant">
            <img src="https://raw.githubusercontent.com/IAINFINITY/links/main/simbolo-de-direito-logo-png_seeklogo-264574.png" alt="Logo Azul Pack Jurídico" className="w-full h-full object-contain" />
          </div>
          <h1 className="mb-4 text-5xl font-bold text-foreground">Azul Pack Jurídico</h1>
          <p className="text-xl text-muted-foreground">
            Sistema de Gestão Jurídica Inteligente
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur border border-border/50 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">Processos</h3>
            <p className="text-sm text-muted-foreground">Gerencie todos os seus processos jurídicos</p>
          </div>
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur border border-border/50 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">IA Integrada</h3>
            <p className="text-sm text-muted-foreground">Análises e defesas automáticas</p>
          </div>
          <div className="p-6 rounded-lg bg-card/50 backdrop-blur border border-border/50 shadow-sm">
            <h3 className="font-semibold text-lg mb-2">Colaboração</h3>
            <p className="text-sm text-muted-foreground">Compartilhe processos com sua equipe</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
