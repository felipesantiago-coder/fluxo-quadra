-- Migration: Fluxo de primeiro acesso (trocar senha + configurar 2FA)
-- Executar no Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- 1. Adicionar colunas de primeiro acesso na tabela profiles
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_setup_mfa BOOLEAN NOT NULL DEFAULT false;

-- ═══════════════════════════════════════════════════════════════
-- 2. Atualizar CHECK constraint de role para incluir 'comum'
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('comum', 'coordenador', 'admin_sistema'));

-- ═══════════════════════════════════════════════════════════════
-- 3. Trigger resiliente (detecta colunas em runtime)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  has_extra_cols BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'must_change_password'
  ) INTO has_extra_cols;

  IF has_extra_cols THEN
    INSERT INTO public.profiles (id, email, display_name, role, must_change_password, must_setup_mfa)
    VALUES (
      NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'role', 'coordenador'),
      COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false),
      COALESCE((NEW.raw_user_meta_data->>'must_setup_mfa')::boolean, false)
    );
  ELSE
    INSERT INTO public.profiles (id, email, display_name, role)
    VALUES (
      NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'role', 'coordenador')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. RLS profiles — separar SELECT de INSERT/UPDATE/DELETE
--    (evita conflito de policies SELECT duplicadas)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN DROP POLICY IF EXISTS "profiles_admin_sistema_full" ON public.profiles; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "profiles_admin_sistema_select" ON public.profiles; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "profiles_admin_sistema_manage" ON public.profiles; EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "profiles_admin_sistema_select" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );

CREATE POLICY "profiles_admin_sistema_manage" ON public.profiles
  FOR INSERT, UPDATE, DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema'));

-- ═══════════════════════════════════════════════════════════════
-- 5. RLS empreendimentos — NÃO usar FOR ALL (conflita com SELECT existente)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN DROP POLICY IF EXISTS "empreendimentos_admin_sistema_manage" ON public.empreendimentos; EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "empreendimentos_admin_sistema_manage" ON public.empreendimentos
  FOR INSERT, UPDATE, DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema'));

-- ═══════════════════════════════════════════════════════════════
-- 6. RLS projeto_units — DELETE para admin
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN DROP POLICY IF EXISTS "projeto_units_admin_delete" ON public.projeto_units; EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "projeto_units_admin_delete" ON public.projeto_units
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );
