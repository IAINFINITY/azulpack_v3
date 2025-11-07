-- Recriar a policy de SELECT para processos de forma mais simples e segura
DROP POLICY IF EXISTS "Users can view their own processos, shared processos or admins can view all" ON public.processos;

CREATE POLICY "Users can view their own processos, shared processos or admins can view all"
ON public.processos
FOR SELECT
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR
  id IN (
    SELECT processo_id 
    FROM public.processo_compartilhamentos
    WHERE shared_with_user_id = auth.uid()
  )
);