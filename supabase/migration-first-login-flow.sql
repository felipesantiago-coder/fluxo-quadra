-- Migration: Fluxo de primeiro acesso (trocar senha + configurar 2FA) + fixes RLS
-- Executar no Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- 1. Adicionar colunas de primeiro acesso na tabela profiles
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles
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
-- 3. Atualizar trigger de auto-create para suportar os novos campos
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, must_change_password, must_setup_mfa)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'coordenador'),
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'must_setup_mfa')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 4. Garantir que o admin pode gerenciar perfis de outros usuários
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_admin_sistema_full" ON public.profiles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "profiles_admin_sistema_full" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 5. RLS para empreendimentos: INSERT / UPDATE / DELETE para admin_sistema
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  DROP POLICY IF EXISTS "empreendimentos_admin_sistema_manage" ON public.empreendimentos;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "empreendimentos_admin_sistema_manage" ON public.empreendimentos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 6. RLS para projeto_units: INSERT / DELETE para admin_sistema
-- ═══════════════════════════════════════════════════════════════
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
