-- ============================================
-- Vitta - Schema do Banco de Dados
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Criar a tabela de unidades
CREATE TABLE IF NOT EXISTS vitta_units (
  id SERIAL PRIMARY KEY,
  bloco VARCHAR(1) NOT NULL CHECK (bloco IN ('A', 'B')),
  andar VARCHAR(20) NOT NULL,
  andar_num INTEGER NOT NULL,
  unidade INTEGER NOT NULL,
  area NUMERIC(10,2) NOT NULL,
  area_str VARCHAR(20) NOT NULL,
  valor_venda NUMERIC(15,2),
  tipologia VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'vendido')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bloco, andar_num, unidade)
);

-- 2. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE vitta_units;

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_vitta_units_bloco ON vitta_units(bloco);
CREATE INDEX IF NOT EXISTS idx_vitta_units_andar ON vitta_units(andar_num);
CREATE INDEX IF NOT EXISTS idx_vitta_units_status ON vitta_units(status);
CREATE INDEX IF NOT EXISTS idx_vitta_units_bloco_unidade ON vitta_units(bloco, unidade);

-- 4. RLS
ALTER TABLE vitta_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access vitta"
ON vitta_units FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can update vitta"
ON vitta_units FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert vitta"
ON vitta_units FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION update_vitta_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vitta_updated_at
BEFORE UPDATE ON vitta_units
FOR EACH ROW
EXECUTE FUNCTION update_vitta_updated_at();
