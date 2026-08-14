-- ================================================================
-- Migration: Correção de Vulnerabilidades de Segurança
-- Data: 2026-08-13
-- Descrição: Corrige RLS das tabelas legadas e storage.objects
-- ================================================================

-- ============================================================
-- 1. CORRIGIR RLS DAS TABELAS DE UNIDADES LEGADAS
--    Problema: UPDATE usa auth.role()='authenticated' (qualquer
--    usuário logado pode alterar). Faltam INSERT e DELETE.
-- ============================================================

-- --- units (Quattre Istambul) ---
DROP POLICY IF EXISTS "Apenas admin pode editar" ON units;
DROP POLICY IF EXISTS "Qualquer um pode ver as unidades" ON units;

CREATE POLICY "units_public_select" ON units
  FOR SELECT USING (true);

CREATE POLICY "units_admin_update" ON units
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin_sistema', 'coordenador'))
  );

CREATE POLICY "units_admin_insert" ON units
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );

CREATE POLICY "units_admin_delete" ON units
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );

-- --- moment_units ---
DROP POLICY IF EXISTS "Apenas admin pode editar moment" ON moment_units;
DROP POLICY IF EXISTS "Qualquer um pode ver as unidades moment" ON moment_units;

CREATE POLICY "moment_units_public_select" ON moment_units
  FOR SELECT USING (true);

CREATE POLICY "moment_units_admin_update" ON moment_units
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin_sistema', 'coordenador'))
  );

CREATE POLICY "moment_units_admin_insert" ON moment_units
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );

CREATE POLICY "moment_units_admin_delete" ON moment_units
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );

-- --- villa_bianco_units ---
DROP POLICY IF EXISTS "Authenticated users can update" ON villa_bianco_units;
DROP POLICY IF EXISTS "Public read access" ON villa_bianco_units;

CREATE POLICY "villa_bianco_units_public_select" ON villa_bianco_units
  FOR SELECT USING (true);

CREATE POLICY "villa_bianco_units_admin_update" ON villa_bianco_units
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin_sistema', 'coordenador'))
  );

CREATE POLICY "villa_bianco_units_admin_insert" ON villa_bianco_units
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );

CREATE POLICY "villa_bianco_units_admin_delete" ON villa_bianco_units
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );

-- --- vitta_units ---
DROP POLICY IF EXISTS "Authenticated users can update vitta" ON vitta_units;
DROP POLICY IF EXISTS "Authenticated users can insert vitta" ON vitta_units;
DROP POLICY IF EXISTS "Public read access vitta" ON vitta_units;

CREATE POLICY "vitta_units_public_select" ON vitta_units
  FOR SELECT USING (true);

CREATE POLICY "vitta_units_admin_update" ON vitta_units
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin_sistema', 'coordenador'))
  );

CREATE POLICY "vitta_units_admin_insert" ON vitta_units
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );

CREATE POLICY "vitta_units_admin_delete" ON vitta_units
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );


-- ============================================================
-- 2. CORRIGIR RLS DO STORAGE OBJECTS
--    Problema: INSERT/UPDATE/DELETE sem checagem de role,
--    qualquer anon pode subir/apagar imagens.
-- ============================================================

DROP POLICY IF EXISTS "empreendimentos_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "empreendimentos_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "empreendimentos_admin_delete" ON storage.objects;

CREATE POLICY "empreendimentos_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'empreendimentos'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );

CREATE POLICY "empreendimentos_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'empreendimentos'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  )
  WITH CHECK (
    bucket_id = 'empreendimentos'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );

CREATE POLICY "empreendimentos_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'empreendimentos'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_sistema')
  );
