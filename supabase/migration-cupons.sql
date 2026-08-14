-- ================================================================
-- MIGRAÇÃO: Sistema de Cupons de Desconto
-- Execute no SQL Editor do Supabase
-- ================================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Tabela de cupons
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          TEXT NOT NULL UNIQUE,
  tipo_desconto   TEXT NOT NULL DEFAULT 'percentual'
                  CHECK (tipo_desconto IN ('percentual', 'fixo')),
  valor_desconto  NUMERIC(10,2) NOT NULL CHECK (valor_desconto > 0),
  usos_maximos    INTEGER CHECK (usos_maximos > 0),
  usos_atuais     INTEGER NOT NULL DEFAULT 0,
  valido_a_partir TIMESTAMPTZ,
  valido_ate      TIMESTAMPTZ,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  planos_ids      UUID[] DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  -- Constraints de negocio
  CONSTRAINT cupom_valor_percentual_max CHECK (
    tipo_desconto != 'percentual' OR valor_desconto <= 100
  )
);

-- Trigger para manter updated_at
CREATE OR REPLACE FUNCTION public.update_cupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cupons_updated_at ON public.cupons;
CREATE TRIGGER trg_cupons_updated_at
  BEFORE UPDATE ON public.cupons
  FOR EACH ROW EXECUTE FUNCTION public.update_cupons_updated_at();

-- RLS
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode validar cupons (select por codigo)
CREATE POLICY "cupons_select_authenticated" ON public.cupons
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin pode gerenciar cupons
CREATE POLICY "cupons_admin_full" ON public.cupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Tabela de uso de cupons (auditoria)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cupom_usos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cupom_id          UUID NOT NULL REFERENCES public.cupons(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assinatura_id     UUID REFERENCES public.assinaturas(id) ON DELETE SET NULL,
  plano_id          UUID NOT NULL REFERENCES public.planos(id),
  valor_original    NUMERIC(10,2) NOT NULL,
  valor_descontado  NUMERIC(10,2) NOT NULL,
  valor_final       NUMERIC(10,2) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.cupom_usos ENABLE ROW LEVEL SECURITY;

-- Usuario pode ver seus proprios usos de cupom
CREATE POLICY "cupom_usos_select_own" ON public.cupom_usos
  FOR SELECT USING (auth.uid() = user_id);

-- Admin pode ver todos os usos
CREATE POLICY "cupom_usos_admin_select" ON public.cupom_usos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- Admin pode inserir usos (o proprio usuario tambem, via API de criar assinatura)
CREATE POLICY "cupom_usos_insert" ON public.cupom_usos
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Indices
-- ─────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_cupons_codigo_lower
  ON public.cupons (lower(codigo));

CREATE INDEX IF NOT EXISTS idx_cupom_usos_cupom_id ON public.cupom_usos(cupom_id);
CREATE INDEX IF NOT EXISTS idx_cupom_usos_user_id ON public.cupom_usos(user_id);
CREATE INDEX IF NOT EXISTS idx_cupom_usos_created_at ON public.cupom_usos(created_at);

-- ─────────────────────────────────────────────────────────────
-- 4. Função de validação (usada pela API)
--    Retorna o cupom se válido, NULL caso contrário.
--    Também incrementa usos_atuais (operação atômica).
-- ─────────────────────────────────────────────────────────────
-- A validação e incremento são feitos na API via adminClient para bypass de RLS.
