-- ============================================
-- Quattre Istambul - Seed Data (72 unidades)
-- Execute este SQL APÓS o schema.sql
-- ON CONFLICT atualiza APENAS o valor_venda, preservando status existentes
-- ============================================

INSERT INTO units (andar, unidade, vagas, area, area_str, valor_venda, tipo_area, status, posicao_solar, quartos) VALUES
-- 1º Andar
(1, 101, 1, 100.00, '100 m²', 838041.03, '100m²', 'disponivel', 'Nascente', 3),
(1, 102, 1, 100.00, '100 m²', 925493.41, '100m²', 'disponivel', 'Poente', 3),
(1, 103, 1, 66.00, '66 m²', 554983.54, '66m²', 'disponivel', 'Nascente', 2),
(1, 104, 1, 67.00, '67 m²', 608685.33, '67m²', 'disponivel', 'Poente', 2),
(1, 105, 1, 67.00, '67 m²', 563017.07, '67m²', 'disponivel', 'Nascente', 2),
(1, 106, 1, 69.00, '69 m²', 622690.48, '69m²', 'disponivel', 'Poente', 2),
(1, 107, 1, 69.00, '69 m²', 580255.71, '69m²', 'disponivel', 'Nascente', 2),
(1, 108, 1, 69.00, '69 m²', 622690.48, '69m²', 'disponivel', 'Poente', 2),
(1, 109, 1, 66.00, '66 m²', 554983.54, '66m²', 'disponivel', 'Nascente', 2),
(1, 110, 1, 67.00, '67 m²', 608685.33, '67m²', 'disponivel', 'Poente', 2),
(1, 111, 1, 100.00, '100 m²', 841308.59, '100m²', 'disponivel', 'Nascente', 3),
(1, 112, 1, 100.00, '100 m²', 925493.41, '100m²', 'disponivel', 'Poente', 3),

-- 2º Andar
(2, 201, 1, 100.00, '100 m²', 857644.33, '100m²', 'disponivel', 'Nascente', 3),
(2, 202, 1, 100.00, '100 m²', 971768.55, '100m²', 'disponivel', 'Poente', 3),
(2, 203, 1, 66.00, '66 m²', 568335.05, '66m²', 'disponivel', 'Nascente', 2),
(2, 204, 1, 67.00, '67 m²', 639119.85, '67m²', 'disponivel', 'Poente', 2),
(2, 205, 1, 67.00, '67 m²', 576561.86, '67m²', 'disponivel', 'Nascente', 2),
(2, 206, 1, 69.00, '69 m²', 653825.26, '69m²', 'disponivel', 'Poente', 2),
(2, 207, 1, 69.00, '69 m²', 594215.21, '69m²', 'disponivel', 'Nascente', 2),
(2, 208, 1, 69.00, '69 m²', 653825.26, '69m²', 'disponivel', 'Poente', 2),
(2, 209, 1, 66.00, '66 m²', 568335.05, '66m²', 'disponivel', 'Nascente', 2),
(2, 210, 1, 67.00, '67 m²', 639119.85, '67m²', 'disponivel', 'Poente', 2),
(2, 211, 1, 100.00, '100 m²', 883374.18, '100m²', 'disponivel', 'Nascente', 3),
(2, 212, 1, 100.00, '100 m²', 971768.55, '100m²', 'disponivel', 'Poente', 3),

-- 3º Andar
(3, 301, 1, 100.00, '100 m²', 866221.29, '100m²', 'disponivel', 'Nascente', 3),
(3, 302, 1, 100.00, '100 m²', 981485.59, '100m²', 'disponivel', 'Poente', 3),
(3, 303, 1, 66.00, '66 m²', 574018.74, '66m²', 'disponivel', 'Nascente', 2),
(3, 304, 1, 67.00, '67 m²', 645511.22, '67m²', 'disponivel', 'Poente', 2),
(3, 305, 1, 67.00, '67 m²', 582327.82, '67m²', 'disponivel', 'Nascente', 2),
(3, 306, 1, 69.00, '69 m²', 660363.69, '69m²', 'disponivel', 'Poente', 2),
(3, 307, 1, 69.00, '69 m²', 600157.72, '69m²', 'disponivel', 'Nascente', 2),
(3, 308, 1, 69.00, '69 m²', 660363.69, '69m²', 'disponivel', 'Poente', 2),
(3, 309, 1, 66.00, '66 m²', 574018.74, '66m²', 'disponivel', 'Nascente', 2),
(3, 310, 1, 67.00, '67 m²', 645511.22, '67m²', 'disponivel', 'Poente', 2),
(3, 311, 1, 100.00, '100 m²', 892207.01, '100m²', 'disponivel', 'Nascente', 3),
(3, 312, 1, 100.00, '100 m²', 981485.59, '100m²', 'disponivel', 'Poente', 3),

-- 4º Andar
(4, 401, 2, 100.00, '100 m²', 926470.48, '100m²', 'disponivel', 'Nascente', 3),
(4, 402, 1, 100.00, '100 m²', 991300.65, '100m²', 'disponivel', 'Poente', 3),
(4, 403, 1, 66.00, '66 m²', 579758.50, '66m²', 'disponivel', 'Nascente', 2),
(4, 404, 1, 67.00, '67 m²', 651966.20, '67m²', 'disponivel', 'Poente', 2),
(4, 405, 1, 67.00, '67 m²', 588150.66, '67m²', 'disponivel', 'Nascente', 2),
(4, 406, 1, 69.00, '69 m²', 666967.19, '69m²', 'disponivel', 'Poente', 2),
(4, 407, 1, 69.00, '69 m²', 606158.84, '69m²', 'disponivel', 'Nascente', 2),
(4, 408, 1, 69.00, '69 m²', 666967.19, '69m²', 'disponivel', 'Poente', 2),
(4, 409, 1, 66.00, '66 m²', 579758.50, '66m²', 'disponivel', 'Nascente', 2),
(4, 410, 1, 67.00, '67 m²', 651966.20, '67m²', 'disponivel', 'Poente', 2),
(4, 411, 1, 100.00, '100 m²', 901129.61, '100m²', 'disponivel', 'Nascente', 3),
(4, 412, 1, 100.00, '100 m²', 991228.43, '100m²', 'disponivel', 'Poente', 3),

-- 5º Andar
(5, 501, 2, 100.00, '100 m²', 1015015.26, '100m²', 'disponivel', 'Nascente', 3),
(5, 502, 2, 100.00, '100 m²', 1029173.20, '100m²', 'disponivel', 'Poente', 3),
(5, 503, 1, 66.00, '66 m²', 585556.37, '66m²', 'disponivel', 'Nascente', 2),
(5, 504, 1, 67.00, '67 m²', 658485.48, '67m²', 'disponivel', 'Poente', 2),
(5, 505, 1, 67.00, '67 m²', 594032.46, '67m²', 'disponivel', 'Nascente', 2),
(5, 506, 1, 69.00, '69 m²', 673636.48, '69m²', 'disponivel', 'Poente', 2),
(5, 507, 1, 69.00, '69 m²', 612220.73, '69m²', 'disponivel', 'Nascente', 2),
(5, 508, 1, 69.00, '69 m²', 673636.48, '69m²', 'disponivel', 'Poente', 2),
(5, 509, 1, 66.00, '66 m²', 585556.37, '66m²', 'disponivel', 'Nascente', 2),
(5, 510, 1, 67.00, '67 m²', 658485.48, '67m²', 'disponivel', 'Poente', 2),
(5, 511, 2, 100.00, '100 m²', 1015015.49, '100m²', 'disponivel', 'Nascente', 3),
(5, 512, 2, 100.00, '100 m²', 1029173.20, '100m²', 'disponivel', 'Poente', 3),

-- 6º Andar
(6, 601, 2, 100.00, '100 m²', 1015015.49, '100m²', 'disponivel', 'Nascente', 3),
(6, 602, 2, 100.00, '100 m²', 1029173.20, '100m²', 'disponivel', 'Poente', 3),
(6, 603, 1, 66.00, '66 m²', 591411.68, '66m²', 'disponivel', 'Nascente', 2),
(6, 604, 1, 67.00, '67 m²', 665070.47, '67m²', 'disponivel', 'Poente', 2),
(6, 605, 1, 67.00, '67 m²', 599972.52, '67m²', 'disponivel', 'Nascente', 2),
(6, 606, 1, 69.00, '69 m²', 680372.98, '69m²', 'disponivel', 'Poente', 2),
(6, 607, 1, 69.00, '69 m²', 618342.67, '69m²', 'disponivel', 'Nascente', 2),
(6, 608, 1, 69.00, '69 m²', 680372.98, '69m²', 'disponivel', 'Poente', 2),
(6, 609, 1, 66.00, '66 m²', 591411.68, '66m²', 'disponivel', 'Nascente', 2),
(6, 610, 1, 67.00, '67 m²', 665070.47, '67m²', 'disponivel', 'Poente', 2),
(6, 611, 2, 100.00, '100 m²', 1015015.49, '100m²', 'disponivel', 'Nascente', 3),
(6, 612, 2, 100.00, '100 m²', 1029173.20, '100m²', 'disponivel', 'Poente', 3)
ON CONFLICT (unidade) DO UPDATE SET valor_venda = EXCLUDED.valor_venda;
