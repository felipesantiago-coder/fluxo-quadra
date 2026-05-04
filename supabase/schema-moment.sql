-- ============================================
-- Moment - Schema do Banco de Dados
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Criar a tabela de unidades
CREATE TABLE IF NOT EXISTS moment_units (
  id SERIAL PRIMARY KEY,
  andar INTEGER NOT NULL,
  unidade INTEGER NOT NULL,
  vagas INTEGER NOT NULL DEFAULT 2,
  area NUMERIC(10,2) NOT NULL,
  area_str VARCHAR(20) NOT NULL,
  valor_venda NUMERIC(15,2),
  tipologia VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'vendido')),
  posicao_solar VARCHAR(20) NOT NULL,
  quartos INTEGER NOT NULL DEFAULT 3,
  is_cobertura BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unidade)
);

-- 2. Habilitar Realtime na tabela
ALTER PUBLICATION supabase_realtime ADD TABLE moment_units;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_moment_units_andar ON moment_units(andar);
CREATE INDEX IF NOT EXISTS idx_moment_units_status ON moment_units(status);
CREATE INDEX IF NOT EXISTS idx_moment_units_tipologia ON moment_units(tipologia);
CREATE INDEX IF NOT EXISTS idx_moment_units_unidade ON moment_units(unidade);

-- 4. Criar RLS (Row Level Security)
ALTER TABLE moment_units ENABLE ROW LEVEL SECURITY;

-- Política: qualquer um pode LER
CREATE POLICY "Qualquer um pode ver as unidades moment"
ON moment_units FOR SELECT
USING (true);

-- Política: apenas usuários autenticados podem EDITAR
CREATE POLICY "Apenas admin pode editar moment"
ON moment_units FOR UPDATE
USING (auth.role() = 'authenticated');

-- 5. Criar função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_moment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_moment_updated_at
BEFORE UPDATE ON moment_units
FOR EACH ROW
EXECUTE FUNCTION update_moment_updated_at();
