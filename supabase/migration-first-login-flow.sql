-- Migration: Fluxo de primeiro acesso (trocar senha + configurar 2FA)
-- Executar no Supabase SQL Editor

-- 1. Adicionar colunas de primeiro acesso na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_setup_mfa BOOLEAN NOT NULL DEFAULT false;

-- 2. Atualizar trigger de auto-create para suportar os novos campos
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

-- 3. Garantir que o admin pode ver e atualizar perfis de outros usuários
-- (a policy profiles_admin_sistema_full já existe e cobre ALL, mas garantir)
CREATE POLICY IF NOT EXISTS "profiles_admin_sistema_full" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );

-- 4. Permitir que o próprio usuário leia must_change_password e must_setup_mfa
-- (a policy profiles_select_own já cobre SELECT onde auth.uid() = id)
