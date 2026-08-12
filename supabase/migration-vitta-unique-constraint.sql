-- ============================================
-- Migração: Corrigir constraint UNIQUE da tabela vitta_units
-- Problema: UNIQUE(bloco, unidade) impede inserção das unidades garden do Térreo
-- pois Lojas (A, 1-6) e Térreo garden (A, 1-5) compartilham os mesmos números de unidade.
-- Solução: Mudar para UNIQUE(bloco, andar_num, unidade)
-- ============================================

-- 1. Remover a constraint UNIQUE antiga
ALTER TABLE vitta_units DROP CONSTRAINT IF EXISTS vitta_units_bloco_unidade_key;

-- 2. Criar a nova constraint UNIQUE que inclui andar_num
ALTER TABLE vitta_units ADD CONSTRAINT vitta_units_bloco_andar_num_unidade_key UNIQUE (bloco, andar_num, unidade);

-- 3. Recriar o índice composto (bloco, unidade) que é usado pelo dashboard
DROP INDEX IF EXISTS idx_vitta_units_bloco_unidade;
CREATE INDEX IF NOT EXISTS idx_vitta_units_bloco_unidade ON vitta_units(bloco, unidade);

-- 4. Inserir as unidades garden do Térreo que foram silenciosamente ignoradas pelo seed
INSERT INTO vitta_units (bloco, andar, andar_num, unidade, area, area_str, valor_venda, tipologia, status) VALUES
  ('A', 'Térreo', 0, 1, 105.67, '105,67 m²', 542446.00, '2 quartos (garden)', 'vendido'),
  ('A', 'Térreo', 0, 2, 75.73, '75,73 m²', 437310.00, '2 quartos (garden)', 'vendido'),
  ('A', 'Térreo', 0, 3, 80.57, '80,57 m²', 486386.00, '2 quartos (garden)', 'disponivel'),
  ('A', 'Térreo', 0, 4, 80.8, '80,80 m²', 484851.00, '2 quartos (garden)', 'vendido'),
  ('A', 'Térreo', 0, 5, 77.58, '77,58 m²', 501753.00, '2 quartos (garden)', 'vendido')
ON CONFLICT (bloco, andar_num, unidade) DO NOTHING;

-- 5. Verificação: contar unidades por andar no Bloco A
SELECT andar, COUNT(*) as total FROM vitta_units WHERE bloco = 'A' GROUP BY andar_num, andar ORDER BY andar_num;
