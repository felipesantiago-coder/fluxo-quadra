#!/usr/bin/env python3
"""Fix unicode escape sequences in simulador-vitta/page.tsx
Replaces literal \\uXXXX sequences with actual UTF-8 characters."""

import re

filepath = '/home/z/my-project/src/app/simulador-vitta/page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Count before
before_count = len(re.findall(r'\\u[0-9a-fA-F]{4}', content))
print(f"Unicode escapes found: {before_count}")

# Replace all \uXXXX with actual unicode characters
# The file has literal backslash + uXXXX (e.g., \u00e7)
# We need to decode these to actual UTF-8 chars
def replace_unicode_escape(match):
    hex_str = match.group(1)
    char = chr(int(hex_str, 16))
    return char

fixed = re.sub(r'\\u([0-9a-fA-F]{4})', replace_unicode_escape, content)

# Count after
after_count = len(re.findall(r'\\u[0-9a-fA-F]{4}', fixed))
print(f"Unicode escapes after fix: {after_count}")
print(f"Replaced: {before_count - after_count} sequences")

# Verify sinal percentage is 6%
if '* 0.06' in fixed:
    print("Sinal percentage: already 6% ✓")
else:
    print("WARNING: Sinal percentage is NOT 0.06!")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(fixed)

print(f"File saved: {filepath}")