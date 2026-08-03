-- ============================================
-- MFA (Multi-Factor Authentication) Migration
-- TOTP + WebAuthn/FIDO2 + Login Events
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar campo mfa_enabled na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Tabela TOTP (segredos por usuário)
CREATE TABLE IF NOT EXISTS public.user_totp (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  secret      TEXT NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela WebAuthn Passkeys (credenciais por usuário)
CREATE TABLE IF NOT EXISTS public.user_passkeys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id   TEXT NOT NULL,
  public_key      TEXT NOT NULL,
  counter         INTEGER NOT NULL DEFAULT 0,
  device_name     TEXT,
  transports      TEXT[],
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, credential_id)
);

-- 4. Tabela de eventos de login (detecção de novo dispositivo)
CREATE TABLE IF NOT EXISTS public.user_login_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address        TEXT,
  user_agent        TEXT,
  device_fingerprint TEXT,
  is_new_device     BOOLEAN DEFAULT false,
  notified          BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_user_totp_user ON public.user_totp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_passkeys_user ON public.user_passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_login_events_user ON public.user_login_events(user_id);
CREATE INDEX IF NOT EXISTS idx_login_events_created ON public.user_login_events(created_at DESC);

-- 6. RLS
ALTER TABLE public.user_totp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_events ENABLE ROW LEVEL SECURITY;

-- TOTP: usuário gerencia o próprio
CREATE POLICY "user_totp_self" ON public.user_totp
  FOR ALL USING (auth.uid() = user_id);

-- Passkeys: usuário gerencia os próprios
CREATE POLICY "user_passkeys_self" ON public.user_passkeys
  FOR ALL USING (auth.uid() = user_id);

-- Login events: usuário lê os próprios, insert é livre (via service_role ou API)
CREATE POLICY "login_events_select_self" ON public.user_login_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "login_events_insert_any" ON public.user_login_events
  FOR INSERT WITH CHECK (true);
