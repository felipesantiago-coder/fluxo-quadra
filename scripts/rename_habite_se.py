#!/usr/bin/env python3
"""Rename habite-se → financiamento in all simulator files (display text only)."""

import re

FILES = [
    "/home/z/my-project/src/app/simulador-vitta/page.tsx",
    "/home/z/my-project/src/app/simulador/page.tsx",
    "/home/z/my-project/src/app/simulador-moment/page.tsx",
    "/home/z/my-project/src/app/simulador-villa-bianco/page.tsx",
]

# Ordered replacements: more specific first to avoid double-replacement issues.
# We only rename USER-FACING text (strings in JSX/JS), NOT internal variable names.
REPLACEMENTS = [
    # Uppercase / Title case display strings
    ("Habite-se (projeção INCC)", "Financiamento (projeção INCC)"),
    ("Habite-se (INCC)", "Financiamento (INCC)"),
    ("Habite-se Original", "Financiamento Original"),
    ("Habite-se Projetado", "Financiamento Projetado"),
    ("Detalhes do Habite-se", "Detalhes do Financiamento"),
    ("Composição do Habite-se", "Composição do Financiamento"),
    ("Saldo Devedor Total (Habite-se)", "Saldo Devedor Total (Financiamento)"),
    ("Habite-se projetado", "Financiamento projetado"),
    ('"Habite-se"', '"Financiamento"'),
    # Tab labels
    ("label: \"Habite-se\"", "label: \"Financiamento\""),
    # Lowercase in running text
    ("pós habite-se", "pós financiamento"),
    ("no habite-se", "no financiamento"),
    ("ao habite-se", "ao financiamento"),
    ("até o habite-se", "até o financiamento"),
    ("para o habite-se", "para o financiamento"),
    ("do habite-se", "do financiamento"),
    ("no Habite-se", "no Financiamento"),
    ("Ao Habite-se", "Ao Financiamento"),
    # Table/summary labels
    ("`Mensais (pós habite-se)`", "`Mensais (pós financiamento)`"),
    ("`Semestrais (pós habite-se)`", "`Semestrais (pós financiamento)`"),
    ("Mensais (pós habite-se)", "Mensais (pós financiamento)"),
    ("Semestrais (pós habite-se)", "Semestrais (pós financiamento)"),
]

# Internal variable names to NOT rename (these stay as-is):
# habiteseAmount, habitesePercent, habiteseCorrected, habiteseBalance, habiteseBalanceCorrected
# activeTab "habitese" → keep internal, but rename the DISPLAY label

for filepath in FILES:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    for old, new in REPLACEMENTS:
        content = content.replace(old, new)

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        changes = sum(1 for a, b in zip(original, content) if a != b)
        print(f"✅ {filepath} updated ({len([o for o, n in REPLACEMENTS if o in original])} replacement patterns matched)")
    else:
        print(f"⚠️  {filepath} - no changes needed")