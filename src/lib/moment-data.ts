// Moment - Dados das unidades (72 unidades, torre única, 6 andares)
// Gerado a partir da planilha Moment Atualizado.xlsx

export interface MomentUnit {
  andar: number;
  unidade: number;
  vagas: number;
  area: number;
  areaStr: string;
  valorVenda: number | null;
  valorStr: string;
  valorFormatado: string;
  tipologia: string;
  status: "disponivel" | "reservado" | "vendido";
  quartos: number;
  isCobertura: boolean;
  sol: string;
}

export const momentTipologias = [
  "3 Quartos",
  "3 Quartos 3 Suítes",
  "3 Quartos Semissuítes",
  "Cobertura",
] as const;

export const momentAndares = [1, 2, 3, 4, 5, 6] as const;

export const momentPavimentos: Record<number, string> = {
  1: "1º andar",
  2: "2º andar",
  3: "3º andar",
  4: "4º andar",
  5: "5º andar",
  6: "Cobertura",
};

export function formatMomentCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const momentUnits: MomentUnit[] = [
  { andar: 1, unidade: 101, vagas: 3, area: 112.3, areaStr: "112,30 m²", valorVenda: 2240814.84, valorStr: "2240814,84", valorFormatado: "R$ 2.240.814,84", tipologia: "3 Quartos Semissuítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 1, unidade: 102, vagas: 2, area: 89.34, areaStr: "89,34 m²", valorVenda: 1699023.48, valorStr: "1699023,48", valorFormatado: "R$ 1.699.023,48", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 1, unidade: 103, vagas: 2, area: 88.3, areaStr: "88,30 m²", valorVenda: 1647260.41, valorStr: "1647260,41", valorFormatado: "R$ 1.647.260,41", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 1, unidade: 104, vagas: 2, area: 88.37, areaStr: "88,37 m²", valorVenda: 1680577.25, valorStr: "1680577,25", valorFormatado: "R$ 1.680.577,25", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 1, unidade: 105, vagas: 2, area: 89.33, areaStr: "89,33 m²", valorVenda: 1617936.55, valorStr: "1617936,55", valorFormatado: "R$ 1.617.936,55", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 1, unidade: 106, vagas: 3, area: 104.85, areaStr: "104,85 m²", valorVenda: 2065538.37, valorStr: "2065538,37", valorFormatado: "R$ 2.065.538,37", tipologia: "3 Quartos 3 Suítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 1, unidade: 107, vagas: 3, area: 104.81, areaStr: "104,81 m²", valorVenda: 2065538.37, valorStr: "2065538,37", valorFormatado: "R$ 2.065.538,37", tipologia: "3 Quartos 3 Suítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 1, unidade: 108, vagas: 2, area: 88.32, areaStr: "88,32 m²", valorVenda: 1647633.6, valorStr: "1647633,60", valorFormatado: "R$ 1.647.633,60", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 1, unidade: 109, vagas: 2, area: 89.28, areaStr: "89,28 m²", valorVenda: null, valorStr: "Consulte", valorFormatado: "Consulte o valor", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 1, unidade: 110, vagas: 2, area: 89.39, areaStr: "89,39 m²", valorVenda: 1643309.45, valorStr: "1643309,45", valorFormatado: "R$ 1.643.309,45", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 1, unidade: 111, vagas: 2, area: 88.28, areaStr: "88,28 m²", valorVenda: 1622902.73, valorStr: "1622902,73", valorFormatado: "R$ 1.622.902,73", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 1, unidade: 112, vagas: 3, area: 112.27, areaStr: "112,27 m²", valorVenda: 2191534.36, valorStr: "2191534,36", valorFormatado: "R$ 2.191.534,36", tipologia: "3 Quartos Semissuítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 2, unidade: 201, vagas: 3, area: 112.3, areaStr: "112,30 m²", valorVenda: 2307020.44, valorStr: "2307020,44", valorFormatado: "R$ 2.307.020,44", tipologia: "3 Quartos Semissuítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 2, unidade: 202, vagas: 2, area: 89.34, areaStr: "89,34 m²", valorVenda: 1749995.05, valorStr: "1749995,05", valorFormatado: "R$ 1.749.995,05", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 2, unidade: 203, vagas: 2, area: 88.3, areaStr: "88,30 m²", valorVenda: 1696678.02, valorStr: "1696678,02", valorFormatado: "R$ 1.696.678,02", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 2, unidade: 204, vagas: 2, area: 88.37, areaStr: "88,37 m²", valorVenda: 1730993.86, valorStr: "1730993,86", valorFormatado: "R$ 1.730.993,86", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 2, unidade: 205, vagas: 2, area: 89.33, areaStr: "89,33 m²", valorVenda: 1666474.49, valorStr: "1666474,49", valorFormatado: "R$ 1.666.474,49", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 2, unidade: 206, vagas: 3, area: 104.85, areaStr: "104,85 m²", valorVenda: 2126485.33, valorStr: "2126485,33", valorFormatado: "R$ 2.126.485,33", tipologia: "3 Quartos 3 Suítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 2, unidade: 207, vagas: 3, area: 104.81, areaStr: "104,81 m²", valorVenda: 2126485.33, valorStr: "2126485,33", valorFormatado: "R$ 2.126.485,33", tipologia: "3 Quartos 3 Suítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 2, unidade: 208, vagas: 2, area: 88.32, areaStr: "88,32 m²", valorVenda: 1697061.97, valorStr: "1697061,97", valorFormatado: "R$ 1.697.061,97", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 2, unidade: 209, vagas: 2, area: 89.28, areaStr: "89,28 m²", valorVenda: 1665542.15, valorStr: "1665542,15", valorFormatado: "R$ 1.665.542,15", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 2, unidade: 210, vagas: 2, area: 89.39, areaStr: "89,39 m²", valorVenda: 1692607.7, valorStr: "1692607,70", valorFormatado: "R$ 1.692.607,70", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 2, unidade: 211, vagas: 2, area: 88.28, areaStr: "88,28 m²", valorVenda: 1671590.14, valorStr: "1671590,14", valorFormatado: "R$ 1.671.590,14", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 2, unidade: 212, vagas: 3, area: 112.27, areaStr: "112,27 m²", valorVenda: 2256269.21, valorStr: "2256269,21", valorFormatado: "R$ 2.256.269,21", tipologia: "3 Quartos Semissuítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 3, unidade: 301, vagas: 3, area: 112.3, areaStr: "112,30 m²", valorVenda: 2329751.04, valorStr: "2329751,04", valorFormatado: "R$ 2.329.751,04", tipologia: "3 Quartos Semissuítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 3, unidade: 302, vagas: 2, area: 89.34, areaStr: "89,34 m²", valorVenda: null, valorStr: "Consulte", valorFormatado: "Consulte o valor", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 3, unidade: 303, vagas: 2, area: 88.3, areaStr: "88,30 m²", valorVenda: 1699538.38, valorStr: "1699538,38", valorFormatado: "R$ 1.699.538,38", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 3, unidade: 304, vagas: 2, area: 88.37, areaStr: "88,37 m²", valorVenda: 1748304.53, valorStr: "1748304,53", valorFormatado: "R$ 1.748.304,53", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 3, unidade: 305, vagas: 2, area: 89.33, areaStr: "89,33 m²", valorVenda: 1683139.88, valorStr: "1683139,88", valorFormatado: "R$ 1.683.139,88", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 3, unidade: 306, vagas: 3, area: 104.85, areaStr: "104,85 m²", valorVenda: 2147411.39, valorStr: "2147411,39", valorFormatado: "R$ 2.147.411,39", tipologia: "3 Quartos 3 Suítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 3, unidade: 307, vagas: 3, area: 104.81, areaStr: "104,81 m²", valorVenda: 2147411.39, valorStr: "2147411,39", valorFormatado: "R$ 2.147.411,39", tipologia: "3 Quartos 3 Suítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 3, unidade: 308, vagas: 2, area: 88.32, areaStr: "88,32 m²", valorVenda: 1714032.76, valorStr: "1714032,76", valorFormatado: "R$ 1.714.032,76", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 3, unidade: 309, vagas: 2, area: 89.28, areaStr: "89,28 m²", valorVenda: 1682197.83, valorStr: "1682197,83", valorFormatado: "R$ 1.682.197,83", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 3, unidade: 310, vagas: 2, area: 89.39, areaStr: "89,39 m²", valorVenda: 1709534.39, valorStr: "1709534,39", valorFormatado: "R$ 1.709.534,39", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 3, unidade: 311, vagas: 2, area: 88.28, areaStr: "88,28 m²", valorVenda: 1688306.1, valorStr: "1688306,10", valorFormatado: "R$ 1.688.306,10", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 3, unidade: 312, vagas: 3, area: 112.27, areaStr: "112,27 m²", valorVenda: 2278494.88, valorStr: "2278494,88", valorFormatado: "R$ 2.278.494,88", tipologia: "3 Quartos Semissuítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 4, unidade: 401, vagas: 3, area: 112.3, areaStr: "112,30 m²", valorVenda: null, valorStr: "Consulte", valorFormatado: "Consulte o valor", tipologia: "3 Quartos Semissuítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 4, unidade: 402, vagas: 2, area: 89.34, areaStr: "89,34 m²", valorVenda: null, valorStr: "Consulte", valorFormatado: "Consulte o valor", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 4, unidade: 403, vagas: 2, area: 88.3, areaStr: "88,30 m²", valorVenda: 1716533.73, valorStr: "1716533,73", valorFormatado: "R$ 1.716.533,73", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 4, unidade: 404, vagas: 2, area: 88.37, areaStr: "88,37 m²", valorVenda: 1765787.18, valorStr: "1765787,18", valorFormatado: "R$ 1.765.787,18", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 4, unidade: 405, vagas: 2, area: 89.33, areaStr: "89,33 m²", valorVenda: 1699970.88, valorStr: "1699970,88", valorFormatado: "R$ 1.699.970,88", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 4, unidade: 406, vagas: 3, area: 104.85, areaStr: "104,85 m²", valorVenda: 2168545.09, valorStr: "2168545,09", valorFormatado: "R$ 2.168.545,09", tipologia: "3 Quartos 3 Suítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 4, unidade: 407, vagas: 3, area: 104.81, areaStr: "104,81 m²", valorVenda: 2168545.09, valorStr: "2168545,09", valorFormatado: "R$ 2.168.545,09", tipologia: "3 Quartos 3 Suítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 4, unidade: 408, vagas: 2, area: 88.32, areaStr: "88,32 m²", valorVenda: 1731173.48, valorStr: "1731173,48", valorFormatado: "R$ 1.731.173,48", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 4, unidade: 409, vagas: 2, area: 89.28, areaStr: "89,28 m²", valorVenda: 1699019.17, valorStr: "1699019,17", valorFormatado: "R$ 1.699.019,17", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 4, unidade: 410, vagas: 2, area: 89.39, areaStr: "89,39 m²", valorVenda: 1726629.96, valorStr: "1726629,96", valorFormatado: "R$ 1.726.629,96", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 4, unidade: 411, vagas: 2, area: 88.28, areaStr: "88,28 m²", valorVenda: 1705188.74, valorStr: "1705188,74", valorFormatado: "R$ 1.705.188,74", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 4, unidade: 412, vagas: 3, area: 112.27, areaStr: "112,27 m²", valorVenda: 2300943.47, valorStr: "2300943,47", valorFormatado: "R$ 2.300.943,47", tipologia: "3 Quartos Semissuítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 5, unidade: 501, vagas: 3, area: 112.3, areaStr: "112,30 m²", valorVenda: 2375896.22, valorStr: "2375896,22", valorFormatado: "R$ 2.375.896,22", tipologia: "3 Quartos Semissuítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 5, unidade: 502, vagas: 2, area: 89.34, areaStr: "89,34 m²", valorVenda: 1820001.05, valorStr: "1820001,05", valorFormatado: "R$ 1.820.001,05", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 5, unidade: 503, vagas: 2, area: 88.3, areaStr: "88,30 m²", valorVenda: 1733698.66, valorStr: "1733698,66", valorFormatado: "R$ 1.733.698,66", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 5, unidade: 504, vagas: 2, area: 88.37, areaStr: "88,37 m²", valorVenda: 1800424.57, valorStr: "1800424,57", valorFormatado: "R$ 1.800.424,57", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 5, unidade: 505, vagas: 2, area: 89.33, areaStr: "89,33 m²", valorVenda: 1716970.76, valorStr: "1716970,76", valorFormatado: "R$ 1.716.970,76", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 5, unidade: 506, vagas: 3, area: 104.85, areaStr: "104,85 m²", valorVenda: 2189891.69, valorStr: "2189891,69", valorFormatado: "R$ 2.189.891,69", tipologia: "3 Quartos 3 Suítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 5, unidade: 507, vagas: 3, area: 104.81, areaStr: "104,81 m²", valorVenda: 2189891.69, valorStr: "2189891,69", valorFormatado: "R$ 2.189.891,69", tipologia: "3 Quartos 3 Suítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 5, unidade: 508, vagas: 2, area: 88.32, areaStr: "88,32 m²", valorVenda: 1765464.56, valorStr: "1765464,56", valorFormatado: "R$ 1.765.464,56", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 5, unidade: 509, vagas: 2, area: 89.28, areaStr: "89,28 m²", valorVenda: 1716009.34, valorStr: "1716009,34", valorFormatado: "R$ 1.716.009,34", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 5, unidade: 510, vagas: 2, area: 89.39, areaStr: "89,39 m²", valorVenda: 1743895.4, valorStr: "1743895,40", valorFormatado: "R$ 1.743.895,40", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 5, unidade: 511, vagas: 2, area: 88.28, areaStr: "88,28 m²", valorVenda: 1722241.27, valorStr: "1722241,27", valorFormatado: "R$ 1.722.241,27", tipologia: "3 Quartos", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Sul" },
  { andar: 5, unidade: 512, vagas: 3, area: 112.27, areaStr: "112,27 m²", valorVenda: 2323616.04, valorStr: "2323616,04", valorFormatado: "R$ 2.323.616,04", tipologia: "3 Quartos Semissuítes", status: "disponivel", quartos: 3, isCobertura: false, sol: "Frente Norte" },
  { andar: 6, unidade: 601, vagas: 3, area: 112.31, areaStr: "112,31 m²", valorVenda: 2375896.22, valorStr: "2375896,22", valorFormatado: "R$ 2.375.896,22", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Norte" },
  { andar: 6, unidade: 602, vagas: 3, area: 89.31, areaStr: "89,31 m²", valorVenda: 1836980.47, valorStr: "1836980,47", valorFormatado: "R$ 1.836.980,47", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Norte" },
  { andar: 6, unidade: 603, vagas: 2, area: 88.3, areaStr: "88,30 m²", valorVenda: 1750539.38, valorStr: "1750539,38", valorFormatado: "R$ 1.750.539,38", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Sul" },
  { andar: 6, unidade: 604, vagas: 3, area: 186.23, areaStr: "186,23 m²", valorVenda: 2915961.53, valorStr: "2915961,53", valorFormatado: "R$ 2.915.961,53", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Norte" },
  { andar: 6, unidade: 605, vagas: 3, area: 197.03, areaStr: "197,03 m²", valorVenda: 2937899.59, valorStr: "2937899,59", valorFormatado: "R$ 2.937.899,59", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Sul" },
  { andar: 6, unidade: 606, vagas: 3, area: 210.37, areaStr: "210,37 m²", valorVenda: 3351550.17, valorStr: "3351550,17", valorFormatado: "R$ 3.351.550,17", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Norte" },
  { andar: 6, unidade: 607, vagas: 3, area: 210.55, areaStr: "210,55 m²", valorVenda: 3354389.18, valorStr: "3354389,18", valorFormatado: "R$ 3.354.389,18", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Norte" },
  { andar: 6, unidade: 608, vagas: 3, area: 194.95, areaStr: "194,95 m²", valorVenda: 2993441.59, valorStr: "2993441,59", valorFormatado: "R$ 2.993.441,59", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Norte" },
  { andar: 6, unidade: 609, vagas: 3, area: 182.67, areaStr: "182,67 m²", valorVenda: 2726253.37, valorStr: "2726253,37", valorFormatado: "R$ 2.726.253,37", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Sul" },
  { andar: 6, unidade: 610, vagas: 3, area: 178.07, areaStr: "178,07 m²", valorVenda: 2697824.16, valorStr: "2697824,16", valorFormatado: "R$ 2.697.824,16", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Norte" },
  { andar: 6, unidade: 611, vagas: 3, area: 175.01, areaStr: "175,01 m²", valorVenda: 2652046.82, valorStr: "2652046,82", valorFormatado: "R$ 2.652.046,82", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Sul" },
  { andar: 6, unidade: 612, vagas: 3, area: 261.4, areaStr: "261,40 m²", valorVenda: 4156307.72, valorStr: "4156307,72", valorFormatado: "R$ 4.156.307,72", tipologia: "Cobertura", status: "disponivel", quartos: 3, isCobertura: true, sol: "Frente Norte" }
];

export function getMomentStats() {
  const total = momentUnits.length;
  const disponiveis = momentUnits.filter(u => u.status === "disponivel").length;
  const reservadas = momentUnits.filter(u => u.status === "reservado").length;
  const vendidas = momentUnits.filter(u => u.status === "vendido").length;
  return { total, disponiveis, reservadas, vendidas };
}