-- Atualizar o bucket 'arquivos' para permitir arquivos maiores
-- Definindo limite de 500MB (500000000 bytes)
UPDATE storage.buckets 
SET file_size_limit = 500000000
WHERE id = 'arquivos';