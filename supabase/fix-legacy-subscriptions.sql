-- ================================================================
-- CORRECAO DE EMERGENCIA: Desbloquear usuarios legados
-- Execute no SQL Editor do Supabase
-- ================================================================
--
-- Este script corrige usuarios que foram bloqueados incorretamente
-- pelo sistema de assinaturas.
--
-- Cenarios corrigidos:
--   1. Perfil com subscription_status='pending' mas sem assinatura
--   2. Perfil com subscription_status='pending' e assinatura pendente
--      ha mais de 24h (pagamento nunca confirmado)
--   3. Perfil com subscription_status=NULL
--
-- Apos executar, os usuarios corrigidos precisam fazer login novamente.
-- ================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Corrigir perfis com pending mas sem assinatura
--    (inconsistencia: perfil diz pending mas tabela assinaturas
--     nao tem registro)
-- ─────────────────────────────────────────────────────────────
UPDATE public.profiles
SET subscription_status = 'none'
WHERE subscription_status = 'pending'
  AND id NOT IN (
    SELECT user_id FROM public.assinaturas
    WHERE status IN ('active', 'pending')
  );

-- ─────────────────────────────────────────────────────────────
-- 2. Expirar assinaturas pendentes ha mais de 24h
--    e resetar o perfil do usuario
-- ─────────────────────────────────────────────────────────────
UPDATE public.assinaturas
SET status = 'expired',
    motivo_cancelamento = CONCAT(
      'Expirado automaticamente por fix-legacy-subscriptions.sql em ', now(),
      '. Pagamento nunca confirmado apos 24h.'
    ),
    updated_at = now()
WHERE status = 'pending'
  AND created_at < now() - interval '24 hours';

-- Corrigir perfis dessas assinaturas expiradas
UPDATE public.profiles
SET subscription_status = 'none'
WHERE subscription_status = 'pending'
  AND id IN (
    SELECT user_id FROM public.assinaturas
    WHERE status = 'expired'
      AND motivo_cancelamento LIKE '%fix-legacy-subscriptions.sql%'
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Corrigir perfis com subscription_status=NULL
--    (se a coluna existe mas nao tem NOT NULL DEFAULT)
-- ─────────────────────────────────────────────────────────────
UPDATE public.profiles
SET subscription_status = 'none'
WHERE subscription_status IS NULL;

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- Verificacao: quantos usuarios foram corrigidos
-- ─────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.profiles WHERE subscription_status = 'none') AS usuarios_none,
  (SELECT count(*) FROM public.profiles WHERE subscription_status = 'active') AS usuarios_active,
  (SELECT count(*) FROM public.profiles WHERE subscription_status = 'pending') AS usuarios_pending,
  (SELECT count(*) FROM public.profiles WHERE subscription_status = 'cancelled') AS usuarios_cancelled,
  (SELECT count(*) FROM public.profiles WHERE subscription_status IS NULL) AS usuarios_null;
