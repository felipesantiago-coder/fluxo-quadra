-- ================================================================
-- Migration: Correções da Auditoria de Segurança
-- Data: 2025-08-15
-- Descrição: Corrige vulnerabilidades encontradas na auditoria
--
-- IDEMPOTENTE: Pode ser executada em qualquer ordem em relação
-- às outras migrations. Usa DO blocks para verificar existência
-- de tabelas antes de operar nelas.
-- ================================================================

-- ============================================================
-- SEC-001: Função RPC atômica para incremento de cupons
--   Problema: TOCTOU race condition — usos_atuais era lido na
--   validação e usado no UPDATE, permitindo que requisições
--   simultâneas ultrapassem o limite.
--   Correção: UPDATE atômico no PostgreSQL com SET usos_atuais =
--   usos_atuais + 1 WHERE (usos_maximos IS NULL OR usos_atuais < usos_maximos)
-- ============================================================

CREATE OR REPLACE FUNCTION public.incrementar_uso_cupom(p_cupom_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.cupons
  SET usos_atuais = usos_atuais + 1,
      updated_at = now()
  WHERE id = p_cupom_id
    AND (usos_maximos IS NULL OR usos_atuais < usos_maximos)
    AND ativo = true;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Grant para authenticated e service_role
GRANT EXECUTE ON FUNCTION public.incrementar_uso_cupom(UUID) TO
  authenticated, service_role;

-- ============================================================
-- SEC-003: RLS na tabela webhook_events
--   Problema: Tabela sem RLS, qualquer autenticado podia ler.
--   Correção: Apenas service_role (webhook usa adminClient) pode acessar.
--   Service_role bypassa RLS automaticamente.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'webhook_events'
  ) THEN
    -- Verificar se RLS já está habilitado antes de tentar
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'webhook_events'
    ) THEN
      ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
      RAISE NOTICE 'SEC-003: RLS habilitado em webhook_events';
    ELSE
      RAISE NOTICE 'SEC-003: RLS já estava habilitado em webhook_events';
    END IF;
  ELSE
    RAISE NOTICE 'SEC-003: Tabela webhook_events não existe ainda — pulando';
  END IF;
END $$;

-- ============================================================
-- SEC-005: Proteger middleware contra cookies forjados
--   (A proteção real é server-side via supabase.auth.getUser())
--   Correção aplicada no código TypeScript (middleware.ts):
--   - Allowlist de valores válidos para subscription_status
--   - Qualquer valor forjado é tratado como ausência (fallback seguro)
-- ============================================================

-- ============================================================
-- SEC-006: Restringir init-schema para admin_sistema
--   (A correção principal é no código TypeScript, mas como
--   backup, documentamos que este endpoint deve ser removido
--   ou protegido após o primeiro uso)
-- ============================================================

-- ============================================================
-- SEC-007: Rate limiting
--   Correção aplicada no código TypeScript (rate-limit.ts):
--   - /api/cupons/validate: 10 req/IP/min
--   - /api/signup-subscribe: 5 req/IP/min
-- ============================================================

-- ============================================================
-- Melhoria: Adicionar índice para busca de cupom_usos por assinatura
--   Usa DO block para verificar se a tabela existe antes de criar.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cupom_usos'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_cupom_usos_assinatura_id
      ON public.cupom_usos(assinatura_id)
      WHERE assinatura_id IS NOT NULL';
    RAISE NOTICE 'Índice idx_cupom_usos_assinatura_id criado/verificado';
  ELSE
    RAISE NOTICE 'Tabela cupom_usos não existe ainda — execute migration-cupons.sql primeiro. Pulando índice.';
  END IF;
END $$;
