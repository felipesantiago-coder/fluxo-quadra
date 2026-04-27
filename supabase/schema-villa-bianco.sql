-- ============================================
-- Villa Bianco - Schema do Banco de Dados
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Criar a tabela de unidades
CREATE TABLE IF NOT EXISTS villa_bianco_units (
  id SERIAL PRIMARY KEY,
  bloco VARCHAR(1) NOT NULL CHECK (bloco IN ('A', 'B', 'C', 'D')),
  andar INTEGER NOT NULL,
  unidade INTEGER NOT NULL,
  vagas INTEGER NOT NULL DEFAULT 2,
  area NUMERIC(10,2) NOT NULL,
  area_str VARCHAR(20) NOT NULL,
  valor_venda NUMERIC(15,2),
  tipologia VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'vendido')),
  quartos INTEGER NOT NULL DEFAULT 3 CHECK (quartos IN (2, 3, 4)),
  is_cobertura BOOLEAN NOT NULL DEFAULT FALSE,
  is_garden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bloco, unidade)
);

-- 2. Habilitar Realtime na tabela
ALTER PUBLICATION supabase_realtime ADD TABLE villa_bianco_units;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_vb_units_bloco ON villa_bianco_units(bloco);
CREATE INDEX IF NOT EXISTS idx_vb_units_andar ON villa_bianco_units(andar);
CREATE INDEX IF NOT EXISTS idx_vb_units_status ON villa_bianco_units(status);
CREATE INDEX IF NOT EXISTS idx_vb_units_tipologia ON villa_bianco_units(tipologia);
CREATE INDEX IF NOT EXISTS idx_vb_units_bloco_unidade ON villa_bianco_units(bloco, unidade);

-- 4. Criar RLS (Row Level Security) - qualquer um pode ler, apenas admin edita
ALTER TABLE villa_bianco_units ENABLE ROW LEVEL SECURITY;

-- Política: qualquer um pode LER
CREATE POLICY "Public read access"
ON villa_bianco_units FOR SELECT
USING (true);

-- Política: apenas usuários autenticados podem EDITAR
CREATE POLICY "Authenticated users can update"
ON villa_bianco_units FOR UPDATE
USING (auth.role() = 'authenticated');

-- 5. Criar função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_vb_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vb_updated_at
BEFORE UPDATE ON villa_bianco_units
FOR EACH ROW
EXECUTE FUNCTION update_vb_updated_at();
