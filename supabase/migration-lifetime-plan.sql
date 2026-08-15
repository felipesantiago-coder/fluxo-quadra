-- ================================================================
-- Migration: Plano Vitalicio (Lifetime)
-- Descrição: Adiciona o status 'lifetime' ao sistema de assinaturas.
--   Assinaturas lifetime não expiram e não exigem pagamento.
--   Apenas admin_sistema pode conceder (via endpoint dedicado).
-- ================================================================

-- 0. Tornar plano_id nullable (assinaturas lifetime não têm plano vinculado)
ALTER TABLE public.assinaturas ALTER COLUMN plano_id DROP NOT NULL;

-- 1. Adicionar 'lifetime' ao CHECK constraint de status
--    O PostgreSQL não suporta ALTER CONSTRAINT, então recriamos.
ALTER TABLE public.assinaturas DROP CONSTRAINT IF EXISTS assinaturas_status_check;

ALTER TABLE public.assinaturas ADD CONSTRAINT assinaturas_status_check CHECK (
  status IN (
    'pending', 'active', 'cancelled',
    'paused', 'expired', 'cancelled_by_user',
    'lifetime'
  )
);

-- 2. Atualizar partial unique index: lifetime conta como "ocupando" o slot
--    de assinatura do usuário (impede ter lifetime + active simultaneamente).
--    Recriar o índice para incluir 'lifetime'.
DROP INDEX IF EXISTS public.idx_one_active_sub_per_user;

CREATE UNIQUE INDEX idx_one_active_sub_per_user
  ON public.assinaturas(user_id)
  WHERE status IN ('active', 'pending', 'lifetime');

-- 3. Atualizar subscription_status CHECK no profile (se existir)
--    Verificar se há constraint antes de tentar alterar
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_subscription_status_check'
      AND table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_subscription_status_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_status_check CHECK (
      subscription_status IN ('none', 'pending', 'active', 'cancelled', 'lifetime')
    );
    RAISE NOTICE 'Constraint subscription_status atualizada com lifetime';
  ELSE
    RAISE NOTICE 'Constraint subscription_status não encontrada — pulando';
  END IF;
END $$;
