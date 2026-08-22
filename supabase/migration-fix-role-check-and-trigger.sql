-- ═══════════════════════════════════════════════════════════════
-- Migration: Corrigir CHECK constraint + trigger para role 'comum'
-- ═══════════════════════════════════════════════════════════════
-- Problemas que esta migration resolve:
--   1. CHECK constraint em profiles.role não inclui 'comum'
--   2. Trigger handle_new_user() ainda usa 'coordenador'
--   3. Colunas adicionais (must_setup_mfa, etc.) não são preenchidas
--      pelo trigger original
-- ═══════════════════════════════════════════════════════════════

-- 1. Atualizar CHECK constraint para incluir 'comum'
DO $$ BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('comum', 'coordenador', 'admin_sistema'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Atualizar DEFAULT da coluna role
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'comum';

-- 3. Recriar trigger handle_new_user() com 'comum' + todas as colunas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _email TEXT := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  _display_name TEXT := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(_email, '@', 1),
    'Usuário'
  );
  _has_mcp BOOLEAN;
  _has_msm BOOLEAN;
BEGIN
  -- Verificar se as colunas opcionais existem
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'must_change_password'
  ) INTO _has_mcp;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'must_setup_mfa'
  ) INTO _has_msm;

  IF _has_mcp AND _has_msm THEN
    INSERT INTO public.profiles (id, email, display_name, role, must_change_password, must_setup_mfa)
    VALUES (
      NEW.id,
      _email,
      _display_name,
      'comum',
      COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false),
      COALESCE((NEW.raw_user_meta_data->>'must_setup_mfa')::boolean, false)
    )
    ON CONFLICT (id) DO NOTHING;  -- não sobrescrever se já existe
  ELSE
    INSERT INTO public.profiles (id, email, display_name, role)
    VALUES (
      NEW.id,
      _email,
      _display_name,
      'comum'
    )
    ON CONFLICT (id) DO NOTHING;  -- não sobrescrever se já existe
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que o trigger existe e está atrelado
DO $$ BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
