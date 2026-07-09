import type { AppState } from "./store";
import type { AplicacaoVacina, ProducaoMensal, Vaca, Vacina } from "./types";

export function seedData(): AppState {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return iso(d);
  };
  const yearsAgo = (n: number) => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - n);
    return iso(d);
  };

  const vacas: Vaca[] = [
    {
      id: "v1",
      nome: "Mimosa",
      brinco: "0231",
      raca: "Holandesa",
      dataNascimento: yearsAgo(4),
      dataUltimoParto: daysAgo(120),
      dataInicioLactacao: daysAgo(118),
      status: "lactacao",
      observacoes: "Alta produtividade histórica.",
    },
    {
      id: "v2",
      nome: "Estrela",
      brinco: "0189",
      raca: "Jersey",
      dataNascimento: yearsAgo(5),
      dataUltimoParto: daysAgo(60),
      dataInicioLactacao: daysAgo(58),
      status: "lactacao",
      observacoes: "",
    },
    {
      id: "v3",
      nome: "Malhada",
      brinco: "0342",
      raca: "Girolando",
      dataNascimento: yearsAgo(6),
      dataUltimoParto: daysAgo(280),
      dataInicioLactacao: daysAgo(278),
      status: "seca",
      observacoes: "Encerrando ciclo.",
    },
    {
      id: "v4",
      nome: "Boneca",
      brinco: "0410",
      raca: "Gir",
      dataNascimento: yearsAgo(3),
      dataUltimoParto: daysAgo(200),
      dataInicioLactacao: daysAgo(198),
      status: "prenha",
      observacoes: "Prevista para novo parto em 2 meses.",
    },
    {
      id: "v5",
      nome: "Flor",
      brinco: "0555",
      raca: "Holandesa",
      dataNascimento: yearsAgo(5),
      dataUltimoParto: daysAgo(90),
      dataInicioLactacao: daysAgo(88),
      status: "lactacao",
    },
  ];

  // Generate 8 months of production for each in-lactation cow
  const producoes: ProducaoMensal[] = [];
  const now = new Date();
  const curves: Record<string, number[]> = {
    v1: [420, 640, 820, 900, 880, 760, 700, 650],
    v2: [380, 520, 610, 640, 600, 540],
    v3: [500, 620, 700, 690, 640, 580, 500, 380],
    v4: [400, 520, 600, 580, 500, 420],
    v5: [450, 640, 780, 820, 790],
  };
  for (const vaca of vacas) {
    const arr = curves[vaca.id] ?? [];
    for (let i = arr.length - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = arr[arr.length - 1 - i];
      producoes.push({
        id: `p-${vaca.id}-${i}`,
        vacaId: vaca.id,
        ano: d.getFullYear(),
        mes: d.getMonth() + 1,
        totalLitros: total,
        mediaDiaria: +(total / 30).toFixed(2),
      });
    }
  }

  const vacinas: Vacina[] = [
    {
      id: "vc1",
      nome: "Febre Aftosa",
      doenca: "Febre aftosa",
      fabricante: "Ourofino",
      doses: 1,
      intervaloDoses: 0,
      periodicidade: "semestral",
      carencia: 0,
    },
    {
      id: "vc2",
      nome: "Brucelose B19",
      doenca: "Brucelose",
      fabricante: "Vallée",
      doses: 1,
      intervaloDoses: 0,
      periodicidade: "dose_unica",
      carencia: 0,
    },
    {
      id: "vc3",
      nome: "Clostridiose",
      doenca: "Carbúnculo sintomático",
      fabricante: "Zoetis",
      doses: 2,
      intervaloDoses: 30,
      periodicidade: "anual",
      carencia: 21,
    },
    {
      id: "vc4",
      nome: "IBR/BVD",
      doenca: "Rinotraqueíte / Diarreia viral",
      fabricante: "MSD",
      doses: 2,
      intervaloDoses: 21,
      periodicidade: "anual",
      carencia: 0,
    },
  ];

  const aplicacoes: AplicacaoVacina[] = [
    {
      id: "a1",
      vacaId: "v1",
      vacinaId: "vc1",
      data: daysAgo(150),
      dose: "Reforço",
      responsavel: "João Silva",
      proximaDose: daysAgo(150 - 180),
    },
    {
      id: "a2",
      vacaId: "v1",
      vacinaId: "vc3",
      data: daysAgo(400),
      dose: "1ª",
      responsavel: "João Silva",
      proximaDose: daysAgo(400 - 365),
    },
    {
      id: "a3",
      vacaId: "v2",
      vacinaId: "vc1",
      data: daysAgo(25),
      dose: "Reforço",
      responsavel: "Maria Souza",
      proximaDose: daysAgo(25 - 180),
    },
    {
      id: "a4",
      vacaId: "v3",
      vacinaId: "vc4",
      data: daysAgo(370),
      dose: "1ª",
      responsavel: "João Silva",
      proximaDose: daysAgo(370 - 365),
    },
    {
      id: "a5",
      vacaId: "v4",
      vacinaId: "vc1",
      data: daysAgo(10),
      dose: "Reforço",
      responsavel: "Maria Souza",
      proximaDose: daysAgo(10 - 180),
    },
  ];

  return { vacas, producoes, vacinas, aplicacoes };
}
