// Paleta de cores para gráficos.
// Cores fixas garantem consistência em qualquer tema (claro/escuro)
// e evitam barras pretas por falta de fill.
export const CHART_PALETTE = [
  "#3B82F6", // azul
  "#22C55E", // verde
  "#FACC15", // amarelo
  "#F97316", // laranja
  "#A855F7", // roxo
  "#06B6D4", // ciano
  "#EF4444", // vermelho
  "#EC4899", // rosa
  "#6366F1", // índigo
  "#84CC16", // verde-limão
] as const;

// Hash determinístico para escolher uma cor estável a partir de um identificador
// (nome da vaca, mês, vacina, etc). A mesma chave produz sempre a mesma cor.
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getCategoryColor(key: string | number | null | undefined): string {
  const k = String(key ?? "");
  if (!k) return CHART_PALETTE[0];
  return CHART_PALETTE[hashString(k) % CHART_PALETTE.length];
}

// Cor por índice (repete a paleta em sequência).
export function getColorByIndex(index: number): string {
  return CHART_PALETTE[((index % CHART_PALETTE.length) + CHART_PALETTE.length) % CHART_PALETTE.length];
}
