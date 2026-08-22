-- ═══════════════════════════════════════════════════════════════
-- Migration: Novos usuários recebem role 'comum' por padrão
-- ═══════════════════════════════════════════════════════════════
-- Anteriormente, o trigger handle_new_user() atribuía 'coordenador'
-- a todos os novos cadastros. Agora, o papel padrão é 'comum'.
--
-- A alteração de papel para 'coordenador' ou 'admin_sistema' deve
-- ser feita explicitamente pelo administrador.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  has_mcp BOOLEAN;
  has_msm BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'must_change_password'
  ) INTO has_mcp;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'must_setup_mfa'
  ) INTO has_msm;

  IF has_mcp AND has_msm THEN
    INSERT INTO public.profiles (id, email, display_name, role, must_change_password, must_setup_mfa)
    VALUES (
      NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
      'comum',
      COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false),
      COALESCE((NEW.raw_user_meta_data->>'must_setup_mfa')::boolean, false)
    );
  ELSE
    INSERT INTO public.profiles (id, email, display_name, role)
    VALUES (
      NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
      'comum'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que o trigger existe
DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Corrigir também o DEFAULT da coluna role na tabela profiles
-- (para casos onde o perfil é criado manualmente sem o trigger)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'comum';
