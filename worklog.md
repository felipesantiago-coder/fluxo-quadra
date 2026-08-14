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

---
Task ID: 3
Agent: main
Task: Auditoria de segurança completa (5 vacilações do vídeo Mano DevIn)

Work Log:
- Vacilação 1 (RLS): Auditadas 11 tabelas. Encontrado: 4 tabelas legadas (units, moment_units, villa_bianco_units, vitta_units) com UPDATE para qualquer autenticado; storage.objects sem checagem de role. Criado migration-security-fixes.sql
- Vacilação 2 (Frontend admin): Sem localStorage. Encontrado: ADMIN_EMAILS.length===0 retornava true (fail-open); seed-admin sem autenticação e com senha hardcoded no response
- Vacilação 3 (IDOR): 4 rotas GET sem autenticação; [id]/units GET sem role check; coordenador pode editar qualquer projeto sem verificação de vínculo
- Vacilação 4 (Chaves expostas): Sem chaves de pagamento. service_role corretamente isolado no server-side
- Vacilação 5 (XSS): Zero XSS. Encontrado: 3 open redirects no fluxo MFA

Correções aplicadas (código):
- seed-admin/route.ts: Adicionado requireAdminSistema(), removido senha do response, movido para env vars
- units/route.ts, moment-units, vitta-units, villa-bianco-units: Alterado isAdmin() de return true para return false quando ADMIN_EMAILS vazio (fail-closed)
- [id]/units/route.ts: Adicionado role check no GET, validação de empreendimento existente no PATCH
- webauthn/authenticate/finish e totp/verify: Adicionado isValidRedirect() para prevenir open redirect
- mfa-verify/page.tsx: Validação client-side do redirect URL

Correções pendentes (SQL — rodar no Supabase SQL Editor):
- migration-security-fixes.sql: Corrige RLS de units, moment_units, villa_bianco_units, vitta_units, storage.objects

Stage Summary:
- 3 vulnerabilidades críticas corrigidas no código + 1 migração SQL criada
- 3 open redirects corrigidos
- Build passa sem erros
- **AÇÃO NECESSÁRIA**: Rodar migration-security-fixes.sql no Supabase SQL Editor

---
Task ID: 4
Agent: main
Task: Integração completa do Mercado Pago (Pix + cartão) com sistema de assinaturas

Work Log:
- Instalado SDK mercadopago@3.4.0
- Criado migration-subscriptions.sql com 3 tabelas (planos, assinaturas, pagamentos) + RLS + índices + seed de 4 planos
- Criado src/lib/mercadopago.ts com integração completa (clientes MP, verificação de webhook, CRUD de planos/assinaturas)
- Criados 7 API routes:
  - GET /api/plans (planos ativos para usuário)
  - POST /api/subscriptions/create (cria assinatura MP + registro local)
  - GET /api/subscriptions/status (status + histórico do usuário)
  - POST /api/subscriptions/cancel (cancela assinatura ativa)
  - POST /api/webhooks/mercadopago (processa pagamentos e mudanças de status automaticamente)
  - GET/POST /api/admin-sistema/planos (admin lista/sincroniza planos com MP)
  - GET/PATCH /api/admin-sistema/assinaturas (admin lista/altera status de assinaturas)
- Criada página /planos com PlanosClient (cards de planos, cálculo de economia, dialog de confirmação, redirecionamento ao checkout MP)
- Criada página /assinatura com AssinaturaClient (status da assinatura, cancelamento, histórico de pagamentos)
- Adicionada tab "Assinaturas" no admin-sistema com 2 sub-tabs: lista de assinaturas + sincronização de planos com MP
- Adicionado botão "Planos" no header da página /projetos
- Atualizado middleware para proteger /planos e /assinatura
- Lint passa (2 erros restantes são preexistentes, não relacionados)

Stage Summary:
- Integração completa Mercado Pago implementada (SDK, API routes, páginas, admin)
- Webhook processa automaticamente: pagamentos aprovados ativam assinaturas, status sincronizados
- Admin pode: sincronizar planos com MP, alterar status manualmente, ver todas assinaturas
- Usuário pode: ver planos, assinar, gerenciar/cancelar assinatura, ver histórico
- **AÇÕES NECESSÁRIAS (manual pelo admin)**:
  1. Rodar migration-subscriptions.sql no Supabase SQL Editor
  2. Configurar MERCADOPAGO_ACCESS_TOKEN no .env
  3. Configurar MERCADOPAGO_WEBHOOK_SECRET no .env
  4. No painel admin → tab Assinaturas → sincronizar cada plano com MP
  5. Configurar webhook no painel do Mercado Pago apontando para /api/webhooks/mercadopago
