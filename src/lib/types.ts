export type StatusVaca = "lactacao" | "seca" | "prenha" | "descartada";

export interface Vaca {
  id: string;
  nome: string;
  brinco: string;
  raca: string;
  dataNascimento: string; // ISO
  dataUltimoParto: string;
  dataInicioLactacao: string;
  status: StatusVaca;
  observacoes?: string;
}

export interface ProducaoMensal {
  id: string;
  vacaId: string;
  ano: number;
  mes: number; // 1-12
  totalLitros: number;
  mediaDiaria: number;
  observacoes?: string;
}

export type Periodicidade =
  | "anual"
  | "semestral"
  | "trimestral"
  | "mensal"
  | "dose_unica"
  | "personalizado";

export interface Vacina {
  id: string;
  nome: string;
  doenca: string;
  fabricante: string;
  lote?: string;
  doses: number;
  intervaloDoses: number; // dias
  periodicidade: Periodicidade;
  periodicidadeDiasCustom?: number;
  carencia: number; // dias
  observacoes?: string;
}

export interface AplicacaoVacina {
  id: string;
  vacaId: string;
  vacinaId: string;
  data: string; // ISO
  dose: string; // "1ª", "2ª", "Reforço"
  responsavel: string;
  lote?: string;
  proximaDose?: string;
  observacoes?: string;
}
