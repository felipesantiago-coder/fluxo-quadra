-- Adicionar coluna 'maior_economia' na tabela 'planos'
-- Execute esta migration no Supabase SQL Editor

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS maior_economia boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN planos.maior_economia IS 'Indica se este plano possui a maior economia (menor valor mensal equivalente). Apenas um plano deve ter este flag true.';
