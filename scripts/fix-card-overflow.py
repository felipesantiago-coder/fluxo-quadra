import os, re

root = '/home/z/my-project/src/components'
dashboards = [
    'dynamic-dashboard.tsx',
    'sales-dashboard.tsx',
    'moment-dashboard.tsx',
    'vitta-dashboard.tsx',
    'villa-bianco-dashboard.tsx',
]

for fname in dashboards:
    fp = os.path.join(root, fname)
    with open(fp, 'r') as f:
        c = f.read()
    
    orig = c
    
    # 1. Add overflow-hidden to perspective wrapper
    old_perspective = '<div style={{ perspective: "800px" }}>'
    new_perspective = '<div style={{ perspective: "800px", overflow: "hidden" }}>'
    c = c.replace(old_perspective, new_perspective)
    
    # 2. Make back face a flex column so content can be constrained
    # Find the back face div with className="bg-white" and make it flex
    # The back face pattern (absolute positioned, rotateY(180deg))
    # We need to add flex flex-col to its className
    
    # Pattern: className="bg-white"  (on the back face only - it comes after rotateY(180deg))
    # This is safe because the front face doesn't have className="bg-white" directly
    # Actually let's be more precise - find it in context of the absolute positioning
    
    # Replace the back face container to be a flex column
    c = c.replace(
        'className="bg-white"\n          >',
        'className="bg-white flex flex-col"\n          >'
    )
    
    # 3. Make the gradient bar in the back face flex-shrink-0
    # In the back face, the gradient bar should not shrink
    # We need to target the gradient bar inside the back face only
    # The pattern is the same for both faces, but since we're making
    # the content div scrollable, the bar should stay fixed at top
    
    # 4. Make the back face content div (p-5 space-y-4) scrollable
    # We need to add overflow-y-auto and flex-1 min-h-0
    # But we need to ONLY target the back face content, not the front face
    # 
    # Strategy: The back face content div is the LAST occurrence of
    # className="p-5 space-y-4" in the UnitCard function
    # (front face uses className="p-5 space-y-3" or similar)
    #
    # Actually, let's check: front uses "p-5 space-y-3" and back uses "p-5 space-y-4"
    # If that's consistent, we can just replace "p-5 space-y-4" with scrollable version
    
    c = c.replace(
        'className="p-5 space-y-4"',
        'className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0"'
    )
    
    if c != orig:
        with open(fp, 'w') as f:
            f.write(c)
        print(f'  OK {fname}')
    else:
        print(f'  SKIP {fname}')

print('Done')