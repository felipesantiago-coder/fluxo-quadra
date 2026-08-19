#!/usr/bin/env python3
"""
Quadra Desk - Proposta Comercial para Quadraimob
Body PDF generation via ReportLab (cover handled separately via HTML/Playwright)
"""

import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, HRFlowable, CondPageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━ Paths ━━
OUTPUT_DIR = "/home/z/my-project/download"
BODY_PDF = os.path.join(OUTPUT_DIR, "proposta_body.pdf")
FINAL_PDF = os.path.join(OUTPUT_DIR, "Quadra_Desk_Proposta_Comercial_Quadraimob.pdf")
FONT_DIR = "/usr/share/fonts"
SCRIPTS_DIR = "/home/z/my-project/skills/pdf/scripts"

# ━━ Cascade Palette (auto-generated) ━━
PAGE_BG       = colors.HexColor('#f5f5f4')
SECTION_BG    = colors.HexColor('#f2f1f0')
CARD_BG       = colors.HexColor('#ebeae8')
TABLE_STRIPE  = colors.HexColor('#ededeb')
HEADER_FILL   = colors.HexColor('#4e4732')
COVER_BLOCK   = colors.HexColor('#746c56')
BORDER        = colors.HexColor('#c5bfac')
ICON          = colors.HexColor('#a48e4b')
ACCENT        = colors.HexColor('#92761f')
ACCENT_2      = colors.HexColor('#3aa0c2')
TEXT_PRIMARY   = colors.HexColor('#151513')
TEXT_MUTED     = colors.HexColor('#7e7c74')
SEM_SUCCESS   = colors.HexColor('#529067')

# ━━ Font Registration ━━
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('FreeSerif',
    normal='FreeSerif', bold='FreeSerif-Bold',
    italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# ━━ Styles ━━
PAGE_W, PAGE_H = A4
LEFT_M = 1.0 * inch
RIGHT_M = 1.0 * inch
TOP_M = 0.9 * inch
BOT_M = 0.9 * inch
AVAIL_W = PAGE_W - LEFT_M - RIGHT_M

h1_style = ParagraphStyle(
    name='H1', fontName='FreeSerif-Bold', fontSize=20, leading=28,
    textColor=TEXT_PRIMARY, spaceBefore=18, spaceAfter=10,
)
h2_style = ParagraphStyle(
    name='H2', fontName='FreeSerif-Bold', fontSize=14, leading=20,
    textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8,
)
body_style = ParagraphStyle(
    name='Body', fontName='FreeSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceBefore=0, spaceAfter=6,
)
body_left = ParagraphStyle(
    name='BodyLeft', fontName='FreeSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceBefore=0, spaceAfter=6,
)
bullet_style = ParagraphStyle(
    name='Bullet', fontName='FreeSerif', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceBefore=2, spaceAfter=4,
    leftIndent=18, bulletIndent=6,
)
caption_style = ParagraphStyle(
    name='Caption', fontName='FreeSerif-Italic', fontSize=8.5, leading=12,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=6,
)
header_cell_style = ParagraphStyle(
    name='HeaderCell', fontName='FreeSerif-Bold', fontSize=10, leading=14,
    textColor=colors.white, alignment=TA_CENTER,
)
cell_style = ParagraphStyle(
    name='Cell', fontName='FreeSerif', fontSize=10, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER,
)
cell_left = ParagraphStyle(
    name='CellLeft', fontName='FreeSerif', fontSize=10, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
)
cell_bold = ParagraphStyle(
    name='CellBold', fontName='FreeSerif-Bold', fontSize=10, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
)
stat_big = ParagraphStyle(
    name='StatBig', fontName='FreeSerif-Bold', fontSize=26, leading=32,
    textColor=ACCENT, alignment=TA_CENTER,
)
stat_label = ParagraphStyle(
    name='StatLabel', fontName='FreeSerif', fontSize=9, leading=12,
    textColor=TEXT_MUTED, alignment=TA_CENTER,
)
quote_style = ParagraphStyle(
    name='Quote', fontName='FreeSerif-Italic', fontSize=11, leading=17,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    leftIndent=24, borderLeftWidth=2, borderLeftColor=ACCENT,
    borderPadding=8, spaceBefore=6, spaceAfter=6,
)
footer_style = ParagraphStyle(
    name='Footer', fontName='FreeSerif', fontSize=7.5, leading=10,
    textColor=TEXT_MUTED, alignment=TA_CENTER,
)

# ━━ Helper functions ━━
def make_table(data, col_widths, has_header=True):
    """Create a styled table with palette colors."""
    t = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_cmds = [
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ]
    if has_header:
        style_cmds.append(('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL))
        style_cmds.append(('TEXTCOLOR', (0, 0), (-1, 0), colors.white))
        for i in range(1, len(data)):
            bg = colors.white if i % 2 == 1 else TABLE_STRIPE
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t


def callout_box(big_text, label_text, width=140):
    """Create a CalloutBox with a big stat number and label."""
    t = Table(
        [[Paragraph(f'<b>{big_text}</b>', stat_big)],
         [Paragraph(label_text, stat_label)]],
        colWidths=[width],
    )
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, ACCENT),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t


def safe_keep(elements):
    """KeepTogether with height guard."""
    total = sum(e.wrap(AVAIL_W, 9999)[1] for e in elements)
    if total <= PAGE_H * 0.4:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)


def add_page_decor(canvas, doc):
    """Header and footer on each page."""
    canvas.saveState()
    # Header accent line
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1.2)
    canvas.line(LEFT_M, PAGE_H - TOP_M + 14, PAGE_W - RIGHT_M, PAGE_H - TOP_M + 14)
    # Header text
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(LEFT_M, PAGE_H - TOP_M + 20, 'Quadra Desk  |  Proposta Comercial  |  Quadraimob')
    # Footer
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(LEFT_M, BOT_M - 14, PAGE_W - RIGHT_M, BOT_M - 14)
    canvas.drawRightString(PAGE_W - RIGHT_M, BOT_M - 26, f'{doc.page}')
    canvas.drawString(LEFT_M, BOT_M - 26, 'Documento confidencial')
    canvas.restoreState()


# ━━ Build story ━━
story = []

# ── CHAPTER 1: O Cenario Atual ──
story.append(Paragraph('<b>1. O Cenario Atual</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'O mercado imobiliario brasileiro passa por um momento de intensa competitividade. Com mais de 150 corretores associados, '
    'a Quadraimob possui uma equipe de vendas com potencial significativo, porem enfrenta desafios operacionais que '
    'impactam diretamente a eficiencia do atendimento ao cliente e a velocidade de conversao dos negocios. Esses desafios '
    'nao sao exclusivos da Quadraimob, mas sim problemas estruturais que afetam a maioria das imobiliarias que ainda '
    'operam com ferramentas fragmentadas e processos manuais.',
    body_style
))

story.append(Paragraph(
    'O fluxo de trabalho tipico de um corretor hoje envolve multiplos pontos de fricacao que, somados, resultam em '
    'perda de tempo, risco de erros e uma experiencia de atendimento aquem do que o cliente espera. Esses problemas '
    'se manifestam em tres dimensoes criticas que o Quadra Desk foi desenhado para eliminar completamente, '
    'transformando a operacao da imobiliaria em um processo agil, centralizado e profissional.',
    body_style
))

story.append(Spacer(1, 8))
story.append(Paragraph('<b>1.1 Espelho de vendas fragmentado</b>', h2_style))
story.append(Paragraph(
    'Atualmente, cada corretor precisa baixar individualmente arquivos PDF separados para acessar a tabela de precos '
    'e a tabela de unidades disponiveis de cada empreendimento. Esses documentos frequentemente ficam desatualizados, '
    'pois qualquer alteracao de preco ou de status de uma unidade exige a geracao de um novo PDF e sua redistribuicao '
    'para toda a equipe. O resultado e um cenario onde corretores frequentemente trabalham com informacoes '
    'desatualizadas, o que gera situacoes constrangedoras diante dos clientes, como oferecer unidades ja vendidas '
    'ou apresentar precos defasados. Alem disso, a dependencia de multiplos PDFs espalhados por e-mails e grupos '
    'de WhatsApp torna a busca por informacoes lenta e ineficiente.',
    body_style
))

story.append(Paragraph('<b>1.2 Simulacoes manuais e propostas em papel</b>', h2_style))
story.append(Paragraph(
    'Quando um corretor atende um cliente interessado em um empreendimento, o processo de simulacao de fluxo de '
    'pagamento e quase inteiramente manual. O corretor utiliza calculadora ou faz calculos no papel, montando '
    'cenario de parcelamento, valores de entrada, taxas e prazos. Se o cliente solicita um segundo cenario com '
    'diferentes parametros, o processo inteiro se repete. Uma unica simulacao pode levar de 15 a 30 minutos, e a '
    'proposta final e frequentemente entregue em uma folha de papel sulfite com calculos feitos a mao, o que '
    'transmite uma imagem pouco profissional. Em um mercado onde o cliente pode facilmente contactar a concorrencia, '
    'cada minuto de espera durante o atendimento e uma oportunidade de venda perdida.',
    body_style
))

story.append(Paragraph('<b>1.3 Gestao de disponibilidade por planilhas</b>', h2_style))
story.append(Paragraph(
    'A atualizacao do status de disponibilidade das unidades e realizada por meio de edicao direta em arquivos Excel. '
    'Cada vez que uma unidade e reservada ou vendida, um coordenador precisa abrir a planilha, localizar a unidade, '
    'alterar o status, salvar o arquivo, gerar um novo PDF e redistribuir para os 150 corretores. Alem de ser um '
    'processo demorado e suscetivel a erros humanos, ele cria um intervalo de tempo significativo entre a alteracao '
    'real e a visibilidade da mudanca pela equipe. Durante esse intervalo, e perfeitamente possivel que dois '
    'corretores oferecam a mesma unidade a clientes diferentes, gerando conflitos internos e insatisfacao.',
    body_style
))

# ── CHAPTER 2: A Solucao ──
story.append(Spacer(1, 18))
story.append(Paragraph('<b>2. A Solucao: Quadra Desk</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'O Quadra Desk e um sistema de gestao imobiliaria desenvolvido para centralizar e otimizar os tres pilares '
    'fundamentais da operacao de uma imobiliaria: o acesso a informacoes de empreendimentos, a simulacao e '
    'geracao de propostas comerciais, e a gestao em tempo real da disponibilidade de unidades. Diferente de '
    'ferramentas genericas como CRMs ou planilhas, o Quadra Desk foi construido especificamente para o fluxo de '
    'trabalho de corretores de imoveis, coordenadores e gestores de imobiliarias, eliminando cada um dos pontos '
    'de fricacao descritos anteriormente.',
    body_style
))

story.append(Paragraph(
    'O sistema opera na nuvem, acessivel por qualquer dispositivo com navegador web, sem necessidade de '
    'instalacao ou configuracao tecnica. A interface foi projetada para ser intuitiva, permitindo que corretores '
    'com diferentes niveis de familiaridade com tecnologia possam utiliza-la desde o primeiro dia, com minima '
    'necessidade de treinamento. Alem disso, toda a informacao e atualizada em tempo real, garantindo que todos '
    'os usuarios da imobiliaria trabalhem com dados sempre sincronizados e precisos.',
    body_style
))

story.append(Spacer(1, 10))
story.append(Paragraph('<b>2.1 Tres modulos, uma plataforma integrada</b>', h2_style))
story.append(Paragraph(
    'O Quadra Desk organiza suas funcionalidades em tres modulos integrados que cobrem o ciclo completo do '
    'atendimento imobiliario. O primeiro modulo e o Espelho de Vendas Digital, que substitui os PDFs desatualizados '
    'por uma interface centralizada onde corretores acessam tabelas de precos e disponibilidade de unidades em '
    'tempo real, sem necessidade de baixar arquivos ou verificar versoes. O segundo modulo e o Simulador de '
    'Pagamento, que permite ao corretor montar simulacoes de fluxo de parcelamento de forma intuitiva, ajustando '
    'valores de entrada, prazos e taxas com poucos cliques, e gerar um PDF profissional da proposta para '
    'envio imediato ao cliente. O terceiro modulo e a Gestao de Disponibilidade, que permite aos coordenadores '
    'atualizar o status de cada unidade com poucos cliques, refletindo instantaneamente para toda a equipe.',
    body_style
))

# ── CHAPTER 3: Funcionalidades ──
story.append(Spacer(1, 18))
story.append(Paragraph('<b>3. Funcionalidades Principais</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'A tabela abaixo resume as funcionalidades的核心 do Quadra Desk, organizadas por modulo, com a descricao '
    'do problema que cada uma resolve e o beneficio mensuravel para a operacao da imobiliaria.',
    body_style
))

story.append(Spacer(1, 12))
feat_data = [
    [Paragraph('<b>Modulo</b>', header_cell_style),
     Paragraph('<b>Funcionalidade</b>', header_cell_style),
     Paragraph('<b>Beneficio Direto</b>', header_cell_style)],
    [Paragraph('Espelho de Vendas', cell_bold),
     Paragraph('Acesso centralizado a tabelas de precos e unidades disponiveis', cell_left),
     Paragraph('Fim dos PDFs desatualizados e da busca por arquivos', cell_left)],
    [Paragraph('Espelho de Vendas', cell_bold),
     Paragraph('Atualizacao em tempo real por empreendimento', cell_left),
     Paragraph('Corretores sempre trabalham com dados atuais', cell_left)],
    [Paragraph('Simulador', cell_bold),
     Paragraph('Simulacao de fluxo de pagamento com ajustes interativos', cell_left),
     Paragraph('De 20 minutos para 3 minutos por simulacao', cell_left)],
    [Paragraph('Simulador', cell_bold),
     Paragraph('Geracao de PDF profissional da proposta comercial', cell_left),
     Paragraph('Entrega imediata ao cliente via WhatsApp ou e-mail', cell_left)],
    [Paragraph('Gestao', cell_bold),
     Paragraph('Atualizacao de status de unidades com poucos cliques', cell_left),
     Paragraph('De minutos para segundos; visibilidade instantanea', cell_left)],
    [Paragraph('Gestao', cell_bold),
     Paragraph('Dashboards de produtividade para gestores', cell_left),
     Paragraph('Visibilidade em tempo real do desempenho da equipe', cell_left)],
]

feat_cols = [AVAIL_W * 0.18, AVAIL_W * 0.42, AVAIL_W * 0.40]
story.append(make_table(feat_data, feat_cols))
story.append(Spacer(1, 4))
story.append(Paragraph('Tabela 1: Funcionalidades do Quadra Desk por modulo', caption_style))
story.append(Spacer(1, 18))

# ── CHAPTER 4: Retorno sobre Investimento ──
story.append(Paragraph('<b>4. Retorno sobre o Investimento</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'Para dimensionar o impacto financeiro do Quadra Desk na operacao da Quadraimob, e necessario traduzir '
    'os ganhos de eficiencia em numeros concretos. A analise abaixo utiliza estimativas conservadoras baseadas '
    'no cenario atual descrito, considerando 150 corretores ativos e uma media de 3 simulacoes por corretor '
    'por semana, numero compativel com o volume de atendimento de uma imobiliaria do porte da Quadraimob.',
    body_style
))

story.append(Paragraph('<b>4.1 Economia de tempo nas simulacoes</b>', h2_style))
story.append(Paragraph(
    'Hoje, cada simulacao de fluxo de pagamento leva em media 20 minutos quando feita manualmente. Com o '
    'Quadra Desk, esse tempo cai para aproximadamente 3 minutos, incluindo a geracao do PDF da proposta. '
    'Considerando 3 simulacoes por semana por corretor, sao 450 simulacoes semanais. A economia por simulacao '
    'e de 17 minutos, totalizando 7.650 minutos por semana, ou aproximadamente 128 horas semanais economizadas. '
    'Isso equivale ao tempo integral de 3 corretores dedicados exclusivamente a vendas em vez de calculos manuais.',
    body_style
))

# Callout boxes row
story.append(Spacer(1, 14))
co1 = callout_box('128 h', 'Horas economizadas por semana', 130)
co2 = callout_box('3 minutos', 'Tempo medio por simulacao', 130)
co3 = callout_box('450/semana', 'Simulacoes realizadas', 130)
callout_row = Table([[co1, co2, co3]], colWidths=[AVAIL_W/3]*3, hAlign='CENTER')
callout_row.setStyle(TableStyle([
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
]))
story.append(callout_row)
story.append(Spacer(1, 18))

story.append(Paragraph('<b>4.2 Impacto na conversao de vendas</b>', h2_style))
story.append(Paragraph(
    'Alem da economia de tempo, o maior impacto do Quadra Desk esta na qualidade do atendimento. Quando um corretor '
    'apresenta ao cliente uma proposta bem formatada, com calculos precisos e visual profissional, em vez de '
    'uma folha de papel com calculos feitos a mao, a percepcao de seriedade e confiabilidade da imobiliaria '
    'aumenta significativamente. Estudos do setor imobiliario indicam que a agilidade no atendimento e um dos '
    'fatores determinantes para a conversao de vendas. Se o sistema evitar a perda de apenas 1 venda a cada '
    '50 corretores por mes, ou seja, 3 vendas adicionais por mes considerando os 150 corretores, o retorno '
    'ja supera o investimento no sistema.',
    body_style
))

story.append(Paragraph('<b>4.3 Eliminacao de conflitos de disponibilidade</b>', h2_style))
story.append(Paragraph(
    'Com a atualizacao em tempo real da disponibilidade de unidades, o risco de dois corretores oferecerem a '
    'mesma unidade simultaneamente e eliminado. Esse tipo de conflito, aparentemente simples, gera custos '
    'invisiveis significativos: constrangimento diante do cliente, desgaste na relacao entre corretores, '
    'necessidade de intervencao da gerencia para resolver disputas internas, e a possibilidade real de perder '
    'ambos os clientes para a concorrencia. O Quadra Desk transforma esse processo em uma operacao '
    'automatizada e instantanea, onde a unidade reservada desaparece do espelho de vendas para toda a equipe '
    'no exato momento em que o coordenador registra a alteracao, sem PDFs, sem e-mails, sem atrasos.',
    body_style
))

# ── CHAPTER 5: Investimento e Condicoes ──
story.append(Spacer(1, 18))
story.append(Paragraph('<b>5. Investimento e Condicoes Comerciais</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'O modelo de contratacao do Quadra Desk foi desenhado para ser simples e previsivel. A Quadraimob contrata '
    'o sistema como um servico corporativo, e todos os 150 corretores e coordenadores tem acesso incluido, '
    'sem custos individuais. O investimento e mensal, sem fidelidade longa, e inclui suporte tecnico e '
    'atualizacoes continuas da plataforma.',
    body_style
))

story.append(Spacer(1, 10))
story.append(Paragraph('<b>5.1 Plano Corporate</b>', h2_style))
story.append(Paragraph(
    'O Plano Corporate e a modalidade recomendada para imobiliarias com mais de 100 corretores. Ele inclui '
    'acesso ilimitado para todos os usuarios da imobiliaria, todos os modulos do sistema (Espelho de Vendas, '
    'Simulador de Pagamento e Gestao de Disponibilidade), suporte prioritario, treinamento inicial da equipe '
    'e atualizacoes continuas. As condicoes comerciais estao detalhadas na tabela a seguir.',
    body_style
))

story.append(Spacer(1, 12))
price_data = [
    [Paragraph('<b>Item</b>', header_cell_style),
     Paragraph('<b>Detalhe</b>', header_cell_style)],
    [Paragraph('Modalidade', cell_bold),
     Paragraph('Corporate (acesso para toda a equipe)', cell_left)],
    [Paragraph('Usuarios incluidos', cell_bold),
     Paragraph('150 corretores + coordenadores e administradores', cell_left)],
    [Paragraph('Modulos incluidos', cell_bold),
     Paragraph('Espelho de Vendas Digital, Simulador de Pagamento, Gestao de Disponibilidade', cell_left)],
    [Paragraph('Investimento mensal', cell_bold),
     Paragraph('<b>R$ 3.100,00/mes</b>', cell_left)],
    [Paragraph('Custo por corretor', cell_bold),
     Paragraph('R$ 20,67/mes por corretor', cell_left)],
    [Paragraph('Periodo minimo', cell_bold),
     Paragraph('3 meses', cell_left)],
    [Paragraph('Suporte', cell_bold),
     Paragraph('Prioritario via e-mail e WhatsApp, SLA de 24 horas', cell_left)],
    [Paragraph('Treinamento', cell_bold),
     Paragraph('Sessao de onboarding inicial incluida', cell_left)],
    [Paragraph('Atualizacoes', cell_bold),
     Paragraph('Continuas, sem custo adicional', cell_left)],
]

price_cols = [AVAIL_W * 0.30, AVAIL_W * 0.70]
story.append(make_table(price_data, price_cols))
story.append(Spacer(1, 4))
story.append(Paragraph('Tabela 2: Condicoes do Plano Corporate', caption_style))
story.append(Spacer(1, 16))

story.append(Paragraph('<b>5.2 Comparativo com o mercado</b>', h2_style))
story.append(Paragraph(
    'Para contextualizar o investimento, e relevante comparar o custo do Quadra Desk com as ferramentas '
    'existentes no mercado imobiliario. Sistemas de CRM imobiliario como Zapimoveis Pro e Imobi Panel cobram '
    'entre R$ 40,00 e R$ 80,00 por corretor por mes, exclusivamente para funcionalidades de portal de imoveis '
    'e CRM basico. O Quadra Desk, por R$ 20,67 por corretor, oferece um sistema de gestao completo que cobre '
    'o ciclo integral do atendimento, desde a consulta de disponibilidade ate a emissao da proposta comercial, '
    'por um custo significativamente inferior ao praticado pelo mercado.',
    body_style
))

story.append(Spacer(1, 12))
comp_data = [
    [Paragraph('<b>Sistema</b>', header_cell_style),
     Paragraph('<b>Custo/Corretor/Mes</b>', header_cell_style),
     Paragraph('<b>Escopo</b>', header_cell_style)],
    [Paragraph('Zapimoveis Pro', cell_left),
     Paragraph('R$ 60,00 - R$ 80,00', cell_style),
     Paragraph('Portal de imoveis + CRM basico', cell_left)],
    [Paragraph('Imobi Panel', cell_left),
     Paragraph('R$ 40,00 - R$ 60,00', cell_style),
     Paragraph('Gestao de leads + anuncios', cell_left)],
    [Paragraph('Casa Minha', cell_left),
     Paragraph('R$ 30,00 - R$ 50,00', cell_style),
     Paragraph('CRM imobiliario', cell_left)],
    [Paragraph('<b>Quadra Desk</b>', cell_bold),
     Paragraph('<b>R$ 20,67</b>', cell_style),
     Paragraph('<b>Espelho + Simulador + Gestao (completo)</b>', cell_bold)],
]
comp_cols = [AVAIL_W * 0.22, AVAIL_W * 0.28, AVAIL_W * 0.50]
story.append(make_table(comp_data, comp_cols))
story.append(Spacer(1, 4))
story.append(Paragraph('Tabela 3: Comparativo de custos com o mercado', caption_style))
story.append(Spacer(1, 16))

story.append(Paragraph('<b>5.3 Condicoes de contrato anual (opcional)</b>', h2_style))
story.append(Paragraph(
    'Para imobiliarias que optarem pelo compromisso anual, o Quadra Desk oferece uma condicao especial com '
    'reducao significativa no valor mensal. Nessa modalidade, o investimento mensal passa a R$ 2.500,00, o que '
    'representa uma economia de R$ 7.200,00 ao longo de 12 meses em relacao ao plano mensal. Essa condicao '
    'e uma forma de reconhecer o compromisso de parceria de longo prazo e proporcionar previsibilidade '
    'orcamentaria para a imobiliaria, com um custo total anual de R$ 30.000,00 contra R$ 37.200,00 no plano mensal.',
    body_style
))

# ── CHAPTER 6: Proximos Passos ──
story.append(Spacer(1, 18))
story.append(Paragraph('<b>6. Proximos Passos</b>', h1_style))
story.append(Spacer(1, 6))

story.append(Paragraph(
    'Para iniciar a operacao do Quadra Desk na Quadraimob, o processo de onboarding e simples e rapido. '
    'A primeira etapa e a reuniao de configuracao, onde os empreendimentos da imobiliaria serao cadastrados '
    'no sistema com suas respectivas tabelas de precos e unidades. Em seguida, sera realizada uma sessao de '
    'treinamento com os coordenadores para que possam gerir a disponibilidade das unidades de forma autonoma. '
    'Por fim, os corretores recebem acesso e podem comecar a utilizar o sistema imediatamente.',
    body_style
))

story.append(Paragraph(
    'Recomendamos que a imobiliaria inicie com um periodo experimental de 15 dias com 5 corretores selecionados, '
    'permitindo que a equipe valide o sistema no dia a dia antes da adesao completa. Esse periodo nao gera '
    'custos adicionais e serve para que a Quadraimob confirme, na pratica, os beneficios descritos nesta '
    'proposta. Apos a validacao, a expansao para os 150 corretores e feita de forma gradual, com acompanhamento '
    'do nosso suporte tecnico em cada etapa.',
    body_style
))

story.append(Paragraph(
    'Estamos a disposicao para agendar a reuniao de configuracao e iniciar o processo de onboarding. O objetivo '
    'e que a Quadraimob tenha o sistema operacional e gerando resultados concretos no menor prazo possivel.',
    body_style
))

# ━━ Build body PDF ━━
doc = SimpleDocTemplate(
    BODY_PDF,
    pagesize=A4,
    leftMargin=LEFT_M,
    rightMargin=RIGHT_M,
    topMargin=TOP_M,
    bottomMargin=BOT_M,
    title='Quadra Desk - Proposta Comercial',
    author='Quadra Desk',
    creator='Quadra Desk',
    subject='Proposta Comercial para Quadraimob',
)
doc.build(story, onFirstPage=add_page_decor, onLaterPages=add_page_decor)
print(f'Body PDF gerado: {BODY_PDF}')
