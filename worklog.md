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

---
Task ID: 5
Agent: main
Task: Otimizações UX/UI/Performance na página simulador-moment

Work Log:
- Lido arquivo completo src/app/simulador-moment/page.tsx (~873 linhas)
- Aplicadas 12 otimizações cirúrgicas via Edit tool:
  1. Header mobile: h-16 → h-14 sm:h-16 (menor altura no mobile)
  2. Subtítulo: adicionado text-xs sm:text-sm para escala mobile
  3. Layout desktop: grid-cols-2 → grid-cols-5 (60/40 split com lg:col-span-3 / lg:col-span-2)
  4. Summary card: adicionado lg:sticky lg:top-4 lg:self-start (sticky no desktop)
  5. custom-scrollbar → sim-scrollbar (classe global do globals.css)
  6. Tab bar: adicionado sim-tab-scroll + scrollbar-width:none inline style
  7. Radio buttons INCC: flex items-center min-h-[44px] cursor-pointer → sim-radio-label
  8. Summary values: text-xl font-bold → text-lg sm:text-xl font-bold
  9. Schedule table: max-h-96 → max-h-72 sm:max-h-96
 10. Form spacing: space-y-5 → space-y-4
 11. Progress bar: adicionado will-change-transform para GPU acceleration
 12. Info banners: envolvidos em flex flex-col sm:flex-row gap-3
 13. Footer: py-6 → py-4 sm:py-6

Stage Summary:
- Nenhuma lógica de negócio, cálculo, constante ou gerenciamento de estado foi alterado
- Nenhuma funcionalidade foi removida
- Estrutura de exportação (SimuladorMomentPage + Suspense) preservada
- Compilação TypeScript sem erros no arquivo
- Verificado: custom-scrollbar=0, min-h-[44px]=0, space-y-5=0 (todos substituídos)

---
Task ID: 6-a
Agent: sub-agent (general-purpose)
Task: Otimizações UX/UI/Performance na página simulador-venice-park

Work Log:
- Lido arquivo completo src/app/simulador-venice-park/page.tsx (~1339 linhas)
- Aplicadas 11 otimizações cirúrgicas via MultiEdit + Edit:
  1. Header mobile: subtítulo adicionado text-xs sm:text-sm para escala mobile
  2. Layout desktop: grid-cols-2 → grid-cols-5 (60/40 split com lg:col-span-3 / lg:col-span-2)
  3. Summary card: adicionado lg:sticky lg:top-4 lg:self-start (sticky no desktop)
  4. custom-scrollbar → sim-scrollbar: N/A (nenhuma instância encontrada no arquivo)
  5. Tab bar: adicionado sim-tab-scroll + scrollbarWidth:'none' inline style
  6. Radio buttons INCC: flex items-center min-h-[44px] cursor-pointer → sim-radio-label (4 instâncias)
  7. Summary values: text-xl font-bold → text-lg sm:text-xl font-bold (2 instâncias)
  8. Schedule table: max-h-96 → max-h-72 sm:max-h-96: N/A (nenhuma instância encontrada no arquivo)
  9. Form spacing: space-y-5 → space-y-4
  10. Progress bar: adicionado will-change-transform para GPU acceleration
  11. Info banners (auto-calc + delivery): envolvidos em flex flex-col sm:flex-row gap-3
  12. Footer: py-6 → py-4 sm:py-6
  13. Step indicator: label text-[10px] sm:text-xs, connector w-4 → w-2 sm:w-16

Stage Summary:
- Nenhuma lógica de negócio, cálculo, constante ou gerenciamento de estado foi alterado
- Nenhuma funcionalidade foi removida
- PDF generation function e INCC API fetching não foram modificados
- Estrutura de exportação (SimuladorVeniceParkPage + Suspense) preservada
- Compilação TypeScript sem erros novos no arquivo (erros preexistentes do jspdf-autotable permanecem)
- Verificado: min-h-[44px]=0, space-y-5=0, custom-scrollbar=0, max-h-96=0 (todos substituídos ou inexistentes)

---
Task ID: 6-b
Agent: sub-agent (general-purpose)
Task: Optimize simulador-vitta page — 12 UX/UI/performance optimizations
Status: completed
Changes applied to src/app/simulador-vitta/page.tsx:
1. ✅ Mobile header: subtitle now uses `text-xs sm:text-sm` for responsive scaling
2. ✅ Desktop layout: grid changed from `lg:grid-cols-2` → `lg:grid-cols-5` with `lg:col-span-3`/`lg:col-span-2` (60/40 split)
3. ✅ Sticky summary card: added `lg:sticky lg:top-4 lg:self-start` to the dark gradient summary card
4. ⏭️ custom-scrollbar → sim-scrollbar: no `custom-scrollbar` instances existed in file; added `sim-scrollbar` to schedule table scroll area (optimization 8)
5. ✅ Mobile tabs: added `sim-tab-scroll` class and `style={{ scrollbarWidth: 'none' }}` to tab bar
6. ✅ INCC radio buttons: replaced `flex items-center min-h-[44px] cursor-pointer` with `sim-radio-label` (4 labels)
7. ✅ Summary card data density: `text-xl font-bold` → `text-lg sm:text-xl font-bold` for property values
8. ✅ Schedule table mobile UX: `max-h-80` → `max-h-72 sm:max-h-96` + `sim-scrollbar` class
9. ✅ Form input spacing: `space-y-5` → `space-y-4`
10. ✅ Progress bar GPU: added `will-change-transform` to progress bar inner div
11. ✅ Info banners: wrapped "Cálculo automático" and delivery info banners in `flex flex-col sm:flex-row gap-3` container
12. ⏭️ Footer py-6 → py-4 sm:py-6: no footer element exists in this file; skipped

Verification:
- TypeScript: zero errors from simulador-vitta/page.tsx (only pre-existing node_modules errors)
- All business logic, calculations, constants, state management, PDF generation, and INCC fetching unchanged
- No features or UI elements removed

---
Task ID: 6-c
Agent: sub-agent (general-purpose)
Task: Optimize simulador-villa-bianco page — 13 UX/UI/performance optimizations
Status: completed
Changes applied to src/app/simulador-villa-bianco/page.tsx:
1. ✅ Mobile header: subtitle now uses `text-xs sm:text-sm` for responsive scaling
2. ✅ Desktop layout: grid changed from `lg:grid-cols-2` → `lg:grid-cols-5` with `lg:col-span-3`/`lg:col-span-2` (60/40 split)
3. ✅ Sticky summary card: added `lg:sticky lg:top-4 lg:self-start` to the dark gradient summary card
4. ✅ custom-scrollbar → sim-scrollbar: 1 instance replaced in schedule table scroll area
5. ✅ Mobile tabs: added `sim-tab-scroll` class and `style={{ scrollbarWidth: 'none' }}` to tab bar
6. ✅ INCC radio buttons: replaced `flex items-center min-h-[44px] cursor-pointer` with `sim-radio-label` (4 labels)
7. ✅ Summary card data density: `text-xl font-bold` → `text-lg sm:text-xl font-bold` for property values (2 instances)
8. ✅ Schedule table mobile UX: `max-h-96` → `max-h-72 sm:max-h-96`
9. ✅ Form input spacing: `space-y-5` → `space-y-4`
10. ✅ Progress bar GPU: added `will-change-transform` to progress bar inner div
11. ✅ Info banners: wrapped "Cálculo automático" and delivery info banners in `flex flex-col sm:flex-row gap-3` container
12. ✅ Footer: `py-6` → `py-4 sm:py-6`
13. ✅ Step indicator: label `text-xs` → `text-[10px] sm:text-xs`, connector `w-4 sm:w-16` → `w-2 sm:w-16`

Verification:
- TypeScript: zero new errors from simulador-villa-bianco/page.tsx (only pre-existing node_modules/jspdf errors)
- All business logic, calculations, constants, state management, PDF generation, and INCC fetching unchanged
- No features or UI elements removed
- Verified: custom-scrollbar=0, min-h-[44px] cursor-pointer=0 (all replaced)

---
Task ID: S3-P1
Agent: security-auditor
Task: Full Security Audit - Part 1 (Authentication, Authorization, Environment Variables)

## Audit Scope
- 50+ source files read completely
- All authentication flows (middleware, Supabase clients, admin auth, MFA setup/verify)
- All authorization checks (admin-sistema/*, admin/*, subscription, units, download, cupons)
- All environment variable usage across src/
- Focus: find NEW vulnerabilities, confirm old fixes, identify deeper issues

## CONFIRMED FIXES (No Regressions)

| Fix ID | Status | Description |
|--------|--------|-------------|
| SEC-003/004 | ✅ CONFIRMED | subscription_status cookie validated against allowlist in middleware.ts:7,117. Forged values outside allowlist fall through safely. |
| SEC-007 | ✅ CONFIRMED | Rate limiting applied on /api/signup-subscribe (5/min/IP) and /api/cupons/validate (10/min/IP). Returns 429 with Retry-After header. |
| SEC-006 | ✅ CONFIRMED | /api/init-schema now requires requireAdminSistema() instead of any auth. |

## NEW FINDINGS

### CRITICAL

S3-P1-001 | CRITICAL | Authentication | src/app/page.tsx:148 + src/middleware.ts:86-94 | **MFA Bypass via Client-Side Cookie Manipulation** | Complete MFA bypass for any account with MFA enabled. An attacker with valid session credentials can skip MFA verification entirely and access all protected resources. | **Exploit**: (1) Attacker obtains valid Supabase session cookie via XSS, session theft, or credential stuffing. (2) Instead of going through the normal login flow (which sets `mfa_pending` cookie via `document.cookie`), attacker calls API endpoints directly using only the Supabase session cookie. (3) The `mfa_pending` cookie is set CLIENT-SIDE via JavaScript (`document.cookie = "mfa_pending=1; ..."`), is NOT `httpOnly`, and is NOT set by any server-side code. (4) The middleware only enforces MFA redirect when `mfa_pending` cookie EXISTS. Without it, the check at middleware.ts:89 (`if (mfaPending && !mfaVerified)`) passes through. (5) API endpoints (e.g., /api/empreendimentos, /api/units, all /api/admin-sistema/*) only check `supabase.auth.getUser()` — they do NOT verify MFA completion. **Root cause**: MFA enforcement is split between client-side cookie setting (page.tsx:148) and middleware page-level redirect (middleware.ts:89), with NO server-side enforcement at the API layer.

S3-P1-002 | CRITICAL | Authentication | src/app/page.tsx:153-156 | **MFA & Subscription Bypass via Login Error Path** | Any error during the login flow profile fetch results in direct redirect to dashboard, completely bypassing MFA and subscription checks. | **Exploit**: (1) Trigger an error during login flow profile fetch (e.g., RLS policy temporarily blocks read, network timeout, column mismatch). (2) The catch block at page.tsx:153-156 redirects to `/admin-sistema` or `/projetos` without setting `mfa_pending` or `subscription_status` cookies. (3) The middleware allows access because no blocking cookies exist.

### HIGH

S3-P1-003 | HIGH | Authorization | src/app/api/units/route.ts:24-43, src/app/api/villa-bianco-units/route.ts:24-44, src/app/api/vitta-units/route.ts:17-43, src/app/api/moment-units/route.ts:17-36 | **Unauthenticated Access to All Unit Data Including Pricing** | GET endpoints for all unit tables require NO authentication. Anyone can read all unit data including `valor_venda` (sale price), status, floor plans, and availability. The middleware explicitly passes all `/api/` routes through without checks (middleware.ts:29-33). | **Exploit**: `curl https://target.com/api/units` returns all units with prices. `curl https://target.com/api/villa-bianco-units` returns all Villa Bianco units. No auth token needed. Competitors can scrape all pricing and availability data.

S3-P1-004 | HIGH | Authorization | src/app/api/download/route.ts:7-20 | **Unauthenticated File Download** | The /api/download endpoint serves a static zip file without any authentication check. | **Exploit**: `curl -o projeto.zip https://target.com/api/download` downloads the file without any session token. Could contain sensitive project documentation or data.

### MEDIUM

S3-P1-005 | MEDIUM | Defense-in-Depth | src/middleware.ts:89 + all API routes | **MFA Not Enforced at API Layer** | No API endpoint checks whether MFA was completed before serving protected data. The `mfa_verified` cookie (set httpOnly in TOTP verify and WebAuthn verify) is never checked by any API handler. This means even if `mfa_pending` were set server-side, an attacker with a valid session could call APIs directly and skip MFA. | **Exploit**: Obtain session cookie via any means, call any protected API endpoint. The API returns data because it only checks `getUser()`.

S3-P1-006 | MEDIUM | Information Disclosure | src/app/api/mfa/totp/verify/route.ts:134-138, src/app/api/mfa/totp/setup/route.ts:58-62, src/app/api/mfa/webauthn/register/begin/route.ts:47-50, src/app/api/mfa/webauthn/register/finish/route.ts:99-103, src/app/api/mfa/webauthn/authenticate/begin/route.ts:51-56, src/app/api/mfa/webauthn/authenticate/finish/route.ts:148-152, src/app/api/first-login/change-password/route.ts:74-75, src/app/api/admin-sistema/users/create/route.ts:76-79, src/app/api/admin-sistema/empreendimentos/upload-image/route.ts:146-148 | **Internal Error Message Leakage** | Multiple endpoints expose `err.message` directly to clients in 500 error responses. Pattern: `{ error: \`Erro interno: ${msg}\` }` or `{ error: msg }`. These messages can reveal internal paths, database errors, Supabase configuration details, and stack information. | **Exploit**: Send malformed requests to trigger errors. Parse error responses to gather internal implementation details (e.g., Supabase error codes, table names, column names, RPC function names).

S3-P1-007 | MEDIUM | Information Disclosure | src/app/api/admin-sistema/setup-storage/route.ts:36-38 | **Storage Bucket Error Detail Leak** | When storage bucket creation fails, the error message includes the actual Supabase error: `{ error: \`Não foi possível criar o bucket automaticamente. Erro: ${insertErr.message}\` }`. This can reveal Supabase storage configuration details. | **Exploit**: Send repeated POST requests to trigger error conditions. Extract Supabase internal error messages from responses.

S3-P1-008 | MEDIUM | Authentication | src/app/api/mfa/disable/route.ts:6-54 | **MFA Disable Without Re-Authentication** | The MFA disable endpoint only requires a valid session. It does NOT require TOTP verification, password re-entry, or WebAuthn challenge before disabling MFA. An attacker with a stolen or hijacked session can disable MFA with a single POST request. | **Exploit**: `POST /api/mfa/disable` with valid session cookie. MFA is completely removed. Attacker can then register their own TOTP or passkey.

S3-P1-009 | MEDIUM | Rate Limiting | src/lib/rate-limit.ts (in-memory) + src/app/api/signup-subscribe/route.ts:40, src/app/api/cupons/validate/route.ts:17 | **In-Memory Rate Limiting Ineffective in Serverless** | Rate limiting uses an in-memory Map. In Vercel's serverless environment, each cold start creates a new instance with empty rate limit state. An attacker can bypass rate limits by: (1) distributing requests across instances via headers, (2) triggering cold starts between requests, (3) simply waiting for instance recycling. The rate limit is per-instance, not per-global. | **Exploit**: Enumerate coupon codes by sending requests with slight delays to trigger cold starts. Each cold start gets a fresh 10-requests allowance. Or use multiple IPs/proxies to bypass per-IP limiting.

S3-P1-010 | MEDIUM | Authentication | src/app/page.tsx:75,82 | **First-Login Cookies Not httpOnly** | The `first_login_step` cookie is set client-side via `document.cookie` at page.tsx:75 and page.tsx:82. It's NOT httpOnly, allowing JavaScript access and modification. | **Exploit**: Any XSS vulnerability could modify `first_login_step` cookie to skip the change-password or MFA setup steps. Also, the `subscription_status` cookie at page.tsx:113 and page.tsx:128 is set client-side without httpOnly — while the middleware validates it against an allowlist, setting it client-side means the value could be manipulated before the middleware reads it.

S3-P1-011 | MEDIUM | Authorization | src/app/page.tsx:112-113 | **Admin Subscription Status Forged Client-Side** | The admin subscription cookie is set client-side: `document.cookie = "subscription_status=active; ..."`. While the middleware's allowlist (SEC-003/004 fix) prevents forged values from triggering the "pending" redirect, forged values like "active" or "lifetime" are silently accepted. Since the middleware only redirects to `/aguardando-pagamento` when the cookie is "pending", any other value (including forged ones) results in allowing access. | **Exploit**: Set `subscription_status=active` via document.cookie on any authenticated user's session. The middleware allows access because "active" is in the allowlist but doesn't trigger the pending redirect. The APIs may catch this server-side, but all page-level access is granted.

S3-P1-012 | MEDIUM | WebAuthn | src/lib/mfa/webauthn.ts:206-227 | **WebAuthn Challenge Store In-Memory in Serverless** | The WebAuthn challenge store is an in-memory Map with 5-minute TTL. In serverless (Vercel), challenges stored on one instance are not available on another. If a user's registration/authenticate begin hits instance A and the finish hits instance B, the challenge is not found and the operation fails. This degrades WebAuthn reliability. While not directly exploitable for authentication bypass (the challenge IS consumed and verified if on the same instance), it could be used to cause denial of service. | **Exploit**: No direct security bypass, but an attacker could cause WebAuthn to consistently fail for users by manipulating routing, forcing them to fall back to TOTP. Combined with a TOTP secret leak, this could enable account takeover.

S3-P1-013 | MEDIUM | Authorization | src/app/api/cupons/validate/route.ts:14-128 | **Coupon Code Enumeration Without Auth** | The coupon validation endpoint requires no authentication and allows checking whether any coupon code exists and is valid. With 10 requests/minute per IP, an attacker can enumerate 600 codes/hour. If codes follow patterns (e.g., PROMO10, WELCOME20), enumeration is trivial. | **Exploit**: Write a script to systematically test coupon codes. Use common patterns and brute-force short codes. Rate limit can be bypassed with multiple IPs.

### LOW

S3-P1-014 | LOW | Information Disclosure | src/app/api/admin-sistema/users/create/route.ts:72 | **Temporary Password Returned in API Response** | The admin user creation endpoint returns the temporary password in the HTTP response body: `{ tempPassword }`. While this is functionally necessary, the password exists in HTTP logs, browser history, and potentially proxy logs. | **Mitigate**: Use a different channel (email) to deliver temporary passwords, or require the admin to click a one-time link to view it.

S3-P1-015 | LOW | Security Headers | Multiple API routes | **Missing Security Headers** | API responses don't set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`, or `Cache-Control: no-store` headers. The Supabase anon key in `NEXT_PUBLIC_SUPABASE_ANON_KEY` could be cached by CDN proxies. | **Mitigate**: Add security headers via Next.js middleware or a `headers()` export in route files.

S3-P1-016 | LOW | Input Validation | src/app/api/admin-sistema/users/create/route.ts:22-23 | **Weak Email Validation** | Email validation is minimal: `if (!email || !email.includes("@"))`. This allows emails like `foo@`, `@@`, or `user@.com`. While Supabase Auth will reject invalid emails, the error is caught and a generic message is returned, wasting an admin API call. | **Mitigate**: Use proper email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.

S3-P1-017 | LOW | Environment Variables | Multiple files | **ADMIN_EMAILS Env Var Not Prefixed** | `ADMIN_EMAILS` is used in server components and API routes without the `NEXT_PUBLIC_` prefix. While this is safe in Next.js Server Components (env vars are only exposed to the client when prefixed with `NEXT_PUBLIC_`), it's inconsistent with the project's naming convention. |

S3-P1-018 | LOW | TOTP | src/lib/mfa/totp.ts:5 | **TOTP Window Acceptable** | The TOTP verification window is set to 1 (±30 seconds). This is within acceptable security standards (NIST allows window 1-2). No action needed, documented for completeness.

## ENVIRONMENT VARIABLE CLASSIFICATION

| Variable | Classification | Used In | Notes |
|----------|---------------|---------|-------|
| NEXT_PUBLIC_SUPABASE_URL | PUBLIC (safe) | client.ts, server.ts, admin.ts, admin-auth.ts | Exposed to client bundle by design |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | PUBLIC (safe) | client.ts, server.ts | Exposed to client bundle by design |
| NEXT_PUBLIC_APP_URL | PUBLIC (safe) | mercadopago.ts, webauthn.ts | Exposed to client bundle by design |
| SUPABASE_SERVICE_ROLE_KEY | SECRET | admin.ts | Server-only. Bypasses RLS. ✅ No client access |
| MERCADOPAGO_ACCESS_TOKEN | SECRET | mercadopago.ts | Server-only. Payment API access. ✅ No client access |
| MERCADOPAGO_WEBHOOK_SECRET | SECRET | mercadopago.ts | Server-only. Webhook signature verification. ✅ No client access |
| RESEND_API_KEY | SECRET | mfa/email.ts | Server-only. Email service access. ✅ No client access |
| SEED_ADMIN_EMAIL | PRIVATE | admin-sistema/seed-admin/route.ts | Server-only. Admin user email |
| SEED_ADMIN_PASSWORD | SECRET | admin-sistema/seed-admin/route.ts | Server-only. Admin initial password |
| ADMIN_EMAILS | PRIVATE | units/villa-bianco/moment routes, page.tsx files | Server components only (not "use client"). ✅ Safe |
| WEBAUTHN_RP_ID | PRIVATE | mfa/webauthn.ts | Server-only module. ✅ No client access |
| WEBAUTHN_RP_NAME | PRIVATE | mfa/webauthn.ts | Server-only module. ✅ No client access |
| WEBAUTHN_ORIGIN | PRIVATE | mfa/webauthn.ts | Server-only module. ✅ No client access |

**Classification Summary**: No SECRET variables are exposed to client-side code. All process.env.* usage in "use client" components exclusively uses NEXT_PUBLIC_* prefixed variables.

## SUMMARY OF FINDINGS BY SEVERITY

| Severity | Count | IDs |
|----------|-------|-----|
| CRITICAL | 2 | S3-P1-001, S3-P1-002 |
| HIGH | 2 | S3-P1-003, S3-P1-004 |
| MEDIUM | 9 | S3-P1-005 through S3-P1-013 |
| LOW | 5 | S3-P1-014 through S3-P1-018 |

## PRIORITY REMEDIATION RECOMMENDATIONS

1. **S3-P1-001 (CRITICAL)**: Move `mfa_pending` cookie setting to server-side. Create a login API endpoint that: (a) authenticates user, (b) checks MFA status from DB, (c) if MFA enabled, sets `mfa_pending` cookie as httpOnly via server response, (d) returns redirect info. Additionally, add MFA verification check to all protected API endpoints.

2. **S3-P1-002 (CRITICAL)**: In the login error catch block (page.tsx:153), do NOT redirect to dashboard. Instead, redirect to login page or a safe default page with an error message.

3. **S3-P1-003 (HIGH)**: Add `supabase.auth.getUser()` check to GET endpoints for unit data, or accept the risk if this is intentionally public data.

4. **S3-P1-004 (HIGH)**: Add authentication check to /api/download route.

5. **S3-P1-005 (MEDIUM)**: Add `mfa_verified` cookie check (httpOnly) to protected API endpoints as defense-in-depth.

6. **S3-P1-006 (MEDIUM)**: Replace all `err.message` leaks with generic error messages. Log details server-side only.

7. **S3-P1-008 (MEDIUM)**: Require TOTP/password verification before allowing MFA disable.

---
Task ID: S3-P2
Agent: security-auditor
Task: Security Audit Part 2 — Injection/XSS/SSRF, Business Logic, RLS, Frontend

## FINDINGS

```
S3-P2-001 | CRITICAL | PRIVILEGE_ESCALATION | supabase/migration-first-login-flow.sql:44 + supabase/schema-admin.sql:41 | SECURITY DEFINER trigger `handle_new_user()` blindly trusts `raw_user_meta_data->>'role'` from user signup metadata. An attacker can call `supabase.auth.signUp({ options: { data: { role: 'admin_sistema' } } })` via the public Supabase client (NEXT_PUBLIC_ keys) to get admin role on profile creation. | Full admin access: create users, grant lifetime, manage all plans/subscriptions, read all data. | Open browser console on any page → call supabase.auth.signUp with role=admin_sistema in metadata → confirm email → log in → access all /api/admin-sistema/ endpoints.
```

```
S3-P2-002 | HIGH | RLS_BYPASS | supabase/migration-storage-rls-fix.sql:26-41 | Storage bucket policies were RE-DOWNGRADED: migration-storage-rls-fix.sql DROPPED the admin role checks from migration-security-fixes.sql and replaced with `WITH CHECK (bucket_id = 'empreendimentos')` only. Any authenticated (or anon) user can upload/replace/delete files in the 'empreendimentos' bucket. | Unauthorized file upload, replacement, or deletion of property images. Potential for malicious content hosting. | Authenticated user calls Supabase Storage API directly → uploads arbitrary file to 'empreendimentos' bucket → replaces legitimate property images.
```

```
S3-P2-003 | HIGH | RLS_BYPASS | supabase/migration-mfa.sql:69 | `user_login_events` table has INSERT policy `WITH CHECK (true)` — any user (including unauthenticated via anon key) can insert fake login events for any user_id, polluting security audit logs. | Attacker can inject false login events (fake IPs, fake user agents, false new_device flags) to desensitize admins to real security alerts. | POST to Supabase REST API /rest/v1/user_login_events with anon key → insert {user_id: 'target-uuid', ip: '1.2.3.4', is_new_device: true} → admin sees false alert.
```

```
S3-P2-004 | MEDIUM | MISSING_AUTH | src/app/api/download/route.ts:7 | GET /api/download has NO authentication. Anyone can download `download/projeto.zip` from the server filesystem. | Unauthorized download of what appears to be a project distribution file. If it contains source code or proprietary data, this is a data leak. | curl https://app.example.com/api/download → receives projeto.zip without any auth.
```

```
S3-P2-005 | MEDIUM | BUSINESS_LOGIC | src/app/api/subscriptions/cancel/route.ts:33-46 | Idempotent success response for already-cancelled subscriptions leaks information: an attacker can probe whether a user has a cancelled subscription by calling the cancel endpoint. Additionally, the cancel route only checks for 'active' status — a user with 'pending' subscription cannot cancel it, forcing them to wait for expiry. | Information disclosure about subscription status; poor UX where users can't cancel pending subscriptions. | Send POST to /api/subscriptions/cancel for any user ID (if session is hijacked) → response reveals subscription state.
```

```
S3-P2-006 | MEDIUM | BUSINESS_LOGIC | src/app/api/admin-sistema/assinaturas/route.ts:177-180 | PATCH /api/admin-sistema/assinaturas does NOT use CAS (Compare-And-Swap) on the UPDATE. It reads the current status, validates the transition in application code, then does a bare `.eq('id', assinaturaId)` update. Race condition with webhook could allow invalid state transitions (e.g., expired→active). | Invalid state transitions bypassing business rules. | Two concurrent requests: webhook changes status to 'expired' while admin PATCH reads 'active' → admin PATCH overwrites with 'active' (invalid: expired→active not allowed).
```

```
S3-P2-007 | MEDIUM | BUSINESS_LOGIC | src/app/api/admin-sistema/users/route.ts:106-111 | PATCH /api/admin-sistema/users uses `createClient()` (user-scoped, respects RLS) instead of `createAdminClient()` (service_role) to update the role. If the target user's profile has RLS that blocks UPDATE for non-self users (profiles_update_own_mfa policy only allows own updates), the update may fail silently or be blocked. This is inconsistent with other admin endpoints that use adminClient. | Admin may be unable to change user roles via the admin panel, or the role change may only work if RLS policies permit cross-user updates. | Admin tries to change user's role → RLS blocks update because profiles_update_own_mfa only allows auth.uid()=id → role change silently fails.
```

```
S3-P2-008 | MEDIUM | INPUT_VALIDATION | src/app/api/admin-sistema/empreendimentos/upload-image/route.ts:56,72 | `empreendimentoId` from formData is used directly in filename construction (`${empreendimentoId}${saveExt}`) without UUID format validation. While Supabase Storage may normalize paths, a crafted ID like `../../other-bucket/file` could theoretically cause unexpected behavior. Additionally, no magic bytes validation is performed — only MIME type and extension are checked, which can both be spoofed. | Path traversal in storage filename; upload of non-image files disguised with valid extension/MIME. | POST with empreendimentoId="../../public" and file named shell.jpg (actually a PHP webshell) → stored as ../../public/shell.jpg in storage.
```

```
S3-P2-009 | MEDIUM | INPUT_VALIDATION | src/app/api/admin-sistema/empreendimentos/upload-image/route.ts:56 | File upload lacks magic bytes validation. Only Content-Type header and file extension are checked. An attacker can upload a polyglot file (e.g., a valid JPEG with embedded JavaScript) that passes MIME/extension checks but contains malicious content. If the file is served with the correct Content-Type by a CDN/browser, XSS is possible when the image is loaded in an SVG context. | Stored XSS via polyglot image file if served in an SVG/img context that renders embedded scripts. | Upload a JPEG with embedded `<script>` tag as an SVG → if CDN serves it as image/svg+xml, script executes.
```

```
S3-P2-010 | MEDIUM | RLS_INCONSISTENCY | supabase/migration-security-fixes.sql vs schema-moment.sql/schema-villa-bianco.sql/schema-vitta.sql | Legacy schema files (schema-moment.sql, schema-villa-bianco.sql, schema-vitta.sql) still contain the OLD vulnerable RLS policies (UPDATE USING auth.role()='authenticated', missing INSERT/DELETE policies). If migration-security-fixes.sql was NOT executed, these tables remain vulnerable. No migration guard prevents re-running the old schemas. | Any authenticated user can UPDATE legacy unit tables if the fix migration wasn't applied. | Authenticated user sends PATCH to update moment_units status → succeeds if old policies are in place.
```

```
S3-P2-011 | MEDIUM | BUSINESS_LOGIC | src/app/api/signup-subscribe/route.ts:150-155 | Signup-subscribe creates profile with `role: 'user'` which does NOT pass the CHECK constraint `role IN ('comum', 'coordenador', 'admin_sistema')`. The error is silently ignored ("Continuar — o trigger do Supabase pode ter criado o perfil"). The SECURITY DEFINER trigger creates the profile with role='coordenador' (higher privilege than intended 'comum'). New signup users get coordenador role instead of comum. | All users created via signup-subscribe get 'coordenador' role, which may have unintended access to update projeto_units and legacy unit tables. | User signs up via plan checkout → profile created with role='coordenador' (from trigger fallback) instead of 'comum' → can update unit data if UPDATE policy checks for coordenador role.
```

```
S3-P2-012 | LOW | INFORMATION_DISCLOSURE | src/app/api/admin-sistema/empreendimentos/upload-image/route.ts:146-147 | Error messages include internal details: `Erro interno: ${msg}` leaks the original Error.message to the client. This could expose internal paths, library versions, or database error details. | Information leakage aids attackers in understanding the system internals. | Trigger an error (e.g., invalid file) → response contains full internal error message.
```

```
S3-P2-013 | LOW | INFORMATION_DISCLOSURE | src/app/api/admin-sistema/users/create/route.ts:77 | On error, returns `err.message` directly to client, potentially leaking internal error details from Supabase Auth admin API. | Information leakage about internal auth system. | Send malformed request → error response contains Supabase internal error details.
```

```
S3-P2-014 | LOW | BUSINESS_LOGIC | src/app/api/cupons/validate/route.ts:44 | Coupon validation uses `createAdminClient()` (service_role, bypasses RLS) to look up coupons. This is correct for functionality but means the rate limiter (in-memory, per-instance) is the only protection against coupon enumeration. In Vercel serverless, each cold start gets a fresh rate limit store. | Attacker can enumerate valid coupon codes across multiple serverless instances. | Send 10 requests/minute from different IPs or wait for cold starts → brute-force coupon codes at ~10 codes/min per IP.
```

```
S3-P2-015 | LOW | MISSING_AUTH | src/app/api/incc/route.ts:444 | GET /api/incc has no authentication. While INCC data is not sensitive, it makes outbound SSRF-like fetch requests to brasilindicadores.com.br and api.bcb.gov.br. No user input controls the URLs (they're hardcoded), so this is not exploitable for SSRF, but the endpoint is unauthenticated. | Low risk — INCC data is publicly available anyway. No SSRF possible since URLs are hardcoded. | N/A — this is informational.
```

## REMEDIATION PRIORITY

1. **S3-P2-001 (CRITICAL)**: Immediately fix `handle_new_user()` trigger to NEVER read `role` from user metadata. Hardcode default role to 'comum' or validate against allowlist.

2. **S3-P2-002 (HIGH)**: Re-run migration-security-fixes.sql (or create a new migration) that restores admin_sistema role checks on storage.objects policies for the 'empreendimentos' bucket.

3. **S3-P2-003 (HIGH)**: Change `user_login_events` INSERT policy from `WITH CHECK (true)` to `WITH CHECK (auth.uid() = user_id)` to prevent fake event injection.

4. **S3-P2-004 (MEDIUM)**: Add authentication to /api/download.

5. **S3-P2-006 (MEDIUM)**: Add CAS (`.eq('status', currentStatus)`) to the PATCH /api/admin-sistema/assinaturas UPDATE query.

6. **S3-P2-008 (MEDIUM)**: Add UUID validation for empreendimentoId and magic bytes validation for uploaded files.

7. **S3-P2-011 (MEDIUM)**: Fix signup-subscribe to set role='comum' (a valid value) instead of 'user'. Or fix the trigger to always default to 'comum'.

8. **S3-P2-007 (MEDIUM)**: Use `createAdminClient()` in PATCH /api/admin-sistema/users for consistency.

9. **S3-P2-012, S3-P2-013 (LOW)**: Replace `err.message` leaks with generic error messages.
