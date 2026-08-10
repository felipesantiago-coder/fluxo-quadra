---
Task ID: 2
Agent: main
Task: Investigar por que o admin não consegue substituir a imagem de empreendimentos existentes

Work Log:
- Analisado upload-image/route.ts, admin-auth.ts, supabase/admin.ts, setup-storage/route.ts
- Identificada causa raiz: faltava política UPDATE no storage.objects para o bucket 'empreendimentos'
- Primeiro upload (INSERT) funcionava; substituição (UPDATE via upsert) falhava por falta de política
- As políticas de storage foram criadas via exec_sql RPC que provavelmente não existe (erro silenciado com .catch)
- Corrigido upload-image/route.ts: usa createAdminClient() (service_role, bypass RLS) com fallback para anon client
- Adicionado cache-busting (?t=timestamp) na URL da imagem para evitar cache do navegador
- Criado migration-storage-rls-fix.sql com DROP + CREATE das 4 políticas de storage (SELECT, INSERT, UPDATE com USING+WITH_CHECK, DELETE)

Stage Summary:
- Causa raiz: política UPDATE ausente em storage.objects para o bucket 'empreendimentos'
- Código corrigido com duas camadas de proteção (admin client bypass + SQL migration)
- **AÇÃO NECESSÁRIA**: Rodar migration-storage-rls-fix.sql no Supabase SQL Editor
