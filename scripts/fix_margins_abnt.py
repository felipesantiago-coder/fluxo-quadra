#!/usr/bin/env python3
"""
Fix margins in proposta_comercial.html to follow ABNT-inspired professional layout.
ABNT reference for A4 (794x1123px): top 3cm≈113px, left 3cm≈113px, right 2cm≈76px, bottom 2cm≈76px
For a commercial proposal, we use slightly adapted values:
  - Left: 90px (~2.38cm)
  - Right: 80px (~2.12cm)  
  - Top (body): 80px (~2.12cm)
  - Bottom (content): 58px + 32px footer = 90px from edge (~2.38cm)
Also fixes remaining diacritical marks.
"""

import re

INPUT = '/home/z/my-project/scripts/proposta_comercial.html'

with open(INPUT, 'r', encoding='utf-8') as f:
    html = f.read()

# ============================================================
# 1. MARGIN FIXES — standardize all margins
# ============================================================

# --- Main content padding ---
# Current: padding: 44px 60px 36px 60px
# New:     padding: 80px 80px 58px 90px  (top right bottom left)
html = html.replace(
    'padding: 44px 60px 36px 60px;',
    'padding: 80px 80px 58px 90px;'
)

# --- Cover side padding ---
# Current: padding: 0 72px;
# New:     padding: 0 90px;  (match body left margin)
html = html.replace(
    '.cover {\n    width: 794px;\n    height: 1123px;\n    position: relative;\n    background: var(--c-navy);\n    overflow: hidden;\n    break-after: page;\n    display: flex;\n    flex-direction: column;\n    justify-content: center;\n    padding: 0 72px;\n}',
    '.cover {\n    width: 794px;\n    height: 1123px;\n    position: relative;\n    background: var(--c-navy);\n    overflow: hidden;\n    break-after: page;\n    display: flex;\n    flex-direction: column;\n    justify-content: center;\n    padding: 0 90px;\n}'
)

# --- Cover confidential bar positioning ---
# Current: left: 72px; right: 72px; bottom: 40px;
# New:     left: 90px; right: 80px; bottom: 50px;
html = html.replace(
    '    bottom: 40px;\n    left: 72px;\n    right: 72px;',
    '    bottom: 50px;\n    left: 90px;\n    right: 80px;'
)

# --- Page footer padding ---
# Current: padding: 0 68px;
# New:     padding: 0 90px;  (align with body left margin)
html = html.replace(
    '    padding: 0 68px;\n    font-size: 9px;',
    '    padding: 0 90px;\n    font-size: 9px;'
)

# ============================================================
# 2. SPACING ADJUSTMENTS — compensate for larger margins
#    to maintain content within 7 pages
# ============================================================

# Chapter header top margin
html = html.replace(
    '    margin-top: 28px;\n}',
    '    margin-top: 22px;\n}'
)

# Body text bottom margin
html = html.replace(
    '    margin-bottom: 12px;\n    text-align: justify;',
    '    margin-bottom: 10px;\n    text-align: justify;'
)

# Section subtitle bottom margin
html = html.replace(
    '    margin-bottom: 16px;\n}\n.section-divider',
    '    margin-bottom: 12px;\n}\n.section-divider'
)

# Section divider bottom margin
html = html.replace(
    '    margin-bottom: 16px;\n}\n\n/* Body text */',
    '    margin-bottom: 12px;\n}\n\n/* Body text */'
)

# Subsection top/bottom margins
html = html.replace(
    '    margin-top: 18px;\n    margin-bottom: 6px;',
    '    margin-top: 14px;\n    margin-bottom: 4px;'
)

# Problem card margin
html = html.replace(
    '    padding: 14px 18px;\n    margin-bottom: 12px;\n    break-inside: avoid;',
    '    padding: 12px 16px;\n    margin-bottom: 10px;\n    break-inside: avoid;'
)

# Module card margin
html = html.replace(
    '    padding: 16px 18px;\n    margin-bottom: 10px;\n    break-inside: avoid;',
    '    padding: 14px 16px;\n    margin-bottom: 8px;\n    break-inside: avoid;'
)

# Table container margin
html = html.replace(
    '    margin: 14px 0 16px 0;\n    break-inside: avoid;',
    '    margin: 10px 0 12px 0;\n    break-inside: avoid;'
)

# KPI row margin
html = html.replace(
    '    margin: 14px 0 16px 0;\n    break-inside: avoid;\n}',
    '    margin: 10px 0 12px 0;\n    break-inside: avoid;\n}'
)

# Callout margin
html = html.replace(
    '    margin: 14px 0;\n    break-inside: avoid;',
    '    margin: 10px 0;\n    break-inside: avoid;'
)

# Callout padding
html = html.replace(
    '    padding: 16px 18px;\n    margin: 10px 0;',
    '    padding: 14px 16px;\n    margin: 10px 0;'
)

# Step item margin
html = html.replace(
    '    margin-bottom: 12px;\n    break-inside: avoid;\n}',
    '    margin-bottom: 10px;\n    break-inside: avoid;\n}'
)

# KPI card padding
html = html.replace(
    '    padding: 16px;\n    text-align: center;',
    '    padding: 14px;\n    text-align: center;'
)

# KPI value font size (slightly smaller to save space)
html = html.replace(
    '    font-size: 28px;\n    font-weight: 800;\n    line-height: 1.1;',
    '    font-size: 26px;\n    font-weight: 800;\n    line-height: 1.1;'
)

# Table header padding
html = html.replace(
    '    padding: 10px 14px;\n}',
    '    padding: 9px 14px;\n}'
)

# Table body cell padding
html = html.replace(
    '    padding: 9px 14px;\n    border-bottom: 1px solid var(--c-gray-100);',
    '    padding: 8px 14px;\n    border-bottom: 1px solid var(--c-gray-100);'
)

# Cover divider margin-bottom
html = html.replace(
    '    margin-bottom: 56px;\n}\n.cover-meta',
    '    margin-bottom: 48px;\n}\n.cover-meta'
)

# Module card number margin-bottom
html = html.replace(
    '    margin-bottom: 10px;\n}\n.module-card-title',
    '    margin-bottom: 8px;\n}\n.module-card-title'
)

# Step content gap  
html = html.replace(
    '    gap: 14px;\n    margin-bottom: 10px;',
    '    gap: 12px;\n    margin-bottom: 10px;'
)

# ============================================================
# 3. DIACRITICAL MARK FIXES (remaining issues)
# ============================================================

fixes = {
    'Beneficio direto': 'Benefício direto',
    'mensuravel': 'mensurável',
    'em media,': 'em média,',
    'Corporaté': 'Corporativo',
    'incluida': 'incluída',
    'Atualizacoes': 'Atualizações',
    'em relacao ao': 'em relação ao',
    'Proximos Passos': 'Próximos Passos',
    'validacao pratica': 'validação prática',
}

for old, new in fixes.items():
    html = html.replace(old, new)

# ============================================================
# 4. SAVE
# ============================================================

with open(INPUT, 'w', encoding='utf-8') as f:
    f.write(html)

print('Done. All margin and spelling fixes applied.')
print('Margin summary (ABNT-inspired, A4 794x1123px):')
print('  Body:    top=80px (~2.1cm)  left=90px (~2.4cm)  right=80px (~2.1cm)  bottom=58px+32px footer (~2.4cm)')
print('  Cover:   left/right=90px')
print('  Footer:  padding 0 90px')
print('  Confidential: left=90px  right=80px  bottom=50px')
