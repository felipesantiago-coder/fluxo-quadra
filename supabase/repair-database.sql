-- ═══════════════════════════════════════════════════════════════════════════
-- REPARAÇÃO COMPLETA DO BANCO
-- Executar NO SQL Editor do Supabase
-- Este script é idempotente (seguro para re-executar)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. GARANTIR QUE TODAS AS COLUNAS EXISTEM EM PROFILES
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_setup_mfa BOOLEAN NOT NULL DEFAULT false;

-- ═══════════════════════════════════════════════════════════════
-- 2. ATUALIZAR CHECK CONSTRAINT DE ROLE (inclui 'comum')
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('comum', 'coordenador', 'admin_sistema'));

-- ═══════════════════════════════════════════════════════════════
-- 3. REPARAR O TRIGGER (agora resiliente — só usa colunas que existem)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  has_mcp BOOLEAN;
  has_msm BOOLEAN;
BEGIN
  -- Verifica se as colunas existem antes de referenciá-las
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

-- Garantir que o trigger existe
DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. REPARAR RLS DA TABELA PROFILES
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: usuário lê o próprio perfil
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: admin_sistema gerencia todos os perfis
-- IMPORTANTE: usa FOR INSERT, UPDATE, DELETE (não FOR ALL) para não
-- criar policy SELECT duplicada que pode conflitar
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_admin_sistema_full" ON public.profiles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Admin precisa de SELECT também (para ver todos os perfis)
CREATE POLICY "profiles_admin_sistema_select" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- Admin pode INSERT, UPDATE, DELETE
CREATE POLICY "profiles_admin_sistema_manage" ON public.profiles
  FOR INSERT, UPDATE, DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 5. REPARAR RLS DA TABELA EMPREENDIMENTOS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.empreendimentos ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuário autenticado pode ver
DO $$ BEGIN
  DROP POLICY IF EXISTS "empreendimentos_select" ON public.empreendimentos;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "empreendimentos_select" ON public.empreendimentos
  FOR SELECT USING (true);

-- INSERT, UPDATE, DELETE: apenas admin_sistema
-- IMPORTANTE: NÃO usar FOR ALL para não criar policy SELECT duplicada
DO $$ BEGIN
  DROP POLICY IF EXISTS "empreendimentos_admin_sistema_manage" ON public.empreendimentos;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "empreendimentos_admin_sistema_manage" ON public.empreendimentos
  FOR INSERT, UPDATE, DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 6. REPARAR RLS DA TABELA PROJETO_UNITS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.projeto_units ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuário pode ver
DO $$ BEGIN
  DROP POLICY IF EXISTS "projeto_units_select" ON public.projeto_units;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "projeto_units_select" ON public.projeto_units
  FOR SELECT USING (true);

-- UPDATE: coordenador ou admin
DO $$ BEGIN
  DROP POLICY IF EXISTS "projeto_units_coordenador" ON public.projeto_units;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "projeto_units_coordenador" ON public.projeto_units
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coordenador', 'admin_sistema')
    )
  );

-- INSERT: apenas admin
DO $$ BEGIN
  DROP POLICY IF EXISTS "projeto_units_admin_insert" ON public.projeto_units;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "projeto_units_admin_insert" ON public.projeto_units
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- DELETE: apenas admin
DO $$ BEGIN
  DROP POLICY IF EXISTS "projeto_units_admin_delete" ON public.projeto_units;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "projeto_units_admin_delete" ON public.projeto_units
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 7. REPARAR PERFIS DE USUÁRIOS QUE FICARAM SEM PROFILE
--    (por causa do trigger quebrado)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.profiles (id, email, display_name, role, must_change_password, must_setup_mfa)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'coordenador'),
  false,
  false
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
AND u.email IS NOT NULL;
