-- ================================================================
-- MIGRAÇÃO: Abordagem B — Checkout antes da conta
-- Adiciona campo subscription_status ao perfil e novas políticas RLS
-- Execute no SQL Editor do Supabase
-- ================================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Adicionar campo subscription_status ao perfil
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none'
  CHECK (subscription_status IN ('none', 'pending', 'active', 'cancelled'));

-- ─────────────────────────────────────────────────────────────
-- 2. RLS: permitir que qualquer um autenticado veja planos ativos
--    (já existe, mas garantir que funcione para a página pública via API admin)
-- ─────────────────────────────────────────────────────────────

-- Política para permitir que usuários sem assinatura vejam planos
-- (já coberto por planos_select_authenticated)

-- ─────────────────────────────────────────────────────────────
-- 3. Permitir que admin atualize subscription_status via webhook
--    (o webhook usa createAdminClient que bypassa RLS, mas se necessário)
-- ─────────────────────────────────────────────────────────────

-- Política para permitir que admin_sistema atualize perfis
CREATE POLICY "profiles_admin_update_subscription" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4. Permitir que o usuário atualize o próprio subscription_status
--    (não necessário — o webhook faz isso via admin client)
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 5. Adicionar índice para queries de perfil por subscription_status
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status
  ON public.profiles(subscription_status);

-- ─────────────────────────────────────────────────────────────
-- 6. RLS: permitir que user insira própria assinatura
--    (necessário para o fluxo signup+subscribe)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "assinaturas_user_insert_own" ON public.assinaturas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 7. RLS: permitir que user atualize própria assinatura
--    (necessário para o fluxo de ativação)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "assinaturas_user_update_own" ON public.assinaturas
  FOR UPDATE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 8. RLS: permitir que user veja seus próprios pagamentos
--    (já existe via pagamentos_select_own)
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 9. Permitir que user insira próprios pagamentos (via webhook)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "pagamentos_user_insert_own" ON public.pagamentos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
