#!/usr/bin/env python3
"""
Fix inconsistent page margins by using @page named pages.

PROBLEM: .main-content padding only applies top to the FIRST fragment
and bottom to the LAST fragment. Intermediate pages get 0 margin.

SOLUTION: Use @page named pages so Paged.js applies consistent
margins to every body page, regardless of where content breaks.
"""

INPUT = '/home/z/my-project/scripts/proposta_comercial.html'

with open(INPUT, 'r', encoding='utf-8') as f:
    html = f.read()

# ============================================================
# 1. Replace @page rules with named pages
# ============================================================
old_page = '''@page {
    size: 794px 1123px;
    margin: 0;
}'''

new_page = '''@page {
    size: 794px 1123px;
    margin: 0;
}
@page body {
    size: 794px 1123px;
    margin-top: 70px;
    margin-right: 80px;
    margin-bottom: 55px;
    margin-left: 90px;
}'''

html = html.replace(old_page, new_page)

# ============================================================
# 2. Assign page types and remove main-content padding
# ============================================================

# .cover → page: cover (keep full-bleed)
html = html.replace(
    '    break-after: page;\n    display: flex;',
    '    break-after: page;\n    page: cover;\n    display: flex;'
)

# .main-content → page: body, padding: 0 (margins now from @page body)
html = html.replace(
    '    padding: 80px 80px 58px 90px;\n    background: var(--c-white);',
    '    page: body;\n    padding: 0;\n    background: var(--c-white);'
)

# .ending → page: ending (keep full-bleed)
html = html.replace(
    '    break-before: page;\n    overflow: hidden;\n    background: var(--c-navy);',
    '    page: ending;\n    break-before: page;\n    overflow: hidden;\n    background: var(--c-navy);'
)

# ============================================================
# 3. Remove dead .page-footer CSS (no HTML element uses it)
# ============================================================
old_footer_css = '''/* Page footer */
.page-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 90px;
    font-size: 9px;
    color: var(--c-gray-400);
    letter-spacing: 0.5px;
}'''

html = html.replace(old_footer_css, '/* Page margins handled by @page body */')

# ============================================================
# 4. SAVE
# ============================================================

with open(INPUT, 'w', encoding='utf-8') as f:
    f.write(html)

print('Done. Named @page rules applied.')
print('Every body page now has consistent margins:')
print('  Top:    70px (~1.85cm)')
print('  Bottom: 55px (~1.45cm)') 
print('  Left:   90px (~2.38cm)')
print('  Right:  80px (~2.12cm)')
print('Cover and ending pages remain full-bleed (margin: 0).')
