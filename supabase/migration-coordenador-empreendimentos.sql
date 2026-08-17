-- =============================================
-- Migration: coordenador_empreendimentos
-- Permite ao admin atribuir empreendimentos específicos a cada coordenador.
-- Many-to-many: profiles (coordenador) <-> empreendimentos
-- =============================================

CREATE TABLE IF NOT EXISTS public.coordenador_empreendimentos (
  coordenador_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  empreendimento_id  UUID NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (coordenador_id, empreendimento_id)
);

-- RLS
ALTER TABLE public.coordenador_empreendimentos ENABLE ROW LEVEL SECURITY;

-- Admin pode gerenciar tudo
CREATE POLICY coordenador_emp_admin_all ON public.coordenador_empreendimentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );

-- Coordenador pode ler os próprios
CREATE POLICY coordenador_emp_read_own ON public.coordenador_empreendimentos
  FOR SELECT USING (coordenador_id = auth.uid());

-- =================================================
-- Pré-popular: coordenadores existentes recebem TODOS os
-- empreendimentos ativos (preserva comportamento atual).
-- O admin pode ajustar depois pelo painel.
-- =================================================
INSERT INTO public.coordenador_empreendimentos (coordenador_id, empreendimento_id)
SELECT p.id, e.id
FROM public.profiles p
CROSS JOIN public.empreendimentos e
WHERE p.role = 'coordenador'
  AND e.ativo = true
ON CONFLICT DO NOTHING;

-- Habilitar Realtime (opcional, para futuras notificações)
ALTER PUBLICATION supabase_realtime ADD TABLE public.coordenador_empreendimentos;
