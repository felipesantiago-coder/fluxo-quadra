---
Task ID: 1
Agent: main
Task: Investigar e corrigir ausência do andar Térreo (unidades garden) no espelho de vendas do Vitta

Work Log:
- Analisado vitta-dashboard.tsx, vitta-data.ts, /api/vitta-units, upload-excel/route.ts, seed-vitta.sql, schema-vitta.sql, CSV original
- Identificada causa raiz: UNIQUE(bloco, unidade) na tabela vitta_units impede inserção das 5 unidades garden do Térreo (A, 1-5) pois conflitam com Lojas (A, 1-6)
- O seed SQL usa ON CONFLICT DO NOTHING, silenciando o conflito
- Alterada constraint UNIQUE para (bloco, andar_num, unidade) no schema
- Regenerado seed-vitta.sql com ON CONFLICT correto
- Atualizado PATCH /api/vitta-units para incluir andar no WHERE
- Atualizado vitta-dashboard.tsx para enviar andar nas mudanças de status
- Criado SQL de migração (supabase/migration-vitta-unique-constraint.sql)
- Build e push realizados com sucesso

Stage Summary:
- Causa raiz: conflito de UNIQUE constraint entre Lojas e Térreo garden
- Código corrigido e deployado
- **AÇÃO NECESSÁRIA**: Rodar migration-vitta-unique-constraint.sql no Supabase SQL Editor para corrigir o banco em produção
