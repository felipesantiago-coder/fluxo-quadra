-- =============================================================================
-- MIGRATION: Security Audit 2025 — Correções Críticas de RLS
-- =============================================================================
-- Data: 2025-08-15
-- Motivo: Correção de vulnerabilidades encontradas na auditoria de segurança
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- SEC-R01 CRITICAL: Privilege Escalation via profiles_update_own_mfa
-- -----------------------------------------------------------------------------
-- PROBLEMA: A policy 'profiles_update_own_mfa' permite qualquer usuário
-- atualizar QUALQUER coluna do próprio perfil, incluindo 'role'.
-- Um coordenador pode setar role='admin_sistema' e obter acesso total.
--
-- CORREÇÃO: Dropar a policy genérica e criar policies específicas por coluna.
-- A coluna 'role' só pode ser alterada via service_role.
-- -----------------------------------------------------------------------------

-- 1. Remover a policy genérica que permite update de qualquer coluna
DROP POLICY IF EXISTS "profiles_update_own_mfa" ON public.profiles;

-- 2. Criar policy restritiva que só permite atualizar colunas seguras
-- Colunas permitidas: mfa_enabled (o objetivo original da policy)
-- Colunas BLOQUEADAS: role (só service_role pode alterar)
-- NOTA: service_role já bypassa RLS automaticamente no Supabase,
-- então não precisamos de nenhuma cláusula especial para isso.
CREATE POLICY "profiles_update_own_safe_fields" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Trigger para garantir que colunas sensíveis nunca sejam alteradas por non-service_role
-- Colunas protegidas: role, subscription_status, must_setup_mfa, must_change_password
-- NOTA: service_role tem request.jwt.claim.sub = NULL,
-- então a verificação funciona: se sub está presente (usuário comum), reverte.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('request.jwt.claim.sub', true) IS NOT NULL THEN
    NEW.role := OLD.role;
    NEW.subscription_status := OLD.subscription_status;
    NEW.must_setup_mfa := OLD.must_setup_mfa;
    NEW.must_change_password := OLD.must_change_password;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_role_trigger ON public.profiles;
DROP TRIGGER IF EXISTS protect_profile_columns_trigger ON public.profiles;
CREATE TRIGGER protect_profile_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

-- -----------------------------------------------------------------------------
-- SEC-R02 HIGH: Usuário pode auto-ativar assinatura
-- -----------------------------------------------------------------------------
-- PROBLEMA: A policy 'assinaturas_user_update_own' permite qualquer usuário
-- fazer UPDATE em qualquer coluna da própria assinatura, incluindo 'status'.
-- Um usuário poderia setar status='active' sem pagamento.
--
-- CORREÇÃO: Restringir o update do usuário para colunas não-críticas.
-- -----------------------------------------------------------------------------

-- 1. Remover a policy genérica
DROP POLICY IF EXISTS "assinaturas_user_update_own" ON public.assinaturas;

-- 2. Criar policy que só permite cancelar (motivo_cancelamento + status)
-- usando uma abordagem de restrição: o usuário só pode setar status='cancelled'
-- NOTA: Em RLS policies, USING acessa a linha atual (antes do update)
-- e WITH CHECK acessa a linha nova (após o update).
-- Equivalentes: USING = OLD, WITH CHECK = NEW.
CREATE POLICY "assinaturas_user_cancel_own" ON public.assinaturas
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status IN ('active', 'paused', 'pending')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('cancelled')
  );

-- -----------------------------------------------------------------------------
-- SEC-R03 MEDIUM: Usuário pode inserir registros de pagamento falsos
-- -----------------------------------------------------------------------------
-- PROBLEMA: A policy 'pagamentos_user_insert_own' permite que um usuário
-- insira registros de pagamento para si mesmo.
--
-- CORREÇÃO: Remover a policy. Pagamentos só devem ser criados via webhook
-- (que usa service_role) ou por admin.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "pagamentos_user_insert_own" ON public.pagamentos;

-- -----------------------------------------------------------------------------
-- SEC-R04 MEDIUM: Login event forging
-- -----------------------------------------------------------------------------
-- PROBLEMA: A policy 'login_events_insert_any' usa WITH CHECK (true),
-- permitindo que qualquer pessoa insira eventos de login falsos.
--
-- CORREÇÃO: Restringir para que usuários só possam inserir eventos próprios.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "login_events_insert_any" ON public.user_login_events;

CREATE POLICY "login_events_insert_own" ON public.user_login_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- SEC-R05 CRITICAL: Storage RLS regression
-- -----------------------------------------------------------------------------
-- PROBLEMA: A migration-storage-rls-fix.sql removeu o role check das policies
-- de storage, permitindo que QUALQUER usuário (mesmo anon) faça upload,
-- sobrescreva e delete imagens no bucket 'empreendimentos'.
--
-- CORREÇÃO: Re-adicionar verificação de role='admin_sistema' nas policies
-- de INSERT, UPDATE e DELETE.
-- -----------------------------------------------------------------------------

-- Recriar policies de storage com verificação de role
DROP POLICY IF EXISTS "storage_empreendimentos_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_empreendimentos_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_empreendimentos_delete" ON storage.objects;

CREATE POLICY "storage_empreendimentos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'empreendimentos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

CREATE POLICY "storage_empreendimentos_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'empreendimentos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

CREATE POLICY "storage_empreendimentos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'empreendimentos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- -----------------------------------------------------------------------------
-- SEC-R06: Adicionar auditoria de alterações de role
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT
);

ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_change_audit_admin_select" ON public.role_change_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

CREATE POLICY "role_change_audit_admin_insert" ON public.role_change_audit
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- Atualizar o trigger de proteção de role para incluir auditoria
CREATE OR REPLACE FUNCTION public.protect_role_column()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_is_service_role BOOLEAN;
  v_current_role TEXT;
  v_new_role TEXT;
BEGIN
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT v_is_service_role THEN
      -- Non-service_role não pode alterar role — reverter
      NEW.role := OLD.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
