export interface BatidaDia {
  dia: number;
  dataStr: string; // Ex: "01/10/2026"
  diaSemana: "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sáb" | "Dom";
  entrada1: string; // "08:00"
  saida1: string;   // "12:00"
  entrada2: string; // "13:00"
  saida2: string;   // "17:00"
  observacao?: string; // "Normal", "DSR", "Feriado", "Atestado", "Falta", etc.
  ehFeriado?: boolean;
  folgaCompensatoria?: boolean;
  // Campos calculados:
  minutosTrabalhados?: number;
  minutosJornadaNominal?: number;
  minutosIntervaloAlmoco?: number;
  minutosAlmocoSuprimido?: number;
  minutosBancoCredito?: number;
  minutosBancoDebito?: number;
  minutosHE50?: number;
  minutosHE100?: number;
  minutosNoturnos?: number;
}

export interface FeriadoFixo {
  id: string;
  dia: number; // 1 a 31
  mes: number; // 1 a 12 (1 = Jan, 12 = Dez)
  descricao: string;
  tipo: "Nacional" | "Municipal" | "Estadual";
}

export const FERIADOS_FIXOS_PADRAO: FeriadoFixo[] = [
  { id: "FER_01_01", dia: 1, mes: 1, descricao: "Confraternização Universal (Ano Novo)", tipo: "Nacional" },
  { id: "FER_21_04", dia: 21, mes: 4, descricao: "Tiradentes", tipo: "Nacional" },
  { id: "FER_01_05", dia: 1, mes: 5, descricao: "Dia Mundial do Trabalho", tipo: "Nacional" },
  { id: "FER_07_09", dia: 7, mes: 9, descricao: "Independência do Brasil", tipo: "Nacional" },
  { id: "FER_12_10", dia: 12, mes: 10, descricao: "Nossa Senhora Aparecida (Padroeira do Brasil)", tipo: "Nacional" },
  { id: "FER_02_11", dia: 2, mes: 11, descricao: "Finados", tipo: "Nacional" },
  { id: "FER_15_11", dia: 15, mes: 11, descricao: "Proclamação da República", tipo: "Nacional" },
  { id: "FER_20_11", dia: 20, mes: 11, descricao: "Dia Nacional de Zumbi e da Consciência Negra", tipo: "Nacional" },
  { id: "FER_25_12", dia: 25, mes: 12, descricao: "Natal", tipo: "Nacional" },
];

export interface CriteriosApuracao {
  limiteDiarioBancoMinutos: number; // 120 min (2h)
  fatorBancoHoras: number; // 1.0 (exato, sem acréscimo)
  sabadoNoBanco: boolean; // true
  minimoIntervaloAlmocoMinutos: number; // 60 min (1h)
  percentualAlmocoSuprimido: number; // 50%
  percentualHEAcima2h: number; // 50%
  percentualDomingoFeriado: number; // 100%
  percentualAdicionalNoturno: number; // 20%
  toleranciaMinutos: number; // 10 min
  jornadaPadraoMinutos: number; // 480 min (8h)
  feriadosFixos: FeriadoFixo[]; // Feriados fixos recorrentes anuais
}

export const CRITERIOS_PADRAO: CriteriosApuracao = {
  limiteDiarioBancoMinutos: 120, // 2 horas
  fatorBancoHoras: 1.0, // exato 1:1
  sabadoNoBanco: true,
  minimoIntervaloAlmocoMinutos: 60, // 1 hora
  percentualAlmocoSuprimido: 50,
  percentualHEAcima2h: 50,
  percentualDomingoFeriado: 100,
  percentualAdicionalNoturno: 20,
  toleranciaMinutos: 10,
  jornadaPadraoMinutos: 480, // 8h
  feriadosFixos: FERIADOS_FIXOS_PADRAO,
};

export interface ResumoMensalFechamento {
  colaboradorNome: string;
  colaboradorCargo: string;
  colaboradorId?: string;
  mesAno: string;
  diasTrabalhados: number;
  diasFalta: number;
  diasAtestado: number;
  totalHorasTrabalhadasMinutos: number;
  totalHorasNominaisMinutos: number;
  // Banco de Horas
  saldoAnteriorBancoMinutos: number;
  bancoCreditosMesMinutos: number;
  bancoDebitosMesMinutos: number;
  saldoLiquidoMesMinutos: number;
  saldoAcumuladoFinalMinutos: number;
  // Horas Extras Pagas
  totalHE50Minutos: number; // Excedente > 2h + Supressão almoço
  totalHE100Minutos: number; // Domingos e Feriados sem folga
  totalAdicionalNoturnoMinutos: number; // 22h às 05h
  // Estimativas financeiras
  salarioBase: number;
  valorHora: number;
  valorEstimadoHE50: number;
  valorEstimadoHE100: number;
  valorEstimadoAdicNoturno: number;
  valorTotalProventosExtras: number;
  dias: BatidaDia[];
}

// Converte "HH:MM" para minutos a partir da meia-noite
export function horaParaMinutos(horaStr: string): number | null {
  if (!horaStr || typeof horaStr !== "string") return null;
  const limpo = horaStr.trim();
  if (!limpo || limpo === "-" || limpo === "--:--") return null;
  const partes = limpo.split(":");
  if (partes.length < 2) return null;
  const h = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Converte minutos para "HH:MM"
export function minutosParaHora(minutosTotal: number, mostrarSinal = false): string {
  if (minutosTotal === null || minutosTotal === undefined || isNaN(minutosTotal)) return "00:00";
  const sinal = minutosTotal < 0 ? "-" : mostrarSinal && minutosTotal > 0 ? "+" : "";
  const abs = Math.abs(Math.round(minutosTotal));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sinal}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Converte minutos para string formatada "00h 00m"
export function minutosParaTextoExtenso(minutosTotal: number, mostrarSinal = true): string {
  if (minutosTotal === null || minutosTotal === undefined || isNaN(minutosTotal)) return "00h 00m";
  const sinal = minutosTotal < 0 ? "-" : mostrarSinal && minutosTotal > 0 ? "+" : "";
  const abs = Math.abs(Math.round(minutosTotal));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sinal}${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

// Converte minutos para valor decimal (ex: 90 min = 1.50)
export function minutosParaDecimal(minutos: number): number {
  if (!minutos || isNaN(minutos)) return 0;
  return Math.round((minutos / 60) * 100) / 100;
}

// Calcula duração entre dois horários em minutos (suporta virada de noite)
export function calcularDuracaoMinutos(inicioStr: string, fimStr: string): number {
  const ini = horaParaMinutos(inicioStr);
  const fim = horaParaMinutos(fimStr);
  if (ini === null || fim === null) return 0;
  if (fim >= ini) {
    return fim - ini;
  } else {
    // Virada de noite (ex: 22:00 às 02:00)
    return (1440 - ini) + fim;
  }
}

// Calcula minutos trabalhados na janela noturna (22:00 às 05:00)
export function calcularMinutosNoturnos(inicioStr: string, fimStr: string): number {
  const ini = horaParaMinutos(inicioStr);
  const fim = horaParaMinutos(fimStr);
  if (ini === null || fim === null) return 0;

  let minutosNoturnos = 0;
  let atual = ini;
  const fimAjustado = fim >= ini ? fim : fim + 1440;

  while (atual < fimAjustado) {
    const minDoDia = atual % 1440;
    // Janela 1: 22:00 (1320) até 24:00 (1440)
    // Janela 2: 00:00 (0) até 05:00 (300)
    if (minDoDia >= 1320 || minDoDia < 300) {
      minutosNoturnos++;
    }
    atual++;
  }

  return minutosNoturnos;
}

// Realiza a apuração diária e mensal completa segundo as regras A&C do WhatsApp
export function calcularFechamentoMensal(
  dias: BatidaDia[],
  criterios: CriteriosApuracao = CRITERIOS_PADRAO,
  dadosGerais: {
    colaboradorNome: string;
    colaboradorCargo: string;
    colaboradorId?: string;
    mesAno: string;
    salarioBase?: number;
    saldoAnteriorBancoMinutos?: number;
    jornadaDiariaMinutos?: number;
    horarioNominal?: {
      entrada: string;
      almocoSaida: string;
      almocoRetorno: string;
      saida: string;
      sabadoAtivo?: boolean;
      sabadoEntrada?: string;
      sabadoSaida?: string;
    };
  }
): ResumoMensalFechamento {
  let totalTrabalhadas = 0;
  let totalNominais = 0;
  let totalBancoCreditos = 0;
  let totalBancoDebitos = 0;
  let totalHE50 = 0;
  let totalHE100 = 0;
  let totalNoturno = 0;
  let diasTrabalhados = 0;
  let diasFalta = 0;
  let diasAtestado = 0;
  const mesNumero = parseInt(dadosGerais.mesAno.split("/")[0], 10);

  const diasApurados: BatidaDia[] = dias.map((diaItem) => {
    const d = { ...diaItem };

    // 0. Verificar se é feriado fixo anual cadastrado nos critérios
    const feriadoFixo = criterios.feriadosFixos?.find((f) => f.dia === d.dia && f.mes === mesNumero);
    if (feriadoFixo) {
      d.ehFeriado = true;
      if (!d.observacao || d.observacao === "Normal" || d.observacao === "Folga") {
        d.observacao = `Feriado: ${feriadoFixo.descricao}`;
      }
    }

    // 1. Calcular tempo trabalhado no período da manhã e da tarde
    const duracaoManha = calcularDuracaoMinutos(d.entrada1, d.saida1);
    const duracaoTarde = calcularDuracaoMinutos(d.entrada2, d.saida2);
    const tempoTrabalhado = duracaoManha + duracaoTarde;
    d.minutosTrabalhados = tempoTrabalhado;

    // 2. Calcular intervalo de almoço
    const duracaoAlmoco = (d.saida1 && d.entrada2) ? calcularDuracaoMinutos(d.saida1, d.entrada2) : 0;
    d.minutosIntervaloAlmoco = duracaoAlmoco;

    // 3. Adicional Noturno (22:00 às 05:00)
    const noturnoManha = calcularMinutosNoturnos(d.entrada1, d.saida1);
    const noturnoTarde = calcularMinutosNoturnos(d.entrada2, d.saida2);
    const totalNoturnoDia = noturnoManha + noturnoTarde;
    d.minutosNoturnos = totalNoturnoDia;
    totalNoturno += totalNoturnoDia;

    // 4. Verificação de status do dia
    const obsLower = (d.observacao || "").toLowerCase();
    const ehAtestado = obsLower.includes("atestado") || obsLower.includes("médico");
    const ehFolgaOuDSR = obsLower.includes("folga") || obsLower.includes("dsr") || d.diaSemana === "Dom";
    const ehFalta = obsLower.includes("falta") || (tempoTrabalhado === 0 && d.diaSemana !== "Sáb" && d.diaSemana !== "Dom" && !d.ehFeriado && !ehFolgaOuDSR && !ehAtestado);

    if (ehAtestado) diasAtestado++;
    if (ehFalta) diasFalta++;
    if (tempoTrabalhado > 0) diasTrabalhados++;

    // 5. Determinar jornada nominal do dia (Feriados têm jornada nominal = 0)
    let jornadaNominal = 0;
    if (d.diaSemana !== "Sáb" && d.diaSemana !== "Dom" && !d.ehFeriado && !ehFolgaOuDSR && !ehAtestado) {
      if (dadosGerais.jornadaDiariaMinutos) {
        jornadaNominal = dadosGerais.jornadaDiariaMinutos;
      } else if (dadosGerais.horarioNominal?.entrada && dadosGerais.horarioNominal?.saida) {
        const manha = calcularDuracaoMinutos(dadosGerais.horarioNominal.entrada, dadosGerais.horarioNominal.almocoSaida || "12:00");
        const tarde = calcularDuracaoMinutos(dadosGerais.horarioNominal.almocoRetorno || "13:00", dadosGerais.horarioNominal.saida);
        jornadaNominal = manha + tarde;
      } else {
        jornadaNominal = criterios.jornadaPadraoMinutos; // Ex: 480 min (8h)
      }
    }
    d.minutosJornadaNominal = jornadaNominal;
    totalNominais += jornadaNominal;
    totalTrabalhadas += tempoTrabalhado;

    // Inicializar rubricas do dia
    let bancoCredito = 0;
    let bancoDebito = 0;
    let he50 = 0;
    let he100 = 0;
    let almocoSuprimido = 0;

    // CRITÉRIO: Supressão de almoço (< 1h)
    // "Tudo que for menor que 1 hora de almoço deve entrar como hora extra, daí esse tem que calcular como hora extra acrescida de 50%"
    if (tempoTrabalhado >= 360 && duracaoAlmoco > 0 && duracaoAlmoco < criterios.minimoIntervaloAlmocoMinutos) {
      almocoSuprimido = criterios.minimoIntervaloAlmocoMinutos - duracaoAlmoco;
      d.minutosAlmocoSuprimido = almocoSuprimido;
      he50 += almocoSuprimido;
    } else {
      d.minutosAlmocoSuprimido = 0;
    }

    // CRITÉRIO: Domingo ou Feriado sem folga compensatória = 100%
    // "Se trabalhar domingo ou feriado sem a folga compensatória deverá ser pago 100%"
    if (d.ehFeriado || d.diaSemana === "Dom") {
      if (tempoTrabalhado > 0) {
        if (d.folgaCompensatoria) {
          // Teve folga compensatória na semana: vai para banco normal
          bancoCredito += tempoTrabalhado;
        } else {
          // Sem folga: 100% pago
          he100 += tempoTrabalhado;
        }
      }
    }
    // CRITÉRIO: Sábado entra como banco de horas (1:1 exato)
    // "Sábado entra como banco de horas" / "horário do banco tem que ser exato, não pode ser acrescido de nada"
    else if (d.diaSemana === "Sáb") {
      if (tempoTrabalhado > 0) {
        bancoCredito += tempoTrabalhado;
      }
    }
    // CRITÉRIO: Segunda a Sexta (Dias Úteis Normais)
    else {
      if (ehAtestado) {
        // Atestado abonado: jornada cumprida sem débito nem crédito
      } else if (ehFalta) {
        // Falta integral: desconta a jornada do banco
        bancoDebito += jornadaNominal;
      } else {
        const saldoDia = tempoTrabalhado - jornadaNominal;

        if (saldoDia > criterios.toleranciaMinutos) {
          // Saldo Positivo (Horas Extras)
          // "Por dia, só podem fazer 2 horas que entram no banco de horas"
          // "Daí tudo que ultrapassar as 2 horas do banco deve também ser pago acrescido dos 50%"
          const maxBanco = criterios.limiteDiarioBancoMinutos; // 120 min
          const paraBanco = Math.min(saldoDia, maxBanco);
          const excedenteAcima2h = Math.max(0, saldoDia - maxBanco);

          bancoCredito += paraBanco;
          he50 += excedenteAcima2h;
        } else if (saldoDia < -criterios.toleranciaMinutos) {
          // Saldo Negativo (Atrasos / Saídas antecipadas)
          // "Nos horários nominais deles deve ser descontado as horas negativas em saldo de banco de horas"
          bancoDebito += Math.abs(saldoDia);
        }
      }
    }

    d.minutosBancoCredito = bancoCredito;
    d.minutosBancoDebito = bancoDebito;
    d.minutosHE50 = he50;
    d.minutosHE100 = he100;

    totalBancoCreditos += bancoCredito;
    totalBancoDebitos += bancoDebito;
    totalHE50 += he50;
    totalHE100 += he100;

    return d;
  });

  const saldoLiquidoMes = totalBancoCreditos - totalBancoDebitos;
  const saldoAnterior = dadosGerais.saldoAnteriorBancoMinutos || 0;
  const saldoAcumuladoFinal = saldoAnterior + saldoLiquidoMes;

  // Cálculos financeiros
  const salario = dadosGerais.salarioBase || 2200.0;
  const cargaHorariaMensal = 220; // padrão CLT
  const valorHora = salario / cargaHorariaMensal;

  const horasDecHE50 = minutosParaDecimal(totalHE50);
  const horasDecHE100 = minutosParaDecimal(totalHE100);
  const horasDecNoturno = minutosParaDecimal(totalNoturno);

  const valorEstimadoHE50 = horasDecHE50 * (valorHora * 1.5);
  const valorEstimadoHE100 = horasDecHE100 * (valorHora * 2.0);
  const valorEstimadoAdicNoturno = horasDecNoturno * (valorHora * (criterios.percentualAdicionalNoturno / 100));
  const valorTotalProventos = valorEstimadoHE50 + valorEstimadoHE100 + valorEstimadoAdicNoturno;

  return {
    colaboradorNome: dadosGerais.colaboradorNome,
    colaboradorCargo: dadosGerais.colaboradorCargo,
    colaboradorId: dadosGerais.colaboradorId,
    mesAno: dadosGerais.mesAno,
    diasTrabalhados,
    diasFalta,
    diasAtestado,
    totalHorasTrabalhadasMinutos: totalTrabalhadas,
    totalHorasNominaisMinutos: totalNominais,
    saldoAnteriorBancoMinutos: saldoAnterior,
    bancoCreditosMesMinutos: totalBancoCreditos,
    bancoDebitosMesMinutos: totalBancoDebitos,
    saldoLiquidoMesMinutos: saldoLiquidoMes,
    saldoAcumuladoFinalMinutos: saldoAcumuladoFinal,
    totalHE50Minutos: totalHE50,
    totalHE100Minutos: totalHE100,
    totalAdicionalNoturnoMinutos: totalNoturno,
    salarioBase: salario,
    valorHora: Math.round(valorHora * 100) / 100,
    valorEstimadoHE50: Math.round(valorEstimadoHE50 * 100) / 100,
    valorEstimadoHE100: Math.round(valorEstimadoHE100 * 100) / 100,
    valorEstimadoAdicNoturno: Math.round(valorEstimadoAdicNoturno * 100) / 100,
    valorTotalProventosExtras: Math.round(valorTotalProventos * 100) / 100,
    dias: diasApurados,
  };
}

// Gera template inicial de 30 ou 31 dias para um mês
export function gerarDiasMes(
  ano: number,
  mes: number,
  feriadosFixos: FeriadoFixo[] = FERIADOS_FIXOS_PADRAO,
  horarioPadrao?: {
    entrada?: string;
    almocoSaida?: string;
    almocoRetorno?: string;
    saida?: string;
    sabadoAtivo?: boolean;
    sabadoEntrada?: string;
    sabadoSaida?: string;
  }
): BatidaDia[] {
  const totalDias = new Date(ano, mes, 0).getDate();
  const nomesDias: ("Dom" | "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sáb")[] = [
    "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"
  ];

  const dias: BatidaDia[] = [];
  for (let dia = 1; dia <= totalDias; dia++) {
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = nomesDias[dataObj.getDay()];
    const ehDomingo = diaSemana === "Dom";
    const ehSabado = diaSemana === "Sáb";

    // Verifica se coincide com feriado fixo anual
    const feriado = feriadosFixos?.find((f) => f.dia === dia && f.mes === mes);
    const ehFeriado = Boolean(feriado);

    let ent1 = "";
    let sai1 = "";
    let ent2 = "";
    let sai2 = "";
    let obs = "Normal";

    if (ehFeriado) {
      obs = `Feriado: ${feriado?.descricao}`;
    } else if (ehDomingo) {
      obs = "DSR";
    } else if (ehSabado) {
      if (horarioPadrao?.sabadoAtivo) {
        ent1 = horarioPadrao.sabadoEntrada || "08:00";
        sai2 = horarioPadrao.sabadoSaida || "12:00";
        obs = "Sábado trabalhado (Banco 1:1)";
      } else {
        obs = "Folga";
      }
    } else {
      // Dia útil normal
      ent1 = horarioPadrao?.entrada || "08:00";
      sai1 = horarioPadrao?.almocoSaida || "12:00";
      ent2 = horarioPadrao?.almocoRetorno || "13:00";
      sai2 = horarioPadrao?.saida || "17:00";
    }

    dias.push({
      dia,
      dataStr: `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`,
      diaSemana,
      entrada1: ent1,
      saida1: sai1,
      entrada2: ent2,
      saida2: sai2,
      observacao: obs,
      ehFeriado,
      folgaCompensatoria: false,
    });
  }

  return dias;
}
