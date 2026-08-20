#!/usr/bin/env python3
"""Brand migration script: Quadra Desk → ImobSync
Replaces text references and logo paths across the entire codebase.
"""

import os
import re

PROJECT_ROOT = "/home/z/my-project/src"
PUBLIC_ROOT = "/home/z/my-project/public"

# Text replacements (order matters - more specific first)
TEXT_REPLACEMENTS = [
    ("Quadra Desk", "ImobSync"),
    ("Quadra", "ImobSync"),  # Only if not already part of 'ImobSync'
    ("quadra desk", "ImobSync"),
    ("quadra-desk", "imobsync"),
]

# Logo path replacements
LOGO_REPLACEMENTS = [
    # /qd-logo.png → imobsync icon (used in headers, dashboards)
    ('/qd-logo.png', '/imobsync-icon-claro-36.png'),
    ('/quadra-desk-logo.png', '/imobsync-logo-claro.png'),
    # /logo.svg → imobsync logo
    ('/logo.svg', '/imobsync-logo-claro.png'),
]

# Files to SKIP (don't modify these)
SKIP_PATTERNS = [
    'node_modules',
    '.next',
    '.git',
    'scripts/imobsync_brand',
]

def should_skip(filepath):
    for pattern in SKIP_PATTERNS:
        if pattern in filepath:
            return True
    return False

def replace_in_file(filepath, replacements):
    """Apply replacements to a single file. Returns (changes_made, new_content)."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except (UnicodeDecodeError, PermissionError):
        return 0, content
    
    original = content
    
    for old, new in replacements:
        content = content.replace(old, new)
    
    # Special handling: don't double-replace 'ImobSync' back
    # If we accidentally get 'ImobSyncImobSync', fix it
    content = content.replace('ImobSyncImobSync', 'ImobSync')
    
    changes = len(original) - len(content) if len(original) != len(content) else 0
    # Count actual text changes more accurately
    if original != content:
        diff_lines = sum(1 for a, b in zip(original.split('\n'), content.split('\n')) if a != b)
        changes = diff_lines
    
    return changes, content

def process_directory(root_dir, replacements, extensions=None):
    """Process all files in a directory tree."""
    results = []
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip certain directories
        dirnames[:] = [d for d in dirnames if not should_skip(os.path.join(dirpath, d))]
        
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            
            if should_skip(filepath):
                continue
            
            # Filter by extension if specified
            if extensions:
                ext = os.path.splitext(filename)[1]
                if ext not in extensions:
                    continue
            
            changes, new_content = replace_in_file(filepath, replacements)
            if changes > 0:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                rel_path = os.path.relpath(filepath, PROJECT_ROOT)
                results.append((rel_path, changes))
    
    return results

# Step 1: Replace text references in TSX/TS files
print("=== Step 1: Replacing 'Quadra Desk' text in source files ===")
source_extensions = {'.tsx', '.ts', '.jsx', '.js'}
# Only replace 'Quadra Desk' and 'quadra desk', not 'Quadra' alone (too risky)
text_replacements = [
    ("Quadra Desk", "ImobSync"),
    ("quadra desk", "ImobSync"),
]
text_results = process_directory(PROJECT_ROOT, text_replacements, source_extensions)
for path, changes in text_results:
    print(f"  ✅ {path} ({changes} lines changed)")
print(f"  Total: {len(text_results)} files modified")

# Step 2: Replace logo paths
print("\n=== Step 2: Replacing logo paths ===")
logo_results = process_directory(PROJECT_ROOT, LOGO_REPLACEMENTS, source_extensions)
for path, changes in logo_results:
    print(f"  ✅ {path} ({changes} lines changed)")
print(f"  Total: {len(logo_results)} files modified")

# Step 3: Also handle CSS files
print("\n=== Step 3: Checking CSS files ===")
css_results = process_directory(PROJECT_ROOT, LOGO_REPLACEMENTS, {'.css'})
for path, changes in css_results:
    print(f"  ✅ {path} ({changes} lines changed)")

# Step 4: Summary
print(f"\n=== Migration Complete ===")
print(f"Text replacements: {len(text_results)} files")
print(f"Logo path replacements: {len(logo_results)} files")
print(f"CSS replacements: {len(css_results)} files")

# Step 5: Verify no remaining 'Quadra Desk' references
print(f"\n=== Verification: Checking for remaining 'Quadra Desk' references ===")
remaining = []
for dirpath, dirnames, filenames in os.walk(PROJECT_ROOT):
    dirnames[:] = [d for d in dirnames if not should_skip(os.path.join(dirpath, d))]
    for filename in filenames:
        filepath = os.path.join(dirpath, filename)
        if should_skip(filepath):
            continue
        ext = os.path.splitext(filename)[1]
        if ext not in source_extensions:
            continue
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            if 'Quadra Desk' in content or 'quadra desk' in content:
                rel = os.path.relpath(filepath, PROJECT_ROOT)
                count = content.count('Quadra Desk') + content.count('quadra desk')
                remaining.append((rel, count))
        except:
            pass

if remaining:
    print(f"  ⚠️  {len(remaining)} files still contain 'Quadra Desk':")
    for path, count in remaining:
        print(f"    - {path} ({count} occurrences)")
else:
    print("  ✅ No remaining 'Quadra Desk' references found!")

# Step 6: Check for remaining old logo paths
print(f"\n=== Verification: Checking for remaining old logo paths ===")
old_paths = ['/qd-logo.png', '/quadra-desk-logo.png']
remaining_logos = []
for dirpath, dirnames, filenames in os.walk(PROJECT_ROOT):
    dirnames[:] = [d for d in dirnames if not should_skip(os.path.join(dirpath, d))]
    for filename in filenames:
        filepath = os.path.join(dirpath, filename)
        if should_skip(filepath):
            continue
        ext = os.path.splitext(filename)[1]
        if ext not in source_extensions:
            continue
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            for old_path in old_paths:
                if old_path in content:
                    rel = os.path.relpath(filepath, PROJECT_ROOT)
                    remaining_logos.append((rel, old_path))
        except:
            pass

if remaining_logos:
    print(f"  ⚠️  {len(remaining_logos)} files still reference old logos:")
    for path, logo in remaining_logos:
        print(f"    - {path} → {logo}")
else:
    print("  ✅ No remaining old logo paths found!")
