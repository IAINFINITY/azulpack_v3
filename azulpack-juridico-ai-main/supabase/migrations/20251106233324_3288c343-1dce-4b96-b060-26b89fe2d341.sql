-- Adicionar políticas RLS para a tabela "IA Juridico"
-- Esta tabela parece ser uma tabela legada/teste, vamos adicionar políticas básicas

-- Policy: todos podem visualizar
CREATE POLICY "Allow public read access to IA Juridico"
ON public."IA Juridico"
FOR SELECT
USING (true);

-- Policy: usuários autenticados podem inserir
CREATE POLICY "Allow authenticated users to insert IA Juridico"
ON public."IA Juridico"
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);