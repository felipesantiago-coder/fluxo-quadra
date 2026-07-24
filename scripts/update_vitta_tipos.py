#!/usr/bin/env python3
"""Update Vitta unit tipos based on area rules."""

filepath = "/home/z/my-project/src/lib/vitta-data.ts"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

import re

def new_tipo(area: float, andar: str) -> str:
    """Determine tipo based on area and floor."""
    if area >= 75:
        return "Garden"
    if area >= 54:
        return "2 quartos (suíte e varanda)"
    if area > 45:
        return "2 quartos"
    if 40 <= area <= 42:
        return "Loja"
    return "1 quarto"

# Pattern: tipo: "..."  inside rawData entries
# Match each rawData entry and replace the tipo
def replace_tipo(match):
    full = match.group(0)
    # Extract area value
    area_match = re.search(r'area:\s*([\d.]+)', full)
    andar_match = re.search(r'andar:\s*"([^"]+)"', full)
    if not area_match:
        return full
    area = float(area_match.group(1))
    andar = andar_match.group(1) if andar_match else ""
    new_t = new_tipo(area, andar)
    # Replace tipo: "..." with new value
    full = re.sub(r'tipo:\s*"[^"]*"', f'tipo: "{new_t}"', full)
    return full

# Process each object in rawData array (between [ and ])
# Split by lines and process objects
lines = content.split('\n')
new_lines = []
for line in lines:
    if 'tipo: "' in line and 'area:' in line.split('tipo:')[0]:
        # Single-line entry with tipo
        area_match = re.search(r'area:\s*([\d.]+)', line)
        andar_match = re.search(r'andar:\s*"([^"]+)"', line)
        if area_match:
            area = float(area_match.group(1))
            andar = andar_match.group(1) if andar_match else ""
            new_t = new_tipo(area, andar)
            line = re.sub(r'tipo:\s*"[^"]*"', f'tipo: "{new_t}"', line)
    new_lines.append(line)

content = '\n'.join(new_lines)

# Update vittaTipos array
old_tipos = 'export const vittaTipos = ["1 Suíte", "2 Suítes", "Apartamento", "Loja", "Studio"] as const;'
new_tipos = 'export const vittaTipos = ["1 quarto", "2 quartos", "2 quartos (suíte e varanda)", "Garden", "Loja"] as const;'
content = content.replace(old_tipos, new_tipos)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

# Print summary of changes
print("Updated vitta-data.ts")

# Count by new tipo
from collections import Counter
tipos = Counter()
for line in new_lines:
    if 'tipo: "' in line:
        m = re.search(r'tipo:\s*"([^"]+)"', line)
        if m:
            tipos[m.group(1)] += 1

for t, c in sorted(tipos.items()):
    print(f"  {t}: {c} unidades")