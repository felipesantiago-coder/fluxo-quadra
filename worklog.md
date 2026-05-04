---
Task ID: 1
Agent: Super Z (Main)
Task: Criar empreendimento Moment - espelho de vendas completo com dados do Excel

Work Log:
- Leu arquivo Excel "Moment Atualizado.xlsx" com 72 unidades, 6 andares, 3 tipologias + coberturas
- Gerou schema SQL (supabase/schema-moment.sql) com tabela moment_units, RLS, Realtime, índices
- Gerou seed SQL (supabase/seed-moment.sql) com ON CONFLICT que preserva status ao atualizar preços
- Criou dados estáticos de fallback (src/lib/moment-data.ts) com 72 unidades mapeadas
- Atualizou API route (/api/moment-units/route.ts) para suportar atualização independente de status E preço via PATCH
- Atualizou dashboard (moment-dashboard.tsx) para refletir mudanças de preço via Realtime
- Criou página /moment/page.tsx com detecção de admin
- Moment já estava na página de seleção de projetos (ProjetosClient.tsx)

Stage Summary:
- 72 unidades importadas do Excel (4 sem preço: 109, 302, 401, 402)
- 9 coberturas no 6º andar (unidades 604-612)
- PATCH API aceita {unidade, status} ou {unidade, valor_venda} ou ambos de forma independente
- Seed SQL preserva status existente ao atualizar preços
- Build verificado com sucesso
- Pendente: usuário deve executar schema-moment.sql e seed-moment.sql no Supabase SQL Editor
