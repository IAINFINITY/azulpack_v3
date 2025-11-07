import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChatDialog = ({ open, onOpenChange }: ChatDialogProps) => {
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [sugestoes] = useState([
    'Acrescentar jurisprudência',
    'Adicionar precedentes',
    'Reforçar argumentação',
    'Incluir legislação',
    'Melhorar fundamentação'
  ]);
  const [novaSugestao, setNovaSugestao] = useState('');

  const handleSendChatMessage = () => {
    if (!chatInput.trim()) return;
    
    setChatMessages([...chatMessages, { role: 'user', content: chatInput }]);
    setChatInput('');
    
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Esta é uma resposta simulada da IA. Integre com seu sistema de chat real.' 
      }]);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat com IA</DialogTitle>
          <DialogDescription>Converse sobre a defesa do processo</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
          <div className="md:col-span-2 space-y-4 flex flex-col">
            <div className="border rounded-lg p-4 flex-1 overflow-y-auto space-y-2 min-h-[300px]">
              {chatMessages.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Inicie uma conversa sobre a defesa
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`p-2 rounded ${msg.role === 'user' ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]' : 'bg-muted max-w-[80%]'}`}>
                  {msg.content}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Digite sua mensagem..."
              />
              <Button onClick={handleSendChatMessage}>Enviar</Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-sm">Sugestões Jurídicas</h3>
              <div className="space-y-2">
                {sugestoes.map((sug, i) => (
                  <Badge key={i} variant="outline" className="w-full justify-start cursor-pointer hover:bg-muted">
                    {sug}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Input
                value={novaSugestao}
                onChange={(e) => setNovaSugestao(e.target.value)}
                placeholder="Adicionar sugestão..."
              />
              <Button variant="secondary" className="w-full" size="sm">
                Adicionar Sugestão
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;
