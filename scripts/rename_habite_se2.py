#!/usr/bin/env python3
"""Second pass: catch remaining habite-se display text (unquoted JSX, notes)."""

FILES = [
    "/home/z/my-project/src/app/simulador-vitta/page.tsx",
    "/home/z/my-project/src/app/simulador/page.tsx",
    "/home/z/my-project/src/app/simulador-moment/page.tsx",
    "/home/z/my-project/src/app/simulador-villa-bianco/page.tsx",
]

# These patterns appear in JSX as unquoted text or in notes/strings that the first pass missed
REPLACEMENTS = [
    # Unquoted JSX text patterns: >Habite-se<, >Habite-se (INCC)<
    (">Habite-se</td>", ">Financiamento</td>"),
    (">Habite-se (INCC)</td>", ">Financiamento (INCC)</td>"),
    # Observation text
    ("O valor do Habite-se inclui:", "O valor do Financiamento inclui:"),
    # List item
    ("O habite-se pode ser quitado", "O financiamento pode ser quitado"),
    # A pagar text (villa-bianco specific)
    ("à vista no habite-se", "à vista no financiamento"),
    # Saldo Devedor no Habite-se (moment specific)
    ("no Habite-se", "no Financiamento"),
    # "Habite-se projetado pelo INCC" in moment and simulador
    ("Habite-se projetado pelo INCC", "Financiamento projetado pelo INCC"),
    # Saldo devedor restante (moment) - already says "restante" not "habite-se" but check
]

for filepath in FILES:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ {filepath} updated")
    else:
        print(f"⚠️  {filepath} - no changes")