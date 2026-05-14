-- Seed: criar os 3 empreendimentos existentes na tabela empreendimentos
-- e migrar status das tabelas de units existentes para projeto_units

-- Inserir empreendimentos existentes
INSERT INTO public.empreendimentos (id, nome, slug, regiao, imagem_url, descricao, ativo) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Quattre Istambul', 'quattre-istambul', 'Sobradinho', '/quattre-istambul-preview.webp', '72 unidades • 6 andares • 4 tipologias', true),
  ('a0000000-0000-0000-0000-000000000002', 'Villa Bianco', 'villa-bianco', 'Park Sul', '/villa-bianco-preview.webp', '123 unidades • 4 blocos • 8 tipologias', true),
  ('a0000000-0000-0000-0000-000000000003', 'Moment', 'moment', 'Noroeste', '/moment-preview.webp', '72 unidades • 6 andares • 4 tipologias', true)
ON CONFLICT (slug) DO NOTHING;

-- Migrar unidades do Quattre Istambul para projeto_units
INSERT INTO public.projeto_units (empreendimento_id, andar, unidade, vagas, area, area_str, quartos, valor_venda, status, posicao_solar, tipologia, bloco, ordem)
SELECT
  'a0000000-0000-0000-0000-000000000001'::uuid,
  u.andar,
  u.unidade::text,
  u.vagas,
  u.area,
  u.area_str,
  u.quartos,
  u.valor_venda,
  u.status,
  u.posicao_solar,
  u.quartos::text || ' Quartos',
  '',
  u.unidade
FROM public.units u
ON CONFLICT DO NOTHING;

-- Migrar unidades do Villa Bianco para projeto_units
INSERT INTO public.projeto_units (empreendimento_id, andar, unidade, vagas, area, area_str, quartos, valor_venda, status, posicao_solar, tipologia, bloco, ordem)
SELECT
  'a0000000-0000-0000-0000-000000000002'::uuid,
  u.andar,
  u.unidade::text,
  u.vagas,
  u.area,
  u.area_str,
  u.quartos,
  u.valor_venda,
  u.status,
  CASE
    WHEN u.bloco = 'B' OR u.bloco = 'C' THEN 'Nascente'
    WHEN u.unidade % 10 IN (2,3,4) THEN 'Face Norte'
    ELSE 'Face Sul'
  END,
  u.tipologia,
  u.bloco,
  (u.andar * 100) + u.unidade
FROM public.villa_bianco_units u
ON CONFLICT DO NOTHING;

-- Migrar unidades do Moment para projeto_units
INSERT INTO public.projeto_units (empreendimento_id, andar, unidade, vagas, area, area_str, quartos, valor_venda, status, posicao_solar, tipologia, bloco, is_cobertura, ordem)
SELECT
  'a0000000-0000-0000-0000-000000000003'::uuid,
  u.andar,
  u.unidade::text,
  u.vagas,
  u.area,
  u.area_str,
  u.quartos,
  u.valor_venda,
  u.status,
  u.posicao_solar,
  u.tipologia,
  '',
  u.is_cobertura,
  u.unidade
FROM public.moment_units u
ON CONFLICT DO NOTHING;

-- Ativar Realtime nas novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.empreendimentos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projeto_units;
