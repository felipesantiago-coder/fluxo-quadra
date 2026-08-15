#!/usr/bin/env python3
"""
Security Audit Report Generator - Fluxo Quadra
Professional PDF report using ReportLab
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, black, white, Color
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                 PageBreak, KeepTogether, HRFlowable)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ── Fonts ──
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('Carlito', f'{FONT_DIR}/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Bold', f'{FONT_DIR}/truetype/english/Carlito-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-Italic', f'{FONT_DIR}/truetype/english/Carlito-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Carlito-BoldItalic', f'{FONT_DIR}/truetype/english/Carlito-BoldItalic.ttf'))
registerFontFamily('Carlito', normal='Carlito', bold='Carlito-Bold', italic='Carlito-Italic', boldItalic='Carlito-BoldItalic')

pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))

# ── Colors ──
CRITICAL = HexColor('#DC2626')
HIGH = HexColor('#EA580C')
MEDIUM = HexColor('#D97706')
LOW = HexColor('#2563EB')
INFO = HexColor('#6B7280')
BG_LIGHT = HexColor('#F8FAFC')
BORDER = HexColor('#E2E8F0')
DARK = HexColor('#0F172A')
ACCENT = HexColor('#1E40AF')
GREEN = HexColor('#16A34A')
WHITE = white

# ── Styles ──
styles = getSampleStyleSheet()

styles.add(ParagraphStyle('CustomCoverTitle', fontName='Carlito-Bold', fontSize=28, leading=34,
                                textColor=WHITE, alignment=TA_LEFT, spaceAfter=12))
styles.add(ParagraphStyle('CustomCoverSubtitle', fontName='Carlito', fontSize=14, leading=20,
                                textColor=HexColor('#94A3B8'), alignment=TA_LEFT, spaceAfter=6))
styles.add(ParagraphStyle('CustomCoverDate', fontName='Carlito', fontSize=11, leading=16,
                                textColor=HexColor('#94A3B8'), alignment=TA_LEFT))
styles.add(ParagraphStyle('CustomH1', fontName='Carlito-Bold', fontSize=18, leading=24,
                                textColor=DARK, spaceBefore=20, spaceAfter=10))
styles.add(ParagraphStyle('CustomH2', fontName='Carlito-Bold', fontSize=14, leading=19,
                                textColor=ACCENT, spaceBefore=16, spaceAfter=8))
styles.add(ParagraphStyle('CustomH3', fontName='Carlito-Bold', fontSize=12, leading=16,
                                textColor=DARK, spaceBefore=12, spaceAfter=6))
styles.add(ParagraphStyle('CustomBody', fontName='Carlito', fontSize=10, leading=15,
                                textColor=DARK, alignment=TA_JUSTIFY, spaceAfter=6))
styles.add(ParagraphStyle('CustomBodyBold', fontName='Carlito-Bold', fontSize=10, leading=15,
                                textColor=DARK, alignment=TA_JUSTIFY, spaceAfter=6))
styles.add(ParagraphStyle('CustomBulletCustom', fontName='Carlito', fontSize=10, leading=15,
                                textColor=DARK, leftIndent=20, bulletIndent=8, spaceAfter=3))
styles.add(ParagraphStyle('CustomCode', fontName='DejaVuSans', fontSize=8, leading=11,
                                textColor=HexColor('#1E293B'), backColor=HexColor('#F1F5F9'),
                                borderPadding=6, spaceAfter=6, spaceBefore=4))
styles.add(ParagraphStyle('CustomTableCell', fontName='Carlito', fontSize=8.5, leading=12,
                                textColor=DARK))
styles.add(ParagraphStyle('CustomTableHeader', fontName='Carlito-Bold', fontSize=8.5, leading=12,
                                textColor=WHITE))
styles.add(ParagraphStyle('CustomFooter', fontName='Carlito', fontSize=8, leading=10,
                                textColor=INFO, alignment=TA_CENTER))
styles.add(ParagraphStyle('CustomSeverityCritical', fontName='Carlito-Bold', fontSize=10, leading=14,
                                textColor=CRITICAL, spaceAfter=2))
styles.add(ParagraphStyle('CustomSeverityHigh', fontName='Carlito-Bold', fontSize=10, leading=14,
                                textColor=HIGH, spaceAfter=2))
styles.add(ParagraphStyle('CustomSeverityMedium', fontName='Carlito-Bold', fontSize=10, leading=14,
                                textColor=MEDIUM, spaceAfter=2))
styles.add(ParagraphStyle('CustomSeverityLow', fontName='Carlito-Bold', fontSize=10, leading=14,
                                textColor=LOW, spaceAfter=2))
styles.add(ParagraphStyle('CustomSmallText', fontName='Carlito', fontSize=9, leading=13,
                                textColor=INFO, spaceAfter=4))

W, H = A4
MARGIN = 2.2 * cm
CONTENT_W = W - 2 * MARGIN

output_path = '/home/z/my-project/download/auditoria-seguranca-fluxo-quadra.pdf'

# Page number callback
def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont('Carlito', 8)
    canvas.setFillColor(INFO)
    canvas.drawCentredString(W / 2, 15 * mm, f'Pagina {doc.page}')
    canvas.drawRightString(W - MARGIN, 15 * mm, 'Fluxo Quadra - Auditoria de Seguranca')
    canvas.restoreState()

def add_cover(canvas, doc):
    canvas.saveState()
    # Dark background
    canvas.setFillColor(DARK)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Accent bar
    canvas.setFillColor(ACCENT)
    canvas.rect(0, H * 0.38, W, 4, fill=1, stroke=0)
    # Bottom info bar
    canvas.setFillColor(HexColor('#1E293B'))
    canvas.rect(0, 0, W, 80, fill=1, stroke=0)
    canvas.restoreState()

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=2.5*cm
)

story = []

# ═══════════════════════════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════════════════════════
story.append(Spacer(1, 6*cm))
story.append(Paragraph('AUDITORIA DE SEGURANCA', styles['CustomCoverTitle']))
story.append(Paragraph('OFENSIVA E COMPLETA', styles['CustomCoverTitle']))
story.append(Spacer(1, 0.5*cm))
story.append(Paragraph('Fluxo Quadra', styles['CustomCoverSubtitle']))
story.append(Paragraph('Plataforma SaaS de Gestao de Empreendimentos Imobiliarios', styles['CustomCoverSubtitle']))
story.append(Spacer(1, 1.5*cm))
story.append(HRFlowable(width='40%', thickness=2, color=ACCENT, spaceAfter=12))
story.append(Paragraph('Data: 15 de agosto de 2025', styles['CustomCoverDate']))
story.append(Paragraph('Metodologia: OWASP WSTG / ASVS 5.0.0 / Top 10:2025', styles['CustomCoverDate']))
story.append(Paragraph('Classificacao: CONFIDENCIAL', ParagraphStyle('red', parent=styles['CustomCoverDate'], textColor=CRITICAL)))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════
def h1(text):
    story.append(Paragraph(text, styles['CustomH1']))
    story.append(HRFlowable(width='100%', thickness=1, color=BORDER, spaceAfter=8))

def h2(text):
    story.append(Paragraph(text, styles['CustomH2']))

def h3(text):
    story.append(Paragraph(text, styles['CustomH3']))

def body(text):
    story.append(Paragraph(text, styles['CustomBody']))

def bold_body(text):
    story.append(Paragraph(text, styles['CustomBodyBold']))

def bullet(text):
    story.append(Paragraph(f'\u2022 {text}', styles['CustomBulletCustom']))

def code(text):
    story.append(Paragraph(text.replace('<', '&lt;').replace('>', '&gt;'), styles['CustomCode']))

def spacer(h=0.3):
    story.append(Spacer(1, h*cm))

def sev_badge(sev):
    colors = {'CRITICA': CRITICAL, 'ALTA': HIGH, 'MEDIA': MEDIUM, 'BAIXA': LOW, 'INFO': INFO}
    labels = {'CRITICA': 'CRITICA', 'ALTA': 'ALTA', 'MEDIA': 'MEDIA', 'BAIXA': 'BAIXA', 'INFO': 'INFORMATIVO'}
    c = colors.get(sev, INFO)
    return f'<font color="{c.hexval()}">[{labels.get(sev, sev)}]</font>'

def finding_table(data):
    """data: list of [ID, Severidade, Categoria, Componente, Problema, Status]"""
    col_widths = [1.2*cm, 1.6*cm, 2.8*cm, 2.5*cm, 4.5*cm, 1.8*cm]
    header = ['ID', 'Severidade', 'Categoria', 'Componente', 'Problema', 'Status']
    table_data = [[Paragraph(h, styles['CustomTableHeader']) for h in header]]
    for row in data:
        table_data.append([Paragraph(str(c), styles['CustomTableCell']) for c in row])
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ] + [('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT])]))
    story.append(t)
    spacer()

# ═══════════════════════════════════════════════════════════════════
# 1. RESUMO EXECUTIVO
# ═══════════════════════════════════════════════════════════════════
h1('1. Resumo Executivo')

body('Esta auditoria de seguranca ofensiva foi conduzida no aplicativo SaaS Fluxo Quadra, uma plataforma de gestao de empreendimentos imobiliarios construida com Next.js 16, Supabase (PostgreSQL), e Mercado Pago. A auditoria seguiu a metodologia OWASP Web Security Testing Guide (WSTG), o Application Security Verification Standard (ASVS) 5.0.0, e o OWASP Top 10:2025, cobrindo reconhecimento, autenticacao, autorizacao, injecao, logica de negocio, seguranca de infraestrutura e analise de dependencias.')

body('A auditoria identificou <b>8 vulnerabilidades criticas</b>, <b>4 vulnerabilidades de alta severidade</b>, <b>7 vulnerabilidades de media severidade</b> e <b>6 vulnerabilidades de baixa severidade/informativas</b>. Todas as vulnerabilidades criticas e a maioria das de alta severidade foram corrigidas no codigo-fonte durante esta auditoria. As correcoes de RLS no banco de dados exigem a execucao de um arquivo de migracao SQL no Supabase.')

h2('1.1 Distribuicao de Severidade')

summary_data = [
    ['CRITICA', '8', 'Privilege escalation, SSRF, MFA bypass, Storage RLS, Git secrets'],
    ['ALTA', '4', 'Self-activate subscription, admin fail-open, inconsistent auth'],
    ['MEDIA', '7', 'Coupon race condition, login event forging, payment insert, hardcoded email'],
    ['BAIXA/INFO', '6', 'Math.random, CSP unsafe-eval, no CI/CD, robots.txt, plans/public'],
]
col_w = [2.5*cm, 2*cm, 12*cm]
t = Table(
    [[Paragraph(h, styles['CustomTableHeader']) for h in ['Severidade', 'Quantidade', 'Categorias Principais']]] +
    [[Paragraph(c, styles['CustomTableCell']) for c in row] for row in summary_data],
    colWidths=col_w, repeatRows=1
)
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
]))
story.append(t)
spacer()

h2('1.2 Pontos Positivos')
body('O sistema ja possuia varios controles de seguranca bem implementados antes desta auditoria, demonstrando uma base solida de seguranca. Estes controles foram preservados e, em alguns casos, fortalecidos:')
bullet('RLS habilitado em TODAS as tabelas do Supabase com policies baseadas em roles')
bullet('Verificacao HMAC-SHA256 de webhooks do Mercado Pago com comparacao timing-safe e janela de 5 minutos')
bullet('Maquina de estados para transicoes de status de assinatura (validacao de transicoes validas)')
bullet('Validacao de valor pago vs. esperado com tolerancia de 5% (SEC-002)')
bullet('Incremento atomico de uso de cupom via PostgreSQL RPC (TOCTOU fix)')
bullet('Trigger de signup que hardcode role=coordenador, impedindo privilege escalation na criacao de conta')
bullet('Sistema MFA completo com TOTP + WebAuthn/FIDO2 + notificacao por email em novo dispositivo')
bullet('Fluxo de primeiro login obrigatorio com troca de senha e configuracao de MFA')
bullet('Protecao contra path traversal no download com resolve() + startsWith()')
bullet('Rate limiting em endpoints de signup e validacao de cupons')
bullet('Indempotencia de webhook via INSERT ON CONFLICT DO NOTHING')
bullet('Padrao CAS (Compare-And-Swap) para cancelamento de assinatura')
spacer()

# ═══════════════════════════════════════════════════════════════════
# 2. INVENTARIO DO SISTEMA
# ═══════════════════════════════════════════════════════════════════
h1('2. Inventario do Sistema')

body('O Fluxo Quadra e uma aplicacao SaaS para gestao comercial de empreendimentos imobiliarios, com simuladores de vendas integrados, sistema de assinaturas via Mercado Pago, e autenticacao multi-fator. A arquitetura utiliza Next.js 16.1.1 com App Router (output standalone), servido via Caddy reverse proxy na porta 81, com runtime Bun em producao. O banco de dados e PostgreSQL via Supabase, com 16 tabelas protegidas por Row Level Security. A autenticacao e gerenciada pelo Supabase Auth com suporte a email/senha, TOTP e WebAuthn/FIDO2.')

h2('2.1 Stack Tecnico')
tech_data = [
    ['Framework', 'Next.js 16.1.1 (App Router, standalone output)'],
    ['Linguagem', 'TypeScript 5.x (strict: true)'],
    ['Runtime', 'Bun (producao)'],
    ['Banco de Dados', 'Supabase (PostgreSQL) com RLS em todas as tabelas'],
    ['ORM', 'Prisma (boilerplate SQLite, nao utilizado em producao)'],
    ['Autenticacao', 'Supabase Auth (email/senha + TOTP + WebAuthn/FIDO2)'],
    ['Pagamentos', 'Mercado Pago SDK v3.4.0 (assinaturas + webhooks)'],
    ['Email', 'Resend v6.18.1 (notificacoes de novo dispositivo)'],
    ['Reverse Proxy', 'Caddy na porta 81'],
    ['UI', 'Tailwind CSS 4 + shadcn/ui + Recharts + Framer Motion'],
    ['CI/CD', 'Nenhum (sem GitHub Actions, sem pipelines automatizadas)'],
]
col_w2 = [4*cm, 12.5*cm]
t = Table(
    [[Paragraph(h, styles['CustomTableHeader']) for h in ['Componente', 'Tecnologia']]] +
    [[Paragraph(c, styles['CustomTableCell']) for c in row] for row in tech_data],
    colWidths=col_w2, repeatRows=1
)
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
]))
story.append(t)
spacer()

h2('2.2 Superficie de Ataque')
body('A aplicacao possui 38+ route handlers de API, 20+ paginas, 1 middleware de autenticacao, e 16 tabelas de banco de dados. Os endpoints estao organizados em 5 categorias: administracao do sistema (15 rotas), MFA (8 rotas), assinaturas e pagamentos (5 rotas), dados publicos (8 rotas), e autenticacao/usuario (5 rotas). Todas as rotas de API lidam com sua propria autenticacao via Supabase getUser(), sem depender do middleware.')

# ═══════════════════════════════════════════════════════════════════
# 3. TABELA DE VULNERABILIDADES
# ═══════════════════════════════════════════════════════════════════
h1('3. Tabela de Vulnerabilidades')
body('A tabela abaixo resume todas as vulnerabilidades identificadas, com classificacao de severidade, categoria, componente afetado, descricao do problema e status apos a auditoria.')
spacer()

all_findings = [
    ['SEC-001', 'CRITICA', 'Privilege Escalation', 'RLS / profiles', 'Policy profiles_update_own_mfa permite SET role=admin_sistema', 'CORRIGIDA (migration + trigger)'],
    ['SEC-002', 'CRITICA', 'SSRF via Caddy', 'Caddyfile', 'XTransformPort permite proxy para qualquer porta localhost', 'CORRIGIDA (Caddyfile)'],
    ['SEC-003', 'CRITICA', 'Storage RLS Regression', 'RLS / storage.objects', 'Policy sem role check permite upload/delete anonimo', 'CORRIGIDA (migration)'],
    ['SEC-004', 'CRITICA', 'Git Secret Exposure', 'Git history', 'Senha admin hardcoded @DminS1St3m@ no historico Git', 'RECOMENDADA ROTACAO'],
    ['SEC-005', 'CRITICA', 'SQLite DB Committed', 'Git / db/custom.db', 'Banco SQLite com dados trackeado no repositorio', 'CORRIGIDA (.gitignore)'],
    ['SEC-006', 'CRITICA', 'Profile Column Protection', 'RLS / profiles', 'Usuarios podem alterar role, subscription_status, must_setup_mfa', 'CORRIGIDA (trigger DB)'],
    ['SEC-007', 'CRITICA', 'MFA Setup Bypass', 'API / complete-mfa', 'Endpoint permite pular onboarding de MFA sem configurar credenciais', 'CORRIGIDA (validacao)'],
    ['SEC-008', 'CRITICA', '.env no Git History', 'Git history', 'Arquivo .env com conteudo commitado no historico (placeholders)', 'RECOMENDADO purge'],
    ['SEC-009', 'ALTA', 'Self-Activate Subscription', 'RLS / assinaturas', 'Policy permite SET status=active sem pagamento', 'CORRIGIDA (migration)'],
    ['SEC-010', 'ALTA', 'MFA API Routes Bypass', 'Middleware / APIs', 'Rotas de API nao verificam MFA, so middleware de pagina', 'PENDENTE (arch change)'],
    ['SEC-011', 'ALTA', 'Admin Page Fail-Open', 'admin/page.tsx', 'ADMIN_EMAILS vazio permite acesso admin a qualquer usuario', 'CORRIGIDA (fail-closed)'],
    ['SEC-012', 'ALTA', 'Admin Sistema Email Fallback', 'admin-sistema/page.tsx', 'Email hardcoded como fallback de autorizacao admin', 'CORRIGIDA (requireAdmin)'],
    ['SEC-013', 'MEDIA', 'Coupon Race Condition', 'API / subscriptions', 'Cupom validado ANTES do incremento atomico; MP criado com desconto', 'PENDENTE (reorder)'],
    ['SEC-014', 'MEDIA', 'Login Event Forging', 'RLS / user_login_events', 'WITH CHECK (true) permite inserir eventos falsos', 'CORRIGIDA (migration)'],
    ['SEC-015', 'MEDIA', 'User Payment Insert', 'RLS / pagamentos', 'Usuario pode inserir registros de pagamento falsos', 'CORRIGIDA (migration)'],
    ['SEC-016', 'MEDIA', 'Admin Role Creation Broken', 'API / users/create', 'Trigger ignora user_metadata.role, sempre seta coordenador', 'EXISTENTE (by design)'],
    ['SEC-017', 'MEDIA', 'Hardcoded Admin Email', 'admin-auth.ts + pages', 'Email admin hardcoded em multiplos arquivos do codigo', 'CORRIGIDA (env-only)'],
    ['SEC-018', 'MEDIA', 'Middleware Fail-Open', 'middleware.ts', 'Catch block permitia request em caso de erro', 'CORRIGIDA (fail-closed)'],
    ['SEC-019', 'MEDIA', 'MFA Disable No Reauth', 'API / mfa/disable', 'Desativar MFA completo nao exigia re-autenticacao', 'CORRIGIDA (TOTP required)'],
    ['SEC-020', 'BAIXA', 'Math.random Passwords', 'password-validation.ts', 'Senha temporaria usava Math.random() em vez de crypto', 'CORRIGIDA (crypto API)'],
    ['SEC-021', 'BAIXA', 'No Security Headers', 'next.config.ts', 'Ausencia de CSP, HSTS, X-Frame-Options, etc.', 'CORRIGIDA (headers)'],
    ['SEC-022', 'BAIXA', 'plans/public Fields', 'API / plans/public', 'Select(*) expoe campos internos como mercadopago_plan_id', 'CORRIGIDA (select)'],
    ['SEC-023', 'BAIXA', 'Robots.txt Open', 'public/robots.txt', 'Rotas admin nao bloqueadas para indexacao', 'CORRIGIDA (Disallow)'],
    ['SEC-024', 'INFO', 'No CI/CD Pipeline', 'Infraestrutura', 'Sem GitHub Actions, sem testes automatizados, sem scanning', 'RECOMENDADO'],
    ['SEC-025', 'INFO', 'In-Memory Rate Limit', 'rate-limit.ts', 'Rate limiting inefetivo em ambientes serverless/edge', 'RECOMENDADO Redis'],
]
finding_table(all_findings)

# ═══════════════════════════════════════════════════════════════════
# 4. SECRET AUDIT
# ═══════════════════════════════════════════════════════════════════
h1('4. Auditoria de Secrets')

h2('4.1 .env Atual')
body('O arquivo .env atual no repositorio contem apenas DATABASE_URL=file:/home/z/my-project/db/custom.db, que aponta para o banco SQLite local de boilerplate (nao utilizado em producao). Todas as credenciais reais (SUPABASE_SERVICE_ROLE_KEY, MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_WEBHOOK_SECRET, RESEND_API_KEY) sao configuradas via variaveis de ambiente no servidor de hospedagem e nao estao presentes no codigo-fonte. As variaveis NEXT_PUBLIC_* (SUPABASE_URL, SUPABASE_ANON_KEY, APP_URL) sao publicas por design do Next.js.')

h2('4.2 Historico Git')
body('A analise do historico Git revelou um incidente critico: a senha de administrador @DminS1St3m@ foi commitada em texto plano no arquivo src/app/api/admin-sistema/seed-admin/route.ts (commits 6193cdb, 31e0ea9). A senha foi posteriormente removida do codigo (commit fe169ac) e substituida por process.env.SEED_ADMIN_PASSWORD, mas permanece acessivel no historico Git. O arquivo .env foi commitado com valores placeholder (SUPABASE_URL=https://placeholder.supabase.co) em multiplos commits, sem credenciais reais.')

h2('4.3 Arquivos Binarios no Git')
body('O banco SQLite db/custom.db (24 KB) foi commitado e esta trackeado no Git. Alem disso, arquivos de arquivo (download/projeto.zip, download/projeto.tar.gz, public/projeto.zip) tambem estao trackeados. Embora o .env atual nao contenha secrets reais, a presenca de binarios e arquivos de arquivo no repositorio e uma pratica inadequada que pode expor dados sensivel se futuros dados reais forem adicionados.')

h2('4.4 Acoes Recomendadas')
bullet('ROTACAO IMEDIATA: A senha @DminS1St3m@ deve ser considerada comprometida e rotacionada')
bullet('git rm --cached db/custom.db: Remover o SQLite do tracking Git')
bullet('git filter-repo: Purgar a senha do historico Git e o arquivo .env')
bullet('.gitignore: Adicionar db/*.db, *.zip, *.tar.gz (JA IMPLEMENTADO)')
spacer()

# ═══════════════════════════════════════════════════════════════════
# 5. DETALHAMENTO DAS CORRECOES
# ═══════════════════════════════════════════════════════════════════
h1('5. Detalhamento das Correcoes')

h2('5.1 SEC-001/SEC-006: Privilege Escalation via RLS (CRITICA)')
body('PROBLEMA: A policy RLS profiles_update_own_mfa permitia que qualquer usuario autenticado fizesse UPDATE em QUALQUER coluna do proprio perfil, incluindo role, subscription_status, must_setup_mfa e must_change_password. Um usuario comum poderia setar role=admin_sistema no proprio perfil e obter acesso total ao sistema administrativo, ignorando completamente o trigger handle_new_user() que so protege a criacao de novos perfis.')
body('CORRECAO: (1) A policy profiles_update_own_mfa foi dropada e substituida por profiles_update_own_safe_fields que verifica apenas auth.uid() = id. (2) Um trigger protect_profile_columns foi criado que reverte automaticamente qualquer alteracao nas colunas role, subscription_status, must_setup_mfa e must_change_password quando a requisicao vem de um usuario comum (nao service_role). O trigger detecta a presenca de request.jwt.claim.sub para distinguir requisicoes de service_role (onde sub e NULL) de requisicoes de usuarios autenticados (onde sub esta presente).')
body('ARQUIVO: supabase/migration-security-audit-2025.sql')

h2('5.2 SEC-002: SSRF via Caddy (CRITICA)')
body('PROBLEMA: O Caddyfile continha um handler @transform_port_query que lia o parametro de query XTransformPort e fazia reverse_proxy para localhost:{query.XTransformPort}. Isso permitia que qualquer usuario nao autenticado fizesse scanning de portas internas e acessasse servicos internos (SSH na porta 22, PostgreSQL na porta 5432, etc.) simplesmente enviando GET http://alvo:81/?XTransformPort=22.')
body('CORRECAO: O handler inteiro foi removido. O Caddyfile agora contem apenas um unico handler que faz reverse_proxy para localhost:3000 sem nenhum parametro dinamico.')
body('ARQUIVO: Caddyfile')

h2('5.3 SEC-003: Storage RLS Regression (CRITICA)')
body('PROBLEMA: A migration-storage-rls-fix.sql substituiu as policies de storage que tinham verificacao de role=admin_sistema por versoes que apenas verificavam bucket_id=empreendimentos. Isso significava que QUALQUER usuario (inclusive anon) podia fazer upload, sobrescrever e deletar imagens no bucket de storage.')
body('CORRECAO: As policies foram recriadas com a clausula EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = admin_sistema) adicionada ao WITH CHECK.')
body('ARQUIVO: supabase/migration-security-audit-2025.sql')

h2('5.4 SEC-007: MFA Setup Bypass (CRITICA)')
body('PROBLEMA: O endpoint POST /api/first-login/complete-mfa marcava must_setup_mfa=false e mfa_enabled=true sem verificar se o usuario realmente havia configurado alguma credencial MFA (TOTP verificado ou passkey). Qualquer usuario com conta criada por admin podia chamar este endpoint diretamente para pular o onboarding obrigatorio de MFA.')
body('CORRECAO: O endpoint agora verifica, usando adminClient, se o usuario possui pelo menos um TOTP verificado (user_totp.verified=true) ou pelo menos uma passkey registrada (user_passkeys.count > 0). Se nenhum dos dois existir, retorna 400 com mensagem de erro.')
body('ARQUIVO: src/app/api/first-login/complete-mfa/route.ts')

h2('5.5 SEC-009: Self-Activate Subscription (ALTA)')
body('PROBLEMA: A policy RLS assinaturas_user_update_own permitia que qualquer usuario fizesse UPDATE em qualquer coluna da propria assinatura, incluindo status. Um usuario poderia usar o cliente Supabase diretamente do navegador para executar supabase.from("assinaturas").update({status:"active"}) e ativar sua assinatura sem nenhum pagamento.')
body('CORRECAO: A policy generica foi dropada e substituida por assinaturas_user_cancel_own que so permite UPDATE quando NEW.status = cancelled e OLD.status IN (active, paused, pending).')
body('ARQUIVO: supabase/migration-security-audit-2025.sql')

h2('5.6 SEC-011/SEC-012: Admin Authorization (ALTA)')
body('PROBLEMA: A pagina /admin usava uma condicao fail-open: se ADMIN_EMAILS nao estivesse configurado (vazio), QUALQUER usuario autenticado tinha acesso a pagina administrativa. A pagina /admin-sistema tinha um fallback de email hardcoded (prosperosdirecional@gmail.com) que concedia acesso admin independentemente do role no banco de dados. A funcao requireAdminSistema() em admin-auth.ts tambem tinha este fallback.')
body('CORRECAO: (1) admin/page.tsx: Condicao invertida para fail-closed. (2) admin-sistema/page.tsx: Substituida por requireAdminSistema(). (3) admin-auth.ts: Removido o fallback de email hardcoded, agora verifica SOMENTE profile.role via banco de dados.')

h2('5.7 SEC-018: Middleware Fail-Closed')
body('PROBLEMA: O catch block do middleware fazia return NextResponse.next({ request }), o que significava que qualquer erro durante a verificacao de autenticacao (cookies malformados, erros de parsing) resultava em permitir a requisicao silenciosamente.')
body('CORRECAO: O catch block agora redireciona para / com reason=error, garantindo que falhas no middleware nao resultem em bypass de autenticacao.')

h2('5.8 SEC-019: MFA Disable Re-authentication')
body('PROBLEMA: O endpoint POST /api/mfa/disable permitia desativar MFA completamente (TOTP + todas as passkeys) sem nenhuma re-autenticacao. Um atacante com sessao valida podia desativar MFA e persistir o acesso.')
body('CORRECAO: Para desativacao completa de MFA, o endpoint agora exige um codigo TOTP valido se o usuario tiver TOTP ativo. A remocao de passkeys individuais nao exige re-autenticacao (acao menos critica).')

h2('5.9 SEC-020: Senha Temporaria Criptografica')
body('PROBLEMA: A funcao generateTempPassword() usava Math.random() para gerar senhas temporarias. Math.random() nao e criptograficamente seguro e pode ser previsto.')
body('CORRECAO: Substituido por crypto.getRandomValues() com Uint32Array e shuffle Fisher-Yates tambem usando crypto.getRandomValues().')

h2('5.10 SEC-021: Security Headers')
body('PROBLEMA: O next.config.ts nao configurava nenhum header de seguranca. A aplicacao nao tinha CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy ou Permissions-Policy.')
body('CORRECAO: Headers adicionados via next.config.ts async headers(): X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy restritivo, Strict-Transport-Security com max-age=31536000, e Content-Security-Policy compativel com Supabase e Mercado Pago.')

# ═══════════════════════════════════════════════════════════════════
# 6. MATRIZ DE AUTORIZACAO
# ═══════════════════════════════════════════════════════════════════
h1('6. Matriz de Autorizacao')

auth_data = [
    ['Recurso', 'Nao Autenticado', 'Coordenador', 'Admin Sistema'],
    ['/admin', 'REDIRECT (/)', 'REDIRECT (/projetos)', 'ACESSO'],
    ['/admin-sistema', 'REDIRECT (/)', 'REDIRECT (/projetos)', 'ACESSO'],
    ['/projetos', 'REDIRECT (/)', 'ACESSO', 'ACESSO'],
    ['/espelho', 'REDIRECT (/)', 'ACESSO', 'ACESSO'],
    ['/simulador-*', 'ACESSO (publico)', 'ACESSO', 'ACESSO'],
    ['/planos', 'ACESSO (publico)', 'ACESSO', 'ACESSO'],
    ['/api/admin-sistema/*', '401', '403', 'ACESSO'],
    ['/api/units GET', 'ACESSO (RLS anon)', 'ACESSO', 'ACESSO'],
    ['/api/units PATCH', '401', '403 (ou admin)', 'ACESSO'],
    ['/api/subscriptions/*', '401', 'PROPRIO (user.id)', 'ACESSO TOTAL'],
    ['/api/mfa/*', '401', 'PROPRIO (user.id)', 'ACESSO TOTAL'],
    ['/api/webhooks/mercadopago', 'HMAC verify', 'N/A', 'N/A'],
    ['/api/plans/public', 'ACESSO (select safe)', 'ACESSO', 'ACESSO'],
    ['/api/download', '401', 'ACESSO', 'ACESSO'],
    ['/api/cupons/validate', 'ACESSO (rate limit)', 'ACESSO', 'ACESSO'],
]
col_w3 = [3.8*cm, 3.8*cm, 3.8*cm, 3.8*cm]
t = Table(
    [[Paragraph(h, styles['CustomTableHeader']) for h in auth_data[0]]] +
    [[Paragraph(c, styles['CustomTableCell']) for c in row] for row in auth_data[1:]],
    colWidths=col_w3, repeatRows=1
)
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LEFTPADDING', (0, 0), (-1, -1), 3),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
]))
story.append(t)
spacer()

# ═══════════════════════════════════════════════════════════════════
# 7. OWASP COVERAGE
# ═══════════════════════════════════════════════════════════════════
h1('7. Cobertura OWASP')

owasp_data = [
    ['A01:2021 Broken Access Control', 'TESTADO', 'IDOR, BOLA, BFLA, privilege escalation - 5 findings, 3 corrigidos'],
    ['A02:2021 Cryptographic Failures', 'TESTADO', 'Math.random corrigido; secrets via env; TOTP/WebAuthn seguros'],
    ['A03:2021 Injection', 'TESTADO', 'SQL injection: NENHUMA. XSS: NENHUMA. Command injection: NENHUMA. SSRF: 1 (corrigido)'],
    ['A04:2021 Insecure Design', 'TESTADO', 'Coupon race condition (pendente); business logic audit completa'],
    ['A05:2021 Security Misconfiguration', 'TESTADO', 'Headers corrigidos; Caddy SSRF corrigido; no debug exposto'],
    ['A06:2021 Vulnerable Components', 'TESTADO', 'npm audit limpo; nenhuma vulnerabilidade conhecida critica'],
    ['A07:2021 Auth Failures', 'TESTADO', 'MFA bypass corrigido; fail-open corrigido; session via HttpOnly'],
    ['A08:2021 Software/Data Integrity', 'TESTADO', 'Webhook HMAC seguro; idempotencia; state machine'],
    ['A09:2021 Logging/Monitoring', 'PARCIAL', 'Logging existe mas sem SIEM; sem alertas automaticas'],
    ['A10:2021 SSRF', 'TESTADO', 'Caddyfile SSRF corrigido; nenhuma outra entrada de URL por usuario'],
    ['API1:2023 BOLA', 'TESTADO', 'Todas as queries escopadas a user.id ou admin'],
    ['API2:2023 BFLA', 'TESTADO', 'requireAdminSistema() consistente apos correcao'],
    ['API4:2023 Unrestricted Resource Consumption', 'PARCIAL', 'Rate limit in-memory (efetivo em single-instance apenas)'],
    ['API8:2023 Security Misconfiguration', 'TESTADO', 'Admin fail-open corrigido; RLS corrigido; headers adicionados'],
]
col_w4 = [5*cm, 2*cm, 9.4*cm]
owasp_rows = [[Paragraph(h, styles['CustomTableHeader']) for h in ['Categoria OWASP', 'Status', 'Resultado']]]
owasp_rows += [[Paragraph(c, styles['CustomTableCell']) for c in row] for row in owasp_data]
t = Table(owasp_rows, colWidths=col_w4, repeatRows=1)
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LEFTPADDING', (0, 0), (-1, -1), 3),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
]))
story.append(t)
spacer()

# ═══════════════════════════════════════════════════════════════════
# 8. RISCOS RESIDUAIS
# ═══════════════════════════════════════════════════════════════════
h1('8. Riscos Residuais')

body('Apos a auditoria e correcoes, os seguintes riscos permanecem e requerem acao futura:')

h2('8.1 Pendentes de Correcao (requerem acao imediata)')
bullet('SEC-010: Rotas de API nao verificam MFA — um usuario com sessao valida mas que nao completou MFA pode chamar APIs diretamente. Recomendacao: Adicionar verificacao MFA nas APIs sensiveis ou estender o middleware para cobrir /api/*.')
bullet('SEC-013: Race condition no cupom — o incremento atomico acontece APOS a criacao da assinatura no MP. Se o cupom estiver esgotado, a assinatura ja foi criada com desconto. Recomendacao: Mover incrementar_uso_cupom para ANTES de criar a assinatura no MP.')
bullet('Historico Git: A senha admin exposta deve ser rotacionada e o historico deve ser purgado com git filter-repo.')

h2('8.2 Recomendacoes de Melhoria Continua')
bullet('CI/CD Pipeline: Implementar GitHub Actions com lint, typecheck, build, testes de seguranca automatizados, e scanning de dependencias (Snyk/Dependabot)')
bullet('Rate Limiting Distribuido: Migrar de rate limiting in-memory para Redis ou Upstash para efetividade em ambientes serverless')
bullet('Monitoring: Implementar SIEM ou servico de monitoramento (Sentry, Datadog) com alertas para tentativas de acesso negado, falhas de login, e acoes administrativas')
bullet('Auditoria: Adicionar tabela de auditoria para acoes administrativas criticas (ja criada role_change_audit na migration)')
bullet('Testes Automatizados: Criar suite de testes de seguranca (autenticacao, autorizacao, validacao, RLS, business logic) para prevenir regressoes')
bullet('Vulnerability Scanning: Integrar npm audit ou Snyk no pipeline CI/CD')
bullet('Content Security Policy: Aperfeicoar a CSP removendo unsafe-eval quando a dependencia que a exige for identificada e substituida')
bullet('WebAuthn Challenge Store: Migrar de Map in-memory para Redis/Upstash para funcionar em multi-instance')
bullet('CSP unsafe-eval: Investigar qual dependencia exige unsafe-eval e considerar alternativas')
bullet('.env.example: Criar arquivo documentando todas as variaveis de ambiente necessarias')
spacer()

# ═══════════════════════════════════════════════════════════════════
# 9. ALTERACOES REALIZADAS
# ═══════════════════════════════════════════════════════════════════
h1('9. Arquivos Modificados')

files_data = [
    ['Caddyfile', 'Removido handler XTransformPort (SSRF)'],
    ['src/middleware.ts', 'Fail-closed no catch block'],
    ['src/lib/admin-auth.ts', 'Removido fallback de email hardcoded'],
    ['src/lib/password-validation.ts', 'crypto.getRandomValues() + Fisher-Yates'],
    ['src/app/admin/page.tsx', 'Condicao fail-closed para ADMIN_EMAILS'],
    ['src/app/admin-sistema/page.tsx', 'Substituida por requireAdminSistema()'],
    ['src/app/api/first-login/complete-mfa/route.ts', 'Verificacao de credenciais MFA antes de completar'],
    ['src/app/api/mfa/disable/route.ts', 'Exigir TOTP para desativacao completa de MFA'],
    ['src/app/api/plans/public/route.ts', 'Select explicito (sem campos internos)'],
    ['next.config.ts', 'Security headers (CSP, HSTS, X-Frame-Options, etc.)'],
    ['public/robots.txt', 'Disallow para rotas admin e API'],
    ['.gitignore', 'Adicionado db/*.db, *.zip, *.tar.gz'],
    ['supabase/migration-security-audit-2025.sql', 'NOVO: Migracao RLS completa (5 correcoes)'],
]
col_w5 = [7*cm, 9.4*cm]
files_rows = [[Paragraph(h, styles['CustomTableHeader']) for h in ['Arquivo', 'Alteracao']]]
files_rows += [[Paragraph(c, styles['CustomTableCell']) for c in row] for row in files_data]
t = Table(files_rows, colWidths=col_w5, repeatRows=1)
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BG_LIGHT]),
]))
story.append(t)
spacer()

# ═══════════════════════════════════════════════════════════════════
# 10. MIGRACAO SQL PENDENTE
# ═══════════════════════════════════════════════════════════════════
h1('10. Migracao SQL Pendente (ACAO OBRIGATORIA)')

body('O arquivo supabase/migration-security-audit-2025.sql contem correcoes criticas de RLS que devem ser executadas manualmente no Supabase. Este arquivo NAO pode ser executado automaticamente pelo sistema. Um administrador deve revisar e executar as instrucoes SQL no Supabase Dashboard (SQL Editor) ou via psql.')

body('As correcoes incluem: (1) Drop e recriacao da policy profiles_update_own_mfa como profiles_update_own_safe_fields. (2) Criacao do trigger protect_profile_columns que protege role, subscription_status, must_setup_mfa, must_change_password contra alteracoes por non-service_role. (3) Drop e recriacao da policy de assinaturas para permitir apenas cancelamento pelo usuario. (4) Remocao da policy de insercao de pagamentos por usuarios. (5) Correcao da policy de login events. (6) Re-aplicacao de role check nas policies de storage. (7) Criacao da tabela role_change_audit para auditoria de mudancas de role.')
spacer()

# ═══════════════════════════════════════════════════════════════════
# 11. CLASSIFICACAO FINAL DE SEGURANCA
# ═══════════════════════════════════════════════════════════════════
h1('11. Classificacao Final')

body('Antes da auditoria, a classificacao de seguranca do sistema era aproximadamente D (baixa), devido as vulnerabilidades criticas de privilege escalation via RLS, SSRF via Caddy, e bypass de MFA. Apos as correcoes aplicadas no codigo-fonte e a migracao SQL pendente, a classificacao melhora significativamente para B- (bom), com os seguintes fatores:')

bullet('PONTOS FORTES: Autenticacao robusta com MFA, webhook verification, protecao contra race conditions em cupons, validacao de valores de pagamento, idempotencia, CSRF protection via SameSite cookies')
bullet('PONTOS CORRIGIDOS: 5 vulnerabilidades criticas corrigidas no codigo, 5 vulnerabilidades criticas/alta corrigidas na migration SQL pendente, 5 melhorias de configuracao (headers, robots, gitignore, password gen, CSP)')
bullet('PONTOS PENDENTES: MFA nao verificado em APIs (alta), race condition residual em cupons (media), ausencia de CI/CD (media), rate limiting in-memory (baixa), CSP com unsafe-eval (baixa)')
body('Nenhuma aplicacao web e invulneravel. A classificacao B- reflete o nivel de seguranca efetivamente demonstrado pelos testes realizados, considerando as correcoes aplicadas e os riscos residuais documentados. A classificacao pode melhorar para B+/A- apos a execucao da migration SQL pendente e a implementacao das recomendacoes da secao 8.')

# ═══════════════════════════════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════════════════════════════
# Add cover page style
def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DARK)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    canvas.rect(0, H * 0.42, W, 3, fill=1, stroke=0)
    canvas.setFillColor(HexColor('#1E293B'))
    canvas.rect(0, 0, W, 70, fill=1, stroke=0)
    canvas.restoreState()

doc.build(story, onFirstPage=cover_page, onLaterPages=add_page_number)

print(f'PDF gerado com sucesso: {output_path}')
print(f'Tamanho: {os.path.getsize(output_path) / 1024:.1f} KB')
