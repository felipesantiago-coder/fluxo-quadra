-- ================================================================
-- MIGRAÇÃO: Sistema de Assinaturas e Pagamentos (Mercado Pago)
-- Execute no SQL Editor do Supabase
-- ================================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Tabela de planos de assinatura
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT NOT NULL,
  descricao         TEXT DEFAULT '',
  periodo_meses     INTEGER NOT NULL CHECK (periodo_meses > 0),
  preco             NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  features          JSONB DEFAULT '[]'::jsonb,
  popular           BOOLEAN DEFAULT false,
  ativo             BOOLEAN DEFAULT true,
  ordem             INTEGER DEFAULT 0,
  mercadopago_plan_id TEXT UNIQUE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Trigger para manter updated_at
CREATE OR REPLACE FUNCTION public.update_planos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_planos_updated_at ON public.planos;
CREATE TRIGGER trg_planos_updated_at
  BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.update_planos_updated_at();

-- RLS
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

-- Qualquer um autenticado pode ver planos ativos
CREATE POLICY "planos_select_authenticated" ON public.planos
  FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas admin_sistema pode gerenciar planos
CREATE POLICY "planos_admin_full" ON public.planos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Tabela de assinaturas dos usuários
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plano_id                  UUID NOT NULL REFERENCES public.planos(id),
  mercadopago_subscription_id TEXT UNIQUE,
  mercadopago_payer_id      TEXT,
  status                    TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN (
                              'pending', 'active', 'cancelled',
                              'paused', 'expired', 'cancelled_by_user'
                            )),
  metodo_pagamento          TEXT DEFAULT NULL,
  data_inicio               TIMESTAMPTZ,
  data_fim                  TIMESTAMPTZ,
  ultimo_pagamento_em       TIMESTAMPTZ,
  proximo_ciclo_em          TIMESTAMPTZ,
  cancelado_em             TIMESTAMPTZ,
  motivo_cancelamento       TEXT DEFAULT '',
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- Trigger para manter updated_at
CREATE OR REPLACE FUNCTION public.update_assinaturas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assinaturas_updated_at ON public.assinaturas;
CREATE TRIGGER trg_assinaturas_updated_at
  BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_assinaturas_updated_at();

-- RLS
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver a própria assinatura
CREATE POLICY "assinaturas_select_own" ON public.assinaturas
  FOR SELECT USING (auth.uid() = user_id);

-- Admin pode ver todas as assinaturas
CREATE POLICY "assinaturas_admin_select" ON public.assinaturas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- Admin pode atualizar qualquer assinatura
CREATE POLICY "assinaturas_admin_update" ON public.assinaturas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- Admin pode inserir assinaturas
CREATE POLICY "assinaturas_admin_insert" ON public.assinaturas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Tabela de pagamentos (histórico)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id           UUID REFERENCES public.assinaturas(id) ON DELETE SET NULL,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mercadopago_payment_id  TEXT UNIQUE,
  mercadopago_preapproval_id TEXT,
  valor                   NUMERIC(10,2) NOT NULL,
  metodo_pagamento        TEXT NOT NULL DEFAULT ''
                          CHECK (metodo_pagamento IN ('pix', 'credit_card', 'debit_card', 'boleto')),
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'cancelled', 'in_process')),
  data_pagamento          TIMESTAMPTZ,
  detalhes                JSONB DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver seus próprios pagamentos
CREATE POLICY "pagamentos_select_own" ON public.pagamentos
  FOR SELECT USING (auth.uid() = user_id);

-- Admin pode ver todos os pagamentos
CREATE POLICY "pagamentos_admin_select" ON public.pagamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- Admin pode inserir pagamentos
CREATE POLICY "pagamentos_admin_insert" ON public.pagamentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4. Tabela de eventos de webhook (idempotencia)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          TEXT NOT NULL,
  event_type        TEXT NOT NULL DEFAULT 'unknown',
  action            TEXT,
  mp_resource_id    TEXT,
  processed_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON public.webhook_events(processed_at);

-- Limpar eventos antigos (manter 30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM public.webhook_events WHERE processed_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 5. Partial Unique Index: impede assinaturas duplicadas ativas/pendentes
-- ─────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_sub_per_user
  ON public.assinaturas(user_id)
  WHERE status IN ('active', 'pending');

-- ─────────────────────────────────────────────────────────────
-- 6. Indices para performance
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assinaturas_user_id ON public.assinaturas(user_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON public.assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_plano_id ON public.assinaturas(plano_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_mp_subscription ON public.assinaturas(mercadopago_subscription_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_assinatura_id ON public.pagamentos(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON public.pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_mp_payment ON public.pagamentos(mercadopago_payment_id);
CREATE INDEX IF NOT EXISTS idx_planos_ativo ON public.planos(ativo);

-- ─────────────────────────────────────────────────────────────
-- 7. Seed: Planos iniciais
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.planos (nome, descricao, periodo_meses, preco, features, popular, ativo, ordem) VALUES
(
  'Mensal',
  'Acesso completo por 30 dias, renovação automática.',
  1,
  49.90,
  '["Espelho de vendas ilimitado", "Todos os empreendimentos", "Atualizações em tempo real", "Suporte por e-mail"]'::jsonb,
  false,
  true,
  1
),
(
  'Trimestral',
  'Acesso completo por 90 dias com desconto. Economize 13%.',
  3,
  129.90,
  '["Espelho de vendas ilimitado", "Todos os empreendimentos", "Atualizações em tempo real", "Suporte prioritário", "Relatórios avançados"]'::jsonb,
  true,
  true,
  2
),
(
  'Semestral',
  'Acesso completo por 6 meses com o melhor custo-benefício. Economize 20%.',
  6,
  239.90,
  '["Espelho de vendas ilimitado", "Todos os empreendimentos", "Atualizações em tempo real", "Suporte prioritário", "Relatórios avançados", "Exportação de dados"]'::jsonb,
  false,
  true,
  3
),
(
  'Anual',
  'Acesso completo por 12 meses. Máxima economia de 25%.',
  12,
  449.90,
  '["Espelho de vendas ilimitado", "Todos os empreendimentos", "Atualizações em tempo real", "Suporte dedicado", "Relatórios avançados", "Exportação de dados", "API de integração"]'::jsonb,
  false,
  true,
  4
)
ON CONFLICT DO NOTHING;
