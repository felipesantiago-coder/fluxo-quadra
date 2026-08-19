#!/usr/bin/env python3
"""
Adjust margins to fit 7 pages while keeping consistency.
Reduce top/bottom slightly and compact internal spacing.
"""

INPUT = '/home/z/my-project/scripts/proposta_comercial.html'

with open(INPUT, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Reduce @page body margins
html = html.replace(
    '    margin-top: 70px;\n    margin-right: 80px;\n    margin-bottom: 55px;\n    margin-left: 90px;',
    '    margin-top: 55px;\n    margin-right: 80px;\n    margin-bottom: 40px;\n    margin-left: 90px;'
)

# 2. Compact internal spacing
replacements = [
    # Chapter header margin
    ('    margin-top: 22px;\n}', '    margin-top: 18px;\n}'),
    # Section subtitle bottom
    ('    margin-bottom: 12px;\n}\n.section-divider', '    margin-bottom: 8px;\n}\n.section-divider'),
    # Subsection margins
    ('    margin-top: 14px;\n    margin-bottom: 4px;', '    margin-top: 10px;\n    margin-bottom: 2px;'),
    # Problem card padding/margin
    ('    padding: 12px 16px;\n    margin-bottom: 10px;', '    padding: 10px 14px;\n    margin-bottom: 8px;'),
    # Module card
    ('    padding: 14px 16px;\n    margin-bottom: 8px;', '    padding: 12px 14px;\n    margin-bottom: 6px;'),
    # Table container
    ('    margin: 10px 0 12px 0;\n    break-inside: avoid;\n}', '    margin: 8px 0 8px 0;\n    break-inside: avoid;\n}'),
    # KPI row
    ('    margin: 10px 0 12px 0;\n    break-inside: avoid;\n}', '    margin: 8px 0 8px 0;\n    break-inside: avoid;\n}'),
    # Callout
    ('    padding: 14px 16px;\n    margin: 10px 0;', '    padding: 12px 14px;\n    margin: 8px 0;'),
    # Step item
    ('    margin-bottom: 10px;\n    break-inside: avoid;\n}', '    margin-bottom: 8px;\n    break-inside: avoid;\n}'),
    # KPI card padding
    ('    padding: 14px;\n    text-align: center;', '    padding: 12px;\n    text-align: center;'),
    # KPI value
    ('    font-size: 26px;\n    font-weight: 800;\n    line-height: 1.1;', '    font-size: 24px;\n    font-weight: 800;\n    line-height: 1.1;'),
    # Step text line-height
    ('    line-height: 1.55;\n}', '    line-height: 1.45;\n}'),
    # Table label margin
    ('    margin-bottom: 10px;\n}', '    margin-bottom: 6px;\n}'),
    # Body text last paragraph
    ('style="margin-top: 24px;"', 'style="margin-top: 16px;"'),
    # Section title margin-bottom
    ('    margin-bottom: 4px;\n    letter-spacing: -0.3px;', '    margin-bottom: 2px;\n    letter-spacing: -0.3px;'),
    # Cover divider
    ('    margin-bottom: 48px;\n}\n.cover-meta', '    margin-bottom: 40px;\n}\n.cover-meta'),
    # Body text line-height and margin
    ('    line-height: 1.65;\n    margin-bottom: 10px;', '    line-height: 1.55;\n    margin-bottom: 8px;'),
    # Problem card text line-height
    ('.problem-card-text {\n    font-size: 12px;\n    font-weight: 400;\n    color: var(--c-gray-600);\n    line-height: 1.6;\n}', '.problem-card-text {\n    font-size: 12px;\n    font-weight: 400;\n    color: var(--c-gray-600);\n    line-height: 1.5;\n}'),
    # Module card text line-height
    ('.module-card-text {\n    font-size: 12px;\n    font-weight: 400;\n    color: var(--c-gray-600);\n    line-height: 1.6;\n}', '.module-card-text {\n    font-size: 12px;\n    font-weight: 400;\n    color: var(--c-gray-600);\n    line-height: 1.5;\n}'),
]

for old, new in replacements:
    html = html.replace(old, new)

with open(INPUT, 'w', encoding='utf-8') as f:
    f.write(html)

print('Done. Margins: top=55px bottom=40px left=90px right=80px')
print('Internal spacing compacted to maintain 7 pages.')
