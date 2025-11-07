-- Criar função para verificar se processo foi compartilhado com usuário
CREATE OR REPLACE FUNCTION public.processo_compartilhado_com_usuario(_processo_id bigint, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.processo_compartilhamentos
    WHERE processo_id = _processo_id
      AND shared_with_user_id = _user_id
  )
$$;

-- Recriar a policy usando a função
DROP POLICY IF EXISTS "Users can view their own processos, shared processos or admins can view all" ON public.processos;
DROP POLICY IF EXISTS "Users can view their own processos, shared processos or admins " ON public.processos;

CREATE POLICY "Users can view their own processos, shared processos or admins can view all"
ON public.processos
FOR SELECT
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR
  processo_compartilhado_com_usuario(id, auth.uid())
);