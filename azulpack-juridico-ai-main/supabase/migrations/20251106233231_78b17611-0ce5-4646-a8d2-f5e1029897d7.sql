-- Criar tabela de compartilhamentos de processos
CREATE TABLE public.processo_compartilhamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id bigint NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL,
  shared_with_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(processo_id, shared_with_user_id)
);

-- Habilitar RLS
ALTER TABLE public.processo_compartilhamentos ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem ver compartilhamentos onde são donos do processo ou foram compartilhados
CREATE POLICY "Users can view shares of their processes or shared with them"
ON public.processo_compartilhamentos
FOR SELECT
USING (
  auth.uid() = shared_by_user_id OR 
  auth.uid() = shared_with_user_id OR
  EXISTS (
    SELECT 1 FROM public.processos 
    WHERE processos.id = processo_compartilhamentos.processo_id 
    AND processos.user_id = auth.uid()
  )
);

-- Policy: usuários podem criar compartilhamentos dos seus próprios processos
CREATE POLICY "Users can share their own processes"
ON public.processo_compartilhamentos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.processos 
    WHERE processos.id = processo_id 
    AND processos.user_id = auth.uid()
  )
);

-- Policy: usuários podem remover compartilhamentos dos seus próprios processos
CREATE POLICY "Users can delete shares of their own processes"
ON public.processo_compartilhamentos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.processos 
    WHERE processos.id = processo_id 
    AND processos.user_id = auth.uid()
  )
);

-- Atualizar a policy de SELECT da tabela processos para incluir processos compartilhados
DROP POLICY IF EXISTS "Users can view their own processos or admins can view all" ON public.processos;

CREATE POLICY "Users can view their own processos, shared processos or admins can view all"
ON public.processos
FOR SELECT
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.processo_compartilhamentos
    WHERE processo_compartilhamentos.processo_id = processos.id
    AND processo_compartilhamentos.shared_with_user_id = auth.uid()
  )
);