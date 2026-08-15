-- ═══════════════════════════════════════════════════════════════
-- CRITICAL FIX: Privilege Escalation via signUp()
-- ═══════════════════════════════════════════════════════════════
-- Vulnerabilidade: O trigger handle_new_user() usava
-- COALESCE(NEW.raw_user_meta_data->>'role', 'coordenador')
-- permitindo que um atacante passasse role='admin_sistema'
-- no metadata do signUp() e obtivesse acesso administrativo.
--
-- Correção: O role é AGORA sempre 'coordenador' (hardcoded).
-- O meta-data de role é completamente ignorado.
-- Apenas o seed-admin pode criar admin_sistema.
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
      'coordenador',  -- HARDCODED: ignora completamente o meta-data de role
      COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false),
      COALESCE((NEW.raw_user_meta_data->>'must_setup_mfa')::boolean, false)
    );
  ELSE
    INSERT INTO public.profiles (id, email, display_name, role)
    VALUES (
      NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
      'coordenador'   -- HARDCODED: ignora completamente o meta-data de role
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
-- Corrigir também o bloco de reparação de perfis (seção 7)
-- que tinha a mesma vulnerabilidade
-- ═══════════════════════════════════════════════════════════════
-- Nota: perfis existentes já criados com role correto NÃO são afetados.
-- A correção acima protege NOVOS cadastros.
-- Para perfis legados que possam ter role incorreto, use o
-- endpoint fix-legacy ou atualização manual.
