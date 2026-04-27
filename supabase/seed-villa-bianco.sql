-- ============================================
-- Villa Bianco - Seed Data (123 unidades)
-- Execute este SQL APÓS o schema-villa-bianco.sql
-- ON CONFLICT atualiza APENAS o valor_venda, preservando status existentes
-- ============================================

INSERT INTO villa_bianco_units (bloco, andar, unidade, vagas, area, area_str, valor_venda, tipologia, status, quartos, is_cobertura, is_garden) VALUES
-- Bloco A - Térreo (Gardens)
('A', 0, 1, 3, 247.88, '247.88 m²', 3521626.21, 'Garden 3 Quartos', 'disponivel', 3, false, true),
('A', 0, 2, 3, 260.93, '260.93 m²', 3667178.31, 'Garden 3 Quartos', 'disponivel', 3, false, true),
-- Bloco A - 1º pavimento
('A', 1, 101, 3, 126.22, '126.22 m²', 2181058.48, '3 Quartos', 'disponivel', 3, false, false),
('A', 1, 102, 3, 126.22, '126.22 m²', 2170458.19, '3 Quartos', 'disponivel', 3, false, false),
('A', 1, 103, 2, 88.10, '88.10 m²', 1500340.12, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco A - 2º pavimento
('A', 2, 201, 3, 126.22, '126.22 m²', 2234102.41, '3 Quartos', 'disponivel', 3, false, false),
('A', 2, 202, 3, 126.22, '126.22 m²', 2223495.54, '3 Quartos', 'disponivel', 3, false, false),
('A', 2, 203, 2, 86.24, '86.24 m²', 1504709.39, '2 Quartos', 'disponivel', 2, false, false),
('A', 2, 204, 2, 104.05, '104.05 m²', 1815436.72, '3 Quartos', 'disponivel', 3, false, false),
('A', 2, 205, 2, 104.05, '104.05 m²', 1824200.50, '3 Quartos', 'disponivel', 3, false, false),
('A', 2, 206, 2, 86.24, '86.24 m²', 1511957.52, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco A - 3º pavimento
('A', 3, 301, 3, 126.22, '126.22 m²', 2254518.35, '3 Quartos', 'disponivel', 3, false, false),
('A', 3, 302, 3, 126.22, '126.22 m²', 2243912.48, '3 Quartos', 'disponivel', 3, false, false),
('A', 3, 303, 2, 86.24, '86.24 m²', 1519200.82, '2 Quartos', 'disponivel', 2, false, false),
('A', 3, 304, 2, 104.05, '104.05 m²', 1832746.67, '3 Quartos', 'disponivel', 3, false, false),
('A', 3, 305, 2, 104.05, '104.05 m²', 1841508.74, '3 Quartos', 'disponivel', 3, false, false),
('A', 3, 306, 2, 86.24, '86.24 m²', 1526453.55, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco A - 4º pavimento
('A', 4, 401, 3, 126.22, '126.22 m²', 2276534.90, '3 Quartos', 'disponivel', 3, false, false),
('A', 4, 402, 3, 126.22, '126.22 m²', 2265928.02, '3 Quartos', 'disponivel', 3, false, false),
('A', 4, 403, 2, 86.24, '86.24 m²', 1533381.45, '2 Quartos', 'disponivel', 2, false, false),
('A', 4, 404, 2, 104.05, '104.05 m²', 1850056.61, '3 Quartos', 'disponivel', 3, false, false),
('A', 4, 405, 2, 104.05, '104.05 m²', 1858818.68, '3 Quartos', 'disponivel', 3, false, false),
('A', 4, 406, 2, 86.24, '86.24 m²', 1540957.29, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco A - 5º pavimento
('A', 5, 501, 3, 126.22, '126.22 m²', 2297751.44, '3 Quartos', 'disponivel', 3, false, false),
('A', 5, 502, 3, 126.22, '126.22 m²', 2287145.14, '3 Quartos', 'disponivel', 3, false, false),
('A', 5, 503, 2, 86.24, '86.24 m²', 1548195.66, '2 Quartos', 'disponivel', 2, false, false),
('A', 5, 504, 2, 104.05, '104.05 m²', 1867366.36, '3 Quartos', 'disponivel', 3, false, false),
('A', 5, 505, 2, 104.05, '104.05 m²', 1876125.94, '3 Quartos', 'disponivel', 3, false, false),
('A', 5, 506, 2, 86.24, '86.24 m²', 1555447.60, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco A - 6º pavimento
('A', 6, 601, 3, 126.22, '126.22 m²', 2312600.02, '3 Quartos', 'disponivel', 3, false, false),
('A', 6, 602, 3, 126.22, '126.22 m²', 2301993.14, '3 Quartos', 'disponivel', 3, false, false),
('A', 6, 603, 2, 86.24, '86.24 m²', 1558285.05, '2 Quartos', 'disponivel', 2, false, false),
('A', 6, 604, 2, 104.05, '104.05 m²', 1880679.34, '3 Quartos', 'disponivel', 3, false, false),
('A', 6, 605, 2, 104.05, '104.05 m²', 1889439.91, '3 Quartos', 'disponivel', 3, false, false),
('A', 6, 606, 2, 86.24, '86.24 m²', 1565613.57, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco A - 7º pavimento (Coberturas)
('A', 7, 701, 4, 167.86, '167.86 m²', 3095222.27, 'Cobertura 3 Quartos', 'disponivel', 3, true, false),
('A', 7, 702, 4, 167.86, '167.86 m²', 3081110.64, 'Cobertura 3 Quartos', 'disponivel', 3, true, false),
('A', 7, 703, 3, 153.33, '153.33 m²', 2788693.66, 'Cobertura 3 Quartos', 'disponivel', 3, true, false),
('A', 7, 704, 3, 154.03, '154.03 m²', 2814388.44, 'Cobertura 3 Quartos', 'disponivel', 3, true, false),
-- Bloco B - Térreo (Gardens)
('B', 0, 1, 3, 267.09, '267.09 m²', 3862320.89, 'Garden 4 Quartos', 'disponivel', 4, false, true),
('B', 0, 2, 3, 267.09, '267.09 m²', 3847216.73, 'Garden 4 Quartos', 'disponivel', 4, false, true),
-- Bloco B - 1º pavimento
('B', 1, 101, 3, 147.20, '147.20 m²', 2494120.81, '4 Quartos', 'disponivel', 4, false, false),
('B', 1, 102, 3, 147.20, '147.20 m²', 2484202.89, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco B - 2º pavimento
('B', 2, 201, 3, 147.20, '147.20 m²', 2555918.90, '4 Quartos', 'disponivel', 4, false, false),
('B', 2, 202, 3, 147.20, '147.20 m²', 2546000.80, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco B - 3º pavimento
('B', 3, 301, 3, 147.20, '147.20 m²', 2580708.01, '4 Quartos', 'disponivel', 4, false, false),
('B', 3, 302, 3, 147.20, '147.20 m²', 2570809.04, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco B - 4º pavimento
('B', 4, 401, 3, 147.20, '147.20 m²', 2605449.51, '4 Quartos', 'disponivel', 4, false, false),
('B', 4, 402, 3, 147.20, '147.20 m²', 2595550.87, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco B - 5º pavimento
('B', 5, 501, 3, 147.20, '147.20 m²', 2630192.64, '4 Quartos', 'disponivel', 4, false, false),
('B', 5, 502, 3, 147.20, '147.20 m²', 2620292.78, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco B - 6º pavimento
('B', 6, 601, 3, 147.20, '147.20 m²', 2647532.40, '4 Quartos', 'disponivel', 4, false, false),
('B', 6, 602, 3, 147.20, '147.20 m²', 2637631.94, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco B - 7º pavimento
('B', 7, 701, 3, 147.20, '147.20 m²', 2664876.39, '4 Quartos', 'disponivel', 4, false, false),
('B', 7, 702, 3, 147.20, '147.20 m²', 2654975.13, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco B - 8º pavimento (Cobertura)
('B', 8, 801, 4, 295.42, '295.42 m²', 5344143.91, 'Cobertura 4 Quartos', 'disponivel', 4, true, false),
-- Bloco C - Térreo (Gardens)
('C', 0, 1, 3, 267.09, '267.09 m²', 3968435.65, 'Garden 4 Quartos', 'disponivel', 4, false, true),
('C', 0, 2, 3, 267.09, '267.09 m²', 3984009.91, 'Garden 4 Quartos', 'disponivel', 4, false, true),
-- Bloco C - 1º pavimento
('C', 1, 101, 3, 147.20, '147.20 m²', 2484202.89, '4 Quartos', 'disponivel', 4, false, false),
('C', 1, 102, 3, 147.20, '147.20 m²', 2494120.81, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco C - 2º pavimento
('C', 2, 201, 3, 147.20, '147.20 m²', 2546000.80, '4 Quartos', 'disponivel', 4, false, false),
('C', 2, 202, 3, 147.20, '147.20 m²', 2555918.90, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco C - 3º pavimento
('C', 3, 301, 3, 147.20, '147.20 m²', 2570809.04, '4 Quartos', 'disponivel', 4, false, false),
('C', 3, 302, 3, 147.20, '147.20 m²', 2580708.01, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco C - 4º pavimento
('C', 4, 401, 3, 147.20, '147.20 m²', 2595550.87, '4 Quartos', 'disponivel', 4, false, false),
('C', 4, 402, 3, 147.20, '147.20 m²', 2605449.51, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco C - 5º pavimento
('C', 5, 501, 3, 147.20, '147.20 m²', 2620292.78, '4 Quartos', 'disponivel', 4, false, false),
('C', 5, 502, 3, 147.20, '147.20 m²', 2630192.64, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco C - 6º pavimento
('C', 6, 601, 3, 147.20, '147.20 m²', 2637631.94, '4 Quartos', 'disponivel', 4, false, false),
('C', 6, 602, 3, 147.20, '147.20 m²', 2647532.40, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco C - 7º pavimento
('C', 7, 701, 3, 147.20, '147.20 m²', 2654975.13, '4 Quartos', 'disponivel', 4, false, false),
('C', 7, 702, 3, 147.20, '147.20 m²', 2664876.39, '4 Quartos', 'disponivel', 4, false, false),
-- Bloco C - 8º pavimento (Cobertura)
('C', 8, 801, 4, 295.42, '295.42 m²', 5344143.91, 'Cobertura 4 Quartos', 'disponivel', 4, true, false),
-- Bloco D - Térreo (Gardens)
('D', 0, 1, 3, 229.89, '229.89 m²', 3378711.77, 'Garden 3 Quartos', 'disponivel', 3, false, true),
('D', 0, 2, 3, 351.87, '351.87 m²', 4644009.54, 'Garden 3 Quartos', 'disponivel', 3, false, true),
('D', 0, 3, 2, 181.73, '181.73 m²', 2599030.48, 'Garden 2 Quartos', 'disponivel', 2, false, true),
('D', 0, 4, 3, 351.87, '351.87 m²', 4709302.99, 'Garden 3 Quartos', 'disponivel', 3, false, true),
('D', 0, 5, 3, 245.52, '245.52 m²', 3535624.39, 'Garden 3 Quartos', 'disponivel', 3, false, true),
-- Bloco D - 1º pavimento
('D', 1, 101, 3, 126.22, '126.22 m²', 2136525.32, '3 Quartos', 'disponivel', 3, false, false),
('D', 1, 102, 3, 126.22, '126.22 m²', 2147113.83, '3 Quartos', 'disponivel', 3, false, false),
('D', 1, 103, 2, 85.71, '85.71 m²', 1458002.21, '2 Quartos', 'disponivel', 2, false, false),
('D', 1, 104, 3, 126.22, '126.22 m²', 2168330.54, '3 Quartos', 'disponivel', 3, false, false),
('D', 1, 105, 3, 126.22, '126.22 m²', 2157724.28, '3 Quartos', 'disponivel', 3, false, false),
-- Bloco D - 2º pavimento
('D', 2, 201, 3, 126.22, '126.22 m²', 2189548.48, '3 Quartos', 'disponivel', 3, false, false),
('D', 2, 202, 3, 126.22, '126.22 m²', 2200154.64, '3 Quartos', 'disponivel', 3, false, false),
('D', 2, 203, 2, 85.71, '85.71 m²', 1494026.29, '2 Quartos', 'disponivel', 2, false, false),
('D', 2, 204, 3, 126.22, '126.22 m²', 2221373.17, '3 Quartos', 'disponivel', 3, false, false),
('D', 2, 205, 3, 126.22, '126.22 m²', 2210765.62, '3 Quartos', 'disponivel', 3, false, false),
('D', 2, 206, 2, 85.71, '85.71 m²', 1486781.30, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco D - 3º pavimento
('D', 3, 301, 3, 126.22, '126.22 m²', 2210765.62, '3 Quartos', 'disponivel', 3, false, false),
('D', 3, 302, 3, 126.22, '126.22 m²', 2221373.17, '3 Quartos', 'disponivel', 3, false, false),
('D', 3, 303, 2, 85.71, '85.71 m²', 1508424.02, '2 Quartos', 'disponivel', 2, false, false),
('D', 3, 304, 3, 126.22, '126.22 m²', 2242588.83, '3 Quartos', 'disponivel', 3, false, false),
('D', 3, 305, 3, 126.22, '126.22 m²', 2231980.17, '3 Quartos', 'disponivel', 3, false, false),
('D', 3, 306, 2, 85.71, '85.71 m²', 1501224.65, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco D - 4º pavimento
('D', 4, 401, 3, 126.22, '126.22 m²', 2231980.17, '3 Quartos', 'disponivel', 3, false, false),
('D', 4, 402, 3, 126.22, '126.22 m²', 2242588.83, '3 Quartos', 'disponivel', 3, false, false),
('D', 4, 403, 2, 85.71, '85.71 m²', 1522814.76, '2 Quartos', 'disponivel', 2, false, false),
('D', 4, 404, 3, 126.22, '126.22 m²', 2263805.77, '3 Quartos', 'disponivel', 3, false, false),
('D', 4, 405, 3, 126.22, '126.22 m²', 2253196.30, '3 Quartos', 'disponivel', 3, false, false),
('D', 4, 406, 2, 85.71, '85.71 m²', 1516411.59, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco D - 5º pavimento
('D', 5, 501, 3, 126.22, '126.22 m²', 2253196.30, '3 Quartos', 'disponivel', 3, false, false),
('D', 5, 502, 3, 126.22, '126.22 m²', 2263805.77, '3 Quartos', 'disponivel', 3, false, false),
('D', 5, 503, 2, 85.71, '85.71 m²', 1537221.71, '2 Quartos', 'disponivel', 2, false, false),
('D', 5, 504, 3, 126.22, '126.22 m²', 2285022.51, '3 Quartos', 'disponivel', 3, false, false),
('D', 5, 505, 3, 126.22, '126.22 m²', 2274412.83, '3 Quartos', 'disponivel', 3, false, false),
('D', 5, 506, 2, 85.71, '85.71 m²', 1530238.74, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco D - 6º pavimento
('D', 6, 601, 3, 126.22, '126.22 m²', 2268024.30, '3 Quartos', 'disponivel', 3, false, false),
('D', 6, 602, 3, 126.22, '126.22 m²', 2278416.48, '3 Quartos', 'disponivel', 3, false, false),
('D', 6, 603, 2, 85.71, '85.71 m²', 1547366.30, '2 Quartos', 'disponivel', 2, false, false),
('D', 6, 604, 3, 126.22, '126.22 m²', 2299952.29, '3 Quartos', 'disponivel', 3, false, false),
('D', 6, 605, 3, 126.22, '126.22 m²', 2289344.82, '3 Quartos', 'disponivel', 3, false, false),
('D', 6, 606, 2, 85.71, '85.71 m²', 1540543.74, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco D - 7º pavimento
('D', 7, 701, 3, 126.22, '126.22 m²', 2282982.86, '3 Quartos', 'disponivel', 3, false, false),
('D', 7, 702, 3, 126.22, '126.22 m²', 2293388.55, '3 Quartos', 'disponivel', 3, false, false),
('D', 7, 703, 2, 85.71, '85.71 m²', 1557514.33, '2 Quartos', 'disponivel', 2, false, false),
('D', 7, 704, 3, 126.22, '126.22 m²', 2314724.67, '3 Quartos', 'disponivel', 3, false, false),
('D', 7, 705, 3, 126.22, '126.22 m²', 2304115.00, '3 Quartos', 'disponivel', 3, false, false),
('D', 7, 706, 2, 85.71, '85.71 m²', 1550370.13, '2 Quartos', 'disponivel', 2, false, false),
-- Bloco D - 8º pavimento (Coberturas)
('D', 8, 801, 4, 173.31, '173.31 m²', 3155513.68, 'Cobertura 3 Quartos', 'disponivel', 3, true, false),
('D', 8, 802, 4, 173.31, '173.31 m²', 3170008.06, 'Cobertura 3 Quartos', 'disponivel', 3, true, false),
('D', 8, 803, 4, 167.86, '167.86 m²', 3098484.06, 'Cobertura 3 Quartos', 'disponivel', 3, true, false),
('D', 8, 804, 4, 167.86, '167.86 m²', 3084343.94, 'Cobertura 3 Quartos', 'disponivel', 3, true, false)
ON CONFLICT (bloco, unidade) DO UPDATE SET valor_venda = EXCLUDED.valor_venda;
