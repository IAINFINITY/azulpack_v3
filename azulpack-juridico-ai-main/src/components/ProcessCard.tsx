import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProcessCardProps {
  id: number;
  titulo: string;
  numero_processo: string;
  status: string;
  empresas_envolvidas: string[];
  etiquetas: string[];
  created_at: string;
  isListView?: boolean;
}

const ProcessCard = ({
  id,
  titulo,
  numero_processo,
  status,
  empresas_envolvidas,
  etiquetas,
  created_at,
  isListView = false
}: ProcessCardProps) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="cursor-pointer hover:shadow-elegant hover:scale-[1.02] transition-smooth border-border/50 bg-card/50 backdrop-blur"
      onClick={() => navigate(`/processo/${id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-1 p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold mb-1 truncate">{titulo}</CardTitle>
              <CardDescription className="text-sm">{numero_processo}</CardDescription>
            </div>
          </div>
          <Badge 
            variant={status === 'Concluido' ? 'default' : 'secondary'}
            className="flex-shrink-0"
          >
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {empresas_envolvidas && empresas_envolvidas.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Empresas Envolvidas</p>
            <div className="flex flex-wrap gap-1.5">
              {empresas_envolvidas.map((empresa, index) => (
                <Badge key={index} variant="outline" className="text-xs">{empresa}</Badge>
              ))}
            </div>
          </div>
        )}
        {etiquetas && etiquetas.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Etiquetas</p>
            <div className="flex flex-wrap gap-1.5">
              {etiquetas.map((etiqueta, index) => (
                <Badge key={index} variant="secondary" className="text-xs">{etiqueta}</Badge>
              ))}
            </div>
          </div>
        )}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Criado em {new Date(created_at).toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessCard;
