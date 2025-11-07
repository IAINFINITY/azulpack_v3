-- Aumentar limite para 5GB (plano Pro)
UPDATE storage.buckets 
SET file_size_limit = 5368709120
WHERE id = 'arquivos';