-- ============================================
-- Quattre Istambul - Corrigir posição solar
-- Lógica: unidades PARES = Nascente, ÍMPARES = Poente
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

UPDATE units SET posicao_solar = 'Nascente' WHERE unidade % 2 = 0;
UPDATE units SET posicao_solar = 'Poente' WHERE unidade % 2 = 1;