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

---
Task ID: 5
Agent: main
Task: Auditoria completa de segurança, confiabilidade, integridade e performance - Integração Mercado Pago

Work Log:
- Lidos todos os 9 arquivos de código da integração MP (mercadopago.ts, 7 API routes, 1 migration SQL)
- Lidos 3 arquivos de frontend (PlanosClient, AssinaturaClient, AdminSistemaClient)
- Lidos admin-auth.ts, middleware.ts, supabase/admin.ts
- Identificados 2 vulnerabilidades CRÍTICAS, 5 ALTAS, 7 MÉDIAS, 5 BAIXAS/INFORMATIVAS
- Gerado relatório PDF completo com 14 seções (auditoria-mercadopago-seguranca.pdf)
- Correções implementadas no código:
  - webhooks/mercadopago/route.ts: Removido bypass isDev, adicionado idempotência via webhook_events, máquina de estados, validação de valor, remoção de payer.email dos detalhes, calculo de data_fim com meses reais
  - subscriptions/cancel/route.ts: Cancelamento atômico (só cancela local se MP confirmar)
  - admin-sistema/assinaturas/route.ts: Máquina de estados no PATCH, exigência de motivo para ativar
  - admin-sistema/planos/route.ts: Validação de entradas (comprimento, tipo, limites)
  - migration-subscriptions.sql: Tabela webhook_events + partial unique index idx_one_active_sub_per_user + índices

Stage Summary:
- Veredicto: NÃO APROVADO PARA PRODUÇÃO (bloqueadores P0 precisam de execução de migration SQL)
- Correções P0+P1 implementadas no código
- **AÇÕES NECESSÁRIAS**: Re-executar migration-subscriptions.sql atualizado no Supabase (inclui webhook_events + partial unique index)

---
Task ID: 3
Agent: main
Task: Corrigir erro 500 ao sincronizar planos com MP + desbloquear usuários legados

Work Log:
- Investigado erro 500 na sincronização de planos com Mercado Pago
- Causa provável: NEXT_PUBLIC_APP_URL ou MERCADOPAGO_ACCESS_TOKEN não configurados, ou erro da API do MP sendo engolido
- Melhorado tratamento de erros em createMpPlan() (mercadopago.ts): captura detalhes do erro da API MP, valida back_url
- Melhorado catch block da rota POST /api/admin-sistema/planos: retorna 503 para APP_URL faltando, 502 para erros da API MP
- Analisado fluxo de login (page.tsx) e middleware: usuários legados com subscription_status='none' NÃO deveriam ser bloqueados
- Migration usa DEFAULT 'none', código trata NULL→'none', middleware permite passar sem cookie
- Criado endpoint POST /api/admin-sistema/assinaturas/fix-legacy para correção em massa de usuários bloqueados
- Criado script SQL fix-legacy-subscriptions.sql para correção de emergência direto no Supabase
- Adicionado botão "Corrigir legados" no painel admin (aba Assinaturas)
- Adicionado mensagem de suporte para usuários legados na tela /aguardando-pagamento
- Endpoint de ativação manual (/api/admin-sistema/assinaturas/activate) já existia e funciona

Stage Summary:
- Erro 500: agora retorna mensagens detalhadas (502/503) em vez de genérico 500
- Usuários legados: 3 opções de correção disponíveis (botão admin, API fix-legacy, SQL direto)
- Ações necessárias: configurar NEXT_PUBLIC_APP_URL e MERCADOPAGO_ACCESS_TOKEN no Vercel
