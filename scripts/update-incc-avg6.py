import re

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Type: replace "projection" with "6m"
    content = content.replace(
        '"none" | "180m" | "12m" | "projection"',
        '"none" | "180m" | "12m" | "6m"'
    )
    
    # 2. Interface: replace projection/projectionSource with avg6
    content = content.replace(
        'avg12: number;\n  projection: number;\n  projectionSource: string;',
        'avg12: number;\n  avg6: number;'
    )
    
    # 3. State initialization - compact format
    content = content.replace(
        'avg180: 0, avg12: 0, projection: 0, projectionSource: "",',
        'avg180: 0, avg12: 0, avg6: 0,'
    )
    
    # 3b. State initialization - multi-line format
    content = content.replace(
        'avg12: 0,\n    projection: 0,\n    projectionSource: "",',
        'avg12: 0,\n    avg6: 0,'
    )
    
    # 4. getInccMonthlyRate: replace projection with 6m
    content = content.replace(
        'if (inccMode === "projection") return inccData.projection;',
        'if (inccMode === "6m") return inccData.avg6;'
    )
    
    # 5. Fetch data mapping - compact format
    content = content.replace(
        'avg180: data.avg180 || 0, avg12: data.avg12 || 0,\n          projection: data.projection || 0, projectionSource: data.projectionSource || "",',
        'avg180: data.avg180 || 0, avg12: data.avg12 || 0,\n          avg6: data.avg6 || 0,'
    )
    
    # 5b. Fetch data mapping - multi-line format
    content = content.replace(
        'avg12: data.avg12 || 0,\n          projection: data.projection || 0,\n          projectionSource: data.projectionSource || "",',
        'avg12: data.avg12 || 0,\n          avg6: data.avg6 || 0,'
    )
    
    # 6. PDF label: "Projeção de mercado" -> "Média dos últimos 6 meses do INCC"
    content = content.replace(
        ': inccMode === "projection"\n            ? "Projeção de mercado"',
        ': inccMode === "6m"\n            ? "Média dos últimos 6 meses do INCC"'
    )
    
    # 7. Radio buttons: replace projection radio with 6m radio
    old_radio = '<input type="radio" name="incc" value="projection" checked={inccMode === "projection"} onChange={() => setInccMode("projection")} className="w-4 h-4 text-amber-600 focus:ring-amber-500" />\n                        <span className="text-sm text-slate-600">Projeção de mercado{!inccData.loading ? ` (${inccData.projection.toFixed(3)}% a.m.)` : " (carregando...)"}</span>\n                        {inccData.projectionSource && !inccData.loading && inccMode === "projection" && (\n                          <p className="text-xs text-slate-400 ml-6 mt-0.5">{inccData.projectionSource}</p>\n                        )}'
    new_radio = '<input type="radio" name="incc" value="6m" checked={inccMode === "6m"} onChange={() => setInccMode("6m")} className="w-4 h-4 text-amber-600 focus:ring-amber-500" />\n                        <span className="text-sm text-slate-600">Média últimos 6 meses{!inccData.loading ? ` (${inccData.avg6.toFixed(4)}% a.m.)` : " (carregando...)"}</span>'
    content = content.replace(old_radio, new_radio)
    
    # 8. Update toFixed(3) to toFixed(4) for avg180 and avg12 display in radio buttons
    content = content.replace('inccData.avg180.toFixed(3)', 'inccData.avg180.toFixed(4)')
    content = content.replace('inccData.avg12.toFixed(3)', 'inccData.avg12.toFixed(4)')
    
    # 9. "Projeção com INCC" -> "Estimativa INCC" in results
    content = content.replace('Projeção com INCC', 'Estimativa INCC')
    content = content.replace('projeção INCC', 'estimativa INCC')
    content = content.replace('projecao INCC', 'estimativa INCC')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated: {filepath}")

files = [
    "/home/z/my-project/src/app/simulador-moment/page.tsx",
    "/home/z/my-project/src/app/simulador-villa-bianco/page.tsx",
    "/home/z/my-project/src/app/simulador-venice-park/page.tsx",
    "/home/z/my-project/src/app/simulador-quattre-istambul/page.tsx",
]

for f in files:
    update_file(f)

print("\nDone! All 4 simulators updated.")
