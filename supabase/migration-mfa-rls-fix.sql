-- ============================================
-- Fix RLS para MFA: permitir que usuários comuns
-- atualizem o próprio mfa_enabled na tabela profiles
-- ============================================

-- Adicionar política UPDATE para o próprio usuário em profiles
-- (antes só existia profiles_admin_sistema_full para ALL)
CREATE POLICY "profiles_update_own_mfa" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Garantir que a política de user_totp permite UPDATE/INSERT
-- (a política existente "user_totp_self" usa FOR ALL, então já cobre)
-- Mas vamos garantir que não há conflito:

-- Verificar se as políticas de user_passkeys permitem INSERT
-- (a política existente "user_passkeys_self" usa FOR ALL, então já cobre)

-- Garantir que user_login_events permite INSERT de qualquer usuário autenticado
-- (a política "login_events_insert_any" usa WITH CHECK (true), então já cobre)
