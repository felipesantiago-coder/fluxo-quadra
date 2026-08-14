-- ================================================================
-- Migration: Correções da Auditoria de Segurança
-- Data: 2025-08-15
-- Descrição: Corrige vulnerabilidades encontradas na auditoria
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
-- ============================================================

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy SELECT para authenticated — só adminClient (service_role) acessa
-- Service_role bypassa RLS automaticamente, então não precisamos de policy.

-- ============================================================
-- SEC-005: Proteger middleware contra cookies forjados
--   (A proteção real é server-side via supabase.auth.getUser())
--   Mas adicionamos verificação de assinatura no subscription-check
--   para garantir que a página /aguardando-pagamento confie no DB,
--   não no cookie.
-- ============================================================

-- ============================================================
-- SEC-006: Restringir init-schema para admin_sistema
--   (A correção principal é no código TypeScript, mas como
--   backup, documentamos que este endpoint deve ser removido
--   ou protegido após o primeiro uso)
-- ============================================================

-- ============================================================
-- Melhoria: Adicionar índice para busca de cupom_usos por assinatura
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cupom_usos_assinatura_id
  ON public.cupom_usos(assinatura_id)
  WHERE assinatura_id IS NOT NULL;
