-- ============================================================
-- Migração: Corrigir políticas RLS do storage.objects para o bucket 'empreendimentos'
-- ============================================================
-- 
-- Problema: Ao substituir a imagem de um empreendimento (upsert), o Supabase Storage
-- executa um UPDATE no objeto. A política de UPDATE não existia, causando falha.
-- O primeiro upload (INSERT) funcionava porque a política de INSERT existia.
--
-- Execute este SQL no Supabase SQL Editor (Dashboard > SQL Editor > New Query).
-- ============================================================

-- 1. Remover políticas existentes que possam estar incompletas/erradas
DROP POLICY IF EXISTS "empreendimentos_public_select" ON storage.objects;
DROP POLICY IF EXISTS "empreendimentos_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "empreendimentos_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "empreendimentos_admin_delete" ON storage.objects;

-- 2. Recriar todas as políticas corretamente

-- Leitura pública: qualquer pessoa pode ver as imagens
CREATE POLICY "empreendimentos_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'empreendimentos');

-- Insert: permitir upload de novos arquivos no bucket
CREATE POLICY "empreendimentos_admin_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'empreendimentos');

-- Update: permitir substituição (upsert) de arquivos existentes
-- IMPORTANTE: precisa de BOTH USING e WITH CHECK para upsert funcionar
CREATE POLICY "empreendimentos_admin_update" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'empreendimentos')
  WITH CHECK (bucket_id = 'empreendimentos');

-- Delete: permitir remoção de arquivos
CREATE POLICY "empreendimentos_admin_delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'empreendimentos');

-- 3. Verificar as políticas criadas
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND qual LIKE '%empreendimentos%'
ORDER BY policyname;
