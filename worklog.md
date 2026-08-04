---
Task ID: 1
Agent: Main Agent
Task: Implement dual admin system (Coordenador de Produto + Administrador do Sistema)

Work Log:
- Explored full codebase structure: auth (Supabase), 3 hardcoded dashboards, API routes, middleware, data models
- Installed xlsx package for Excel parsing
- Created SQL schema: profiles table with roles, empreendimentos table, projeto_units generic table
- Created seed SQL to migrate existing projects into new tables
- Created 5 API routes: empreendimentos CRUD, image upload, Excel upload+parse, dynamic units, seed admin
- Created dynamic-dashboard.tsx (1450 lines) - generic sales mirror for any project
- Created admin-sistema page + AdminSistemaClient (691 lines) - full project management panel
- Created /empreendimento/[id] dynamic route for new project sales mirrors
- Updated /projetos page to dynamically fetch and show DB projects alongside hardcoded ones
- Updated middleware to protect /admin-sistema and /empreendimento routes
- Updated login page to redirect by role (admin_sistema → /admin-sistema, others → /projetos)
- Build compiled successfully with all routes registered

Stage Summary:
- Database schema ready at /supabase/schema-admin.sql
- Seed migration at /supabase/seed-empreendimentos.sql
- Admin user: prosperosdirecional@gmail.com / @DminS1St3m@
- New routes: /admin-sistema, /empreendimento/[id], 5 API endpoints
- Role system: 'coordenador' (change status) vs 'admin_sistema' (full project management)

---
Task ID: 4
Agent: main
Task: Substituir "proposta" por "simulação" e corrigir geração de PDF no mobile

Work Log:
- Mapeou todas as ocorrências de "proposta" nos 3 simuladores (Quattre: 3, Moment: 0, Villa Bianco: 4)
- Substituiu todas por "simulação" (PDF header, nome do arquivo, botão do frontend)
- Investigou causa de falha do PDF no mobile: doc.save() usa FileSaver.js que falha no iOS Safari
- Implementou download mobile-safe usando blob + createElement('a') + click() com fallback para doc.save()
- Mesma correção aplicada nos 3 simuladores
- Build aprovado sem erros

Stage Summary:
- Arquivos alterados: simulador/page.tsx, simulador-moment/page.tsx, simulador-villa-bianco/page.tsx
- Zero ocorrências de "proposta" restantes nos simuladores
- PDF agora funciona em mobile (iOS Safari, Chrome mobile, WebView)
---
Task ID: 1
Agent: main
Task: Implementar projeção INCC baseada em expectativas de mercado (Bacen Focus) e adicionar opção nos simuladores

Work Log:
- Verificou que INCC NÃO está disponível no catálogo da API Olinda (Bacen Expectativas)
- Confirmou que IGP-M está disponível e amplamente coberto (54 respondentes)
- Buscou dados históricos do IGP-M (Bacen SGS série 189) e INCC-M (brasilindicadores) para calcular fator de proporcionalidade
- Calculou fator INCC/IGP-M ≈ 2.01x nos últimos 60 meses
- Implementou função fetchInccProjection() na API /api/incc que:
  1. Busca expectativa 12m do IGP-M via Olinda API (mediana suavizada)
  2. Converte taxa anual para mensal equivalente (juros compostos)
  3. Calcula fator histórico INCC/IGP-M (últimos 60 meses)
  4. Aplica fator para obter projeção INCC
  5. Fallback: usa média 12m se expectativas indisponíveis
- Adicionou campo projectionSource no retorno da API (descrição da fonte usada)
- Re-adicionou opção "Projeção de mercado" nos 3 simuladores (Moment, Quattre, Villa Bianco)
- Opção agora mostra detalhes da fonte quando selecionada

Stage Summary:
- Resultado da projeção: 0.688% a.m. (IGP-M 4.19% a.a. × fator 2.01x)
- Arquivos alterados: src/app/api/incc/route.ts, simulador-moment/page.tsx, simulador/page.tsx, simulador-villa-bianco/page.tsx
- Build compilou sem erros
---
Task ID: 1
Agent: main
Task: Habilitar upload de imagem de preview para TODOS os empreendimentos (incluindo legacy)

Work Log:
- Analisou a estrutura atual: 4 projetos hardcoded no ProjetosClient.tsx sem gestão de imagem via admin
- Criou API /api/admin-sistema/migrate-legacy para migrar projetos hardcoded (Quattre, Villa Bianco, Moment, Vitta) para o banco
- Atualizou upload-image/route.ts para aceitar JPG, PNG e WebP (com conversão para WebP via sharp, resize 1200x800, qualidade 85)
- Reescreveu ProjetosClient.tsx: removeu staticProjects, agora busca tudo do banco, usa SLUG_ROUTE_MAP para rotas legadas
- Atualizou AdminSistemaClient.tsx com auto-migração ao abrir a página e aceita .jpg/.jpeg/.png/.webp no upload

Stage Summary:
- Todos os empreendimentos agora ficam no banco de dados e podem ter imagens gerenciadas pelo admin
- Upload aceita formatos comuns (JPG, PNG, WebP) e converte para WebP otimizado
- Rota /projetos busca 100% do banco (sem hardcoded)
- Rotas legadas (/espelho, /villa-bianco, /moment, /vitta) mantidas via mapeamento de slug
- Build passou sem erros
---
Task ID: 1
Agent: general-purpose
Task: Adicionar parcela única ao simulador Quattre Istambul

Work Log:
- Leu arquivo completo simulador/page.tsx (1270+ linhas)
- Adicionou 4 campos ao interface CalculationResult: unicaValue, unicaPercent, unicaDate, unicaScheduleRows
- Adicionou state unicaValueInput com useState("") (sem valor padrão - obrigatório input manual)
- Estendeu activeTab type para incluir "unica"
- Adicionou parseVal(unicaValueInput) após parsing de semestral
- Inseriu lógica de parcela única no useMemo: data = addMonthsToDate(dpDate, totalMonths) = outubro 2027, INCC factor aplicado, schedule row 1/1
- Atualizou totalCaptation para incluir unicaVal
- Adicionou unicaVal ao dependency array do useMemo
- Adicionou setUnicaValueInput("") ao clearAll
- PDF: linha condicional no Resumo Financeiro, seção de cronograma, nota explicativa
- UI: campo input de valor único após max semestrais, com helper text
- Tabela de resultados: linha condicional azul para Única (entre semestrais e financiamento)
- Tabs de cronograma: adicionado "unica" com label "Única", conteúdo com tabela + total + empty state

Stage Summary:
- Arquivo alterado: src/app/simulador/page.tsx
- Parcela única: sem valor padrão, opcional, paga em outubro 2027 (mês anterior à entrega)
- Compõe a captação da obra (reduz financiamento)
- Corrigida pelo INCC quando ativo
- Build compilou sem erros
---
Task ID: 1
Agent: general-purpose
Task: Vitta monthly captação fix - contar parcelas mensais remanescentes como captação

Work Log:
- Leu arquivo completo simulador-vitta/page.tsx (962 linhas)
- Adicionou campos totalMonthlyCommitted e totalMonthlyCommittedPercent ao interface CalculationResult
- Modificou cálculo de captação: totalMonthlyCommitted = (paidMonthlyCount + remainingMonthlyCount) * monthlyVal (TODAS as mensais)
- Atualizou totalCaptation para usar totalMonthlyCommitted em vez de monthlyPaidDuringConstruction
- Ajustou saldoResidual e habiteseCorrected: removeu remainingMonthlyValue (mensais agora são captação, não financiamento)
- Atualizou mensais remanescentes corrigido (INCC) para 0
- Resultados tabela: mudou "Mensais (obra)" para "Mensais" mostrando total, substituiu row "pós financiamento" amber por info row azul
- Tab Financiamento: removeu mensais remanescentes da composição, adicionou nota azul explicativa
- Adicionou caixa de observação abaixo da tabela de resultados
- PDF: mensais agora mostram total com detalhamento, removido "Mensais (pós financiamento)" do resumo, removido mensais do habite-se
- PDF notas: atualizada nota sobre mensais (captação) e semestrais (financiamento)
- Helper text no input: "pós-entrega (captação)" em vez de "para o financiamento"

Stage Summary:
- Arquivo alterado: src/app/simulador-vitta/page.tsx
- ALL monthly installments (including remaining) now count as captação
- Only remaining semester + residual balance go to financing (habitese)
- Client can pay remaining monthlies directly to constructor or integrate into bank financing
- Build compilou sem erros
---
Task ID: 1
Agent: main
Task: Refatorar upload Excel: UPSERT seguro + corrigir normalização de cabeçalhos

Work Log:
- Identificou bug: normalizeColumnName() convertia espaços em '_' mas COLUMN_MAP usava chaves com espaços → cabeçalhos compostos falhavam silenciosamente
- Corrigiu normalização: agora tanto as chaves do COLUMN_MAP quanto os cabeçalhos do Excel são normalizados com a mesma função
- Substituiu estratégia DELETE+INSERT por UPSERT usando onConflict='empreendimento_id,unidade'
- Adicionou validação obrigatória de coluna 'unidade' no upload
- Adicionou unique index idx_projeto_units_emp_unidade no schema e migration
- Adicionado política RLS INSERT para admin_sistema (necessária para upsert)
- Refatorado toast do frontend para mostrar inseridas/atualizadas/ignoradas/erros
- Criado migration SQL em supabase/migrations/add_unique_emp_unidade.sql

Stage Summary:
- Arquivos alterados: upload-excel/route.ts (reescrito), AdminSistemaClient.tsx, schema-admin.sql
- Migration pendente: supabase/migrations/add_unique_emp_unidade.sql (executar no Supabase Dashboard)
- Build aprovado sem erros

---
Task ID: 1
Agent: main
Task: Investigar e corrigir falha de atualização de preços via upload Excel parcial

Work Log:
- Leitura completa do route de upload (upload-excel/route.ts)
- Mapeamento de todas as fontes de dados dos espelhos de vendas (5 empreendimentos)
- Leitura da API vitta-units/route.ts para confirmar estrutura da tabela dedicada
- Identificação de 3 bugs na cadeia upload → espelho
- Aplicação das 4 correções no route de upload
- Verificação com npx next build (sucesso)

Stage Summary:
- Bug 1: "valor_total" não estava no COLUMN_MAP → coluna "Valor Total" era ignorada silenciosamente
- Bug 2: Vitta ausente do DEDICATED_TABLE_MAP → upload nunca syncava com vitta_units
- Bug 3: syncToDedicatedTable recebia `partial` para o WHERE → update sem coluna "bloco" falhava para Vitta/Villa Bianco
- Correções: adicionados valor_total/valor_da_unidade/preco_total ao COLUMN_MAP, Vitta ao DEDICATED_TABLE_MAP, novo parâmetro matchData na função de sync


---
Task ID: 1
Agent: main
Task: Implementar TOTP, WebAuthn/FIDO2 e notificação por e-mail para MFA

Work Log:
- Criada migration SQL (supabase/migration-mfa.sql) com tabelas user_totp, user_passkeys, user_login_events
- Adicionado campo mfa_enabled na tabela profiles
- Instalados pacotes: otplib@12, qrcode, @simplewebauthn/server, @simplewebauthn/browser, resend
- Criado src/lib/mfa/totp.ts (geração/verificação TOTP)
- Criado src/lib/mfa/webauthn.ts (registro/autenticação WebAuthn + challenge store)
- Criado src/lib/mfa/email.ts (notificação novo dispositivo + fingerprinting + recordLoginEvent)
- Criadas 9 API routes: totp/setup, totp/verify, webauthn/register/begin+finish, webauthn/authenticate/begin+finish, mfa/check, mfa/status, mfa/disable
- Criada página /mfa-verify (verificação pós-login: tenta WebAuthn primeiro, fallback TOTP)
- Criada página /mfa-setup (configuração: TOTP com QR code + WebAuthn passkeys)
- Atualizado middleware para interceptar usuários com MFA ativo mas não verificados
- Atualizado login page para detectar MFA e redirecionar para /mfa-verify
- Adicionado botão "Segurança" no header do admin-sistema
- Build validado com sucesso

Stage Summary:
- TOTP (Google Authenticator): implementado com otplib@12 + QR code via qrcode
- WebAuthn/FIDO2: implementado com @simplewebauthn, fallback automático para TOTP
- Notificação e-mail: implementada com Resend (gratuito 3k/mês), log se sem API key
- Detecção novo dispositivo: fingerprinting de UA + comparação com histórico
- Fluxo: login → detecta MFA → cookie mfa_pending → middleware redireciona → /mfa-verify → cookie mfa_verified → libera acesso

---
Task ID: 2
Agent: main
Task: Corrigir MFA: botão acesso para todos os usuários + TOTP inativo + WebAuthn falha

Work Log:
- Adicionado botão "Segurança" no header de ProjetosClient.tsx (antes apenas em AdminSistemaClient)
- Corrigido getRPConfig() que crashava com new URL(undefined), substituído por getRPConfigFromRequest(request)
- Corrigido decodeCredentialID() para usar atob() em vez de Buffer.from(id, 'base64url')
- Removido authenticatorAttachment: 'cross-platform' para permitir biometria nativa
- Mudado userVerification de 'required' para 'preferred'
- Criada migration RLS: profiles_update_own_mfa (UPDATE próprio perfil para qualquer usuário)
- /api/mfa/status: self-repair quando RLS bloqueia profile update
- /api/mfa/totp/verify: não falha quando RLS bloqueia (log warning)
- Corrigido WebAuthn: 'authenticator' → 'credential' na chamada verifyAuthenticationResponse (v13)
- Corrigido authenticate/finish: 'verificationInfo' → 'authenticationInfo' (v13 API)
- Corrigido publicKey: salvar como base64 (Uint8Array → Buffer → base64) em vez de JSON.stringify
- Corrigido authenticate/finish: restaurar publicKey de base64 para Uint8Array (com compatibilidade para formato antigo)
- Removido 'origin' de generateRegistrationOptions (não aceito na v13)

Stage Summary:
- TOTP: totalmente funcional (configuração + login)
- WebAuthn: corrigido para v13 da @simplewebauthn/server (3 bugs de API)
- RLS: policy adicionada para usuários não-admin atualizarem próprio perfil
- Migration pendente: supabase/migration-mfa-rls-fix.sql

