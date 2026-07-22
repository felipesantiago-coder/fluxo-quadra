-- Migration: Adicionar unique constraint para upsert seguro no upload Excel
-- Antes: DELETE + INSERT (perdia unidades não presentes no novo Excel)
-- Depois: UPSERT por (empreendimento_id, unidade)

-- Primeiro, remover duplicatas existentes (caso haja), mantendo a primeira ocorrência
DELETE FROM public.projeto_units a
USING public.projeto_units b
WHERE a.id > b.id
  AND a.empreendimento_id = b.empreendimento_id
  AND a.unidade = b.unidade;

-- Criar índice unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_projeto_units_emp_unidade
  ON public.projeto_units(empreendimento_id, unidade);

-- Política RLS para INSERT (necessária para o upsert do upload Excel)
CREATE POLICY "projeto_units_admin_insert" ON public.projeto_units
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema'
    )
  );
