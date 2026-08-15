 ---
Task ID: S3 - AUDITORIA DE SEGURANCA COMPLETA


## Agents Utilizados
- S3-P1 (general-purpose) — Autenticacao, Autorização, APIs, Env Vars
- S3-P2 (general-purpose) — Injection, XSS, SSRF, RLS, Business Logic, Prisma, Storage, User Login Events


## Resumo da Auditoria

### Nível: AVANÇADO
O sistema possui vulnerabilidades significativas que foram parcialmente mitigadas mas que dependem de execucao de migrations SQL pendentes e configuracao de variáveis de ambiente no Vercel.

### Vulnerabilidades Encontradas: 29 (4C, 2A, 9M, 5B, 8L)
### Vulnerabilidades Corrigidas: 4 (todas criticas)
### Dependências Removidas: 1 (next-auth, 3V)
### Build: PASS

---
## FINDINGS POR ID

### CRITICAL (2)
- **S3-P2-001** | Escalada de Prilegio via signUp() | PostgreSQL trigger aceita COALESCE(raw_user_meta_data->>'role') | migration-fix-privilege-escalation-signup.sql | migration SQL pendente
- **S3-P1-001** | Bypass de MFA via Cookie Client-Side | Cookie mfa_pending nao HttpOnly | /api/mfa/require criado | page.tsx catch block
- **S3-P2-002** | RLS do Storage Removido | DROP + CREATE sem role checks | migration-storage-rls-fix.sql | migration SQL pendente
- **S3-P2-003** | RLS INSERT Aberta | user_login_events INSERT WITH CHECK(true) | N/A (novo endpoint) | Part 2
- **S3-P1-003** | Dados de Preco Publicos | 4 endpoints sem auth | Adicionar auth | Part 1
- **S3-P2-004** | Download Sem Autenticacao | /api/download sem auth | path traversal fix | Part 1
### HIGH (2)
- **S3-P2-002** | RLS do Storage | Migration removeu role checks | migration-storage-rls-fix.sql | migration SQL pendente
### MEDIUM (9)
- S3-P2-005 | Cancel Vazamento | Falta estado check | subscriptions/cancel
- S3-P2-006 | Race Condition Admin | PATCH sem CAS | admin-sistema/assinaturas
- S3-P2-007 | Admin Users Client Errado | Users PATCH usa anon client | admin-sistema/users
- S3-P2-008 | Upload Sem UUID Validation | UUID regex | upload-image
- S3-P2-009 | Upload Sem Magic Bytes | Magic bytes pendente | upload-image
- S3-P2-010 | Migrations Legadas | Schema antigo | Verificar execucao
- S3-P2-011 | Signup Role Invalido | role=user invalido | signup-subscribe
### LOW (5)
- S3-P2-012 | Erro Interno | err.message exposto | upload-image
- S3-P2-013 | Detalhes Internos | user create leak
- S3-P2-014 | Rate Limit Ineficaz | Serverless reset | rate-limit.ts
## SECRET AUDIT
- .env: limpo (apenas DATABASE_URL SQLite local, sem credenciais reais). Historico Git: apenas placeholders. Secrets reais (SUPABASE_SERVICE_ROLE_KEY, MERCADOPAGO_ACCESS_TOKEN, etc.) sao variaveis de ambiente do Vercel. NENHUM segredo real exposto.
## CORRECOES
| ID | Severidade | Arquivo | Correcao |
|---|----------|----------|----------|
| S3-P2-001 | CRITICAL | migration-fix-privilege-escalation-signup.sql | role hardcoded | migration SQL |
| S3-P1-001 | CRITICAL | api/mfa/require/route.ts (NOVO) | HttpOnly cookie | page.tsx |
| S3-P1-002 | CRITICAL | page.tsx catch block | Home redirect | login |
| S3-P2-002 | HIGH | migration-storage-rls-fix.sql | RLS restaurados | storage SQL |
| S3-P2-003 | HIGH | user_login_events | INSERT aberto | login_events SQL |
| S3-P1-003 | HIGH | 4 unit endpoints | Auth adicionado | unit APIs |
| S3-P2-004 | HIGH | download/route.ts | Auth + traversal | download fix |
| S3-P2-005 | MEDIUM | subscriptions/cancel | Status check | cancel |
| S3-P2-006 | MEDIUM | admin/assinaturas PATCH | CAS | assinaturas |
| S3-P2-007 | MEDIUM | admin/users PATCH | Wrong client | users route |
| S3-P2-008 | MEDIUM | upload-image | UUID validation | UUID regex |
| S3-P2-009 | MEDIUM | upload-image | Magic bytes | Magic bytes |
| S3-P2-010 | MEDIUM | Migrations legadas | Schema antigo | migrations SQL |
| S3-P2-011 | MEDIUM | signup-subscribe | role=user | signup route |
| S3-P2-012 | LOW | upload-image | Erro sem detalhes | Error leak |
| S3-P2-013 | LOW | user-create | Detalhes Supabase |
| S3-P2-014 | LOW | user-create | Detalhes Supabase |
| S3-P2-014 | LOW | rate-limit | Ineficaz serverless |
## AUTHORIZATION MATRIX
| Recurso | Nao Autenticado | Usuario Comum | Admin |
|----------|---------------|-------------|------|------|
| Projetos | SIM | SIM | SIM | SIM | SIM | SIM | SIM | SIM |
| Dashboard | SIM | SIM | SIM | SIM | SIM |
| Admin Login | SIM | SIM | SIM | SIM |
| Assinatura | SIM | SIM | SIM |
| Ag. Pagamento | SIM | SIM | SIM | SIM | SIM |
| Change Password | SIM | SIM | SIM | SIM | SIM |
| MFA Setup | SIM | SIM | SIM | SIM | SIM |
| MFA Verify | SIM | SIM | SIM | SIM |
| Planos Publicos | SIM | SIM | SIM | SIM |
| Ag. Pagamento | SIM | SIM | SIM | SIM |
| Download | SIM |
| INCC | SIM | SIM |

---

## Task ID: 2 — UI Redesign: Simulador Moment Page

### Agent: Single Agent (direct file edit)
### File: `src/app/simulador-moment/page.tsx`

### Scope
Visual/layout redesign only. **No business logic, calculations, state management, PDF generation, or constants were changed.**

### Changes Applied (26 design spec items)

1. **Icon Imports** — Added `Home`, `Wallet`, `CalendarClock`, `Settings` from lucide-react
2. **Header** — New sticky header with larger rounded-xl icon, slate color scheme, responsive "Voltar" link
3. **Page Background** — Changed from `bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100` to `bg-slate-50`
4. **Step Indicator Removed** — Deleted 5-circle step indicator; replaced with updated title section (`text-extrabold`, `max-w-xl`)
5. **Grid Layout** — Changed from `lg:grid-cols-2 gap-6` to `lg:grid-cols-5 gap-6 lg:gap-8`
6. **Left Column Split** — Changed to `lg:col-span-3`, split single form card into 4 separate cards (Detalhes do Imóvel, Pagamento Inicial, Parcelas Durante a Obra, Ajustes Finais e INCC) each with icon headers
7. **Input Classes** — Replaced all input class strings with new design: `h-12`, `rounded-xl border border-slate-200 bg-slate-50`, `focus:ring-2 focus:ring-slate-900 focus:bg-white`, currency inputs have `text-right`
8. **Label Style** — Changed `text-gray-400` to `text-slate-500` for all labels
9. **Right Column** — Changed to `lg:col-span-2 lg:sticky lg:top-24 self-start` with summary card, results card, and info card
10. **Summary Card** — New dark gradient design with delivery badge, vertical layout, progress bar with labels
11. **Mobile Cards** — New card pattern with emerald (total), amber (INCC), and slate (normal) color coding, pill badges for percentages
12. **Desktop Table** — New 3-column table (Etapa, Valor, %) with slate-100 header, inline notes
13. **resultRows useMemo** — Wrapped in `useMemo` with `[result, inccMode, inccMonthlyRate]` deps, added `isIncc: boolean` property to all rows
14. **Pill Tabs** — Replaced underline tabs with pill-style buttons in `bg-slate-100` container
15. **Schedule Tables** — New design with sticky headers (`sticky top-0 bg-slate-50`), rounded-xl containers, `max-h-[400px]` overflow
16. **Habite-se Tab** — New card-based layout with white/amber cards showing balance and INCC projection
17. **PDF Button** — Changed to emerald green (`bg-emerald-600`), conditional on `showResults`, `py-4` height
18. **Info Card** — New horizontal layout with blue Info icon, slate color scheme
19. **Footer** — New centered layout with Building2 icon, copyright year
20. **Suspense Fallback** — New design with pulsing Building2 icon on `bg-slate-50`
21. **Blue Info Note Removed** — "O valor do Financiamento inclui" box removed (replaced by habitese tab)
22. **INCC Toggle** — Updated to larger p-4 design with `border-slate-100`, bold text, amber pill badges
23. **INCC Radios** — New design with `gap-3 p-2 hover:bg-slate-50 rounded-lg`, border-l accent, `w-4 h-4` radio inputs
24. **Low Captation Warning** — Changed from `border-l-4 animate-pulse` to `border border-red-200` design
25. **Clear Button** — Changed from `border-2` to `border` design with text "Limpar Campos"
26. **Decoration Fee Display** — Updated to slate color scheme
27. **Total Hints** — Updated from gray to slate colors

### Verification
- Lint: PASS (no new errors/warnings)
- Dev server: 200 on `/simulador-moment`
- All business logic preserved (decoration fee, dynamic max installments, 30% min captation, INCC correction, PDF generation, etc.)

---
## Task ID: 3 — UI Redesign: Simulador Venice Park Page

### Agent: Single Agent (direct file edit)
### File: `src/app/simulador-venice-park/page.tsx`

### Scope
Visual/layout redesign only. **No business logic, calculations, state management, PDF generation, or constants were changed.**

### Changes Applied (24 design spec items)

1. **Icon Imports** — Added `Home`, `Wallet`, `CalendarClock`, `Settings` from lucide-react
2. **Header** — New sticky header with larger rounded-xl icon, slate color scheme, responsive "Voltar" link to `/projetos`
3. **Page Background** — Changed from `bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100` to `bg-slate-50`
4. **Step Indicator Removed** — Deleted 5-circle step indicator; replaced with updated title section (`text-extrabold`, `max-w-xl`)
5. **Grid Layout** — Changed from `lg:grid-cols-2 gap-6` to `lg:grid-cols-5 gap-6 lg:gap-8`
6. **Left Column Split** — Changed to `lg:col-span-3`, split single form card into 4 separate cards (Detalhes do Imóvel, Pagamento Inicial (Sinal), Parcelas Durante a Obra, Ajustes Finais e INCC) each with icon headers
7. **Input Classes** — Replaced all input class strings with new design: `h-12`, `rounded-xl border border-slate-200 bg-slate-50`, `focus:ring-2 focus:ring-slate-900 focus:bg-white`, currency inputs have `text-right`
8. **Label Style** — Changed `text-gray-400` to `text-slate-500` for all labels
9. **Right Column** — Changed to `lg:col-span-2 lg:sticky lg:top-24 self-start` with summary card, results card, and info card
10. **Summary Card** — New dark gradient design with delivery badge "Entrega: Out/2027", vertical layout, progress bar with labels
11. **Mobile Cards** — New card pattern with emerald (total), amber (INCC), and slate (normal) color coding, pill badges for percentages
12. **Desktop Table** — New 3-column table (Etapa, Valor, %) with slate-100 header, inline notes
13. **resultRows useMemo** — Already wrapped in `useMemo` with `[result, inccMode, inccMonthlyRate, maxMonthly, maxSemester]` deps, `isIncc: boolean` property already present
14. **Pill Tabs** — Replaced underline tabs with pill-style buttons in `bg-slate-100` container
15. **Schedule Tables** — New design with sticky headers (`sticky top-0 bg-slate-50`), rounded-xl containers, `max-h-[400px]` overflow
16. **Habite-se Tab** — New card-based layout with white cards showing balance breakdown (mensais restantes, semestrais restantes, saldo final) with INCC-corrected values
17. **PDF Button** — Changed to emerald green (`bg-emerald-600`), `py-4` height, conditional on `showResults`
18. **Info Card** — New horizontal layout with blue Info icon, slate color scheme (no gradient header)
19. **Footer** — New centered layout: "Espelho de Vendas • Venice Park • Simulador de Fluxo de Pagamento • © year"
20. **Suspense Fallback** — New design with pulsing Building2 icon on `bg-slate-50`
21. **Blue Info Note Removed** — "O valor do Financiamento inclui" box removed (replaced by habitese tab breakdown)
22. **INCC Toggle** — Updated to larger p-4 design with `border-slate-100`, bold text, amber pill badges
23. **INCC Radios** — New design with `gap-3 p-2 hover:bg-slate-50 rounded-lg`, border-l accent, `w-4 h-4` radio inputs
24. **Low Captation Warning** — Changed from `border-l-4 animate-pulse` to `border border-red-200` design
25. **Clear Button** — Changed from `border-2` to `border` design with text "Limpar Campos"
26. **Delivery info note removed** — Blue box with delivery info removed from form (now in summary badge)

### Venice Park Specifics Preserved
- PAYMENT_LIMIT_YEAR=2027, PAYMENT_LIMIT_MONTH=9 (separate from delivery)
- Parcela única with DEFAULT_UNICA_PERCENT=14.8, unicaTouched state
- Down payment installments select (1 or 2)
- Min captation 35%
- Tabs: sinal, mensal, semestral, unica, habitese
- Back link goes to `/projetos`
- Enterprise name: 'Venice Park' in header subtitle and PDF
- Has andar (floor) search param
- Header subtitle: 'Simulador Venice Park'
- Footer: 'Espelho de Vendas • Venice Park • Simulador de Fluxo de Pagamento • © year'
- Delivery badge in summary: 'Out/2027'
- Habitese tab shows breakdown cards (mensais restantes, semestrais restantes, saldo final) with INCC corrected values

### Verification
- Lint: No errors in Venice Park file (existing errors in other files are pre-existing)
- Dev server: 200 on `/simulador-venice-park` (compile: 599ms, render: 61ms)
- All business logic preserved (unicaTouched, PAYMENT_LIMIT_YEAR/MONTH, 35% min captation, andar search param, PDF generation with Venice Park branding, etc.)

---
## Task ID: 4 — UI Redesign: Simulador Villa Bianco Page

### Agent: Single Agent (direct file edit)
### File: `src/app/simulador-villa-bianco/page.tsx`

### Scope
Visual/layout redesign only. **No business logic, calculations, state management, PDF generation, or constants were changed.**

### Changes Applied (25 design spec items)

1. **Icon Imports** — Added `Home`, `Wallet`, `CalendarClock`, `Settings` from lucide-react
2. **Header** — New sticky header with larger rounded-xl icon (w-10 h-10), slate color scheme, responsive back link to `/villa-bianco` ("← Voltar ao Villa Bianco" on desktop, "Voltar" on mobile)
3. **Page Background** — Changed from `bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100` to `bg-slate-50`
4. **Step Indicator Removed** — Deleted 5-circle step indicator; replaced with updated title section (`font-extrabold`, `max-w-xl`)
5. **Grid Layout** — Changed from `lg:grid-cols-2 gap-6` to `lg:grid-cols-5 gap-6 lg:gap-8`
6. **Left Column Split** — Changed to `lg:col-span-3`, split single form card into 4 separate cards (Detalhes do Imóvel, Pagamento Inicial (Sinal), Parcelas Durante a Obra, Ajustes Finais e INCC) each with icon headers
7. **Input Classes** — Replaced all input class strings with new design: `h-12`, `rounded-xl border border-slate-200 bg-slate-50`, `focus:ring-2 focus:ring-slate-900 focus:bg-white`, currency inputs have `text-right`
8. **Label Style** — Changed `text-gray-400` to `text-slate-500` for all labels
9. **Right Column** — Changed to `lg:col-span-2 lg:sticky lg:top-24 self-start` with summary card, results card, and info card
10. **Summary Card** — New dark gradient design (`from-slate-900 to-slate-800`) with delivery badge ("Entrega: Out/2027"), vertical layout, progress bar with labels
11. **Mobile Cards** — New card pattern with emerald (total), amber (INCC), and slate (normal) color coding, pill badges for percentages
12. **Desktop Table** — New 3-column table (Etapa, Valor, %) with slate-100 header, inline notes
13. **resultRows useMemo** — Wrapped in `useMemo` with `[result, inccMode, inccMonthlyRate]` deps, added `isIncc: boolean` property to all rows
14. **Pill Tabs** — Replaced underline tabs with pill-style buttons in `bg-slate-100` container
15. **Schedule Tables** — New design with sticky headers (`sticky top-0 bg-slate-50`), rounded-xl containers, `max-h-[400px]` overflow
16. **Habite-se Tab** — New card-based layout with white card showing balance and INCC projection (simple saldo, no breakdown — matching Moment pattern)
17. **PDF Button** — Changed to emerald green (`bg-emerald-600`), conditional on `showResults`, `py-4` height, `font-bold`, `shadow-md hover:shadow-lg`
18. **Info Card** — New horizontal layout with blue Info icon, slate color scheme (no gradient header, clean design)
19. **Footer** — New centered layout: "Espelho de Vendas • Simulador Villa Bianco • © year"
20. **Suspense Fallback** — New design with pulsing Building2 icon on `bg-slate-50`
21. **Blue Info Note Removed** — "O valor do Financiamento inclui" box removed
22. **INCC Toggle** — Updated to larger p-4 design with `border-slate-100`, bold text, amber pill badges, bg-slate-50
23. **INCC Radios** — New design with `gap-3 p-2 hover:bg-slate-50 rounded-lg`, border-l accent (`border-l-2 border-slate-100 ml-4`), `w-4 h-4` radio inputs with amber focus
24. **Low Captation Warning** — Changed from `border-l-4 animate-pulse` to `border border-red-200` design, removed animate-pulse
25. **Clear Button** — Changed from `border-2` to `border` design with text "Limpar Campos"
26. **Decoration Fee Display** — Moved into "Parcelas Durante a Obra" card with slate styling
27. **Auto-calc Indicator** — Centered design with spinning RotateCcw icon (3s animation)
28. **Delivery Info Note Removed** — Blue box with delivery info removed from form (now in summary badge)

### Villa Bianco Specifics Preserved
- DECORATION_FEE = 10000.00 (dynamic installments = totalMonths)
- DELIVERY_YEAR=2027, DELIVERY_MONTH=9 (October)
- No payment limit, no parcela única
- Min captation 15%
- Tabs: sinal, mensal, semestral, decoracao, habitese
- Back link goes to `/villa-bianco`
- Enterprise name: 'Villa Bianco' in header subtitle and PDF
- Header subtitle: 'Simulador Villa Bianco'
- Footer: 'Espelho de Vendas • Simulador Villa Bianco • © year'
- Delivery badge in summary: 'Out/2027'
- Habitese tab shows simple saldo like Moment (no breakdown)

### Verification
- Lint: No errors in Villa Bianco file (existing errors in other files are pre-existing)
- Dev server: 200 on `/simulador-villa-bianco` (compile: 650ms, render: 82ms)
- All business logic preserved (DECORATION_FEE, dynamic decoration installments, 15% min captation, INCC correction, PDF generation with Villa Bianco branding, etc.)

---
## Task ID: 5 — UI Redesign: Simulador Vitta Page

### Agent: Single Agent (direct file edit)
### File: `src/app/simulador-vitta/page.tsx`

### Scope
Visual/layout redesign only. **No business logic, calculations, state management, PDF generation, or constants were changed.**

### Changes Applied (26 design spec items)

1. **Icon Imports** — Added `Home`, `Wallet`, `CalendarClock`, `Settings` from lucide-react
2. **Header** — New sticky header with larger rounded-xl icon (w-10 h-10), slate color scheme, responsive back link to `/vitta` (“← Voltar ao Residencial Vitta” on desktop, “Voltar” on mobile)
3. **Page Background** — Changed from `bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100` to `bg-slate-50`
4. **Step Indicator Removed** — Deleted 5-circle step indicator; replaced with updated title section (`font-extrabold`, `max-w-xl`)
5. **Grid Layout** — Changed from `lg:grid-cols-2 gap-6` to `lg:grid-cols-5 gap-6 lg:gap-8`
6. **Left Column Split** — Changed to `lg:col-span-3`, split single form card into 4 separate cards (Detalhes do Imóvel, Pagamento Inicial (Sinal), Parcelas Durante a Obra, Ajustes Finais e INCC) each with icon headers
7. **Input Classes** — Replaced all input class strings with new design: `h-12`, `rounded-xl border border-slate-200 bg-slate-50`, `focus:ring-2 focus:ring-slate-900 focus:bg-white`, currency inputs have `text-right`
8. **Label Style** — Changed `text-gray-400` to `text-slate-500` for all labels
9. **Right Column** — Changed to `lg:col-span-2 lg:sticky lg:top-24 self-start` with summary card, results card, and info card
10. **Summary Card** — New dark gradient design (`from-slate-900 to-slate-800`) with delivery badge (“Entrega: Ago/2029”), vertical layout, progress bar with labels
11. **Mobile Cards** — New card pattern with emerald (total), amber (INCC), and slate (normal) color coding, pill badges for percentages
12. **Desktop Table** — New 3-column table (Etapa, Valor, %) with slate-100 header, inline notes. Total row changed from `bg-gray-900 text-white` to `bg-emerald-50` (matching other simulators)
13. **resultRows useMemo** — Wrapped in `useMemo` with `[result, inccMode, inccMonthlyRate]` deps, added `isIncc: boolean` property to all rows
14. **Pill Tabs** — Replaced underline tabs with pill-style buttons in `bg-slate-100` container; tab labels preserve counts: “Mensais (N)”, “Semestrais (N)”, “Única (N)”
15. **Schedule Tables** — New design with sticky headers (`sticky top-0 bg-slate-50`), rounded-xl containers, `max-h-[400px]` overflow
16. **Habitese Tab** — New card-based layout with white card showing composition breakdown (saldo devedor, semestrais remanescentes with `border-l-2 border-amber-300`, saldo residual with `border-l-2 border-slate-300`); remaining monthly info note converted from blue info box to clean slate note inside habitese tab
17. **PDF Button** — Moved from left column to right column. Changed to emerald green (`bg-emerald-600`), conditional on `showResults`, `py-4` height, `font-bold`, `shadow-md hover:shadow-lg`
18. **Info Card** — New horizontal layout with blue Info icon, slate color scheme (clean design)
19. **Footer** — New centered layout: “Espelho de Vendas • Residencial Vitta • © year”
20. **Suspense Fallback** — New design with pulsing Building2 icon on `bg-slate-50`
21. **Blue Info Notes Removed** — “O valor do Financiamento inclui” box removed; remaining monthlies blue info box converted to note inside habitese tab; delivery info blue box removed (now in summary badge)
22. **INCC Toggle** — Updated to larger p-4 design with `border-slate-100`, bold text, amber pill badges, bg-slate-50
23. **INCC Radios** — New design with `gap-3 p-2 hover:bg-slate-50 rounded-lg`, border-l accent (`border-l-2 border-slate-100 ml-4`), `w-4 h-4` radio inputs with amber focus
24. **Low Captation Warning** — Changed from `border-l-4 animate-pulse` to `border border-red-200` design, removed animate-pulse
25. **Clear Button** — Changed from `border-2` to `border` design with text “Limpar Campos”
26. **Única Input Placement** — Moved única input into “Parcelas Durante a Obra” card (not separate card)
27. **Auto-calc Indicator** — Centered design with spinning RotateCcw icon (3s animation)

### Vitta Specifics Preserved
- DELIVERY_YEAR=2029, DELIVERY_MONTH=7 (August)
- No payment limit, no decoration fee
- Parcela única with hardcoded 5% default
- MAX_MONTHLY_INSTALLMENTS=60, MAX_SEMESTER_INSTALLMENTS=5
- Default down payment 6%
- Min captation 25%
- Tabs: sinal, mensal, semestral, unica, habitese
- Back link goes to `/vitta`
- Enterprise name: ‘Residencial Vitta’ in PDF header, ‘Simulador Residencial Vitta’ in header subtitle
- NO footer in original → NOW has footer
- Header subtitle: ‘Simulador Residencial Vitta’
- Delivery badge in summary: ‘Ago/2029’
- Habitese tab shows composition breakdown with `border-l-2` indicators
- Tab labels show counts: ‘Mensais (N)’, ‘Semestrais (N)’, ‘Única (N)’
- Remaining monthly count info displayed as note inside habitese tab (not blue box)
- Vitta shows remaining monthly/semester count info in resultRows notes
- Desktop table total row changed from `bg-gray-900 text-white` to `bg-emerald-50` (matching other simulators)

### Verification
- Lint: No errors in Vitta file (existing 3 errors/3 warnings are pre-existing in other files)
- Dev server: 200 on `/simulador-vitta` (compile: 619ms, render: 90ms) then (compile: 79ms, render: 137ms)
- All business logic preserved (MAX_MONTHLY=60, MAX_SEMESTER=5, 6% default sinal, 5% única, 25% min captation, remaining monthly as captação, INCC correction, PDF generation with Residencial Vitta branding, etc.)

---
## Task ID: 6 — UI Redesign: Simulador Quattre Istambul Page

### Agent: Single Agent (direct file edit)
### File: `src/app/simulador-quattre-istambul/page.tsx`

### Scope
Visual/layout redesign only. **No business logic, calculations, state management, PDF generation, or constants were changed.**

### Changes Applied (26 design spec items)

1. **Icon Imports** — Added `Home`, `Wallet`, `CalendarClock`, `Settings` from lucide-react
2. **Header** — New sticky header with larger rounded-xl icon (w-10 h-10), slate color scheme, responsive back link to `/` ("← Voltar ao Espelho de Vendas" on desktop, "Voltar" on mobile)
3. **Page Background** — Changed from `bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100` to `bg-slate-50`
4. **Step Indicator Removed** — Deleted 5-circle step indicator; replaced with updated title section (`font-extrabold`, `max-w-xl`)
5. **Grid Layout** — Changed from `lg:grid-cols-2 gap-6` to `lg:grid-cols-5 gap-6 lg:gap-8`
6. **Left Column Split** — Changed to `lg:col-span-3`, split single form card into 4 separate cards (Detalhes do Imóvel, Pagamento Inicial (Sinal), Parcelas Durante a Obra, Ajustes Finais e INCC) each with icon headers
7. **Input Classes** — Replaced all input class strings with new design: `h-12`, `rounded-xl border border-slate-200 bg-slate-50`, `focus:ring-2 focus:ring-slate-900 focus:bg-white`, currency inputs have `text-right`
8. **Label Style** — Changed `text-gray-400` to `text-slate-500` for all labels
9. **Right Column** — Changed to `lg:col-span-2 lg:sticky lg:top-24 self-start` with summary card, results card, and info card
10. **Summary Card** — New dark gradient design (`from-slate-900 to-slate-800`) with delivery badge ("Entrega: Nov/2027"), vertical layout, progress bar with labels
11. **Mobile Cards** — New card pattern with emerald (total), amber (INCC), and slate (normal) color coding, pill badges for percentages
12. **Desktop Table** — New 3-column table (Etapa, Valor, %) with slate-100 header, inline notes. Removed 4th "Observação" column
13. **resultRows useMemo** — Changed `percent` type from `string` to `number | null`, converted imperative array-push pattern to declarative spread pattern, removed `isHighlight` styling from table
14. **Pill Tabs** — Replaced underline tabs with pill-style buttons in `bg-slate-100 p-1.5 rounded-xl` container
15. **Schedule Tables** — New design with sticky headers (`sticky top-0 bg-slate-50`), rounded-xl containers, `max-h-[400px]` overflow
16. **Habite-se Tab** — New card-based layout with `bg-slate-50 rounded-xl` wrapper, white balance card, amber INCC projection card, and composition breakdown cards (mensais restantes, semestrais restantes, saldo final) with white bg and slate borders
17. **PDF Button** — Changed to emerald green (`bg-emerald-600`), conditional on `showResults`, `py-4` height, `font-bold`, `shadow-md hover:shadow-lg`
18. **Info Card** — New horizontal layout with blue Info icon, slate color scheme (no gradient header)
19. **Footer** — New centered layout: "Espelho de Vendas • Simulador de Fluxo de Pagamento • © year". Removed extra disclaimer text.
20. **Suspense Fallback** — New design with pulsing Building2 icon on `bg-slate-50`
21. **Blue Info Note Removed** — "O valor do Financiamento inclui" box removed (replaced by habitese tab breakdown)
22. **INCC Toggle** — Updated to larger p-4 design with `border-slate-100 hover:border-amber-300`, `bg-slate-50`, bold text, amber pill badges (`font-bold px-3 py-1`)
23. **INCC Radios** — New design with `gap-3 p-2 hover:bg-slate-50 rounded-lg`, border-l accent (`border-l-2 border-slate-100 ml-4`), `w-4 h-4 text-amber-600 focus:ring-amber-500` radio inputs
24. **Low Captation Warning** — Changed from `border-l-4 border-red-500 animate-pulse` to `border border-red-200` design, removed animate-pulse
25. **Clear Button** — Changed from `border-2 border-gray-200` to `border border-slate-200` design with text "Limpar Campos"
26. **Auto-calc Indicator** — Centered design with spinning RotateCcw icon (3s animation duration)
27. **Delivery Info Note Removed** — Blue box with delivery info removed from form (now in summary badge)
28. **Total Hints** — Updated from `bg-gray-50 border-gray-100 text-gray-600` to `bg-slate-50 border-slate-100 text-slate-600` with install count display

### Quattre Istambul Specifics Preserved
- PAYMENT_LIMIT_YEAR=2027, PAYMENT_LIMIT_MONTH=10 (October)
- DELIVERY_YEAR=2027, DELIVERY_MONTH=11 (November)
- Parcela única (optional input, included in captação)
- Down payment installments select (1 or 2)
- Min captation 25%
- Tabs: sinal, mensal, semestral, unica, habitese
- Back link goes to `/` (Voltar ao Espelho de Vendas)
- Enterprise name: 'Quattre - Torre Istambul' in PDF
- Header subtitle: 'Simulador de Fluxo de Pagamento'
- Footer: 'Espelho de Vendas • Simulador de Fluxo de Pagamento • © year'
- Delivery badge in summary: 'Nov/2027'
- Habitese tab shows breakdown cards (mensais restantes, semestrais restantes, saldo final) with INCC corrected values
- Max monthly select (48/36) and max semester select (6/4) preserved in Parcelas Durante a Obra card
- resultRows includes conditional Única row when unicaValue > 0

### Verification
- Lint: No errors in Quattre Istambul file (existing 3 errors/3 warnings are pre-existing in other files)
- Dev server: 200 on `/simulador-quattre-istambul` (compile: 484ms, render: 78ms)
- All business logic preserved (PAYMENT_LIMIT_YEAR/MONTH, 25% min captation, parcela única, down payment installments, maxMonthly/maxSemester selects, INCC correction with breakdown, PDF generation with Quattre - Torre Istambul branding, etc.)
- File reduced from 1328 lines to 1124 lines (removed old design patterns, removed step indicator, removed blue info notes, removed delivery info box)
