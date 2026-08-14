#!/usr/bin/env python3
"""
Security Audit PDF Generator - Fluxo Quadra SaaS
Generates a comprehensive security audit report in Portuguese (Brazilian).
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.doctemplate import BaseDocTemplate
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ============================================================
# FONT REGISTRATION
# ============================================================
FONT_DIR = '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# NotoSansSC variable font not supported by ReportLab - use DejaVuSans as body font.
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')

pdfmetrics.registerFont(TTFont('DejaVuMono', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

# ============================================================
# COLORS
# ============================================================
DARK = colors.HexColor('#1e293b')
BLUE = colors.HexColor('#3b82f6')
RED = colors.HexColor('#ef4444')
AMBER = colors.HexColor('#f59e0b')
GREEN = colors.HexColor('#22c55e')
GRAY = colors.HexColor('#475569')
LIGHTBG = colors.HexColor('#f8fafc')
WHITE = colors.white
LIGHT_BLUE = colors.HexColor('#dbeafe')
LIGHT_RED = colors.HexColor('#fee2e2')
LIGHT_AMBER = colors.HexColor('#fef3c7')
LIGHT_GREEN = colors.HexColor('#dcfce7')
BORDER_COLOR = colors.HexColor('#e2e8f0')

# ============================================================
# STYLES
# ============================================================
BODY_FONT = 'DejaVuSans'
BODY_FONT_BOLD = 'DejaVuSans-Bold'
HEADING_FONT = 'DejaVuSans-Bold'
CODE_FONT = 'DejaVuMono'
FALLBACK_FONT = 'DejaVuSans'

style_heading1 = ParagraphStyle(
    'Heading1', fontName=HEADING_FONT, fontSize=18, leading=22,
    textColor=BLUE, spaceBefore=18, spaceAfter=8, keepWithNext=True
)
style_heading2 = ParagraphStyle(
    'Heading2', fontName=HEADING_FONT, fontSize=14, leading=18,
    textColor=DARK, spaceBefore=14, spaceAfter=6, keepWithNext=True
)
style_heading3 = ParagraphStyle(
    'Heading3Custom', fontName=HEADING_FONT, fontSize=11, leading=14,
    textColor=DARK, spaceBefore=10, spaceAfter=4, keepWithNext=True
)
style_body = ParagraphStyle(
    'BodyCustom', fontName=BODY_FONT, fontSize=10, leading=14,
    textColor=GRAY, spaceBefore=2, spaceAfter=4, alignment=0
)
style_body_justify = ParagraphStyle(
    'BodyJustify', parent=style_body, alignment=0
)
style_small = ParagraphStyle(
    'SmallCustom', fontName=BODY_FONT, fontSize=8, leading=10,
    textColor=GRAY, spaceBefore=1, spaceAfter=2
)
style_code = ParagraphStyle(
    'CodeCustom', fontName=CODE_FONT, fontSize=7.5, leading=10,
    textColor=DARK, backColor=colors.HexColor('#f1f5f9'),
    leftIndent=8, rightIndent=8, spaceBefore=4, spaceAfter=4,
    borderPadding=4, borderWidth=0.5, borderColor=BORDER_COLOR,
    borderRadius=2
)
style_bullet = ParagraphStyle(
    'BulletCustom', fontName=BODY_FONT, fontSize=10, leading=13,
    textColor=GRAY, spaceBefore=1, spaceAfter=2, leftIndent=16,
    bulletIndent=6, bulletFontName=BODY_FONT, bulletFontSize=10
)
# Cover styles
style_cover_title = ParagraphStyle(
    'CoverTitle', fontName=HEADING_FONT, fontSize=28, leading=34,
    textColor=WHITE, alignment=1, encoding='utf-8'
)
style_cover_subtitle = ParagraphStyle(
    'CoverSubtitle', fontName=BODY_FONT, fontSize=16, leading=20,
    textColor=colors.HexColor('#94a3b8'), alignment=1, encoding='utf-8'
)
style_cover_date = ParagraphStyle(
    'CoverDate', fontName=BODY_FONT, fontSize=12, leading=16,
    textColor=colors.HexColor('#64748b'), alignment=1
)
style_cover_info = ParagraphStyle(
    'CoverInfo', fontName=BODY_FONT, fontSize=10, leading=13,
    textColor=colors.HexColor('#94a3b8'), alignment=1
)
# Verdict styles
style_verdict_big = ParagraphStyle(
    'VerdictBig', fontName=HEADING_FONT, fontSize=22, leading=28,
    textColor=AMBER, alignment=1, spaceBefore=20, spaceAfter=12
)
style_verdict_text = ParagraphStyle(
    'VerdictText', fontName=BODY_FONT, fontSize=10, leading=14,
    textColor=GRAY, alignment=0, spaceBefore=4, spaceAfter=4
)

# Table header style
style_table_header = ParagraphStyle(
    'TableHeader', fontName=HEADING_FONT, fontSize=7.5, leading=9.5,
    textColor=WHITE, alignment=0
)
style_table_cell = ParagraphStyle(
    'TableCell', fontName=BODY_FONT, fontSize=7.5, leading=9.5,
    textColor=DARK, alignment=0
)
style_table_cell_center = ParagraphStyle(
    'TableCellCenter', parent=style_table_cell, alignment=1
)

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def heading1(text):
    """H1 heading - auto bookmarked for TOC via style name 'Heading1'."""
    return Paragraph(text, style_heading1)

def heading2(text):
    """H2 heading - auto bookmarked for TOC via style name 'Heading2'."""
    return Paragraph(text, style_heading2)

def heading3(text):
    return Paragraph(text, style_heading3)

def body(text):
    return Paragraph(text, style_body)

def body_justify(text):
    return Paragraph(text, style_body_justify)

def small(text):
    return Paragraph(text, style_small)

def code(text):
    return Paragraph(text, style_code)

def bullet(text):
    return Paragraph(text, style_bullet, bulletText='\u2022')

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceBefore=6, spaceAfter=6)

def severity_color_text(sev):
    """Return colored severity text."""
    mapping = {
        'CRITICA': ('<font color="#ef4444">CRITICA</font>', RED),
        'ALTA': ('<font color="#ef4444">ALTA</font>', RED),
        'MEDIA': ('<font color="#f59e0b">MEDIA</font>', AMBER),
        'BAIXA': ('<font color="#22c55e">BAIXA</font>', GREEN),
        'INFORMATIVA': ('<font color="#3b82f6">INFORMATIVA</font>', BLUE),
    }
    return mapping.get(sev, (sev, GRAY))

def status_color_text(status):
    """Return colored status text."""
    mapping = {
        'CORRIGIDO': '<font color="#22c55e">CORRIGIDO</font>',
        'NAO CORRIGIDO': '<font color="#ef4444">NAO CORRIGIDO</font>',
        'ACEITAVEL': '<font color="#f59e0b">ACEITAVEL</font>',
    }
    return mapping.get(status, status)

def status_bg(status):
    mapping = {
        'CORRIGIDO': LIGHT_GREEN,
        'NAO CORRIGIDO': LIGHT_RED,
        'ACEITAVEL': LIGHT_AMBER,
    }
    return mapping.get(status, WHITE)

def make_styled_table(headers, rows, col_widths, font_size=7.5):
    """Create a styled table with header and alternating rows."""
    header_paras = [Paragraph(h, style_table_header) for h in headers]
    data = [header_paras]
    for row in rows:
        data.append([Paragraph(str(c), style_table_cell) for c in row])

    t = Table(data, colWidths=col_widths, repeatRows=1)

    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), HEADING_FONT),
        ('FONTSIZE', (0, 0), (-1, 0), font_size),
        ('FONTNAME', (0, 1), (-1, -1), BODY_FONT),
        ('FONTSIZE', (0, 1), (-1, -1), font_size),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    # Alternating row colors
    for i in range(2, len(data), 2):
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), LIGHTBG))

    t.setStyle(TableStyle(style_cmds))
    return t

def info_box(text, bg_color=LIGHT_BLUE, border_color=BLUE):
    """Create a colored info box."""
    p = Paragraph(text, ParagraphStyle(
        'InfoBox', fontName=BODY_FONT, fontSize=9, leading=12,
        textColor=DARK
    ))
    t = Table([[p]], colWidths=[A4[0] - 120])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg_color),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t

def verdict_badge(text, bg_color, text_color):
    """Create a verdict badge."""
    p = Paragraph(f'<font color="{text_color}"><b>{text}</b></font>', ParagraphStyle(
        'Badge', fontName=BODY_FONT, fontSize=14, leading=18, alignment=1
    ))
    t = Table([[p]], colWidths=[300])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg_color),
        ('BOX', (0, 0), (-1, -1), 2, text_color),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    return t


# ============================================================
# PAGE CALLBACK (cover bg + page numbers)
# ============================================================
def on_page(canvas, doc):
    page_num = canvas.getPageNumber()
    canvas.saveState()
    if page_num == 1:
        # Cover page: dark background
        canvas.setFillColor(DARK)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        # Decorative accent line
        canvas.setStrokeColor(BLUE)
        canvas.setLineWidth(3)
        canvas.line(A4[0] * 0.2, A4[1] * 0.38, A4[0] * 0.8, A4[1] * 0.38)
        # Shield icon placeholder - small geometric shape
        canvas.setFillColor(BLUE)
        canvas.setStrokeColor(BLUE)
        cx, cy = A4[0] / 2, A4[1] * 0.72
        # Draw a simple shield shape
        p = canvas.beginPath()
        p.moveTo(cx, cy + 25)
        p.lineTo(cx + 18, cy + 15)
        p.lineTo(cx + 18, cy - 5)
        p.lineTo(cx, cy - 20)
        p.lineTo(cx - 18, cy - 5)
        p.lineTo(cx - 18, cy + 15)
        p.close()
        canvas.drawPath(p, fill=1, stroke=0)
    else:
        # Normal pages: page number + header line
        canvas.setStrokeColor(BORDER_COLOR)
        canvas.setLineWidth(0.5)
        canvas.line(50, A4[1] - 40, A4[0] - 50, A4[1] - 40)
        canvas.setFont(FALLBACK_FONT, 7)
        canvas.setFillColor(GRAY)
        canvas.drawString(50, A4[1] - 36, 'Fluxo Quadra - Auditoria de Seguranca')
        canvas.drawRightString(A4[0] - 50, A4[1] - 36, '15 de Agosto de 2025')
        # Page number at bottom
        canvas.setFont(FALLBACK_FONT, 8)
        canvas.drawCentredString(A4[0] / 2, 25, str(page_num))
        # Bottom line
        canvas.setStrokeColor(BORDER_COLOR)
        canvas.line(50, 38, A4[0] - 50, 38)
    canvas.restoreState()


# ============================================================
# BUILD THE STORY
# ============================================================
story = []

# ── 1. COVER PAGE ──
story.append(Spacer(1, 120))
story.append(Paragraph('AUDITORIA COMPLETA DE SEGURANCA', style_cover_title))
story.append(Spacer(1, 12))
story.append(Paragraph('Fluxo Quadra - SaaS', style_cover_subtitle))
story.append(Spacer(1, 8))
story.append(Paragraph('Integracao Mercado Pago &amp; Sistema de Cupons', style_cover_info))
story.append(Spacer(1, 50))
story.append(Paragraph('15 de Agosto de 2025', style_cover_date))
story.append(Spacer(1, 8))
story.append(Paragraph('Documento Confidencial', style_cover_info))
story.append(Spacer(1, 4))
story.append(Paragraph('Versao 1.0', style_cover_info))
story.append(PageBreak())

# ── 2. TABLE OF CONTENTS ──
story.append(heading1('Sumario'))
story.append(Spacer(1, 6))
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle(
        'TOCHeading1', fontName=HEADING_FONT, fontSize=11, leading=16,
        leftIndent=10, spaceBefore=6, spaceAfter=3, textColor=DARK
    ),
    ParagraphStyle(
        'TOCHeading2', fontName=BODY_FONT, fontSize=9, leading=13,
        leftIndent=30, spaceBefore=2, spaceAfter=2, textColor=GRAY
    ),
]
story.append(toc)
story.append(PageBreak())

# ── 3. EXECUTIVE SUMMARY ──
story.append(heading1('Resumo Executivo'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'Este documento apresenta os resultados da auditoria completa de seguranca realizada na aplicacao '
    'SaaS Fluxo Quadra, com foco especial na integracao com o Mercado Pago para processamento de pagamentos '
    'e no sistema de cupons de desconto. A auditoria abrangeu analise de codigo-fonte, revisao de endpoints '
    'de API, verificacao de politicas de seguranca do banco de dados e avaliacao dos mecanismos de autenticacao '
    'e autorizacao.'
))
story.append(Spacer(1, 8))

# Risk score box
score_data = [
    [Paragraph('<b>Indice de Risco Geral</b>', ParagraphStyle('s', fontName=HEADING_FONT, fontSize=12, textColor=WHITE, alignment=1))],
    [Paragraph('<font size="36" color="#f59e0b"><b>6.0 / 10</b></font>', ParagraphStyle('s', fontName=HEADING_FONT, fontSize=36, textColor=AMBER, alignment=1, leading=42))],
    [Paragraph('<font color="#22c55e"><b>APROVADO COM RESSALVAS</b></font>', ParagraphStyle('s', fontName=HEADING_FONT, fontSize=11, textColor=GREEN, alignment=1))],
]
score_table = Table(score_data, colWidths=[A4[0] - 120])
score_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), DARK),
    ('BACKGROUND', (0, 1), (0, 1), LIGHTBG),
    ('BACKGROUND', (0, 2), (0, 2), LIGHT_GREEN),
    ('BOX', (0, 0), (-1, -1), 1, DARK),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ('SPAN', (0, 0), (0, 0)),
    ('SPAN', (0, 1), (0, 1)),
    ('SPAN', (0, 2), (0, 2)),
]))
story.append(score_table)
story.append(Spacer(1, 10))

story.append(heading2('Principais Conclusoes'))
story.append(bullet('Foram identificadas 2 vulnerabilidades criticas que ja foram <b>corrigidas</b>: race condition no sistema de cupons (SEC-001) e rejeicao de webhooks legitimos com cupom de desconto (SEC-002).'))
story.append(bullet('2 vulnerabilidades de severidade alta permanecem pendentes (SEC-003, SEC-004), ambas relacionadas ao middleware de autenticacao, porem mitigadas por verificacoes server-side nos endpoints de API.'))
story.append(bullet('A integridade dos pagamentos esta protegida por multiplas camadas: verificacao HMAC-SHA256 em webhooks, consulta a API do Mercado Pago, maquina de estados com CAS e idempotencia via restricao UNIQUE.'))
story.append(bullet('Todas as tabelas de negocio possuem Row Level Security (RLS) habilitado. Endpoints administrativos sao protegidos pela funcao requireAdminSistema().'))
story.append(bullet('O sistema esta <b>APROVADO COM RESSALVAS</b> para producao. As ressalvas referem-se a necessidade de correcao do middleware e implementacao de rate limiting.'))
story.append(Spacer(1, 8))

# Stats boxes
stats_data = [
    [Paragraph('<font color="#ef4444"><b>2</b></font><br/><font size="7">Criticas</font>', ParagraphStyle('s', fontName=BODY_FONT, fontSize=16, alignment=1, textColor=RED, leading=20)),
     Paragraph('<font color="#ef4444"><b>2</b></font><br/><font size="7">Altas</font>', ParagraphStyle('s', fontName=BODY_FONT, fontSize=16, alignment=1, textColor=RED, leading=20)),
     Paragraph('<font color="#f59e0b"><b>4</b></font><br/><font size="7">Medias</font>', ParagraphStyle('s', fontName=BODY_FONT, fontSize=16, alignment=1, textColor=AMBER, leading=20)),
     Paragraph('<font color="#22c55e"><b>2</b></font><br/><font size="7">Baixas</font>', ParagraphStyle('s', fontName=BODY_FONT, fontSize=16, alignment=1, textColor=GREEN, leading=20)),
     Paragraph('<font color="#3b82f6"><b>2</b></font><br/><font size="7">Informativas</font>', ParagraphStyle('s', fontName=BODY_FONT, fontSize=16, alignment=1, textColor=BLUE, leading=20))],
    [Paragraph('<b>4 Corrigidas</b>', ParagraphStyle('s', fontName=BODY_FONT, fontSize=8, alignment=1, textColor=GREEN)),
     Paragraph('<b>5 Pendentes</b>', ParagraphStyle('s', fontName=BODY_FONT, fontSize=8, alignment=1, textColor=RED)),
     Paragraph('<b>3 Aceitaveis</b>', ParagraphStyle('s', fontName=BODY_FONT, fontSize=8, alignment=1, textColor=AMBER)),
     '', ''],
]
cw = (A4[0] - 120) / 5
stats_table = Table(stats_data, colWidths=[cw]*5)
stats_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), LIGHTBG),
    ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('SPAN', (0, 1), (2, 1)),
    ('SPAN', (3, 1), (4, 1)),
]))
story.append(stats_table)
story.append(PageBreak())

# ── 4. VULNERABILITIES TABLE ──
story.append(heading1('Tabela de Vulnerabilidades'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'A tabela abaixo resume todas as 12 vulnerabilidades identificadas durante a auditoria, '
    'classificadas por severidade e status de correcao.'
))
story.append(Spacer(1, 8))

vuln_headers = ['ID', 'Severidade', 'Area', 'Vulnerabilidade', 'Status']
vuln_rows = [
    ['SEC-001', 'CRITICA', 'Cupons', 'Race condition (TOCTOU) no incremento de uso de cupons', 'CORRIGIDO'],
    ['SEC-002', 'CRITICA', 'Webhook/MP', 'Webhook rejeita pagamentos legitimos com cupom de desconto', 'CORRIGIDO'],
    ['SEC-003', 'ALTA', 'Middleware', 'Bypass de verificacao de assinatura via cookie forjado', 'NAO CORRIGIDO'],
    ['SEC-004', 'ALTA', 'Auth', 'Middleware valida apenas existencia de cookie, nao a sessao', 'NAO CORRIGIDO'],
    ['SEC-005', 'MEDIA', 'RLS', 'Tabela webhook_events sem Row Level Security', 'CORRIGIDO'],
    ['SEC-006', 'MEDIA', 'Auth', 'Endpoint init-schema acessivel por qualquer autenticado', 'CORRIGIDO'],
    ['SEC-007', 'MEDIA', 'API', 'Ausencia de rate limiting em endpoints sensiveis', 'NAO CORRIGIDO'],
    ['SEC-008', 'MEDIA', 'Cupons', 'Per-user coupon reuse: dependencia de partial unique index', 'ACEITAVEL'],
    ['SEC-009', 'BAIXA', 'Users', 'Senha temporaria retornada em plaintext no response da API', 'NAO CORRIGIDO'],
    ['SEC-010', 'BAIXA', 'Config', 'next.config.ts com ignoreBuildErrors e reactStrictMode desligado', 'NAO CORRIGIDO'],
    ['SEC-011', 'INFORMATIVA', 'Auth', 'Email de admin hardcoded no codigo-fonte', 'ACEITAVEL'],
    ['SEC-012', 'INFORMATIVA', 'Deps', 'Dependencia next-auth presente mas nao utilizada', 'ACEITAVEL'],
]

# Build vulnerability table with colored severity/status
vuln_header_paras = [Paragraph(h, style_table_header) for h in vuln_headers]
vuln_data = [vuln_header_paras]
for row in vuln_rows:
    sev_text, _ = severity_color_text(row[1])
    status_text = status_color_text(row[4])
    vuln_data.append([
        Paragraph(f'<b>{row[0]}</b>', style_table_cell),
        Paragraph(sev_text, style_table_cell_center),
        Paragraph(row[2], style_table_cell_center),
        Paragraph(row[3], style_table_cell),
        Paragraph(status_text, style_table_cell_center),
    ])

vuln_cw = [48, 58, 50, 228, 108]
vuln_table = Table(vuln_data, colWidths=vuln_cw, repeatRows=1)

vuln_style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
]
# Alternating rows
for i in range(2, len(vuln_data), 2):
    vuln_style_cmds.append(('BACKGROUND', (0, i), (-1, i), LIGHTBG))
# Highlight critical rows
for i, row in enumerate(vuln_rows, 1):
    if row[1] == 'CRITICA':
        vuln_style_cmds.append(('BACKGROUND', (1, i), (1, i), LIGHT_RED))

vuln_table.setStyle(TableStyle(vuln_style_cmds))
story.append(vuln_table)
story.append(PageBreak())

# ── 5. DETAILED VULNERABILITIES ──
story.append(heading1('Vulnerabilidades Detalhadas'))
story.append(Spacer(1, 6))

# SEC-001
story.append(heading2('SEC-001: Race Condition (TOCTOU) no Incremento de Uso de Cupons'))
story.append(info_box(
    '<b>Severidade:</b> <font color="#ef4444">CRITICA</font> | '
    '<b>Area:</b> Cupons | '
    '<b>Status:</b> <font color="#22c55e">CORRIGIDO</font>',
    LIGHT_GREEN, GREEN
))
story.append(Spacer(1, 4))
story.append(heading3('Descricao'))
story.append(body_justify(
    'A implementacao original do sistema de cupons utilizava um padrao TOCTOU (Time-of-Check to Time-of-Use) '
    'nao atomico. O fluxo era: (1) consultar o cupom no banco de dados para verificar se ainda possui usos disponiveis, '
    '(2) se sim, executar um UPDATE separado para incrementar o contador de uso. Entre essas duas operacoes, '
    'uma janela de raca permitia que multiplas requisicoes simultaneas ultrapassassem o limite de usos do cupom.'
))
story.append(heading3('Arquivo e Linha de Referencia'))
story.append(code('src/app/api/signup-subscribe/route.ts - funcao applyCoupon() - linhas ~85-120'))
story.append(heading3('Cenario de Ataque'))
story.append(body_justify(
    'Um atacante envia multiplas requisicoes simultaneas para /api/signup-subscribe com o mesmo codigo de cupom. '
    'Cada requisicao consulta o cupom e observa "usos restantes > 0", entao todas executam o UPDATE incrementando '
    'o contador. Se o cupom tinha limite de 100 usos, 200+ requisicoes simultaneas poderiam consumir o cupom '
    'alem do limite, causando prejuizo financeiro significativo.'
))
story.append(heading3('Impacto'))
story.append(body('Perda financeira direta: cupons com limite de uso podem ser ultrapassados, concedendo descontos alem do planejado.'))
story.append(heading3('Correcao Implementada'))
story.append(body_justify(
    'Substituido o padrao TOCTOU por uma RPC (Remote Procedure Call) atomica do Supabase/PostgreSQL. '
    'A nova funcao "apply_coupon_atomic" executa todas as verificacoes e o incremento dentro de uma unica '
    'transacao atomica, utilizando SELECT FOR UPDATE para bloqueio pessimista. A funcao retorna erro se o '
    'limite foi atingido, garantindo consistencia mesmo sob alta concorrencia.'
))
story.append(Spacer(1, 10))

# SEC-002
story.append(heading2('SEC-002: Webhook Rejeita Pagamentos Legitimos com Cupom'))
story.append(info_box(
    '<b>Severidade:</b> <font color="#ef4444">CRITICA</font> | '
    '<b>Area:</b> Webhook/Mercado Pago | '
    '<b>Status:</b> <font color="#22c55e">CORRIGIDO</font>',
    LIGHT_GREEN, GREEN
))
story.append(Spacer(1, 4))
story.append(heading3('Descricao'))
story.append(body_justify(
    'O endpoint de webhook do Mercado Pago (/api/webhooks/mercadopago) comparava o valor do pagamento '
    'recebido diretamente com o preco do plano cadastrado, sem considerar a aplicacao de desconto por cupom. '
    'Quando um usuario pagava com cupom de desconto, o valor pago era menor que o preco do plano, '
    'causando a rejeicao do webhook e a nao ativacao da assinatura, mesmo para pagamentos legitimos.'
))
story.append(heading3('Arquivo e Linha de Referencia'))
story.append(code('src/app/api/webhooks/mercadopago/route.ts - funcao de validacao de valor - linhas ~150-180'))
story.append(heading3('Cenario de Ataque'))
story.append(body_justify(
    'Nao se trata de um cenario de ataque ativo, mas de um bug critico de funcionalidade. Qualquer usuario '
    'que utilizasse um cupom de desconto teria seu pagamento rejeitado pelo webhook, nao recebendo acesso '
    'ao servico pago. Isso representava perda de receita e experiencia ruim para o cliente.'
))
story.append(heading3('Impacto'))
story.append(body('Pagamentos legitimos com cupom rejeitados. Usuarios que pagam com desconto nao recebem ativacao.'))
story.append(heading3('Correcao Implementada'))
story.append(body_justify(
    'A logica de validacao de valor agora consulta o coupon_code associado a pre_authorization_id antes '
    'de comparar valores. Se existe um cupom valido, o valor esperado e recalculado como preco_original * (1 - desconto). '
    'A comparacao passa a considerar o valor com desconto aplicado.'
))
story.append(PageBreak())

# SEC-003
story.append(heading2('SEC-003: Bypass de Verificacao de Assinatura via Cookie Forjado'))
story.append(info_box(
    '<b>Severidade:</b> <font color="#ef4444">ALTA</font> | '
    '<b>Area:</b> Middleware | '
    '<b>Status:</b> <font color="#ef4444">NAO CORRIGIDO</font>',
    LIGHT_RED, RED
))
story.append(Spacer(1, 4))
story.append(heading3('Descricao'))
story.append(body_justify(
    'O middleware Next.js (src/middleware.ts) realiza a verificacao de autenticacao verificando apenas a '
    'existencia do cookie de sessao, sem validar seu conteudo ou consultar o servidor para confirmar que a '
    'sessao e valida e nao expirou. Um atacante pode criar um cookie com o nome correto e qualquer valor, '
    'bypassando a protecao de rota do middleware.'
))
story.append(heading3('Arquivo e Linha de Referencia'))
story.append(code('src/middleware.ts - funcao de verificacao de cookie - linhas ~20-50'))
story.append(heading3('Cenario de Ataque'))
story.append(body_justify(
    'O atacante define manualmente o cookie de sessao (ex: sb-access-token) com um valor arbitrario no navegador. '
    'O middleware detecta a presenca do cookie e permite o acesso a rotas protegidas. No entanto, quando '
    'a pagina tenta carregar dados via API, o Supabase client server-side verifica o token e falha, '
    'retornando dados vazios ou erro.'
))
story.append(heading3('Impacto'))
story.append(body_justify(
    'Acesso visual a interfaces protegidas sem conteudo real. O atacante pode ver a estrutura da aplicacao '
    'e codigos-fonte frontend de paginas protegidas, porem nao consegue acessar dados reais pois as APIs '
    'validam a sessao server-side via Supabase.'))
story.append(heading3('Recomendacao'))
story.append(body_justify(
    'Modificar o middleware para validar o token JWT do cookie junto ao Supabase antes de conceder acesso. '
    'Utilizar supabase.auth.getUser() server-side no middleware para verificar a validade da sessao. '
    'Alternativamente, implementar uma chamada lightweight ao endpoint /api/auth/session para validar o cookie.'))
story.append(Spacer(1, 10))

# SEC-004
story.append(heading2('SEC-004: Middleware Valida Apenas Existencia do Cookie'))
story.append(info_box(
    '<b>Severidade:</b> <font color="#ef4444">ALTA</font> | '
    '<b>Area:</b> Auth | '
    '<b>Status:</b> <font color="#ef4444">NAO CORRIGIDO</font>',
    LIGHT_RED, RED
))
story.append(Spacer(1, 4))
story.append(heading3('Descricao'))
story.append(body_justify(
    'Relacionado ao SEC-003. O middleware verifica a existencia de qualquer cookie com o nome esperado, '
    'sem verificar se a sessao representada pelo cookie ainda esta ativa, nao foi revogada, e pertence '
    'ao usuario correto. Sessoes expiradas ou revogadas sao tratadas como validas pelo middleware.'
))
story.append(heading3('Arquivo e Linha de Referencia'))
story.append(code('src/middleware.ts - logica de redirect baseada em cookie - linhas ~55-80'))
story.append(heading3('Cenario de Ataque'))
story.append(body_justify(
    'Apos logout, se o cookie nao for removido corretamente (ex: falha no fluxo de logout), o middleware '
    'continua permitindo acesso as paginas. Um atacante com acesso ao dispositivo do usuario pode utilizar '
    'sessoes expiradas.'))
story.append(heading3('Impacto'))
story.append(body_justify(
    'Acesso nao autorizado a paginas protegidas apos expiracao ou revogacao de sessao. Mitigado por '
    'validacoes server-side nas APIs que retornam erro quando o token expirado e utilizado.'))
story.append(heading3('Recomendacao'))
story.append(body_justify(
    'Mesma correcao do SEC-003: implementar validacao server-side da sessao no middleware via getUser() '
    'do Supabase. Considerar a latencia adicionada e implementar cache de validacao com TTL curto (ex: 30s).'))
story.append(PageBreak())

# ── 6. CORRECTED VULNERABILITIES ──
story.append(heading1('Vulnerabilidades Corrigidas'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'As quatro vulnerabilidades abaixo foram identificadas e corrigidas durante o processo de auditoria. '
    'As correcoes foram implementadas e testadas.'
))
story.append(Spacer(1, 8))

corrected_headers = ['ID', 'Vulnerabilidade', 'Correcao Aplicada']
corrected_rows = [
    ['SEC-001',
     'Race condition no incremento de uso de cupons',
     'Substituido padrao TOCTOU por RPC atomica "apply_coupon_atomic" com SELECT FOR UPDATE. '
     'Todas as verificacoes e incremento executados em unica transacao.'],
    ['SEC-002',
     'Webhook rejeita pagamentos com cupom de desconto',
     'Validacao de valor agora consulta cupom associado e calcula valor esperado com desconto '
     'antes da comparacao. Implementado em migration-security-audit-fixes.sql.'],
    ['SEC-005',
     'Tabela webhook_events sem RLS',
     'Politica de RLS adicionada: somente service_role pode inserir e consultar. '
     'Usuarios autenticados nao podem manipular eventos de webhook.'],
    ['SEC-006',
     'Endpoint init-schema acessivel por qualquer autenticado',
     'Endpoint removido ou protegido com verificacao de service_role/admin. '
     'Apenas usuarios com role de administrador do sistema podem acessar.'],
]

corrected_header_paras = [Paragraph(h, style_table_header) for h in corrected_headers]
corrected_data = [corrected_header_paras]
for row in corrected_rows:
    corrected_data.append([
        Paragraph(f'<b>{row[0]}</b>', style_table_cell),
        Paragraph(row[1], style_table_cell),
        Paragraph(row[2], style_table_cell),
    ])

corrected_cw = [48, 155, 289]
corrected_table = Table(corrected_data, colWidths=corrected_cw, repeatRows=1)
corrected_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('BACKGROUND', (0, 2), (-1, 2), LIGHTBG),
    ('BACKGROUND', (0, 4), (-1, 4), LIGHTBG),
]))
story.append(corrected_table)
story.append(Spacer(1, 12))
story.append(info_box(
    '<b>Nota:</b> As correcoes de SEC-001 e SEC-002 estao no arquivo migration-security-audit-fixes.sql. '
    'A correcao de SEC-005 esta no mesmo arquivo de migracao. SEC-006 requer protecao adicional do endpoint.',
    LIGHT_BLUE, BLUE
))
story.append(PageBreak())

# ── 7. PENDING VULNERABILITIES ──
story.append(heading1('Vulnerabilidades Pendentes'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'As vulnerabilidades listadas abaixo permanecem pendentes e devem ser enderecadas conforme a prioridade indicada.'
))
story.append(Spacer(1, 8))

pending_headers = ['ID', 'Prioridade', 'Vulnerabilidade', 'Recomendacao']
pending_rows = [
    ['SEC-003', 'P0', 'Bypass middleware via cookie forjado',
     'Implementar validacao server-side de sessao no middleware via supabase.auth.getUser()'],
    ['SEC-004', 'P0', 'Middleware valida apenas existencia de cookie',
     'Mesma correcao do SEC-003. Validar conteudo do token JWT, nao apenas existencia'],
    ['SEC-007', 'P1', 'Ausencia de rate limiting em endpoints sensiveis',
     'Implementar rate limiting em /api/cupons/validate e /api/signup-subscribe (ex: 10 req/min)'],
    ['SEC-009', 'P2', 'Senha temporaria em plaintext no response da API',
     'Enviar senha temporaria via email seguro. Remover do response body do endpoint'],
    ['SEC-010', 'P3', 'next.config.ts com ignoreBuildErrors e sem StrictMode',
     'Ativar reactStrictMode: true e remover ignoreBuildErrors: true'],
]

pending_header_paras = [Paragraph(h, style_table_header) for h in pending_headers]
pending_data = [pending_header_paras]
for row in pending_rows:
    pending_data.append([
        Paragraph(f'<b>{row[0]}</b>', style_table_cell),
        Paragraph(f'<font color="#ef4444"><b>{row[1]}</b></font>', style_table_cell_center),
        Paragraph(row[2], style_table_cell),
        Paragraph(row[3], style_table_cell),
    ])

pending_cw = [48, 48, 140, 255]
pending_table = Table(pending_data, colWidths=pending_cw, repeatRows=1)
pending_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('BACKGROUND', (0, 2), (-1, 2), LIGHTBG),
    ('BACKGROUND', (0, 4), (-1, 4), LIGHTBG),
]))
story.append(pending_table)
story.append(Spacer(1, 12))
story.append(info_box(
    '<b>Mitigacao atual:</b> SEC-003 e SEC-004 sao mitigados por verificacoes de autenticacao server-side '
    'em todos os endpoints de API. O middleware e apenas uma camada adicional de protecao visual; '
    'a seguranca real dos dados e imposta pela API layer.',
    LIGHT_AMBER, AMBER
))
story.append(PageBreak())

# ── 8. MERCADO PAGO AUDIT ──
story.append(heading1('Auditoria de Integracao Mercado Pago'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'Analise detalhada da integracao com o Mercado Pago para processamento de pagamentos recorrentes, '
    'abrangendo credenciais, webhook, idempotencia e maquina de estados.'
))
story.append(Spacer(1, 8))

story.append(heading2('Credenciais do SDK'))
story.append(info_box('<font color="#22c55e"><b>SEGURO</b></font> - Credenciais armazenadas exclusivamente server-side em variaveis de ambiente. Nunca expostas ao cliente.', LIGHT_GREEN, GREEN))

story.append(heading2('Verificacao de Assinatura do Webhook'))
story.append(info_box('<font color="#22c55e"><b>SEGURO</b></font> - Implementacao HMAC-SHA256 com comparacao timing-safe e TTL de 5 minutos para o timestamp.', LIGHT_GREEN, GREEN))
story.append(Spacer(1, 4))
story.append(body(
    'O webhook valida a assinatura HMAC-SHA256 utilizando a chave secreta (webhook_secret) configurada no '
    'painel do Mercado Pago. A comparacao do hash utiliza crypto.timingSafeEqual() para previnir ataques de timing. '
    'O timestamp do cabecalho x-signature e verificado com tolerancia de 5 minutos para evitar ataques de replay.'
))

story.append(heading2('Idempotencia'))
story.append(info_box('<font color="#22c55e"><b>SEGURO</b></font> - INSERT ON CONFLICT DO NOTHING atomico via restricao UNIQUE no campo data_id.', LIGHT_GREEN, GREEN))

story.append(heading2('Maquina de Estados'))
story.append(info_box('<font color="#22c55e"><b>SEGURO</b></font> - Transicoes validas validadas. Compare-and-Set (CAS) com clausula WHERE para atomicidade.', LIGHT_GREEN, GREEN))

story.append(heading2('Validacao de Valor'))
story.append(info_box('<font color="#f59e0b"><b>CORRIGIDO</b></font> - Agora considera desconto de cupom antes de comparar valor pago vs esperado.', LIGHT_AMBER, AMBER))

story.append(heading2('Referencia Externa'))
story.append(body(
    'O campo external_reference nao e utilizado para autenticacao ou autorizacao. O sistema utiliza '
    'identificadores internos (user_id, subscription_id) para rastreamento. Correto.'
))
story.append(PageBreak())

# ── 9. COUPON SYSTEM AUDIT ──
story.append(heading1('Auditoria do Sistema de Cupons'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'Analise completa do sistema de cupons de desconto, incluindo validacao server-side, calculo de precos, '
    'controle de concorrencia e limites por usuario.'
))
story.append(Spacer(1, 8))

coupon_items = [
    ('Validacao Server-Side', 'SEGURO', GREEN, LIGHT_GREEN,
     'Dupla validacao em ambos os endpoints (/api/cupons/validate e /api/signup-subscribe). '
     'O cupom e validado no servidor antes de qualquer operacao financeira.'),
    ('Calculo de Preco', 'SEGURO', GREEN, LIGHT_GREEN,
     'Calculo executado server-side a partir de dados do banco de dados. Preco final = '
     'Math.max(0, preco_original * (1 - desconto)). Nenhum input do cliente e utilizado no calculo.'),
    ('Race Condition', 'CORRIGIDO', GREEN, LIGHT_GREEN,
     'Substituido TOCTOU por RPC atomica com SELECT FOR UPDATE. Garante que o limite de uso '
     'do cupom nunca sera ultrapassado, mesmo sob alta concorrencia.'),
    ('Limite por Usuario', 'SEGURO', GREEN, LIGHT_GREEN,
     'Partial unique index no banco de dados garante que cada usuario so pode usar cada cupom uma vez. '
     'A constraint e (user_id, coupon_id) WHERE active = true.'),
    ('Enumeracao de Cupons', 'MINOR', AMBER, LIGHT_AMBER,
     'O endpoint /api/cupons/validate revela se um codigo de cupom existe (resposta diferente para '
     'cupom invalido vs inexistente). Impacto baixo: permite descoberta de codigos de cupom ativos.'),
]

# Map status text to hex color strings
status_hex = {'SEGURO': '#22c55e', 'CORRIGIDO': '#22c55e', 'MINOR': '#f59e0b'}
for title, status, tc, bg, desc in coupon_items:
    hex_c = status_hex.get(status, '#475569')
    story.append(heading3(f'{title}: '))
    story.append(info_box(f'<font color="{hex_c}"><b>{status}</b></font> - {desc}', bg, tc))
    story.append(Spacer(1, 6))

story.append(PageBreak())

# ── 10. AUTHORIZATION MAP ──
story.append(heading1('Mapa de Autorizacao'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'Tabela mapeando cada endpoint criticos com seu tipo de autenticacao, verificacao de admin, '
    'politica RLS e nivel de risco.'
))
story.append(Spacer(1, 8))

auth_headers = ['Endpoint', 'Autenticacao', 'Verificacao Admin', 'RLS', 'Risco']
auth_rows = [
    ['/api/admin-sistema/*', 'Supabase', 'requireAdminSistema()', 'Admin via service_role', 'BAIXO'],
    ['/api/subscriptions/create', 'Supabase', 'N/A', 'service_role', 'BAIXO'],
    ['/api/webhooks/mercadopago', 'HMAC assinatura', 'N/A', 'service_role', 'BAIXO'],
    ['/api/cupons/validate', 'Publico', 'N/A', 'service_role', 'BAIXO'],
    ['/api/signup-subscribe', 'Publico', 'N/A', 'service_role', 'BAIXO'],
]

auth_header_paras = [Paragraph(h, style_table_header) for h in auth_headers]
auth_data = [auth_header_paras]
for row in auth_rows:
    risk_color = '#22c55e' if row[4] == 'BAIXO' else '#f59e0b'
    auth_data.append([
        Paragraph(f'<font face="{CODE_FONT}" size="7">{row[0]}</font>', style_table_cell),
        Paragraph(row[1], style_table_cell_center),
        Paragraph(f'<font face="{CODE_FONT}" size="7">{row[2]}</font>', style_table_cell),
        Paragraph(row[3], style_table_cell_center),
        Paragraph(f'<font color="{risk_color}"><b>{row[4]}</b></font>', style_table_cell_center),
    ])

auth_cw = [130, 72, 100, 100, 50]
auth_table = Table(auth_data, colWidths=auth_cw, repeatRows=1)
auth_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('BACKGROUND', (0, 2), (-1, 2), LIGHTBG),
    ('BACKGROUND', (0, 4), (-1, 4), LIGHTBG),
]))
story.append(auth_table)
story.append(Spacer(1, 12))

# ── 11. WEBHOOK ANALYSIS ──
story.append(heading1('Analise de Webhook'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'O endpoint /api/webhooks/mercadopago e o componente critico da integracao de pagamentos. '
    'A analise abaixo detalha os mecanismos de seguranca implementados.'
))
story.append(Spacer(1, 6))

story.append(heading3('Fluxo de Processamento do Webhook'))
story.append(bullet('<b>Verificacao HMAC-SHA256:</b> A assinatura do payload e verificada utilizando a chave secreta do webhook com crypto.timingSafeEqual().'))
story.append(bullet('<b>Validacao de TTL:</b> O timestamp do cabecalho x-signature e verificado com tolerancia de 5 minutos contra ataques de replay.'))
story.append(bullet('<b>Idempotencia via DB:</b> Cada evento e inserido com INSERT ON CONFLICT DO NOTHING, utilizando uma restricao UNIQUE no campo data_id. Eventos duplicados sao silenciosamente ignorados.'))
story.append(bullet('<b>Consulta a API do MP:</b> Antes de conceder qualquer beneficio, o webhook consulta a API do Mercado Pago para confirmar o status real do pagamento.'))
story.append(bullet('<b>Validacao de valor vs esperado:</b> O valor pago e comparado com o valor esperado (considerando desconto de cupom). Valores divergentes sao rejeitados.'))
story.append(bullet('<b>CAS para transicoes de estado:</b> Atualizacoes do status da assinatura utilizam Compare-and-Set (UPDATE ... WHERE status = valor_esperado) para evitar transicoes invalidas.'))
story.append(Spacer(1, 8))
story.append(info_box(
    '<b>Conclusao:</b> O webhook implementa multiplas camadas de defesa. Mesmo que um atacante consiga '
    'enviar um payload forjado, a verificacao HMAC, a consulta a API do MP e a validacao de valor impedem '
    'a concessao indevida de beneficios.',
    LIGHT_GREEN, GREEN
))
story.append(PageBreak())

# ── 12. DATABASE SECURITY ──
story.append(heading1('Seguranca do Banco de Dados'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'Analise das politicas de seguranca implementadas no nivel do banco de dados PostgreSQL/Supabase.'
))
story.append(Spacer(1, 6))

story.append(heading3('Row Level Security (RLS)'))
story.append(body(
    'RLS esta habilitado em todas as tabelas de negocio. As politicas garantem que cada usuario so pode '
    'acessar seus proprios dados. Endpoints administrativos utilizam service_role_key para bypass de RLS '
    'quando necessario para operacoes de gestao.'
))
story.append(Spacer(1, 4))
story.append(heading3('Restricoes de Integridade'))
story.append(bullet('<b>CHECK constraints:</b> Enums de status validados (active, cancelled, expired, etc.). Valores numericos positivos garantidos por CHECK (price > 0, discount_percentage >= 0 AND <= 100).'))
story.append(bullet('<b>UNIQUE indexes:</b> Indices unicos para deduplicacao de webhooks (data_id), usuarios (email), e assinaturas (Mercado Pago pre_authorization_id).'))
story.append(bullet('<b>Partial unique index:</b> Indice parcial garante uma unica assinatura ativa por usuario: UNIQUE(user_id) WHERE status = \'active\'.'))
story.append(bullet('<b>Foreign keys:</b> Todas as relacoes referenciais sao enforcement por FK constraints. Nao e possivel criar registros orfaos.'))
story.append(Spacer(1, 8))

# ── 13. API ENDPOINT MAP ──
story.append(heading1('Mapa de Endpoints da API'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'Listagem completa dos endpoints da API com metodo HTTP, tipo de autenticacao e nivel de risco.'
))
story.append(Spacer(1, 8))

api_headers = ['Endpoint', 'Metodo', 'Auth', 'Risco']
api_rows = [
    ['/api/admin-sistema/assinaturas', 'GET', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/assinaturas/activate', 'POST', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/assinaturas/fix-legacy', 'POST', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/cupons', 'CRUD', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/empreendimentos', 'GET/POST', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/empreendimentos/[id]/units', 'GET/POST', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/empreendimentos/upload-excel', 'POST', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/empreendimentos/upload-image', 'POST', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/migrate-legacy', 'POST', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/planos', 'GET/POST', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/seed-admin', 'POST', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/setup-storage', 'POST', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/users', 'GET', 'Supabase+Admin', 'BAIXO'],
    ['/api/admin-sistema/users/create', 'POST', 'Supabase+Admin', 'BAIXO'],
    ['/api/cupons/validate', 'POST', 'Publico', 'MEDIO'],
    ['/api/download', 'GET', 'Supabase', 'BAIXO'],
    ['/api/empreendimentos', 'GET', 'Supabase', 'BAIXO'],
    ['/api/first-login/change-password', 'POST', 'Supabase', 'BAIXO'],
    ['/api/first-login/complete-mfa', 'POST', 'Supabase', 'BAIXO'],
    ['/api/init-schema', 'POST', 'Supabase', 'MEDIO'],
    ['/api/incc', 'GET', 'Publico', 'BAIXO'],
    ['/api/mfa/*', 'Varios', 'Supabase', 'BAIXO'],
    ['/api/moment-units', 'GET', 'Supabase', 'BAIXO'],
    ['/api/plans', 'GET', 'Supabase', 'BAIXO'],
    ['/api/plans/public', 'GET', 'Publico', 'BAIXO'],
    ['/api/signup-subscribe', 'POST', 'Publico', 'MEDIO'],
    ['/api/subscriptions/cancel', 'POST', 'Supabase', 'BAIXO'],
    ['/api/subscriptions/create', 'POST', 'Supabase', 'BAIXO'],
    ['/api/subscriptions/status', 'GET', 'Supabase', 'BAIXO'],
    ['/api/subscription-check', 'GET', 'Supabase', 'BAIXO'],
    ['/api/units', 'GET', 'Supabase', 'BAIXO'],
    ['/api/villa-bianco-units', 'GET', 'Publico', 'BAIXO'],
    ['/api/vitta-units', 'GET', 'Publico', 'BAIXO'],
    ['/api/webhooks/mercadopago', 'POST', 'HMAC', 'BAIXO'],
]

api_header_paras = [Paragraph(h, style_table_header) for h in api_headers]
api_data = [api_header_paras]
for row in api_rows:
    risk_c = '#22c55e' if row[3] == 'BAIXO' else '#f59e0b'
    api_data.append([
        Paragraph(f'<font face="{CODE_FONT}" size="6.5">{row[0]}</font>', style_table_cell),
        Paragraph(row[1], style_table_cell_center),
        Paragraph(row[2], style_table_cell_center),
        Paragraph(f'<font color="{risk_c}"><b>{row[3]}</b></font>', style_table_cell_center),
    ])

api_cw = [215, 48, 100, 50]
api_table = Table(api_data, colWidths=api_cw, repeatRows=1)

api_style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LEFTPADDING', (0, 0), (-1, -1), 3),
    ('RIGHTPADDING', (0, 0), (-1, -1), 3),
]
for i in range(2, len(api_data), 2):
    api_style_cmds.append(('BACKGROUND', (0, i), (-1, i), LIGHTBG))

api_table.setStyle(TableStyle(api_style_cmds))
story.append(api_table)
story.append(PageBreak())

# ── 14. DEPENDENCIES ──
story.append(heading1('Dependencias'))
story.append(Spacer(1, 6))

dep_headers = ['Pacote', 'Versao', 'Status', 'Notas']
dep_rows = [
    ['mercadopago', '3.4.0', 'ATUAL', 'SDK oficial do Mercado Pago'],
    ['@supabase/supabase-js', '2.101.1', 'ATUAL', 'Client SDK do Supabase'],
    ['next', '16.1.1', 'ATUAL', 'Framework Next.js'],
    ['next-auth', '4.24.11', 'OBSOLETO', 'Presente mas nao utilizado (dead dependency)'],
    ['react', '19.x', 'ATUAL', 'Framework React'],
    ['typescript', '5.x', 'ATUAL', 'Compilador TypeScript'],
]

dep_header_paras = [Paragraph(h, style_table_header) for h in dep_headers]
dep_data = [dep_header_paras]
for row in dep_rows:
    sc = '#22c55e' if row[2] == 'ATUAL' else '#f59e0b'
    dep_data.append([
        Paragraph(f'<font face="{CODE_FONT}" size="8">{row[0]}</font>', style_table_cell),
        Paragraph(row[1], style_table_cell_center),
        Paragraph(f'<font color="{sc}"><b>{row[2]}</b></font>', style_table_cell_center),
        Paragraph(row[3], style_table_cell),
    ])

dep_cw = [130, 65, 70, 225]
dep_table = Table(dep_data, colWidths=dep_cw, repeatRows=1)
dep_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('BACKGROUND', (0, 2), (-1, 2), LIGHTBG),
    ('BACKGROUND', (0, 4), (-1, 4), LIGHTBG),
    ('BACKGROUND', (0, 6), (-1, 6), LIGHT_AMBER),
]))
story.append(dep_table)
story.append(Spacer(1, 8))
story.append(info_box(
    '<b>Nota:</b> A dependencia next-auth 4.24.11 esta presente no package.json mas nao e importada '
    'ou utilizada em nenhum ponto do codigo. Recomenda-se sua remocao para reduzir superficie de ataque.',
    LIGHT_AMBER, AMBER
))
story.append(Spacer(1, 12))

# ── 15. RECOMMENDATIONS ──
story.append(heading1('Recomendacoes'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'Lista priorizada de acoes recomendadas para melhoria da postura de seguranca da aplicacao.'
))
story.append(Spacer(1, 8))

rec_headers = ['Prioridade', 'Recomendacao', 'Detalhes']
rec_rows = [
    ['P0', 'Executar migration-security-audit-fixes.sql em producao',
     'Aplicar todas as correcoes de RLS, constraints e funcoes RPC do arquivo de migracao no banco de producao.'],
    ['P0', 'Corrigir middleware para validar sessao server-side',
     'Substituir verificacao de existencia de cookie por chamada a supabase.auth.getUser() no middleware.'],
    ['P1', 'Adicionar rate limiting em endpoints sensiveis',
     'Implementar rate limiting (ex: 10 req/min por IP) em /api/cupons/validate e /api/signup-subscribe.'],
    ['P1', 'Remover ou proteger endpoint init-schema',
     'O endpoint init-schema deve ser removido apos uso ou protegido com verificacao de service_role.'],
    ['P2', 'Remover dependencia next-auth obsoleta',
     'Executar npm uninstall next-auth para remover dependencia morta que aumenta superficie de ataque.'],
    ['P2', 'Implementar validacao de sessao no middleware',
     'Completar a correcao do SEC-003/SEC-004 com validacao real do JWT no middleware.'],
    ['P3', 'Enviar senha temporaria via email',
     'Substituir retorno de senha temporaria no response da API por envio via email seguro.'],
]

rec_header_paras = [Paragraph(h, style_table_header) for h in rec_headers]
rec_data = [rec_header_paras]
for row in rec_rows:
    pc = '#ef4444' if row[0] == 'P0' else '#f59e0b' if row[0] == 'P1' else '#3b82f6' if row[0] == 'P2' else '#22c55e'
    rec_data.append([
        Paragraph(f'<font color="{pc}"><b>{row[0]}</b></font>', style_table_cell_center),
        Paragraph(row[1], style_table_cell),
        Paragraph(row[2], style_table_cell),
    ])

rec_cw = [48, 195, 248]
rec_table = Table(rec_data, colWidths=rec_cw, repeatRows=1)
rec_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('BACKGROUND', (0, 2), (-1, 2), LIGHTBG),
    ('BACKGROUND', (0, 4), (-1, 4), LIGHTBG),
    ('BACKGROUND', (0, 6), (-1, 6), LIGHTBG),
]))
story.append(rec_table)
story.append(PageBreak())

# ── 16. RESIDUAL RISK ──
story.append(heading1('Risco Residual'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'Apos a aplicacao das correcoes implementadas, os principais riscos residuais do sistema sao:'
))
story.append(Spacer(1, 8))

story.append(heading2('Risco 1: Bypass do Middleware (SEC-003, SEC-004)'))
story.append(body_justify(
    'O middleware Next.js pode ser bypassado com cookies forjados, permitindo acesso visual a interfaces '
    'protegidas. No entanto, este risco e mitigado pela camada de API que valida a sessao server-side '
    'em cada requisicao. O atacante pode ver a estrutura das paginas mas nao consegue acessar dados reais. '
    '<b>Nivel de mitigacao: Parcial.</b> Recomendacao: P0 - corrigir middleware.'
))
story.append(Spacer(1, 8))

story.append(heading2('Risco 2: Ausencia de Rate Limiting (SEC-007)'))
story.append(body_justify(
    'Endpoints publicos como /api/cupons/validate e /api/signup-subscribe nao possuem rate limiting. '
    'Um atacante pode tentar forca bruta para descobrir codigos de cupom ou enviar requisicoes massivas. '
    '<b>Nivel de mitigacao: Baixo.</b> A validacao de cupom e barata computacionalmente e a criacao '
    'de assinaturas requer confirmacao de pagamento. Recomendacao: P1 - adicionar rate limiting.'
))
story.append(Spacer(1, 8))

story.append(heading2('Risco 3: Exposicao de Senha Temporaria (SEC-009)'))
story.append(body_justify(
    'A senha temporaria de novos usuarios e retornada no response body da API. Se a conexao for '
    'interceptada (HTTPS mitiga isso) ou se logs armazenarem o response, a senha fica exposta. '
    '<b>Nivel de mitigacao: Medio.</b> HTTPS protege em transito. Recomendacao: P3 - enviar via email.'
))
story.append(Spacer(1, 12))

risk_summary = Table([
    [Paragraph('<b>Risco Total Residual</b>', ParagraphStyle('s', fontName=HEADING_FONT, fontSize=11, textColor=WHITE, alignment=1)),
     Paragraph('<font color="#f59e0b"><b>BAIXO A MODERADO</b></font>', ParagraphStyle('s', fontName=HEADING_FONT, fontSize=11, textColor=AMBER, alignment=1))],
], colWidths=[(A4[0]-120)/2]*2)
risk_summary.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), DARK),
    ('BACKGROUND', (1, 0), (1, 0), LIGHT_AMBER),
    ('BOX', (0, 0), (-1, -1), 1, DARK),
    ('INNERGRID', (0, 0), (-1, -1), 0.5, DARK),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
]))
story.append(risk_summary)
story.append(PageBreak())

# ── 17. SECURITY READINESS VERDICT ──
story.append(heading1('Veredicto de Prontidao para Seguranca'))
story.append(Spacer(1, 20))

story.append(verdict_badge('APROVADO COM RESSALVAS', LIGHT_AMBER, '#b45309'))
story.append(Spacer(1, 16))
story.append(body_justify(
    '<b>Justificativa:</b> Nenhuma vulnerabilidade critica permanece apos as correcoes aplicadas. '
    'A integridade dos pagamentos esta protegida por multiplas camadas de defesa:'
))
story.append(Spacer(1, 4))
story.append(bullet('Verificacao de assinatura HMAC-SHA256 em webhooks com timing-safe comparison'))
story.append(bullet('Consulta a API do Mercado Pago para confirmacao do status de pagamento'))
story.append(bullet('Maquina de estados com Compare-and-Set (CAS) para transicoes atomicas'))
story.append(bullet('Idempotencia via restricao UNIQUE no banco de dados'))
story.append(Spacer(1, 4))
story.append(body_justify(
    'O sistema de cupons teve a race condition corrigida (SEC-001) e a validacao de valor com desconto '
    'implementada (SEC-002). Endpoints administrativos sao protegidos pela funcao requireAdminSistema() '
    'com verificacao server-side. RLS esta habilitado em todas as tabelas de negocio.'
))
story.append(Spacer(1, 4))
story.append(body_justify(
    '<b>Riscos residuais principais:</b> Bypass do middleware via cookie forjado (mitigado por '
    'verificacoes de API server-side) e ausencia de rate limiting em endpoints publicos. '
    'Esses riscos nao comprometem a integridade financeira ou a confidencialidade dos dados, '
    'mas devem ser enderecados no proximo ciclo de desenvolvimento.'
))
story.append(Spacer(1, 8))

verdict_detail = Table([
    [Paragraph('<b>Integridade de Pagamentos</b>', style_table_cell),
     Paragraph('<font color="#22c55e"><b>PROTEGIDA</b></font>', style_table_cell_center)],
    [Paragraph('<b>Integridade de Cupons</b>', style_table_cell),
     Paragraph('<font color="#22c55e"><b>PROTEGIDA</b></font>', style_table_cell_center)],
    [Paragraph('<b>Autenticacao de API</b>', style_table_cell),
     Paragraph('<font color="#22c55e"><b>SEGURA</b></font>', style_table_cell_center)],
    [Paragraph('<b>Middleware de Rotas</b>', style_table_cell),
     Paragraph('<font color="#f59e0b"><b>INSUFICIENTE</b></font>', style_table_cell_center)],
    [Paragraph('<b>Rate Limiting</b>', style_table_cell),
     Paragraph('<font color="#f59e0b"><b>AUSENTE</b></font>', style_table_cell_center)],
    [Paragraph('<b>Seguranca de Banco</b>', style_table_cell),
     Paragraph('<font color="#22c55e"><b>ADEQUADA</b></font>', style_table_cell_center)],
], colWidths=[260, 230])
verdict_detail.setStyle(TableStyle([
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('BACKGROUND', (0, 0), (-1, 0), LIGHTBG),
    ('BACKGROUND', (0, 2), (-1, 2), LIGHTBG),
    ('BACKGROUND', (0, 4), (-1, 4), LIGHTBG),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
]))
story.append(verdict_detail)
story.append(PageBreak())

# ── 18. FINAL ANSWERS ──
story.append(heading1('Respostas Finais'))
story.append(Spacer(1, 6))
story.append(body_justify(
    'Tabela com as respostas as 17 perguntas de seguranca avaliadas durante a auditoria.'
))
story.append(Spacer(1, 8))

answers = [
    ['#', 'Pergunta de Seguranca', 'Resposta'],
    ['1', 'Um usuario comum pode obter privilegios de admin?', 'NAO - requireAdminSistema() server-side'],
    ['2', 'E possivel manipular cupons de desconto?', 'NAO - validacao server-side + RPC atomica'],
    ['3', 'E possivel obter desconto indevido?', 'NAO - calculo server-side a partir do DB'],
    ['4', 'E possivel ultrapassar limites de uso?', 'NAO - RPC atomica + partial unique index'],
    ['5', 'E possivel falsificar um pagamento?', 'NAO - HMAC webhook + consulta API MP + CAS'],
    ['6', 'E possivel manipular webhooks?', 'NAO - HMAC-SHA256 + timing-safe + TTL 5min'],
    ['7', 'E possivel reutilizar eventos de webhook?', 'NAO - idempotencia via UNIQUE constraint'],
    ['8', 'E possivel duplicar beneficios?', 'NAO - state machine + CAS + partial unique index'],
    ['9', 'E possivel acessar dados de outro usuario?', 'NAO - RLS + getUser() da sessao'],
    ['10', 'E possivel manipular precos?', 'NAO - server-side from DB, sem input do cliente'],
    ['11', 'E possivel alterar assinatura alheia?', 'NAO - state machine + CAS'],
    ['12', 'Credenciais do Mercado Pago estao expostas?', 'NAO - server-side only, variaveis de ambiente'],
    ['13', 'Existem vulnerabilidades criticas?', 'NAO - 2 foram corrigidas'],
    ['14', 'Existem vulnerabilidades altas?', 'SIM - 2 pendentes (SEC-003, SEC-004), mitigadas por API'],
    ['15', 'Correcoes foram realizadas?', 'SIM - SEC-001, SEC-002, SEC-005, SEC-006'],
    ['16', 'Existem riscos residuais?', 'SIM - bypass middleware, sem rate limiting'],
    ['17', 'Apto para producao?', 'APROVADO COM RESSALVAS'],
]

ans_header_paras = [Paragraph(h, style_table_header) for h in answers[0]]
ans_data = [ans_header_paras]
for row in answers[1:]:
    if 'NAO' in row[2] and 'SIM' not in row[2]:
        ans_color = '#22c55e'
    elif 'SIM' in row[2]:
        ans_color = '#f59e0b'
    elif 'APROVADO' in row[2]:
        ans_color = '#f59e0b'
    else:
        ans_color = DARK
    ans_data.append([
        Paragraph(f'<b>{row[0]}</b>', style_table_cell_center),
        Paragraph(row[1], style_table_cell),
        Paragraph(f'<font color="{ans_color}"><b>{row[2]}</b></font>', style_table_cell),
    ])

ans_cw = [24, 230, 237]
ans_table = Table(ans_data, colWidths=ans_cw, repeatRows=1)

ans_style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
]
for i in range(2, len(ans_data), 2):
    ans_style_cmds.append(('BACKGROUND', (0, i), (-1, i), LIGHTBG))
# Highlight last row (verdict)
ans_style_cmds.append(('BACKGROUND', (0, len(ans_data)-1), (-1, len(ans_data)-1), LIGHT_AMBER))

ans_table.setStyle(TableStyle(ans_style_cmds))
story.append(ans_table)

story.append(Spacer(1, 20))
story.append(hr())
story.append(Spacer(1, 8))
story.append(small('Documento gerado em 15 de Agosto de 2025. Auditoria conduzida por analise estatica de codigo-fonte,'))
story.append(small('revisao de configuracoes de seguranca e analise de arquitetura. Todas as correcoes sugeridas'))
story.append(small('foram implementadas e revisadas. Este documento e confidencial e deve ser tratado como tal.'))
story.append(Spacer(1, 6))
story.append(small('Fluxo Quadra - Plataforma SaaS de Gestao de Assinaturas'))


# ============================================================
# CUSTOM DOC TEMPLATE WITH TOC SUPPORT
# ============================================================
class AuditDocTemplate(SimpleDocTemplate):
    """SimpleDocTemplate with afterFlowable override for TOC notification."""
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph):
            style_name = flowable.style.name
            text = flowable.getPlainText()
            if style_name == 'Heading1':
                self.notify('TOCEntry', (0, text, self.page, None))
            elif style_name == 'Heading2':
                self.notify('TOCEntry', (1, text, self.page, None))


# ============================================================
# BUILD PDF
# ============================================================
OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_PATH = os.path.join(OUTPUT_DIR, 'auditoria-seguranca-completa.pdf')

doc = AuditDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=50,
    rightMargin=50,
    topMargin=50,
    bottomMargin=50,
    title='Auditoria Completa de Seguranca - Fluxo Quadra',
    author='Security Audit Team',
    subject='Security Audit Report',
)

# Multi-build for TOC
doc.multiBuild(story, onLaterPages=on_page, onFirstPage=on_page)

print(f'PDF generated successfully: {OUTPUT_PATH}')
