-- Tornar user_id obrigatório na tabela processos
ALTER TABLE public.processos 
ALTER COLUMN user_id SET NOT NULL;

-- Adicionar valor padrão temporário para user_id caso não exista
ALTER TABLE public.processos 
ALTER COLUMN user_id SET DEFAULT auth.uid();