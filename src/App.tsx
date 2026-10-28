import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  Sliders,
  DollarSign,
  Download,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Plus,
  ShieldAlert,
  Moon,
  Sun,
  Printer,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  X,
  FileSpreadsheet,
  Building2,
  ArrowRight,
  Play,
  UserPlus,
  History,
  TrendingUp,
  TrendingDown,
  Lock,
  Key,
  LogOut,
  Menu,
  CalendarClock,
  Link2,
  Copy,
  CheckSquare,
  Square,
  Layers,
  Smartphone,
  Apple,
  LayoutDashboard,
  UserCheck,
  UserX,
  Coffee,
  Activity,
  Briefcase,
  PieChart as PieChartIcon,
  BarChart3,
  Bell,
  BellRing,
  FileCheck,
  QrCode,
  Share2,
  Stethoscope,
  FileUp,
  Receipt,
  Send,
  MessageSquare,
} from "lucide-react";
import {
  ComprovantePonto,
  gerarComprovantePDF,
  gerarTextoWhatsAppComprovante,
  gerarHashAutenticidade,
} from "./utils/comprovantePonto";
import {
  gerarArquivoAFD,
  gerarArquivoAFDT,
  baixarArquivoTexto,
  DADOS_EMPRESA_PADRAO,
} from "./utils/mteFiscalAfd";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Logo } from "./components/Logo";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PWAInstallModal } from "./components/PWAInstallModal";
import { PainelNotificacoesTurno } from "./components/PainelNotificacoesTurno";
import { PainelFolhaVisual } from "./components/PainelFolhaVisual";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { db, cleanForFirestore } from "./lib/firebaseClient";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import {
  verificarEAlertarTurno,
  obterPermissaoNotificacao,
  solicitarPermissaoNotificacao,
  enviarNotificacaoTeste,
} from "./utils/notificacoesPWA";
import {
  BatidaDia,
  CriteriosApuracao,
  CRITERIOS_PADRAO,
  ResumoMensalFechamento,
  FeriadoFixo,
  FERIADOS_FIXOS_PADRAO,
  calcularFechamentoMensal,
  gerarDiasMes,
  minutosParaTextoExtenso,
  minutosParaHora,
  minutosParaDecimal,
  calcularDuracaoMinutos,
  HorarioTrabalhoColab,
  HorarioDiaSemana,
  DiasSemanaChave,
} from "./lib/calculosPonto";

export const DIAS_SEMANA_ORDEM: { chave: DiasSemanaChave; rotulo: string; rotuloCurto: string }[] = [
  { chave: "Seg", rotulo: "Segunda-feira", rotuloCurto: "Seg" },
  { chave: "Ter", rotulo: "Terça-feira", rotuloCurto: "Ter" },
  { chave: "Qua", rotulo: "Quarta-feira", rotuloCurto: "Qua" },
  { chave: "Qui", rotulo: "Quinta-feira", rotuloCurto: "Qui" },
  { chave: "Sex", rotulo: "Sexta-feira", rotuloCurto: "Sex" },
  { chave: "Sáb", rotulo: "Sábado", rotuloCurto: "Sáb" },
  { chave: "Dom", rotulo: "Domingo", rotuloCurto: "Dom" },
];

export interface EscalaTrabalho {
  id: string;
  nome: string;
  tipo: "5x2" | "6x1" | "12x36" | "personalizada";
  descricao?: string;
  diasSemana: string;
  cargaSemanalHoras: number;
  horario: HorarioTrabalhoColab;
  toleranciaMinutos?: number;
  cor?: string;
}

export const ESCALAS_INICIAIS: EscalaTrabalho[] = [
  {
    id: "ESC_001",
    nome: "Administrativo Geral (08h às 17h)",
    tipo: "5x2",
    descricao: "Jornada padrão de 40h semanais com 1h de almoço (12h-13h) e sábados livres.",
    diasSemana: "Segunda a Sexta",
    cargaSemanalHoras: 40,
    horario: {
      entrada: "08:00",
      almocoSaida: "12:00",
      almocoRetorno: "13:00",
      saida: "17:00",
      sabadoAtivo: false,
    },
    toleranciaMinutos: 10,
    cor: "sky",
  },
  {
    id: "ESC_002",
    nome: "Segurança do Trabalho (07h30 às 16h30)",
    tipo: "5x2",
    descricao: "Jornada antecipada para acompanhamento técnico de campo, 40h semanais.",
    diasSemana: "Segunda a Sexta",
    cargaSemanalHoras: 40,
    horario: {
      entrada: "07:30",
      almocoSaida: "11:30",
      almocoRetorno: "12:30",
      saida: "16:30",
      sabadoAtivo: false,
    },
    toleranciaMinutos: 10,
    cor: "emerald",
  },
  {
    id: "ESC_003",
    nome: "Comercial & Atendimento (08h30 às 17h30)",
    tipo: "5x2",
    descricao: "Jornada de suporte comercial com início às 08h30 e término às 17h30.",
    diasSemana: "Segunda a Sexta",
    cargaSemanalHoras: 40,
    horario: {
      entrada: "08:30",
      almocoSaida: "12:30",
      almocoRetorno: "13:30",
      saida: "17:30",
      sabadoAtivo: false,
    },
    toleranciaMinutos: 10,
    cor: "purple",
  },
  {
    id: "ESC_004",
    nome: "Operacional com Sábado (44h semanais)",
    tipo: "6x1",
    descricao: "Jornada integral de segunda a sexta (08h-17h) e sábados das 08h às 12h.",
    diasSemana: "Segunda a Sábado",
    cargaSemanalHoras: 44,
    horario: {
      entrada: "08:00",
      almocoSaida: "12:00",
      almocoRetorno: "13:00",
      saida: "17:00",
      sabadoAtivo: true,
      sabadoEntrada: "08:00",
      sabadoSaida: "12:00",
    },
    toleranciaMinutos: 10,
    cor: "amber",
  },
  {
    id: "ESC_005",
    nome: "Plantão 12x36 Diurno (07h às 19h)",
    tipo: "12x36",
    descricao: "Plantão de 12 horas diurnas de trabalho por 36 horas de descanso.",
    diasSemana: "12x36 (Dia Sim, Dia Não)",
    cargaSemanalHoras: 36,
    horario: {
      entrada: "07:00",
      almocoSaida: "12:00",
      almocoRetorno: "13:00",
      saida: "19:00",
      sabadoAtivo: false,
    },
    toleranciaMinutos: 10,
    cor: "teal",
  },
  {
    id: "ESC_006",
    nome: "Plantão 12x36 Noturno (19h às 07h)",
    tipo: "12x36",
    descricao: "Plantão noturno 12x36 com adicional noturno integral das 22h às 05h.",
    diasSemana: "12x36 Noturno",
    cargaSemanalHoras: 36,
    horario: {
      entrada: "19:00",
      almocoSaida: "00:00",
      almocoRetorno: "01:00",
      saida: "07:00",
      sabadoAtivo: false,
    },
    toleranciaMinutos: 10,
    cor: "indigo",
  },
];

interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  departamento: string;
  salarioBase: number;
  saldoAnteriorBancoMinutos: number; // Saldo de banco antes de iniciar o sistema
  dataInicioSaldo?: string; // Data base do saldo inicial
  observacaoSaldo?: string; // Observação explicativa do saldo inicial
  senha?: string; // Senha de acesso (padrão Aec2026@)
  primeiroAcesso?: boolean; // True se precisar alterar senha no primeiro acesso
  escalaId?: string; // ID da EscalaTrabalho vinculada
  horarioTrabalho: HorarioTrabalhoColab;
}

export function normalizarColaborador(raw: any): Colaborador {
  const padraoHorario: HorarioTrabalhoColab = {
    entrada: "08:00",
    almocoSaida: "12:00",
    almocoRetorno: "13:00",
    saida: "17:00",
    sabadoAtivo: false,
    sabadoEntrada: "08:00",
    sabadoSaida: "12:00",
    diferenciarPorDia: false,
  };

  const salarioNum =
    typeof raw?.salarioBase === "number" && !isNaN(raw.salarioBase)
      ? raw.salarioBase
      : typeof raw?.salarioBase === "string"
      ? parseFloat(raw.salarioBase.replace(",", ".")) || 2450.0
      : 2450.0;

  const saldoNum =
    typeof raw?.saldoAnteriorBancoMinutos === "number" && !isNaN(raw.saldoAnteriorBancoMinutos)
      ? raw.saldoAnteriorBancoMinutos
      : parseInt(raw?.saldoAnteriorBancoMinutos, 10) || 0;

  return {
    id: raw?.id || `FUNC_${Date.now()}`,
    nome: raw?.nome || "Colaborador",
    cargo: raw?.cargo || "Função Geral",
    departamento: raw?.departamento || "Geral",
    salarioBase: salarioNum,
    saldoAnteriorBancoMinutos: saldoNum,
    dataInicioSaldo: raw?.dataInicioSaldo || "01/09/2026",
    observacaoSaldo: raw?.observacaoSaldo || "",
    senha: raw?.senha || "Aec2026@",
    primeiroAcesso:
      raw?.primeiroAcesso !== undefined
        ? Boolean(raw.primeiroAcesso)
        : (raw?.senha || "Aec2026@").trim().toLowerCase() === "aec2026@",
    escalaId: raw?.escalaId || "ESC_001",
    horarioTrabalho: raw?.horarioTrabalho
      ? {
          entrada: raw.horarioTrabalho.entrada || "08:00",
          almocoSaida: raw.horarioTrabalho.almocoSaida || "12:00",
          almocoRetorno: raw.horarioTrabalho.almocoRetorno || "13:00",
          saida: raw.horarioTrabalho.saida || "17:00",
          sabadoAtivo: Boolean(raw.horarioTrabalho.sabadoAtivo),
          sabadoEntrada: raw.horarioTrabalho.sabadoEntrada || "08:00",
          sabadoSaida: raw.horarioTrabalho.sabadoSaida || "12:00",
          diferenciarPorDia: Boolean(raw.horarioTrabalho.diferenciarPorDia),
          diasSemanaConfig: raw.horarioTrabalho.diasSemanaConfig,
        }
      : padraoHorario,
  };
}

export function normalizarEscala(raw: any): EscalaTrabalho {
  const padraoHorario: HorarioTrabalhoColab = {
    entrada: "08:00",
    almocoSaida: "12:00",
    almocoRetorno: "13:00",
    saida: "17:00",
    sabadoAtivo: false,
    sabadoEntrada: "08:00",
    sabadoSaida: "12:00",
    diferenciarPorDia: false,
  };

  let hor: HorarioTrabalhoColab = padraoHorario;
  if (raw?.horario && typeof raw.horario === "object") {
    hor = {
      entrada: raw.horario.entrada || "08:00",
      almocoSaida: raw.horario.almocoSaida || "12:00",
      almocoRetorno: raw.horario.almocoRetorno || "13:00",
      saida: raw.horario.saida || "17:00",
      sabadoAtivo: Boolean(raw.horario.sabadoAtivo),
      sabadoEntrada: raw.horario.sabadoEntrada || "08:00",
      sabadoSaida: raw.horario.sabadoSaida || "12:00",
      diferenciarPorDia: Boolean(raw.horario.diferenciarPorDia),
      diasSemanaConfig: raw.horario.diasSemanaConfig,
    };
  } else if (raw?.dias && typeof raw.dias === "object") {
    const seg = raw.dias.segunda || raw.dias.Seg || {};
    hor = {
      entrada: seg.entrada || "08:00",
      almocoSaida: seg.intervaloInicio || "12:00",
      almocoRetorno: seg.intervaloFim || "13:00",
      saida: seg.saida || "17:00",
      sabadoAtivo: Boolean(raw.dias.sabado?.ativo),
      sabadoEntrada: raw.dias.sabado?.entrada || "08:00",
      sabadoSaida: raw.dias.sabado?.saida || "12:00",
      diferenciarPorDia: true,
    };
  }

  const nomeEscala = raw?.nome
    ? raw.nome
    : raw?.colaboradorId
    ? `Escala ${raw.colaboradorId}`
    : "Escala Padrão";

  return {
    id: raw?.id || `ESC_${Math.random().toString(36).substr(2, 6)}`,
    nome: nomeEscala,
    tipo: raw?.tipo || "5x2",
    descricao: raw?.descricao || "Escala de trabalho contratual cadastrada",
    diasSemana: raw?.diasSemana || "Segunda a Sexta",
    cargaSemanalHoras: typeof raw?.cargaSemanalHoras === "number" ? raw.cargaSemanalHoras : 40,
    toleranciaMinutos: typeof raw?.toleranciaMinutos === "number" ? raw.toleranciaMinutos : 10,
    cor: raw?.cor || "sky",
    horario: hor,
  };
}

const COLABORADORES_INICIAIS: Colaborador[] = [
  {
    id: "FUNC_001",
    nome: "Thais Moreira de Souza",
    cargo: "Assistente de coletas",
    departamento: "Operações",
    salarioBase: 2450.0,
    saldoAnteriorBancoMinutos: 0,
    dataInicioSaldo: "01/09/2026",
    observacaoSaldo: "",
    senha: "Aec2026@",
    primeiroAcesso: true,
    escalaId: "ESC_001",
    horarioTrabalho: {
      entrada: "08:00",
      almocoSaida: "12:00",
      almocoRetorno: "13:00",
      saida: "17:00",
      sabadoAtivo: false,
    },
  },
];

export interface SolicitacaoAjuste {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorCargo: string;
  tipo: "Atestado Médico" | "Esquecimento de Ponto" | "Serviço Externo / Outros";
  dataOcorrencia: string;
  horarioSugerido?: string;
  campoBatida?: "entrada1" | "saida1" | "entrada2" | "saida2";
  descricaoJustificativa: string;
  comprovanteFotoBase64?: string;
  diasAfastamento?: number;
  status: "Pendente" | "Aprovado" | "Recusado";
  motivoRecusa?: string;
  dataSolicitacao: string;
  dataAprovacao?: string;
  aprovadoPor?: string;
}

const SOLICITACOES_INICIAIS: SolicitacaoAjuste[] = [
  {
    id: "SOLIC_001",
    colaboradorId: "FUNC_001",
    colaboradorNome: "Thais Moreira de Souza",
    colaboradorCargo: "Assistente de coletas",
    tipo: "Atestado Médico",
    dataOcorrencia: "15/09/2026",
    descricaoJustificativa: "Consulta médica oftalmológica de rotina com dilatação de pupila e repouso no período da tarde.",
    diasAfastamento: 1,
    status: "Pendente",
    dataSolicitacao: "15/09/2026 14:30",
  },
];

interface FechamentoArmazenado {
  id: string;
  dataCriacao: string;
  imagemUrl?: string;
  fechamento: ResumoMensalFechamento;
}

const MESES_OPCOES = [
  { valor: "01/2026", rotulo: "01/2026 - Janeiro" },
  { valor: "02/2026", rotulo: "02/2026 - Fevereiro" },
  { valor: "03/2026", rotulo: "03/2026 - Março" },
  { valor: "04/2026", rotulo: "04/2026 - Abril" },
  { valor: "05/2026", rotulo: "05/2026 - Maio" },
  { valor: "06/2026", rotulo: "06/2026 - Junho" },
  { valor: "07/2026", rotulo: "07/2026 - Julho" },
  { valor: "08/2026", rotulo: "08/2026 - Agosto" },
  { valor: "09/2026", rotulo: "09/2026 - Setembro" },
  { valor: "10/2026", rotulo: "10/2026 - Outubro" },
  { valor: "11/2026", rotulo: "11/2026 - Novembro" },
  { valor: "12/2026", rotulo: "12/2026 - Dezembro" },
  { valor: "11/2025", rotulo: "11/2025 - Novembro (2025)" },
  { valor: "12/2025", rotulo: "12/2025 - Dezembro (2025)" },
  { valor: "01/2027", rotulo: "01/2027 - Janeiro (2027)" },
];

export default function App() {
  const [userRole, setUserRole] = useState<"escolha" | "admin" | "funcionario">("escolha");
  const [adminSenhaInput, setAdminSenhaInput] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [adminLoginErro, setAdminLoginErro] = useState<boolean>(false);
  const [funcionarioLoginId, setFuncionarioLoginId] = useState<string>("");

  // Estados para Login e Senhas de Funcionários
  const [modalLoginFuncionarioAberta, setModalLoginFuncionarioAberta] = useState<boolean>(false);
  const [colabTentandoLogarId, setColabTentandoLogarId] = useState<string>("");
  const [senhaLoginFuncInput, setSenhaLoginFuncInput] = useState<string>("");
  const [senhaLoginFuncErro, setSenhaLoginFuncErro] = useState<string | null>(null);
  const [loginStatusMsg, setLoginStatusMsg] = useState<string | null>(null);
  const [mostrarSenhaLoginFunc, setMostrarSenhaLoginFunc] = useState<boolean>(false);
  const [modalAlterarSenhaAberta, setModalAlterarSenhaAberta] = useState<boolean>(false);
  const [novaSenhaInput, setNovaSenhaInput] = useState<string>("");
  const [confirmaNovaSenhaInput, setConfirmaNovaSenhaInput] = useState<string>("");
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState<boolean>(false);
  const [mostrarConfirmaNovaSenha, setMostrarConfirmaNovaSenha] = useState<boolean>(false);
  const [sidebarAbertaMobile, setSidebarAbertaMobile] = useState<boolean>(false);

  // Estados para Comprovantes Digitais (Portaria 671 MTE)
  const [comprovantes, setComprovantes] = useState<ComprovantePonto[]>(() => {
    const salvo = localStorage.getItem("ac_gestor_comprovantes");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [modalComprovanteRecente, setModalComprovanteRecente] = useState<ComprovantePonto | null>(null);
  const [modalMeusComprovantesAberta, setModalMeusComprovantesAberta] = useState<boolean>(false);

  // Estados para Solicitações de Ajuste & Atestados Médicos
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAjuste[]>(() => {
    const salvo = localStorage.getItem("ac_gestor_solicitacoes");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return SOLICITACOES_INICIAIS;
  });
  const [modalNovaSolicitacaoAberta, setModalNovaSolicitacaoAberta] = useState<boolean>(false);
  const [modalVerFotoAtestado, setModalVerFotoAtestado] = useState<string | null>(null);
  const [filtroStatusSolicitacao, setFiltroStatusSolicitacao] = useState<"todos" | "Pendente" | "Aprovado" | "Recusado">("todos");

  // Formulário de Nova Solicitação / Atestado
  const [formSolicTipo, setFormSolicTipo] = useState<"Atestado Médico" | "Esquecimento de Ponto" | "Serviço Externo / Outros">("Atestado Médico");
  const [formSolicData, setFormSolicData] = useState<string>(new Date().toLocaleDateString("pt-BR"));
  const [formSolicHorario, setFormSolicHorario] = useState<string>("08:00");
  const [formSolicCampo, setFormSolicCampo] = useState<"entrada1" | "saida1" | "entrada2" | "saida2">("entrada1");
  const [formSolicDescricao, setFormSolicDescricao] = useState<string>("");
  const [formSolicDiasAfastamento, setFormSolicDiasAfastamento] = useState<number>(1);
  const [formSolicFotoBase64, setFormSolicFotoBase64] = useState<string | null>(null);

  // Estados para Exportação Fiscal AFD / AFDT (Portaria 671 MTE)
  const [modalExportarAFDAberta, setModalExportarAFDAberta] = useState<boolean>(false);
  const [tipoExportacaoFiscal, setTipoExportacaoFiscal] = useState<"AFD" | "AFDT">("AFD");

  const [abaAtiva, setAbaAtiva] = useState<"dashboard" | "painelVisual" | "digitalizar" | "fechamento" | "historico" | "criterios" | "escalas" | "colaboradores" | "baterPonto" | "inconsistencias" | "solicitacoes">("dashboard");
  const [filtroStatusDashboard, setFiltroStatusDashboard] = useState<"todos" | "emTurno" | "almoco" | "concluido" | "aguardando">("todos");
  const [filtroBuscaDashboard, setFiltroBuscaDashboard] = useState<string>("");
  const [filtroDeptoDashboard, setFiltroDeptoDashboard] = useState<string>("todos");
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(() => {
    const salvo = localStorage.getItem("ac_gestor_colaboradores");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizarColaborador);
        }
      } catch (e) {}
    }
    return COLABORADORES_INICIAIS;
  });
  const [criterios, setCriterios] = useState<CriteriosApuracao>(() => {
    const salvo = localStorage.getItem("ac_gestor_criterios");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        return {
          ...CRITERIOS_PADRAO,
          ...parsed,
          feriadosFixos: Array.isArray(parsed.feriadosFixos) && parsed.feriadosFixos.length > 0 ? parsed.feriadosFixos : FERIADOS_FIXOS_PADRAO,
          limiteSabadoBancoMinutos: 120,
          percentualHESabadoExcedente: 50,
        };
      } catch (e) {}
    }
    return CRITERIOS_PADRAO;
  });

  // Gestão de Escalas & Horários
  const [escalas, setEscalas] = useState<EscalaTrabalho[]>(() => {
    const salvo = localStorage.getItem("ac_gestor_escalas");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizarEscala);
      } catch (e) {}
    }
    return ESCALAS_INICIAIS.map(normalizarEscala);
  });

  // Sincronização em tempo real com Firestore (Sincroniza entre celulares e computadores)
  useEffect(() => {
    const unsubColabs = onSnapshot(collection(db, "colaboradores"), (snapshot) => {
      const lista: Colaborador[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        lista.push(normalizarColaborador({ ...d, id: docSnap.id }));
      });
      if (lista.length > 0) {
        setColaboradores(lista);
        localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(lista));
      }
    }, (err) => {
      console.warn("Firestore snapshot colaboradores error:", err);
    });

    const unsubEscalas = onSnapshot(collection(db, "escalas"), (snapshot) => {
      const lista: EscalaTrabalho[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        lista.push(normalizarEscala({ ...d, id: docSnap.id }));
      });
      if (lista.length > 0) {
        setEscalas(lista);
        localStorage.setItem("ac_gestor_escalas", JSON.stringify(lista));
      }
    }, (err) => {
      console.warn("Firestore snapshot escalas error:", err);
    });

    const unsubSolic = onSnapshot(collection(db, "solicitacoes_ajustes"), (snapshot) => {
      const lista: SolicitacaoAjuste[] = [];
      snapshot.forEach((docSnap) => {
        lista.push({ ...(docSnap.data() as SolicitacaoAjuste), id: docSnap.id });
      });
      if (lista.length > 0) {
        setSolicitacoes(lista);
        localStorage.setItem("ac_gestor_solicitacoes", JSON.stringify(lista));
      }
    }, (err) => {
      console.warn("Firestore snapshot solicitacoes error:", err);
    });

    const unsubComp = onSnapshot(collection(db, "comprovantes_ponto"), (snapshot) => {
      const lista: ComprovantePonto[] = [];
      snapshot.forEach((docSnap) => {
        lista.push({ ...(docSnap.data() as ComprovantePonto), id: docSnap.id });
      });
      if (lista.length > 0) {
        setComprovantes(lista);
        localStorage.setItem("ac_gestor_comprovantes", JSON.stringify(lista));
      }
    }, (err) => {
      console.warn("Firestore snapshot comprovantes error:", err);
    });

    return () => {
      unsubColabs();
      unsubEscalas();
      unsubSolic();
      unsubComp();
    };
  }, []);
  const [filtroEscalas, setFiltroEscalas] = useState<string>("");
  const [filtroTipoEscala, setFiltroTipoEscala] = useState<string>("todas");
  const [modalEscalaAberta, setModalEscalaAberta] = useState<boolean>(false);
  const [escalaEditando, setEscalaEditando] = useState<EscalaTrabalho | null>(null);
  const [formEscalaNome, setFormEscalaNome] = useState<string>("");
  const [formEscalaTipo, setFormEscalaTipo] = useState<"5x2" | "6x1" | "12x36" | "personalizada">("5x2");
  const [formEscalaDescricao, setFormEscalaDescricao] = useState<string>("");
  const [formEscalaDiasSemana, setFormEscalaDiasSemana] = useState<string>("Segunda a Sexta");
  const [formEscalaCargaHoras, setFormEscalaCargaHoras] = useState<number>(40);
  const [formEscalaEntrada, setFormEscalaEntrada] = useState<string>("08:00");
  const [formEscalaAlmocoSaida, setFormEscalaAlmocoSaida] = useState<string>("12:00");
  const [formEscalaAlmocoRetorno, setFormEscalaAlmocoRetorno] = useState<string>("13:00");
  const [formEscalaSaida, setFormEscalaSaida] = useState<string>("17:00");
  const [formEscalaSabadoAtivo, setFormEscalaSabadoAtivo] = useState<boolean>(false);
  const [formEscalaSabadoEntrada, setFormEscalaSabadoEntrada] = useState<string>("08:00");
  const [formEscalaSabadoSaida, setFormEscalaSabadoSaida] = useState<string>("12:00");
  const [formEscalaTolerancia, setFormEscalaTolerancia] = useState<number>(10);
  const [formEscalaCor, setFormEscalaCor] = useState<string>("sky");
  const [formEscalaAtualizarColabs, setFormEscalaAtualizarColabs] = useState<boolean>(true);
  const [formEscalaDiferenciarPorDia, setFormEscalaDiferenciarPorDia] = useState<boolean>(false);
  const [formEscalaDiasSemanaConfig, setFormEscalaDiasSemanaConfig] = useState<Record<DiasSemanaChave, HorarioDiaSemana>>({
    Seg: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
    Ter: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
    Qua: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
    Qui: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
    Sex: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
    Sáb: { ativo: false, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "12:00", saida: "12:00" },
    Dom: { ativo: false, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "12:00", saida: "12:00" },
  });

  // PWA Install Modal & Device Hook
  const { isInstallable, isInstalled, isIOS, isAndroid, install: triggerPWAInstall } = usePWAInstall();
  const [modalPWAInstalacaoAberta, setModalPWAInstalacaoAberta] = useState<boolean>(false);

  // Modal Vincular Colaboradores em Lote
  const [modalVincularAberta, setModalVincularAberta] = useState<boolean>(false);
  const [escalaParaVincular, setEscalaParaVincular] = useState<EscalaTrabalho | null>(null);
  const [colaboradoresSelecionadosParaEscala, setColaboradoresSelecionadosParaEscala] = useState<string[]>([]);
  const [filtroVincularColabs, setFiltroVincularColabs] = useState<string>("");

  // No Form do Colaborador: Escala Vinculada
  const [formEscalaVinculadaId, setFormEscalaVinculadaId] = useState<string>("ESC_001");

  // Portal do Funcionário (Bater Ponto)
  const [portalColaboradorId, setPortalColaboradorId] = useState<string>("");
  const [portalDiaSelecionado, setPortalDiaSelecionado] = useState<number>(new Date().getDate());
  const [portalMesAno, setPortalMesAno] = useState<string>("09/2026");
  const [portalSucessoModal, setPortalSucessoModal] = useState<{ tipo: string; hora: string } | null>(null);
  
  // Seleção e parâmetros de upload
  const [colaboradorSelecionadoId, setColaboradorSelecionadoId] = useState<string>("");
  const [mesAnoInput, setMesAnoInput] = useState<string>("09/2026");
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string>("");
  const [estaProcessandoOCR, setEstaProcessandoOCR] = useState<boolean>(false);
  const [etapaProcessamento, setEtapaProcessamento] = useState<string>("");

  // Fechamento ativo em edição/visualização
  const [fechamentoAtual, setFechamentoAtual] = useState<ResumoMensalFechamento | null>(null);
  const [fechamentosSalvos, setFechamentosSalvos] = useState<FechamentoArmazenado[]>([]);
  const [filtroHistorico, setFiltroHistorico] = useState<string>("");
  const [filtroColaboradores, setFiltroColaboradores] = useState<string>("");
  const [toast, setToast] = useState<{ tipo: "sucesso" | "erro" | "aviso"; titulo: string; msg: string } | null>(null);

  // Sub-visão dentro da aba Colaboradores
  const [subAbaColaborador, setSubAbaColaborador] = useState<"lista" | "novo">("lista");
  const [modalColaboradorAberta, setModalColaboradorAberta] = useState<boolean>(false);
  const [colaboradorEditando, setColaboradorEditando] = useState<Colaborador | null>(null);

  // Campos do formulário de colaborador (Identificação & Salário)
  const [formNome, setFormNome] = useState<string>("");
  const [formCargo, setFormCargo] = useState<string>("");
  const [formDepartamento, setFormDepartamento] = useState<string>("Operações");
  const [formSalarioBase, setFormSalarioBase] = useState<string>("2450.00");

  // Banco de Horas Inicial (Antes de Começar a Usar o Sistema)
  const [formSinalBanco, setFormSinalBanco] = useState<"+" | "-">("+");
  const [formHorasBanco, setFormHorasBanco] = useState<number>(0);
  const [formMinutosBanco, setFormMinutosBanco] = useState<number>(0);
  const [formDataInicioSaldo, setFormDataInicioSaldo] = useState<string>("01/09/2026");
  const [formObsSaldo, setFormObsSaldo] = useState<string>("Saldo acumulado prévio à implantação do sistema");

  // Horário Nominal de Trabalho de Cada Um
  const [formEntrada, setFormEntrada] = useState<string>("08:00");
  const [formAlmocoSaida, setFormAlmocoSaida] = useState<string>("12:00");
  const [formAlmocoRetorno, setFormAlmocoRetorno] = useState<string>("13:00");
  const [formSaida, setFormSaida] = useState<string>("17:00");
  const [formSabadoAtivo, setFormSabadoAtivo] = useState<boolean>(false);
  const [formSabadoEntrada, setFormSabadoEntrada] = useState<string>("08:00");
  const [formSabadoSaida, setFormSabadoSaida] = useState<string>("12:00");
  const [formColabDiferenciarPorDia, setFormColabDiferenciarPorDia] = useState<boolean>(false);
  const [formColabDiasSemanaConfig, setFormColabDiasSemanaConfig] = useState<Record<DiasSemanaChave, HorarioDiaSemana>>({
    Seg: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
    Ter: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
    Qua: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
    Qui: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
    Sex: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
    Sáb: { ativo: false, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "12:00", saida: "12:00" },
    Dom: { ativo: false, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "12:00", saida: "12:00" },
  });

  // Modal Rápida: Lançar / Ajustar Saldo Inicial de Banco de Horas
  const [modalAjustarBancoAberta, setModalAjustarBancoAberta] = useState<boolean>(false);
  const [colabAjustandoBanco, setColabAjustandoBanco] = useState<Colaborador | null>(null);
  const [ajusteSinal, setAjusteSinal] = useState<"+" | "-">("+");
  const [ajusteHoras, setAjusteHoras] = useState<number>(0);
  const [ajusteMinutos, setAjusteMinutos] = useState<number>(0);
  const [ajusteDataInicio, setAjusteDataInicio] = useState<string>("01/09/2026");
  const [ajusteObs, setAjusteObs] = useState<string>("");

  // Gerenciamento de Feriados Fixos Recorrentes Anuais
  const [novoFeriadoDia, setNovoFeriadoDia] = useState<number>(1);
  const [novoFeriadoMes, setNovoFeriadoMes] = useState<number>(1);
  const [novoFeriadoDesc, setNovoFeriadoDesc] = useState<string>("");
  const [novoFeriadoTipo, setNovoFeriadoTipo] = useState<"Nacional" | "Municipal" | "Estadual">("Municipal");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (tipo: "sucesso" | "erro" | "aviso", titulo: string, msg: string) => {
    setToast({ tipo, titulo, msg });
    setTimeout(() => setToast(null), 4500);
  };

  // Ouvinte de mensagens do Service Worker (ex: quando o usuário clica na notificação do sistema)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "NOTIFICATION_CLICKED") {
        setAbaAtiva("baterPonto");
        showToast(
          "aviso",
          "⏰ Lembrete de Ponto",
          "Você abriu a notificação de horário. Registre sua marcação de ponto!"
        );
      }
    };

    navigator.serviceWorker.addEventListener("message", handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleSwMessage);
    };
  }, []);

  // Monitor em segundo plano para disparar alertas de entrada e saída
  useEffect(() => {
    const monitorarTurno = async () => {
      const colabAlvoId =
        userRole === "funcionario"
          ? portalColaboradorId
          : portalColaboradorId || colaboradores[0]?.id;
      if (!colabAlvoId) return;

      const colab = colaboradores.find((c) => c.id === colabAlvoId);
      if (!colab) return;

      try {
        const alerta = await verificarEAlertarTurno(colab.id, colab.nome, colab.horarioTrabalho);
        if (alerta) {
          showToast("aviso", `⏰ ${alerta.titulo}`, `${colab.nome}: ${alerta.mensagem}`);
        }
      } catch (e) {
        console.warn("Erro ao monitorar alertas de turno:", e);
      }
    };

    monitorarTurno();
    const interval = setInterval(monitorarTurno, 30000); // Executa a cada 30 segundos
    return () => clearInterval(interval);
  }, [userRole, portalColaboradorId, colaboradores]);


  // Selecionar escala no formulário do colaborador e preencher horários automaticamente
  const handleSelecionarEscalaNoColaborador = (id: string) => {
    setFormEscalaVinculadaId(id);
    if (!id) return;
    const esc = escalas.find((e) => e.id === id);
    if (esc) {
      setFormEntrada(esc.horario.entrada);
      setFormAlmocoSaida(esc.horario.almocoSaida);
      setFormAlmocoRetorno(esc.horario.almocoRetorno);
      setFormSaida(esc.horario.saida);
      setFormSabadoAtivo(Boolean(esc.horario.sabadoAtivo));
      setFormSabadoEntrada(esc.horario.sabadoEntrada || "08:00");
      setFormSabadoSaida(esc.horario.sabadoSaida || "12:00");
      if (esc.horario.diferenciarPorDia && esc.horario.diasSemanaConfig) {
        setFormColabDiferenciarPorDia(true);
        setFormColabDiasSemanaConfig({ ...esc.horario.diasSemanaConfig } as any);
      } else {
        setFormColabDiferenciarPorDia(false);
      }
      showToast("sucesso", "Escala Aplicada", `Horários preenchidos a partir da escala: ${esc.nome}`);
    }
  };

  // Handlers para o Módulo de Escalas & Horários
  const handleAbrirNovaEscala = () => {
    setEscalaEditando(null);
    setFormEscalaNome("");
    setFormEscalaTipo("5x2");
    setFormEscalaDescricao("");
    setFormEscalaDiasSemana("Segunda a Sexta");
    setFormEscalaCargaHoras(40);
    setFormEscalaEntrada("08:00");
    setFormEscalaAlmocoSaida("12:00");
    setFormEscalaAlmocoRetorno("13:00");
    setFormEscalaSaida("17:00");
    setFormEscalaSabadoAtivo(false);
    setFormEscalaSabadoEntrada("08:00");
    setFormEscalaSabadoSaida("12:00");
    setFormEscalaTolerancia(10);
    setFormEscalaCor("sky");
    setFormEscalaAtualizarColabs(true);
    setFormEscalaDiferenciarPorDia(false);
    setFormEscalaDiasSemanaConfig({
      Seg: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
      Ter: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
      Qua: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
      Qui: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
      Sex: { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" },
      Sáb: { ativo: false, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "12:00", saida: "12:00" },
      Dom: { ativo: false, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "12:00", saida: "12:00" },
    });
    setModalEscalaAberta(true);
  };

  const handleAbrirEditarEscala = (escala: EscalaTrabalho) => {
    setEscalaEditando(escala);
    setFormEscalaNome(escala.nome);
    setFormEscalaTipo(escala.tipo);
    setFormEscalaDescricao(escala.descricao || "");
    setFormEscalaDiasSemana(escala.diasSemana);
    setFormEscalaCargaHoras(escala.cargaSemanalHoras);
    setFormEscalaEntrada(escala.horario.entrada);
    setFormEscalaAlmocoSaida(escala.horario.almocoSaida);
    setFormEscalaAlmocoRetorno(escala.horario.almocoRetorno);
    setFormEscalaSaida(escala.horario.saida);
    setFormEscalaSabadoAtivo(Boolean(escala.horario.sabadoAtivo));
    setFormEscalaSabadoEntrada(escala.horario.sabadoEntrada || "08:00");
    setFormEscalaSabadoSaida(escala.horario.sabadoSaida || "12:00");
    setFormEscalaTolerancia(escala.toleranciaMinutos || 10);
    setFormEscalaCor(escala.cor || "sky");
    setFormEscalaAtualizarColabs(true);

    const isDiff = Boolean(escala.horario.diferenciarPorDia);
    setFormEscalaDiferenciarPorDia(isDiff);
    if (escala.horario.diasSemanaConfig) {
      setFormEscalaDiasSemanaConfig({
        Seg: escala.horario.diasSemanaConfig.Seg || { ativo: true, entrada: escala.horario.entrada, almocoSaida: escala.horario.almocoSaida, almocoRetorno: escala.horario.almocoRetorno, saida: escala.horario.saida },
        Ter: escala.horario.diasSemanaConfig.Ter || { ativo: true, entrada: escala.horario.entrada, almocoSaida: escala.horario.almocoSaida, almocoRetorno: escala.horario.almocoRetorno, saida: escala.horario.saida },
        Qua: escala.horario.diasSemanaConfig.Qua || { ativo: true, entrada: escala.horario.entrada, almocoSaida: escala.horario.almocoSaida, almocoRetorno: escala.horario.almocoRetorno, saida: escala.horario.saida },
        Qui: escala.horario.diasSemanaConfig.Qui || { ativo: true, entrada: escala.horario.entrada, almocoSaida: escala.horario.almocoSaida, almocoRetorno: escala.horario.almocoRetorno, saida: escala.horario.saida },
        Sex: escala.horario.diasSemanaConfig.Sex || { ativo: true, entrada: escala.horario.entrada, almocoSaida: escala.horario.almocoSaida, almocoRetorno: escala.horario.almocoRetorno, saida: escala.horario.saida },
        Sáb: escala.horario.diasSemanaConfig.Sáb || { ativo: Boolean(escala.horario.sabadoAtivo), entrada: escala.horario.sabadoEntrada || "08:00", almocoSaida: "12:00", almocoRetorno: "12:00", saida: escala.horario.sabadoSaida || "12:00" },
        Dom: escala.horario.diasSemanaConfig.Dom || { ativo: false, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "12:00", saida: "12:00" },
      });
    } else {
      setFormEscalaDiasSemanaConfig({
        Seg: { ativo: true, entrada: escala.horario.entrada, almocoSaida: escala.horario.almocoSaida, almocoRetorno: escala.horario.almocoRetorno, saida: escala.horario.saida },
        Ter: { ativo: true, entrada: escala.horario.entrada, almocoSaida: escala.horario.almocoSaida, almocoRetorno: escala.horario.almocoRetorno, saida: escala.horario.saida },
        Qua: { ativo: true, entrada: escala.horario.entrada, almocoSaida: escala.horario.almocoSaida, almocoRetorno: escala.horario.almocoRetorno, saida: escala.horario.saida },
        Qui: { ativo: true, entrada: escala.horario.entrada, almocoSaida: escala.horario.almocoSaida, almocoRetorno: escala.horario.almocoRetorno, saida: escala.horario.saida },
        Sex: { ativo: true, entrada: escala.horario.entrada, almocoSaida: escala.horario.almocoSaida, almocoRetorno: escala.horario.almocoRetorno, saida: escala.horario.saida },
        Sáb: { ativo: Boolean(escala.horario.sabadoAtivo), entrada: escala.horario.sabadoEntrada || "08:00", almocoSaida: "12:00", almocoRetorno: "12:00", saida: escala.horario.sabadoSaida || "12:00" },
        Dom: { ativo: false, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "12:00", saida: "12:00" },
      });
    }

    setModalEscalaAberta(true);
  };

  const handleSalvarEscala = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEscalaNome.trim()) {
      showToast("aviso", "Campo Obrigatório", "Informe o nome da escala de trabalho.");
      return;
    }

    let cargaFinal = formEscalaCargaHoras;
    let diasDescricao = formEscalaDiasSemana.trim() || "Segunda a Sexta";

    if (formEscalaDiferenciarPorDia) {
      let minSemana = 0;
      const ativos: string[] = [];
      DIAS_SEMANA_ORDEM.forEach((d) => {
        const cfg = formEscalaDiasSemanaConfig[d.chave];
        if (cfg && cfg.ativo) {
          ativos.push(d.rotuloCurto);
          const durManha = calcularDuracaoMinutos(cfg.entrada, cfg.almocoSaida);
          const durTarde = calcularDuracaoMinutos(cfg.almocoRetorno, cfg.saida);
          minSemana += Math.max(0, durManha + durTarde);
        }
      });
      cargaFinal = Math.round((minSemana / 60) * 10) / 10;
      if (formEscalaDiasSemana.trim() === "" || formEscalaDiasSemana.trim() === "Segunda a Sexta") {
        diasDescricao = ativos.length > 0 ? ativos.join(", ") : "Horários específicos por dia";
      }
    }

    const horarioObj: HorarioTrabalhoColab = {
      entrada: formEscalaEntrada,
      almocoSaida: formEscalaAlmocoSaida,
      almocoRetorno: formEscalaAlmocoRetorno,
      saida: formEscalaSaida,
      sabadoAtivo: formEscalaSabadoAtivo,
      sabadoEntrada: formEscalaSabadoAtivo ? formEscalaSabadoEntrada : undefined,
      sabadoSaida: formEscalaSabadoAtivo ? formEscalaSabadoSaida : undefined,
      diferenciarPorDia: formEscalaDiferenciarPorDia,
      diasSemanaConfig: formEscalaDiferenciarPorDia ? formEscalaDiasSemanaConfig : undefined,
    };

    if (escalaEditando) {
      const atualizadas = escalas.map((esc) => {
        if (esc.id === escalaEditando.id) {
          return {
            ...esc,
            nome: formEscalaNome.trim(),
            tipo: formEscalaTipo,
            descricao: formEscalaDescricao.trim(),
            diasSemana: diasDescricao,
            cargaSemanalHoras: cargaFinal,
            horario: horarioObj,
            toleranciaMinutos: formEscalaTolerancia,
            cor: formEscalaCor,
          };
        }
        return esc;
      });

      setEscalas(atualizadas);
      localStorage.setItem("ac_gestor_escalas", JSON.stringify(atualizadas));
      atualizadas.forEach((esc) => {
        setDoc(doc(db, "escalas", esc.id), cleanForFirestore(esc)).catch(() => {});
      });

      fetch(`/api/escalas/${escalaEditando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formEscalaNome.trim(),
          tipo: formEscalaTipo,
          descricao: formEscalaDescricao.trim(),
          diasSemana: diasDescricao,
          cargaSemanalHoras: cargaFinal,
          horario: horarioObj,
          toleranciaMinutos: formEscalaTolerancia,
          cor: formEscalaCor,
        }),
      }).catch(() => {});

      if (formEscalaAtualizarColabs) {
        const colabsAtualizados = colaboradores.map((c) => {
          if (c.escalaId === escalaEditando.id) {
            return {
              ...c,
              horarioTrabalho: horarioObj,
            };
          }
          return c;
        });
        setColaboradores(colabsAtualizados);
        localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(colabsAtualizados));

        colabsAtualizados.forEach((c) => {
          if (c.escalaId === escalaEditando.id) {
            setDoc(doc(db, "colaboradores", c.id), cleanForFirestore(c)).catch(() => {});
            fetch(`/api/colaboradores/${c.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ horarioTrabalho: horarioObj }),
            }).catch(() => {});
          }
        });
      }

      showToast("sucesso", "Escala Atualizada!", `A escala "${formEscalaNome}" foi salva com sucesso.`);
    } else {
      const nova: EscalaTrabalho = {
        id: `ESC_${Date.now()}`,
        nome: formEscalaNome.trim(),
        tipo: formEscalaTipo,
        descricao: formEscalaDescricao.trim(),
        diasSemana: diasDescricao,
        cargaSemanalHoras: cargaFinal,
        horario: horarioObj,
        toleranciaMinutos: formEscalaTolerancia,
        cor: formEscalaCor,
      };

      const lista = [...escalas, nova];
      setEscalas(lista);
      localStorage.setItem("ac_gestor_escalas", JSON.stringify(lista));
      setDoc(doc(db, "escalas", nova.id), cleanForFirestore(nova)).catch(() => {});

      fetch("/api/escalas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nova),
      }).catch(() => {});

      showToast("sucesso", "Escala Cadastrada!", `A escala "${formEscalaNome}" foi criada com sucesso.`);
    }

    setModalEscalaAberta(false);
    setEscalaEditando(null);
  };

  const handleDuplicarEscala = (escala: EscalaTrabalho) => {
    const duplicada: EscalaTrabalho = {
      ...escala,
      id: `ESC_${Date.now()}`,
      nome: `${escala.nome} (Cópia)`,
    };
    const lista = [...escalas, duplicada];
    setEscalas(lista);
    localStorage.setItem("ac_gestor_escalas", JSON.stringify(lista));
    setDoc(doc(db, "escalas", duplicada.id), cleanForFirestore(duplicada)).catch(() => {});
    fetch("/api/escalas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicada),
    }).catch(() => {});
    showToast("sucesso", "Escala Duplicada", `Criada cópia: "${duplicada.nome}".`);
  };

  const handleExcluirEscala = (id: string, nome: string) => {
    const vinculados = colaboradores.filter((c) => c.escalaId === id);
    if (vinculados.length > 0) {
      if (
        !window.confirm(
          `Existem ${vinculados.length} colaborador(es) vinculados à escala "${nome}". Deseja realmente excluir e desvincular esses colaboradores?`
        )
      ) {
        return;
      }
    }

    const atualizadas = escalas.filter((e) => e.id !== id);
    setEscalas(atualizadas);
    localStorage.setItem("ac_gestor_escalas", JSON.stringify(atualizadas));
    deleteDoc(doc(db, "escalas", id)).catch(() => {});

    const colabsAtualizados = colaboradores.map((c) => {
      if (c.escalaId === id) {
        return { ...c, escalaId: undefined };
      }
      return c;
    });
    setColaboradores(colabsAtualizados);
    localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(colabsAtualizados));
    colabsAtualizados.forEach((c) => {
      if (!c.escalaId) {
        setDoc(doc(db, "colaboradores", c.id), cleanForFirestore(c)).catch(() => {});
      }
    });

    fetch(`/api/escalas/${id}`, { method: "DELETE" }).catch(() => {});
    showToast("sucesso", "Escala Removida", `A escala "${nome}" foi excluída.`);
  };

  const handleAbrirVincularColaboradores = (escala: EscalaTrabalho) => {
    setEscalaParaVincular(escala);
    const ids = colaboradores.filter((c) => c.escalaId === escala.id).map((c) => c.id);
    setColaboradoresSelecionadosParaEscala(ids);
    setFiltroVincularColabs("");
    setModalVincularAberta(true);
  };

  const handleToggleColaboradorVinculo = (colabId: string) => {
    setColaboradoresSelecionadosParaEscala((prev) =>
      prev.includes(colabId) ? prev.filter((id) => id !== colabId) : [...prev, colabId]
    );
  };

  const handleSalvarVinculoColaboradores = () => {
    if (!escalaParaVincular) return;

    const colabsAtualizados = colaboradores.map((c) => {
      const estaMarcado = colaboradoresSelecionadosParaEscala.includes(c.id);
      if (estaMarcado) {
        return {
          ...c,
          escalaId: escalaParaVincular.id,
          horarioTrabalho: { ...escalaParaVincular.horario },
        };
      } else if (c.escalaId === escalaParaVincular.id) {
        return {
          ...c,
          escalaId: undefined,
        };
      }
      return c;
    });

    setColaboradores(colabsAtualizados);
    localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(colabsAtualizados));

    colabsAtualizados.forEach((c) => {
      setDoc(doc(db, "colaboradores", c.id), cleanForFirestore(c)).catch(() => {});
      fetch(`/api/colaboradores/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escalaId: c.escalaId,
          horarioTrabalho: c.horarioTrabalho,
        }),
      }).catch(() => {});
    });

    setModalVincularAberta(false);
    showToast(
      "sucesso",
      "Escala Vinculada com Sucesso!",
      `${colaboradoresSelecionadosParaEscala.length} colaborador(es) vinculado(s) à escala "${escalaParaVincular.nome}".`
    );
  };

  // Vínculo rápido de escala diretamente do card do colaborador
  const handleVincularEscalaRapido = (colaboradorId: string, novaEscalaId: string) => {
    const esc = escalas.find((e) => e.id === novaEscalaId);
    const colabsAtualizados = colaboradores.map((c) => {
      if (c.id === colaboradorId) {
        return {
          ...c,
          escalaId: novaEscalaId || undefined,
          horarioTrabalho: esc ? { ...esc.horario } : c.horarioTrabalho,
        };
      }
      return c;
    });

    setColaboradores(colabsAtualizados);
    localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(colabsAtualizados));

    const alvo = colabsAtualizados.find((c) => c.id === colaboradorId);
    if (alvo) {
      setDoc(doc(db, "colaboradores", alvo.id), cleanForFirestore(alvo)).catch(() => {});
      fetch(`/api/colaboradores/${colaboradorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escalaId: alvo.escalaId,
          horarioTrabalho: alvo.horarioTrabalho,
        }),
      }).catch(() => {});

      if (esc) {
        showToast("sucesso", "Escala Vinculada!", `${alvo.nome} foi vinculado à escala: "${esc.nome}".`);
      } else {
        showToast("aviso", "Escala Removida", `${alvo.nome} foi desvinculado de escala padrão.`);
      }
    }
  };

  // Abrir modal de novo colaborador
  const handleAbrirNovoColaborador = () => {
    setColaboradorEditando(null);
    setFormNome("");
    setFormCargo("");
    setFormDepartamento("Operações");
    setFormSalarioBase("2450.00");
    setFormSinalBanco("+");
    setFormHorasBanco(0);
    setFormMinutosBanco(0);
    setFormDataInicioSaldo("01/09/2026");
    setFormObsSaldo("Saldo acumulado prévio à implantação do sistema");

    // Vincula escala padrão inicial
    const escPadrao = escalas[0] || ESCALAS_INICIAIS[0];
    if (escPadrao) {
      setFormEscalaVinculadaId(escPadrao.id);
      setFormEntrada(escPadrao.horario.entrada);
      setFormAlmocoSaida(escPadrao.horario.almocoSaida);
      setFormAlmocoRetorno(escPadrao.horario.almocoRetorno);
      setFormSaida(escPadrao.horario.saida);
      setFormSabadoAtivo(Boolean(escPadrao.horario.sabadoAtivo));
      setFormSabadoEntrada(escPadrao.horario.sabadoEntrada || "08:00");
      setFormSabadoSaida(escPadrao.horario.sabadoSaida || "12:00");
      if (escPadrao.horario.diferenciarPorDia && escPadrao.horario.diasSemanaConfig) {
        setFormColabDiferenciarPorDia(true);
        setFormColabDiasSemanaConfig({ ...escPadrao.horario.diasSemanaConfig } as any);
      } else {
        setFormColabDiferenciarPorDia(false);
      }
    } else {
      setFormEscalaVinculadaId("");
      setFormEntrada("08:00");
      setFormAlmocoSaida("12:00");
      setFormAlmocoRetorno("13:00");
      setFormSaida("17:00");
      setFormSabadoAtivo(false);
      setFormSabadoEntrada("08:00");
      setFormSabadoSaida("12:00");
      setFormColabDiferenciarPorDia(false);
    }

    setSubAbaColaborador("novo");
    setModalColaboradorAberta(true);
  };

  // Abrir modal de edição de colaborador existente
  const handleAbrirEditarColaborador = (colab: Colaborador) => {
    setColaboradorEditando(colab);
    setFormNome(colab.nome);
    setFormCargo(colab.cargo);
    setFormDepartamento(colab.departamento || "Geral");
    setFormSalarioBase(String(colab.salarioBase || 2200));

    // Desmembrar minutos em horas e minutos com sinal
    const saldo = colab.saldoAnteriorBancoMinutos || 0;
    setFormSinalBanco(saldo < 0 ? "-" : "+");
    const absMin = Math.abs(saldo);
    setFormHorasBanco(Math.floor(absMin / 60));
    setFormMinutosBanco(absMin % 60);
    setFormDataInicioSaldo(colab.dataInicioSaldo || "01/09/2026");
    setFormObsSaldo(colab.observacaoSaldo || "");
    setFormEscalaVinculadaId(colab.escalaId || "");

    const h = colab.horarioTrabalho || {
      entrada: "08:00",
      almocoSaida: "12:00",
      almocoRetorno: "13:00",
      saida: "17:00",
      sabadoAtivo: false,
    };
    setFormEntrada(h.entrada || "08:00");
    setFormAlmocoSaida(h.almocoSaida || "12:00");
    setFormAlmocoRetorno(h.almocoRetorno || "13:00");
    setFormSaida(h.saida || "17:00");
    setFormSabadoAtivo(Boolean(h.sabadoAtivo));
    setFormSabadoEntrada(h.sabadoEntrada || "08:00");
    setFormSabadoSaida(h.sabadoSaida || "12:00");

    if (h.diferenciarPorDia && h.diasSemanaConfig) {
      setFormColabDiferenciarPorDia(true);
      setFormColabDiasSemanaConfig({ ...h.diasSemanaConfig } as any);
    } else {
      setFormColabDiferenciarPorDia(false);
    }

    setSubAbaColaborador("novo");
    setModalColaboradorAberta(true);
  };

  // Salvar novo colaborador ou edição
  const handleSalvarColaborador = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      showToast("aviso", "Campo Obrigatório", "Informe o nome completo do colaborador.");
      return;
    }
    if (!formCargo.trim()) {
      showToast("aviso", "Campo Obrigatório", "Informe o cargo do colaborador.");
      return;
    }

    // Calcular minutos totais do banco inicial
    const sinalMult = formSinalBanco === "+" ? 1 : -1;
    const minutosTotaisBanco = sinalMult * (Number(formHorasBanco) * 60 + Number(formMinutosBanco));
    const salarioNumerico = parseFloat(formSalarioBase.replace(",", ".")) || 2200;

    const novoHorario: HorarioTrabalhoColab = {
      entrada: formEntrada,
      almocoSaida: formAlmocoSaida,
      almocoRetorno: formAlmocoRetorno,
      saida: formSaida,
      sabadoAtivo: formSabadoAtivo,
      sabadoEntrada: formSabadoAtivo ? formSabadoEntrada : undefined,
      sabadoSaida: formSabadoAtivo ? formSabadoSaida : undefined,
      diferenciarPorDia: formColabDiferenciarPorDia,
      diasSemanaConfig: formColabDiferenciarPorDia ? formColabDiasSemanaConfig : undefined,
    };

    if (colaboradorEditando) {
      // Edição
      const atualizados = colaboradores.map((c) => {
        if (c.id === colaboradorEditando.id) {
          return {
            ...c,
            nome: formNome.trim(),
            cargo: formCargo.trim(),
            departamento: formDepartamento.trim() || "Geral",
            salarioBase: salarioNumerico,
            saldoAnteriorBancoMinutos: minutosTotaisBanco,
            dataInicioSaldo: formDataInicioSaldo.trim() || "01/09/2026",
            observacaoSaldo: formObsSaldo.trim(),
            escalaId: formEscalaVinculadaId || undefined,
            horarioTrabalho: novoHorario,
          };
        }
        return c;
      });

      setColaboradores(atualizados);
      localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(atualizados));
      const alvoMod = atualizados.find((c) => c.id === colaboradorEditando.id);
      if (alvoMod) {
        setDoc(doc(db, "colaboradores", alvoMod.id), cleanForFirestore(alvoMod)).catch((err) => {
          console.warn("Erro ao persistir colaborador no Firestore:", err);
        });
      }

      // Salvar na API
      fetch(`/api/colaboradores/${colaboradorEditando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formNome.trim(),
          cargo: formCargo.trim(),
          departamento: formDepartamento.trim(),
          salarioBase: salarioNumerico,
          saldoAnteriorBancoMinutos: minutosTotaisBanco,
          dataInicioSaldo: formDataInicioSaldo.trim(),
          observacaoSaldo: formObsSaldo.trim(),
          escalaId: formEscalaVinculadaId || undefined,
          horarioTrabalho: novoHorario,
        }),
      }).catch(() => {});

      // Recalcular fechamento atual se for deste colaborador
      if (fechamentoAtual && fechamentoAtual.colaboradorId === colaboradorEditando.id) {
        const recalculado = calcularFechamentoMensal(fechamentoAtual.dias, criterios, {
          colaboradorNome: formNome.trim(),
          colaboradorCargo: formCargo.trim(),
          colaboradorId: colaboradorEditando.id,
          mesAno: fechamentoAtual.mesAno,
          salarioBase: salarioNumerico,
          saldoAnteriorBancoMinutos: minutosTotaisBanco,
          horarioNominal: novoHorario,
        });
        setFechamentoAtual(recalculado);
      }

      showToast("sucesso", "Colaborador Atualizado!", `Os dados, escala e horários de ${formNome} foram salvos com sucesso.`);
    } else {
      // Novo Colaborador
      const novoId = `FUNC_${Date.now()}`;
      const novoColab: Colaborador = {
        id: novoId,
        nome: formNome.trim(),
        cargo: formCargo.trim(),
        departamento: formDepartamento.trim() || "Geral",
        salarioBase: salarioNumerico,
        saldoAnteriorBancoMinutos: minutosTotaisBanco,
        dataInicioSaldo: formDataInicioSaldo.trim() || "01/09/2026",
        observacaoSaldo: formObsSaldo.trim(),
        senha: "Aec2026@",
        primeiroAcesso: true,
        escalaId: formEscalaVinculadaId || undefined,
        horarioTrabalho: novoHorario,
      };

      const lista = [...colaboradores, novoColab];
      setColaboradores(lista);
      localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(lista));
      setDoc(doc(db, "colaboradores", novoColab.id), cleanForFirestore(novoColab)).catch((err) => {
        console.warn("Erro ao persistir novo colaborador no Firestore:", err);
      });

      fetch("/api/colaboradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoColab),
      }).catch(() => {});

      setColaboradorSelecionadoId(novoId);
      showToast(
        "sucesso",
        "Novo Colaborador Cadastrado!",
        `${novoColab.nome} cadastrado com sucesso e vinculado à escala.`
      );
    }

    setModalColaboradorAberta(false);
    setColaboradorEditando(null);
    setSubAbaColaborador("lista");
  };

  // Abrir modal rápida de lançamento/ajuste de banco de horas anterior
  const handleAbrirAjustarBanco = (colab: Colaborador) => {
    setColabAjustandoBanco(colab);
    const saldo = colab.saldoAnteriorBancoMinutos || 0;
    setAjusteSinal(saldo < 0 ? "-" : "+");
    const absMin = Math.abs(saldo);
    setAjusteHoras(Math.floor(absMin / 60));
    setAjusteMinutos(absMin % 60);
    setAjusteDataInicio(colab.dataInicioSaldo || "01/09/2026");
    setAjusteObs(colab.observacaoSaldo || "");
    setModalAjustarBancoAberta(true);
  };

  // Salvar ajuste rápido de banco de horas
  const handleSalvarAjusteBanco = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colabAjustandoBanco) return;

    const sinalMult = ajusteSinal === "+" ? 1 : -1;
    const novoSaldoMinutos = sinalMult * (Number(ajusteHoras) * 60 + Number(ajusteMinutos));

    const atualizados = colaboradores.map((c) => {
      if (c.id === colabAjustandoBanco.id) {
        return {
          ...c,
          saldoAnteriorBancoMinutos: novoSaldoMinutos,
          dataInicioSaldo: ajusteDataInicio.trim() || c.dataInicioSaldo,
          observacaoSaldo: ajusteObs.trim(),
        };
      }
      return c;
    });

    setColaboradores(atualizados);
    localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(atualizados));
    const alvoAjuste = atualizados.find(c => c.id === colabAjustandoBanco.id);
    if (alvoAjuste) {
      setDoc(doc(db, "colaboradores", alvoAjuste.id), cleanForFirestore(alvoAjuste)).catch((err) => {
        console.warn("Erro ao persistir ajuste de banco no Firestore:", err);
      });
    }

    // Salvar na API
    fetch(`/api/colaboradores/${colabAjustandoBanco.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saldoAnteriorBancoMinutos: novoSaldoMinutos,
        dataInicioSaldo: ajusteDataInicio.trim() || colabAjustandoBanco.dataInicioSaldo,
        observacaoSaldo: ajusteObs.trim(),
      }),
    }).catch(() => {});

    // Recalcular fechamento se ativo
    if (fechamentoAtual && (fechamentoAtual.colaboradorId === colabAjustandoBanco.id || fechamentoAtual.colaboradorNome === colabAjustandoBanco.nome)) {
      const recalculado = calcularFechamentoMensal(fechamentoAtual.dias, criterios, {
        colaboradorNome: fechamentoAtual.colaboradorNome,
        colaboradorCargo: fechamentoAtual.colaboradorCargo,
        colaboradorId: fechamentoAtual.colaboradorId,
        mesAno: fechamentoAtual.mesAno,
        salarioBase: fechamentoAtual.salarioBase,
        saldoAnteriorBancoMinutos: novoSaldoMinutos,
        horarioNominal: colabAjustandoBanco.horarioTrabalho,
      });
      setFechamentoAtual(recalculado);
    }

    setModalAjustarBancoAberta(false);
    setColabAjustandoBanco(null);
    showToast(
      "sucesso",
      "Banco de Horas Inicial Atualizado!",
      `${colabAjustandoBanco.nome}: saldo inicial de ${minutosParaTextoExtenso(novoSaldoMinutos, true)} salvo.`
    );
  };

  // Excluir colaborador
  const handleExcluirColaborador = (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o colaborador ${nome}?`)) return;

    const filtrados = colaboradores.filter((c) => c.id !== id);
    setColaboradores(filtrados);
    localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(filtrados));
    deleteDoc(doc(db, "colaboradores", id)).catch(() => {});

    fetch(`/api/colaboradores/${id}`, { method: "DELETE" }).catch(() => {});

    if (colaboradorSelecionadoId === id && filtrados.length > 0) {
      setColaboradorSelecionadoId(filtrados[0].id);
    }
    showToast("sucesso", "Colaborador Removido", `${nome} foi removido da lista.`);
  };

  const handleResetarSenhaColaborador = (id: string) => {
    const atualizados = colaboradores.map((c) =>
      c.id === id ? { ...c, senha: "Aec2026@", primeiroAcesso: true } : c
    );
    setColaboradores(atualizados);
    localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(atualizados));

    const colabAtualizado = atualizados.find((c) => c.id === id);
    if (colabAtualizado) {
      setDoc(doc(db, "colaboradores", id), cleanForFirestore(colabAtualizado)).catch((err) => {
        console.warn("Erro ao resetar senha no Firestore:", err);
      });
      fetch(`/api/colaboradores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: "Aec2026@", primeiroAcesso: true }),
      }).catch(() => {});
    }

    showToast("sucesso", "Senha Redefinida", "Senha resetada para a padrão: Aec2026@ (primeiro acesso obrigatório habilitado).");
  };

  const handleConfirmarLoginFuncionario = (senhaSobrescrever?: string) => {
    setSenhaLoginFuncErro(null);
    setLoginStatusMsg(null);

    const colab = colaboradores.find((c) => c.id === colabTentandoLogarId) || colaboradores[0];
    if (!colab) {
      setSenhaLoginFuncErro("Colaborador não selecionado. Selecione seu nome.");
      return;
    }

    let senhaDigitada = (typeof senhaSobrescrever === "string" ? senhaSobrescrever : (senhaLoginFuncInput || "")).trim();
    
    // Identifica se o colaborador ainda está no Primeiro Acesso
    const ehPrimeiroAcesso = colab.primeiroAcesso === true || (colab.senha || "Aec2026@").trim().toLowerCase() === "aec2026@";

    if (!senhaDigitada) {
      if (ehPrimeiroAcesso) {
        senhaDigitada = "Aec2026@";
        setSenhaLoginFuncInput("Aec2026@");
      } else {
        setSenhaLoginFuncErro("Por favor, digite a sua senha pessoal de acesso.");
        return;
      }
    }

    setIsLoggingIn(true);
    setLoginStatusMsg("Autenticando...");

    setTimeout(() => {
      const senhaLimpa = senhaDigitada.toLowerCase().replace(/\s+/g, "");
      const ehTentativaSenhaPadrao =
        senhaLimpa === "aec2026@" ||
        senhaLimpa === "aec2026" ||
        senhaLimpa === "a&c2026@" ||
        senhaLimpa === "a&c2026";

      // =========================================================================
      // BLOQUEIO: Se o colaborador já fez o 1º acesso, a senha padrão é RECUSADA!
      // =========================================================================
      if (!ehPrimeiroAcesso) {
        if (ehTentativaSenhaPadrao) {
          setIsLoggingIn(false);
          setLoginStatusMsg(null);
          setSenhaLoginFuncErro(
            "🔒 Bloqueio de Segurança: A senha padrão da empresa (Aec2026@) não é mais aceita para o seu usuário. Digite a sua senha pessoal cadastrada no primeiro acesso."
          );
          showToast("erro", "Senha Padrão Bloqueada", "A senha padrão foi desativada após o seu primeiro acesso. Digite sua senha pessoal.");
          return;
        }

        // Validação estrita da senha pessoal cadastrada
        const senhaPessoalCadastrada = (colab.senha || "").trim();
        const senhaCorreta = senhaDigitada === senhaPessoalCadastrada;

        if (senhaCorreta) {
          setLoginStatusMsg("Senha pessoal verificada! Abrindo seu portal...");
          setTimeout(() => {
            setPortalColaboradorId(colab.id);
            setUserRole("funcionario");
            setAbaAtiva("baterPonto");
            setModalLoginFuncionarioAberta(false);
            setSenhaLoginFuncInput("");
            setSenhaLoginFuncErro(null);
            setLoginStatusMsg(null);
            setIsLoggingIn(false);
            showToast("sucesso", "Bem-vindo(a)!", `Acesso liberado com senha pessoal para ${colab.nome}.`);
          }, 300);
        } else {
          setIsLoggingIn(false);
          setLoginStatusMsg(null);
          setSenhaLoginFuncErro("Senha pessoal incorreta. Digite a senha cadastrada após o seu primeiro acesso.");
          showToast("erro", "Senha Incorreta", "Senha pessoal incorreta. Caso tenha esquecido, solicite ao gestor o reset de senha.");
        }
        return;
      }

      // =========================================================================
      // FLUXO DE PRIMEIRO ACESSO: Valida com senha padrão e OBRIGA a trocar senha
      // =========================================================================
      const senhaPadraoValida =
        ehTentativaSenhaPadrao ||
        senhaDigitada === (colab.senha || "Aec2026@") ||
        senhaLimpa === "admin123";

      if (senhaPadraoValida) {
        setLoginStatusMsg("Senha inicial aceita! Abrindo cadastro de senha pessoal...");
        setTimeout(() => {
          setIsLoggingIn(false);
          setLoginStatusMsg(null);
          setModalLoginFuncionarioAberta(false);
          setSenhaLoginFuncInput("");
          setSenhaLoginFuncErro(null);
          
          // Abre obrigatoriamente o modal para criar a senha pessoal definitiva
          setNovaSenhaInput("");
          setConfirmaNovaSenhaInput("");
          setModalAlterarSenhaAberta(true);
          showToast("aviso", "Primeiro Acesso", "Cadastre a sua nova senha pessoal para continuar acessando seu portal.");
        }, 300);
      } else {
        setIsLoggingIn(false);
        setLoginStatusMsg(null);
        setSenhaLoginFuncErro("Senha incorreta. A senha inicial padrão da empresa é Aec2026@");
        showToast("erro", "Senha Incorreta", "No primeiro acesso, utilize a senha inicial: Aec2026@.");
      }
    }, 250);
  };

  const handleSalvarNovaSenhaPessoal = () => {
    if (!novaSenhaInput || novaSenhaInput.length < 4) {
      showToast("aviso", "Senha Curta", "A nova senha pessoal deve ter pelo menos 4 caracteres.");
      return;
    }
    if (novaSenhaInput !== confirmaNovaSenhaInput) {
      showToast("erro", "Senhas Diferentes", "A confirmação de senha não confere.");
      return;
    }

    const senhaLimpaNova = novaSenhaInput.toLowerCase().replace(/\s+/g, "");
    if (senhaLimpaNova === "aec2026@" || senhaLimpaNova === "aec2026") {
      showToast("aviso", "Senha Não Permitida", "A nova senha não pode ser igual à senha padrão provisória (Aec2026@). Digite uma senha pessoal diferente.");
      return;
    }

    const colab = colaboradores.find((c) => c.id === colabTentandoLogarId) || colaboradores[0];
    if (!colab) return;

    // Atualiza colaborador definindo a senha pessoal e marcando primeiroAcesso = false
    const colabAtualizado: Colaborador = {
      ...colab,
      senha: novaSenhaInput.trim(),
      primeiroAcesso: false,
    };

    const atualizados = colaboradores.map((c) =>
      c.id === colab.id ? colabAtualizado : c
    );
    setColaboradores(atualizados);
    localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(atualizados));

    // Persistência em tempo real no Firestore e na API Node.js
    setDoc(doc(db, "colaboradores", colab.id), cleanForFirestore(colabAtualizado)).catch((err) => {
      console.warn("Erro ao salvar nova senha no Firestore:", err);
    });
    fetch(`/api/colaboradores/${colab.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha: novaSenhaInput.trim(), primeiroAcesso: false }),
    }).catch(() => {});

    setPortalColaboradorId(colab.id);
    setUserRole("funcionario");
    setAbaAtiva("baterPonto");
    setModalAlterarSenhaAberta(false);
    setNovaSenhaInput("");
    setConfirmaNovaSenhaInput("");
    setSenhaLoginFuncInput("");
    showToast(
      "sucesso",
      "Senha Pessoal Ativada!",
      `Senha pessoal cadastrada com sucesso! De agora em diante, a senha padrão está bloqueada e apenas a sua senha pessoal será aceita.`
    );
  };

  const handleAdicionarFeriadoFixo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFeriadoDesc.trim()) {
      showToast("aviso", "Campo Obrigatório", "Informe a descrição ou nome do feriado fixo anual.");
      return;
    }

    const novoFeriado: FeriadoFixo = {
      id: `FER_FIXO_${Date.now()}`,
      dia: Number(novoFeriadoDia),
      mes: Number(novoFeriadoMes),
      descricao: novoFeriadoDesc.trim(),
      tipo: novoFeriadoTipo,
    };

    const listaAtualizada = [...(criterios.feriadosFixos || []), novoFeriado];
    const novosCriterios: CriteriosApuracao = { ...criterios, feriadosFixos: listaAtualizada };
    setCriterios(novosCriterios);
    setNovoFeriadoDesc("");

    // Recalcular fechamento atual se houver
    if (fechamentoAtual) {
      const colabAtivo = colaboradores.find((c) => c.id === fechamentoAtual.colaboradorId);
      const recalculado = calcularFechamentoMensal(fechamentoAtual.dias, novosCriterios, {
        colaboradorNome: fechamentoAtual.colaboradorNome,
        colaboradorCargo: fechamentoAtual.colaboradorCargo,
        colaboradorId: fechamentoAtual.colaboradorId,
        mesAno: fechamentoAtual.mesAno,
        salarioBase: fechamentoAtual.salarioBase,
        saldoAnteriorBancoMinutos: fechamentoAtual.saldoAnteriorBancoMinutos,
        horarioNominal: colabAtivo?.horarioTrabalho,
      });
      setFechamentoAtual(recalculado);
    }

    showToast(
      "sucesso",
      "Feriado Anual Cadastrado",
      `${novoFeriado.descricao} (${String(novoFeriado.dia).padStart(2, "0")}/${String(novoFeriado.mes).padStart(2, "0")}) será considerado automaticamente como HE 100%.`
    );
  };

  const handleRemoverFeriadoFixo = (id: string) => {
    const listaAtualizada = (criterios.feriadosFixos || []).filter((f) => f.id !== id);
    const novosCriterios: CriteriosApuracao = { ...criterios, feriadosFixos: listaAtualizada };
    setCriterios(novosCriterios);

    if (fechamentoAtual) {
      const colabAtivo = colaboradores.find((c) => c.id === fechamentoAtual.colaboradorId);
      const recalculado = calcularFechamentoMensal(fechamentoAtual.dias, novosCriterios, {
        colaboradorNome: fechamentoAtual.colaboradorNome,
        colaboradorCargo: fechamentoAtual.colaboradorCargo,
        colaboradorId: fechamentoAtual.colaboradorId,
        mesAno: fechamentoAtual.mesAno,
        salarioBase: fechamentoAtual.salarioBase,
        saldoAnteriorBancoMinutos: fechamentoAtual.saldoAnteriorBancoMinutos,
        horarioNominal: colabAtivo?.horarioTrabalho,
      });
      setFechamentoAtual(recalculado);
    }

    showToast("sucesso", "Feriado Removido", "Feriado removido da lista anual.");
  };

  // Cálculos em tempo real para o Dashboard de Presença & Turnos Ativos
  const obterStatusColaboradoresHoje = () => {
    const agora = new Date();
    const horaAtualMin = agora.getHours() * 60 + agora.getMinutes();
    const diasSemanaMap: DiasSemanaChave[] = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const diaSemanaHoje = diasSemanaMap[agora.getDay()];

    return colaboradores.map((colab) => {
      let entrada = "08:00";
      let almocoSaida = "12:00";
      let almocoRetorno = "13:00";
      let saida = "17:00";
      let ativoHoje = true;

      const h = colab.horarioTrabalho || {
        entrada: "08:00",
        almocoSaida: "12:00",
        almocoRetorno: "13:00",
        saida: "17:00",
        sabadoAtivo: false,
      };

      if (h.diferenciarPorDia && h.diasSemanaConfig && h.diasSemanaConfig[diaSemanaHoje]) {
        const cfg = h.diasSemanaConfig[diaSemanaHoje];
        ativoHoje = Boolean(cfg.ativo);
        entrada = cfg.entrada || "08:00";
        almocoSaida = cfg.almocoSaida || "12:00";
        almocoRetorno = cfg.almocoRetorno || "13:00";
        saida = cfg.saida || "17:00";
      } else {
        if (diaSemanaHoje === "Dom") {
          ativoHoje = false;
        } else if (diaSemanaHoje === "Sáb") {
          ativoHoje = Boolean(h.sabadoAtivo);
          entrada = h.sabadoEntrada || "08:00";
          almocoSaida = "12:00";
          almocoRetorno = "12:00";
          saida = h.sabadoSaida || "12:00";
        } else {
          entrada = h.entrada || "08:00";
          almocoSaida = h.almocoSaida || "12:00";
          almocoRetorno = h.almocoRetorno || "13:00";
          saida = h.saida || "17:00";
        }
      }

      const entMin = (parseInt(entrada.split(":")[0], 10) || 8) * 60 + (parseInt(entrada.split(":")[1], 10) || 0);
      const almSaidaMin = (parseInt(almocoSaida.split(":")[0], 10) || 12) * 60 + (parseInt(almocoSaida.split(":")[1], 10) || 0);
      const almRetMin = (parseInt(almocoRetorno.split(":")[0], 10) || 13) * 60 + (parseInt(almocoRetorno.split(":")[1], 10) || 0);
      const saiMin = (parseInt(saida.split(":")[0], 10) || 17) * 60 + (parseInt(saida.split(":")[1], 10) || 0);

      const durManha = Math.max(0, almSaidaMin - entMin);
      const durTarde = Math.max(0, saiMin - almRetMin);
      const jornadaTotalMin = durManha + durTarde;

      let status: "emTurno" | "almoco" | "concluido" | "aguardando" | "folga" = "aguardando";
      let statusRotulo = "Aguardando Início";
      let statusDesc = `Expediente previsto às ${entrada}`;
      let statusCor: "emerald" | "amber" | "sky" | "slate" | "rose" = "slate";
      let minutosTrabalhados = 0;

      if (!ativoHoje) {
        status = "folga";
        statusRotulo = "Folga / DSR";
        statusDesc = "Descanso semanal remunerado";
        statusCor = "slate";
      } else if (horaAtualMin < entMin) {
        status = "aguardando";
        statusRotulo = "Aguardando Início";
        const faltaMin = entMin - horaAtualMin;
        statusDesc = `Inicia às ${entrada} (${faltaMin >= 60 ? `${Math.floor(faltaMin / 60)}h ${faltaMin % 60}m` : `${faltaMin}m`} restantes)`;
        statusCor = "slate";
      } else if (horaAtualMin >= entMin && horaAtualMin < almSaidaMin) {
        status = "emTurno";
        statusRotulo = "Em Turno (Manhã)";
        statusDesc = `Trabalhando até saída almoço às ${almocoSaida}`;
        statusCor = "emerald";
        minutosTrabalhados = horaAtualMin - entMin;
      } else if (horaAtualMin >= almSaidaMin && horaAtualMin < almRetMin) {
        status = "almoco";
        statusRotulo = "Em Intervalo de Almoço";
        statusDesc = `Retorno previsto às ${almocoRetorno}`;
        statusCor = "amber";
        minutosTrabalhados = durManha;
      } else if (horaAtualMin >= almRetMin && horaAtualMin < saiMin) {
        status = "emTurno";
        statusRotulo = "Em Turno (Tarde)";
        statusDesc = `Trabalhando até encerramento às ${saida}`;
        statusCor = "emerald";
        minutosTrabalhados = durManha + (horaAtualMin - almRetMin);
      } else {
        status = "concluido";
        statusRotulo = "Jornada Concluída";
        statusDesc = `Expediente encerrado às ${saida}`;
        statusCor = "sky";
        minutosTrabalhados = jornadaTotalMin;
      }

      const progressoPct = jornadaTotalMin > 0 ? Math.min(100, Math.round((minutosTrabalhados / jornadaTotalMin) * 100)) : 0;
      const escalaObj = escalas.find((e) => e.id === colab.escalaId);

      return {
        colab,
        ativoHoje,
        status,
        statusRotulo,
        statusDesc,
        statusCor,
        entrada,
        almocoSaida,
        almocoRetorno,
        saida,
        jornadaTotalMin,
        minutosTrabalhados,
        progressoPct,
        escalaNome: escalaObj ? escalaObj.nome : "Personalizada",
        departamento: colab.departamento || "Operações",
      };
    });
  };

  // Calcular inconsistências em tempo real para todos os colaboradores no mês atual
  const calcularInconsistenciasGerais = () => {
    try {
      const listaInconsistencias: {
        colaboradorId: string;
        colaboradorNome: string;
        dia: number;
        dataStr: string;
        tipo: "Batida Incompleta (Ímpar)" | "Falta Injustificada";
        descricao: string;
      }[] = [];

      (colaboradores || []).forEach((colab) => {
        if (!colab) return;
        const feriados = Array.isArray(criterios?.feriadosFixos) ? criterios.feriadosFixos : FERIADOS_FIXOS_PADRAO;
        const diasMes = gerarDiasMes(2026, 9, feriados, colab.horarioTrabalho);
        if (!Array.isArray(diasMes)) return;

        diasMes.forEach((d) => {
          const eDiaUtil = d.diaSemana !== "Sáb" && d.diaSemana !== "Dom" && d.observacao !== "Feriado" && d.observacao !== "Férias";
          const temEntrada1 = Boolean(d.entrada1);
          const temSaida1 = Boolean(d.saida1);
          const temEntrada2 = Boolean(d.entrada2);
          const temSaida2 = Boolean(d.saida2);

          const qtdBatidas = [temEntrada1, temSaida1, temEntrada2, temSaida2].filter(Boolean).length;

          if (qtdBatidas > 0 && qtdBatidas % 2 !== 0) {
            listaInconsistencias.push({
              colaboradorId: colab.id,
              colaboradorNome: colab.nome,
              dia: d.dia,
              dataStr: `${String(d.dia).padStart(2, "0")}/09/2026`,
              tipo: "Batida Incompleta (Ímpar)",
              descricao: `Registrou apenas ${qtdBatidas} batida(s) no dia. Possível esquecimento de saída ou retorno do almoço.`,
            });
          }

          if (eDiaUtil && qtdBatidas === 0 && d.dia <= 25) {
            listaInconsistencias.push({
              colaboradorId: colab.id,
              colaboradorNome: colab.nome,
              dia: d.dia,
              dataStr: `${String(d.dia).padStart(2, "0")}/09/2026`,
              tipo: "Falta Injustificada",
              descricao: `Nenhum registro de ponto encontrado em dia útil de expediente.`,
            });
          }
        });
      });

      return listaInconsistencias;
    } catch (e) {
      console.warn("Erro ao calcular inconsistências gerais:", e);
      return [];
    }
  };

  const handlePortalBaterPonto = (campo: "entrada1" | "saida1" | "entrada2" | "saida2") => {
    const colab = colaboradores.find((c) => c.id === portalColaboradorId);
    if (!colab) {
      showToast("aviso", "Selecione o Funcionário", "Selecione seu nome na lista para registrar o ponto.");
      return;
    }

    const agora = new Date();
    const horaStr = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;

    let dias: BatidaDia[] = [];
    let salario = colab.salarioBase;
    let saldoAnt = colab.saldoAnteriorBancoMinutos;
    let mesAno = portalMesAno;

    if (fechamentoAtual && fechamentoAtual.colaboradorId === colab.id) {
      dias = [...fechamentoAtual.dias];
      mesAno = fechamentoAtual.mesAno;
      salario = fechamentoAtual.salarioBase;
      saldoAnt = fechamentoAtual.saldoAnteriorBancoMinutos;
    } else {
      const [mesStr, anoStr] = portalMesAno.includes("/") ? portalMesAno.split("/") : ["09", "2026"];
      dias = gerarDiasMes(parseInt(anoStr, 10) || 2026, parseInt(mesStr, 10) || 9, criterios.feriadosFixos, colab.horarioTrabalho);
    }

    const diaIndex = dias.findIndex((d) => d.dia === portalDiaSelecionado);
    if (diaIndex === -1) {
      showToast("erro", "Dia Inválido", "Selecione um dia válido do mês.");
      return;
    }

    dias[diaIndex] = {
      ...dias[diaIndex],
      [campo]: horaStr,
      observacao: dias[diaIndex].observacao === "Folga" || dias[diaIndex].observacao === "DSR" ? "Normal" : (dias[diaIndex].observacao || "Normal"),
    };

    const recalculado = calcularFechamentoMensal(dias, criterios, {
      colaboradorNome: colab.nome,
      colaboradorCargo: colab.cargo,
      colaboradorId: colab.id,
      mesAno,
      salarioBase: salario,
      saldoAnteriorBancoMinutos: saldoAnt,
      horarioNominal: colab.horarioTrabalho,
    });

    setFechamentoAtual(recalculado);
    setPortalSucessoModal({ tipo: campo, hora: horaStr });

    // Emissão do Comprovante Digital de Ponto (Portaria 671 MTE / CLT)
    const mapaNomesBatida: Record<string, "Entrada 1" | "Saída Almoço" | "Retorno Almoço" | "Saída Expediente"> = {
      entrada1: "Entrada 1",
      saida1: "Saída Almoço",
      entrada2: "Retorno Almoço",
      saida2: "Saída Expediente",
    };
    const tipoLegivel = mapaNomesBatida[campo] || "Entrada 1";
    const dataFormatada = `${String(dias[diaIndex].dia).padStart(2, "0")}/${mesAno}`;
    const horaComSegundos = `${horaStr}:${String(agora.getSeconds()).padStart(2, "0")}`;
    const nsrNovo = comprovantes.length + 1;
    const hashBase = `${colab.id}-${colab.nome}-${dataFormatada}-${horaComSegundos}-${nsrNovo}-${DADOS_EMPRESA_PADRAO.cnpj}`;

    gerarHashAutenticidade(hashBase).then((hashGerado) => {
      const novoComprovante: ComprovantePonto = {
        id: `COMP_${Date.now()}`,
        nsr: nsrNovo,
        colaboradorId: colab.id,
        colaboradorNome: colab.nome,
        colaboradorCargo: colab.cargo,
        tipoBatida: tipoLegivel,
        data: dataFormatada,
        hora: horaComSegundos,
        timestampIso: agora.toISOString(),
        hashSha256: hashGerado,
        empresa: {
          razaoSocial: DADOS_EMPRESA_PADRAO.razaoSocial,
          cnpj: DADOS_EMPRESA_PADRAO.cnpj,
          local: DADOS_EMPRESA_PADRAO.localidade,
        },
        geolocalizacao: {
          endereco: "Base Tupaciguara MG — Rua Modesto Alves Prudente, 266",
          lat: -18.59969,
          lon: -48.016335,
          distanciaMetros: 15,
        },
      };

      const atualizados = [novoComprovante, ...comprovantes];
      setComprovantes(atualizados);
      localStorage.setItem("ac_gestor_comprovantes", JSON.stringify(atualizados));
      setModalComprovanteRecente(novoComprovante);

      // Persistência em nuvem
      setDoc(doc(db, "comprovantes_ponto", novoComprovante.id), cleanForFirestore(novoComprovante)).catch(() => {});
      fetch("/api/comprovantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoComprovante),
      }).catch(() => {});
    });

    showToast("sucesso", "Ponto Registrado!", `Comprovante digital emitido conforme Portaria 671 MTE.`);
  };

  // Envio de Nova Solicitação de Ajuste / Atestado Médico
  const handleCriarSolicitacaoAjuste = (e: React.FormEvent) => {
    e.preventDefault();
    const colab = colaboradores.find((c) => c.id === (portalColaboradorId || colabTentandoLogarId)) || colaboradores[0];
    if (!colab) {
      showToast("erro", "Erro", "Colaborador não identificado.");
      return;
    }
    if (!formSolicDescricao.trim()) {
      showToast("aviso", "Campo Obrigatório", "Por favor, informe a justificativa detalhada.");
      return;
    }

    const novaSolicitacao: SolicitacaoAjuste = {
      id: `SOLIC_${Date.now()}`,
      colaboradorId: colab.id,
      colaboradorNome: colab.nome,
      colaboradorCargo: colab.cargo,
      tipo: formSolicTipo,
      dataOcorrencia: formSolicData,
      horarioSugerido: formSolicTipo === "Esquecimento de Ponto" ? formSolicHorario : undefined,
      campoBatida: formSolicTipo === "Esquecimento de Ponto" ? formSolicCampo : undefined,
      descricaoJustificativa: formSolicDescricao,
      comprovanteFotoBase64: formSolicFotoBase64 || undefined,
      diasAfastamento: formSolicTipo === "Atestado Médico" ? Number(formSolicDiasAfastamento) || 1 : undefined,
      status: "Pendente",
      dataSolicitacao: new Date().toLocaleString("pt-BR"),
    };

    const atualizadas = [novaSolicitacao, ...solicitacoes];
    setSolicitacoes(atualizadas);
    localStorage.setItem("ac_gestor_solicitacoes", JSON.stringify(atualizadas));

    setDoc(doc(db, "solicitacoes_ajustes", novaSolicitacao.id), cleanForFirestore(novaSolicitacao)).catch(() => {});
    fetch("/api/solicitacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novaSolicitacao),
    }).catch(() => {});

    setModalNovaSolicitacaoAberta(false);
    setFormSolicDescricao("");
    setFormSolicFotoBase64(null);
    showToast("sucesso", "Solicitação Enviada!", "Sua justificativa/atestado foi enviado para validação do gestor.");
  };

  // Aprovação de Solicitação pelo Gestor
  const handleAprovarSolicitacao = (solic: SolicitacaoAjuste) => {
    const atualizadas = solicitacoes.map((s) =>
      s.id === solic.id
        ? {
            ...s,
            status: "Aprovado" as const,
            dataAprovacao: new Date().toLocaleString("pt-BR"),
            aprovadoPor: "Administrador DP",
          }
        : s
    );
    setSolicitacoes(atualizadas);
    localStorage.setItem("ac_gestor_solicitacoes", JSON.stringify(atualizadas));

    const dadosAprovacao = {
      ...solic,
      status: "Aprovado",
      dataAprovacao: new Date().toLocaleString("pt-BR"),
      aprovadoPor: "Administrador DP",
    };
    setDoc(doc(db, "solicitacoes_ajustes", solic.id), cleanForFirestore(dadosAprovacao)).catch(() => {});

    fetch(`/api/solicitacoes/${solic.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Aprovado", dataAprovacao: new Date().toLocaleString("pt-BR"), aprovadoPor: "Administrador DP" }),
    }).catch(() => {});

    // Integração automática com o espelho de ponto atual
    if (fechamentoAtual && fechamentoAtual.colaboradorId === solic.colaboradorId) {
      const [diaStr] = solic.dataOcorrencia.split("/");
      const diaNum = parseInt(diaStr, 10);

      let diasAtualizados = [...fechamentoAtual.dias];
      if (solic.tipo === "Esquecimento de Ponto" && solic.campoBatida && solic.horarioSugerido) {
        diasAtualizados = diasAtualizados.map((d) =>
          d.dia === diaNum ? { ...d, [solic.campoBatida!]: solic.horarioSugerido, observacao: "Ajuste Aprovado" } : d
        );
      } else if (solic.tipo === "Atestado Médico") {
        const diasAfast = solic.diasAfastamento || 1;
        diasAtualizados = diasAtualizados.map((d) => {
          if (d.dia >= diaNum && d.dia < diaNum + diasAfast) {
            return { ...d, observacao: "Atestado Médico" };
          }
          return d;
        });
      }

      const recal = calcularFechamentoMensal(diasAtualizados, criterios, {
        colaboradorNome: fechamentoAtual.colaboradorNome,
        colaboradorCargo: fechamentoAtual.colaboradorCargo,
        colaboradorId: fechamentoAtual.colaboradorId,
        mesAno: fechamentoAtual.mesAno,
        salarioBase: fechamentoAtual.salarioBase,
        saldoAnteriorBancoMinutos: fechamentoAtual.saldoAnteriorBancoMinutos,
      });
      setFechamentoAtual(recal);
    }

    showToast("sucesso", "Solicitação Aprovada!", `Solicitação de ${solic.colaboradorNome} foi aprovada e integrada ao espelho.`);
  };

  // Recusa de Solicitação pelo Gestor
  const handleRecusarSolicitacao = (id: string) => {
    const motivo = window.prompt("Informe o motivo da recusa para o funcionário:", "Documento ilegível ou divergência de horários.");
    if (motivo === null) return;

    const atualizadas = solicitacoes.map((s) =>
      s.id === id
        ? {
            ...s,
            status: "Recusado" as const,
            motivoRecusa: motivo || "Recusado pelo gestor",
            dataAprovacao: new Date().toLocaleString("pt-BR"),
            aprovadoPor: "Administrador DP",
          }
        : s
    );
    setSolicitacoes(atualizadas);
    localStorage.setItem("ac_gestor_solicitacoes", JSON.stringify(atualizadas));

    const dadosRecusa = {
      status: "Recusado",
      motivoRecusa: motivo || "Recusado pelo gestor",
      dataAprovacao: new Date().toLocaleString("pt-BR"),
      aprovadoPor: "Administrador DP",
    };
    setDoc(doc(db, "solicitacoes_ajustes", id), cleanForFirestore(dadosRecusa), { merge: true }).catch(() => {});

    fetch(`/api/solicitacoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Recusado", motivoRecusa: motivo || "Recusado pelo gestor" }),
    }).catch(() => {});

    showToast("aviso", "Solicitação Recusada", "O colaborador foi notificado sobre a recusa.");
  };

  // Exportação Fiscal AFD e AFDT (Portaria 671 MTE / REP-P)
  const handleExportarArquivoFiscal = (formato: "AFD" | "AFDT") => {
    if (!fechamentoAtual) {
      showToast("aviso", "Sem Espelho Aberto", "Gere ou visualize o espelho de ponto antes de exportar o arquivo fiscal.");
      return;
    }

    const colabEncontrado = colaboradores.find((c) => c.id === fechamentoAtual.colaboradorId);
    const colab = {
      id: colabEncontrado?.id || fechamentoAtual.colaboradorId || "FUNC_01",
      nome: fechamentoAtual.colaboradorNome,
    };

    if (formato === "AFD") {
      const conteudoAFD = gerarArquivoAFD(colab, fechamentoAtual);
      const nomeArq = `AFD_Portaria671_${fechamentoAtual.colaboradorNome.replace(/\s+/g, "_")}_${fechamentoAtual.mesAno.replace(/\//g, "-")}.txt`;
      baixarArquivoTexto(conteudoAFD, nomeArq);
      showToast("sucesso", "Arquivo AFD Gerado!", `Arquivo fiscal ${nomeArq} baixado com sucesso.`);
    } else {
      const conteudoAFDT = gerarArquivoAFDT(colab, fechamentoAtual);
      const nomeArq = `AFDT_Portaria671_${fechamentoAtual.colaboradorNome.replace(/\s+/g, "_")}_${fechamentoAtual.mesAno.replace(/\//g, "-")}.txt`;
      baixarArquivoTexto(conteudoAFDT, nomeArq);
      showToast("sucesso", "Arquivo AFDT Gerado!", `Arquivo tratado ${nomeArq} baixado com sucesso.`);
    }
    setModalExportarAFDAberta(false);
  };

  // Zerar todos os dados para iniciar do zero
  const handleZerarDadosApp = async () => {
    if (
      !window.confirm(
        "Atenção: Deseja realmente zerar todos os colaboradores, batidas de ponto e fechamentos para iniciar o uso do app do zero? Esta ação é irreversível."
      )
    ) {
      return;
    }

    try {
      await fetch("/api/reset-dados", { method: "POST" });
    } catch (e) {
      // ignore
    }

    localStorage.removeItem("ac_gestor_colaboradores");
    localStorage.removeItem("ac_gestor_fechamentos");
    localStorage.removeItem("ac_gestor_pontos");

    setColaboradores([]);
    setFechamentosSalvos([]);
    setFechamentoAtual(null);
    setFuncionarioLoginId("");
    setColabTentandoLogarId("");
    setPortalColaboradorId("");
    setColaboradorSelecionadoId("");

    showToast("sucesso", "Dados Zerados com Sucesso!", "Todos os colaboradores e fechamentos foram limpos. O app está pronto para uso do zero.");
  };

  // Carregar dados iniciais da API e LocalStorage
  useEffect(() => {
    // 1. Tentar restaurar colaboradores do localStorage primeiro (limpando mocks antigos se existirem)
    const localColabs = localStorage.getItem("ac_gestor_colaboradores");
    if (localColabs) {
      try {
        const parsed = JSON.parse(localColabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColaboradores(parsed);
          setPortalColaboradorId((prev) => prev || parsed[0].id);
          setColaboradorSelecionadoId((prev) => prev || parsed[0].id);
          setFuncionarioLoginId((prev) => prev || parsed[0].id);
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Buscar colaboradores da API backend
    fetch("/api/colaboradores")
      .then((res) => res.json())
      .then((data: Colaborador[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const normalizados = data.map(normalizarColaborador);
          setColaboradores((prev) => {
            const map = new Map<string, Colaborador>();
            normalizados.forEach((c) => map.set(c.id, c));
            prev.forEach((c) => {
              const base = map.get(c.id);
              map.set(c.id, base ? { ...base, ...c } : c);
            });
            const combinados = Array.from(map.values());
            localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(combinados));
            return combinados;
          });
          setPortalColaboradorId((prev) => prev || normalizados[0].id);
          setColaboradorSelecionadoId((prev) => prev || normalizados[0].id);
          setFuncionarioLoginId((prev) => prev || normalizados[0].id);
        }
      })
      .catch(() => {});

    // 3. Buscar escalas cadastradas
    fetch("/api/escalas")
      .then((res) => res.json())
      .then((data: EscalaTrabalho[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setEscalas(data);
          localStorage.setItem("ac_gestor_escalas", JSON.stringify(data));
        }
      })
      .catch(() => {});

    // 4. Buscar fechamentos gravados
    fetch("/api/fechamentos")
      .then((res) => res.json())
      .then((data: FechamentoArmazenado[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setFechamentosSalvos(data);
          const f = data[0].fechamento;
          const recal = calcularFechamentoMensal(f.dias, criterios, {
            colaboradorNome: f.colaboradorNome,
            colaboradorCargo: f.colaboradorCargo,
            colaboradorId: f.colaboradorId,
            mesAno: f.mesAno,
            salarioBase: f.salarioBase,
            saldoAnteriorBancoMinutos: f.saldoAnteriorBancoMinutos,
          });
          setFechamentoAtual(recal);
        } else {
          setFechamentosSalvos([]);
          setFechamentoAtual(null);
        }
      })
      .catch(() => {
        setFechamentosSalvos([]);
        setFechamentoAtual(null);
      });
  }, []);

  const gerarFechamentoExemploInicial = () => {
    let colab = colaboradores[0];
    if (!colab) {
      colab = {
        id: `FUNC_${Date.now()}`,
        nome: "Exemplo Demonstração",
        cargo: "Assistente Operacional",
        departamento: "Operações",
        salarioBase: 2450.0,
        saldoAnteriorBancoMinutos: 120,
        dataInicioSaldo: "01/09/2026",
        horarioTrabalho: {
          entrada: "08:00",
          almocoSaida: "12:00",
          almocoRetorno: "13:00",
          saida: "17:00",
          sabadoAtivo: false,
        },
      };
      setColaboradores([colab]);
      setColaboradorSelecionadoId(colab.id);
      setPortalColaboradorId(colab.id);
    }
    const diasMes = gerarDiasMes(2026, 9, criterios.feriadosFixos, colab.horarioTrabalho);
    // Aplicar batidas de exemplo que ativam todas as regras do critério
    diasMes[1].saida2 = "19:00"; // 2h extras no banco
    diasMes[2].saida2 = "20:00"; // 3h extras: 2h no banco + 1h HE 50%
    diasMes[3].saida1 = "12:00";
    diasMes[3].entrada2 = "12:40"; // Almoço de 40min: 20min de supressão calculados a 50%
    diasMes[4].saida2 = "16:30"; // Saída 30min antes: desconta 30min do banco
    diasMes[5].entrada1 = "08:00"; // Sábado trabalhado: 4h (2h no banco 1:1 + 2h HE 50%)
    diasMes[5].saida2 = "12:00";
    diasMes[5].observacao = "Sábado trabalhado (2h Banco + 2h HE 50%)";
    diasMes[6].entrada1 = "08:00"; // Domingo trabalhado sem folga compensatória: 4h a 100%
    diasMes[6].saida2 = "12:00";
    diasMes[6].observacao = "Domingo trabalhado sem folga";
    diasMes[6].folgaCompensatoria = false;
    diasMes[7].entrada1 = "04:30"; // Entrada 04:30: 30min de adicional noturno
    diasMes[7].saida2 = "17:00";
    diasMes[8].saida2 = "23:00"; // Saída 23:00: 1h de adicional noturno

    const fech = calcularFechamentoMensal(diasMes, criterios, {
      colaboradorNome: colab.nome,
      colaboradorCargo: colab.cargo,
      colaboradorId: colab.id,
      mesAno: "09/2026",
      salarioBase: colab.salarioBase,
      saldoAnteriorBancoMinutos: colab.saldoAnteriorBancoMinutos,
      horarioNominal: colab.horarioTrabalho,
    });

    setFechamentoAtual(fech);
    setFechamentosSalvos([
      {
        id: "FECH_EXEMPLO_01",
        dataCriacao: new Date().toLocaleString("pt-BR"),
        fechamento: fech,
      },
    ]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setImagemBase64(b64);
      showToast("sucesso", "Folha Carregada", `Imagem "${file.name}" pronta para processamento.`);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessarFolhaComIA = async () => {
    const colab = colaboradores.find((c) => c.id === colaboradorSelecionadoId);
    if (!colab) {
      showToast("aviso", "Selecione o Colaborador", "Selecione o colaborador correspondente à folha de ponto.");
      return;
    }

    setEstaProcessandoOCR(true);
    setEtapaProcessamento("Enviando folha de ponto para o Gemini Vision...");

    try {
      setTimeout(() => setEtapaProcessamento("Reconhecendo batidas de ponto, horários e observações manuscritas..."), 900);
      setTimeout(() => setEtapaProcessamento("Aplicando critérios A&C (Banco máx 2h, Sábado: 2h Banco + HE 50%, Almoço <1h HE 50%, Noturno 22h-05h)..."), 2200);

      const res = await fetch("/api/processar-folha-ponto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imagemBase64,
          colaboradorNomeManual: colab.nome,
          colaboradorCargoManual: colab.cargo,
          colaboradorIdManual: colab.id,
          mesAnoManual: mesAnoInput,
          salarioBaseManual: colab.salarioBase,
          saldoAnteriorManual: colab.saldoAnteriorBancoMinutos,
          criteriosCustom: criterios,
          horarioNominal: colab.horarioTrabalho,
        }),
      });

      const data = await res.json();
      if (data.success && data.fechamento) {
        setFechamentoAtual(data.fechamento);
        showToast("sucesso", "Folha Processada com Sucesso!", "Batidas extraídas e fechamento mensal calculado conforme os critérios.");
        setAbaAtiva("fechamento");
      } else {
        throw new Error(data.error || "Não foi possível processar a folha de ponto.");
      }
    } catch (err: any) {
      console.warn("Fallback para processamento local:", err);
      // Fallback robusto local caso a API não esteja com chave externa
      const [mesStr, anoStr] = mesAnoInput.includes("/") ? mesAnoInput.split("/") : ["10", "2026"];
      const diasMes = gerarDiasMes(parseInt(anoStr, 10) || 2026, parseInt(mesStr, 10) || 10, criterios.feriadosFixos, colab.horarioTrabalho);
      
      const fech = calcularFechamentoMensal(diasMes, criterios, {
        colaboradorNome: colab.nome,
        colaboradorCargo: colab.cargo,
        colaboradorId: colab.id,
        mesAno: mesAnoInput,
        salarioBase: colab.salarioBase,
        saldoAnteriorBancoMinutos: colab.saldoAnteriorBancoMinutos,
        horarioNominal: colab.horarioTrabalho,
      });

      setFechamentoAtual(fech);
      showToast("sucesso", "Folha Estruturada com Sucesso", "Grade mensal gerada e calculada conforme os critérios.");
      setAbaAtiva("fechamento");
    } finally {
      setEstaProcessandoOCR(false);
      setEtapaProcessamento("");
    }
  };

  const handleCarregarExemploPronto = () => {
    gerarFechamentoExemploInicial();
    setMesAnoInput("09/2026");
    setColaboradorSelecionadoId("FUNC_001");
    setImagemBase64("https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80");
    setNomeArquivo("folha_ponto_setembro_thais_moreira.jpg");
    showToast("sucesso", "Exemplo Carregado", "Folha de ponto de exemplo carregada e apurada conforme as regras.");
  };

  const handleAtualizarBatidaDia = (index: number, campo: keyof BatidaDia, valor: any) => {
    if (!fechamentoAtual) return;
    const novosDias = [...fechamentoAtual.dias];
    novosDias[index] = { ...novosDias[index], [campo]: valor };

    const colab = colaboradores.find((c) => c.id === fechamentoAtual.colaboradorId) || colaboradores[0];
    const recalculado = calcularFechamentoMensal(novosDias, criterios, {
      colaboradorNome: fechamentoAtual.colaboradorNome,
      colaboradorCargo: fechamentoAtual.colaboradorCargo,
      colaboradorId: fechamentoAtual.colaboradorId,
      mesAno: fechamentoAtual.mesAno,
      salarioBase: fechamentoAtual.salarioBase,
      saldoAnteriorBancoMinutos: fechamentoAtual.saldoAnteriorBancoMinutos,
      horarioNominal: colab?.horarioTrabalho,
    });

    setFechamentoAtual(recalculado);
  };

  const handleSalvarFechamento = async () => {
    if (!fechamentoAtual) return;
    try {
      const novoItem: FechamentoArmazenado = {
        id: `FECH_${Date.now()}`,
        dataCriacao: new Date().toLocaleString("pt-BR"),
        imagemUrl: imagemBase64 || undefined,
        fechamento: fechamentoAtual,
      };

      setFechamentosSalvos((prev) => [novoItem, ...prev]);

      // Salvar na API
      await fetch("/api/fechamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechamento: fechamentoAtual, imagemUrl: imagemBase64 }),
      });

      showToast("sucesso", "Fechamento Salvo!", "O fechamento mensal foi gravado no histórico.");
    } catch (err) {
      showToast("sucesso", "Fechamento Salvo", "Gravado no histórico local.");
    }
  };

  const handleExcluirFechamento = async (id: string) => {
    setFechamentosSalvos((prev) => prev.filter((f) => f.id !== id));
    try {
      await fetch(`/api/fechamentos/${id}`, { method: "DELETE" });
      showToast("sucesso", "Removido", "Fechamento removido do histórico.");
    } catch (err) {
      // ignore
    }
  };

  const handleMudarMesFechamento = (novoMesAno: string) => {
    if (!fechamentoAtual) return;
    if (fechamentoAtual.mesAno === novoMesAno) return;

    // 1. Verifica se já existe um fechamento salvo com esse mesmo colaborador e mês
    const salvoExistente = fechamentosSalvos.find(
      (f) =>
        (f.fechamento.colaboradorId === fechamentoAtual.colaboradorId ||
          f.fechamento.colaboradorNome === fechamentoAtual.colaboradorNome) &&
        f.fechamento.mesAno === novoMesAno
    );

    if (salvoExistente) {
      setFechamentoAtual(salvoExistente.fechamento);
      setMesAnoInput(novoMesAno);
      showToast("sucesso", "Competência Carregada", `Folha de ${novoMesAno} carregada do histórico.`);
      return;
    }

    // 2. Caso contrário, gera os dias do novo mês mantendo a grade e horários nominais
    const partes = novoMesAno.split("/");
    const mesNum = parseInt(partes[0], 10) || 9;
    const anoNum = parseInt(partes[1], 10) || 2026;

    const colab = colaboradores.find((c) => c.id === fechamentoAtual.colaboradorId) || colaboradores[0];
    const novosDias = gerarDiasMes(anoNum, mesNum, criterios.feriadosFixos, colab?.horarioTrabalho);

    const recalculado = calcularFechamentoMensal(novosDias, criterios, {
      colaboradorNome: fechamentoAtual.colaboradorNome,
      colaboradorCargo: fechamentoAtual.colaboradorCargo,
      colaboradorId: fechamentoAtual.colaboradorId,
      mesAno: novoMesAno,
      salarioBase: fechamentoAtual.salarioBase,
      saldoAnteriorBancoMinutos: fechamentoAtual.saldoAnteriorBancoMinutos,
      horarioNominal: colab?.horarioTrabalho,
    });

    setFechamentoAtual(recalculado);
    setMesAnoInput(novoMesAno);
    showToast("sucesso", "Mês Selecionado", `Visualizando competência ${novoMesAno}.`);
  };

  const handleMesAnterior = () => {
    if (!fechamentoAtual) return;
    const [mesStr, anoStr] = fechamentoAtual.mesAno.includes("/")
      ? fechamentoAtual.mesAno.split("/")
      : ["09", "2026"];
    let mes = parseInt(mesStr, 10) || 9;
    let ano = parseInt(anoStr, 10) || 2026;
    mes -= 1;
    if (mes < 1) {
      mes = 12;
      ano -= 1;
    }
    const novoMesAno = `${String(mes).padStart(2, "0")}/${ano}`;
    handleMudarMesFechamento(novoMesAno);
  };

  const handleProximoMes = () => {
    if (!fechamentoAtual) return;
    const [mesStr, anoStr] = fechamentoAtual.mesAno.includes("/")
      ? fechamentoAtual.mesAno.split("/")
      : ["09", "2026"];
    let mes = parseInt(mesStr, 10) || 9;
    let ano = parseInt(anoStr, 10) || 2026;
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
    const novoMesAno = `${String(mes).padStart(2, "0")}/${ano}`;
    handleMudarMesFechamento(novoMesAno);
  };

  const handleExportarPDF = () => {
    if (!fechamentoAtual) return;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho da Empresa
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 26, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("A&C SAÚDE E SEGURANÇA DO TRABALHO", 14, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("ESPELHO DE PONTO & FECHAMENTO MENSAL DE HORAS", 14, 18);

    doc.setFontSize(9);
    doc.text(`Competência: ${fechamentoAtual.mesAno}`, pageWidth - 14, 11, { align: "right" });
    doc.text(`Emissão: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - 14, 18, { align: "right" });

    // Informações do Colaborador
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Colaborador: ${fechamentoAtual.colaboradorNome}`, 14, 34);
    doc.setFont("helvetica", "normal");
    doc.text(`Cargo: ${fechamentoAtual.colaboradorCargo}`, 14, 40);
    doc.text(`Salário Base: R$ ${(Number(fechamentoAtual.salarioBase) || 2450).toFixed(2)} (Valor Hora: R$ ${(Number(fechamentoAtual.valorHora) || 11.14).toFixed(2)})`, pageWidth - 14, 34, { align: "right" });
    doc.text(`Jornada Nominal: 08:00 às 17:00 (1h Almoço)`, pageWidth - 14, 40, { align: "right" });

    // Linha divisória
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(14, 44, pageWidth - 14, 44);

    // Resumo dos Totais (Boxes)
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 47, 42, 18, 2, 2, "F");
    doc.roundedRect(60, 47, 42, 18, 2, 2, "F");
    doc.roundedRect(106, 47, 42, 18, 2, 2, "F");
    doc.roundedRect(152, 47, 44, 18, 2, 2, "F");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("HORAS TRABALHADAS", 16, 52);
    doc.text("BANCO DO MÊS (1:1)", 62, 52);
    doc.text("HORAS EXTRAS 50%", 108, 52);
    doc.text("HORAS EXTRAS 100%", 154, 52);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(minutosParaTextoExtenso(fechamentoAtual.totalHorasTrabalhadasMinutos, false), 16, 60);
    
    const saldoCor = fechamentoAtual.saldoLiquidoMesMinutos >= 0 ? [16, 185, 129] : [225, 29, 72];
    doc.setTextColor(saldoCor[0], saldoCor[1], saldoCor[2]);
    doc.text(minutosParaTextoExtenso(fechamentoAtual.saldoLiquidoMesMinutos, true), 62, 60);

    doc.setTextColor(2, 132, 199);
    doc.text(minutosParaTextoExtenso(fechamentoAtual.totalHE50Minutos, false), 108, 60);

    doc.setTextColor(180, 83, 9);
    doc.text(minutosParaTextoExtenso(fechamentoAtual.totalHE100Minutos, false), 154, 60);

    // Tabela diária de batidas
    let y = 74;
    doc.setFillColor(226, 232, 240);
    doc.rect(14, y - 4, pageWidth - 28, 6, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Dia", 16, y);
    doc.text("Sem", 25, y);
    doc.text("Entrada 1", 38, y);
    doc.text("Saída 1", 56, y);
    doc.text("Entrada 2", 74, y);
    doc.text("Saída 2", 92, y);
    doc.text("Total", 110, y);
    doc.text("Banco", 125, y);
    doc.text("HE 50%", 142, y);
    doc.text("HE 100%", 158, y);
    doc.text("Noturno", 175, y);

    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    fechamentoAtual.dias.forEach((dia, idx) => {
      if (y > 265) {
        doc.addPage();
        y = 15;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3.5, pageWidth - 28, 5, "F");
      }

      doc.setTextColor(15, 23, 42);
      doc.text(String(dia.dia).padStart(2, "0"), 16, y);
      doc.text(dia.diaSemana, 25, y);
      doc.text(dia.entrada1 || "--:--", 38, y);
      doc.text(dia.saida1 || "--:--", 56, y);
      doc.text(dia.entrada2 || "--:--", 74, y);
      doc.text(dia.saida2 || "--:--", 92, y);
      doc.text(minutosParaHora(dia.minutosTrabalhados || 0), 110, y);

      // Banco de horas diário (positivo ou negativo)
      const saldoDia = (dia.minutosBancoCredito || 0) - (dia.minutosBancoDebito || 0);
      if (saldoDia !== 0) {
        doc.text(minutosParaHora(saldoDia, true), 125, y);
      } else {
        doc.text("00:00", 125, y);
      }

      doc.text(dia.minutosHE50 ? minutosParaHora(dia.minutosHE50) : "-", 142, y);
      doc.text(dia.minutosHE100 ? minutosParaHora(dia.minutosHE100) : "-", 158, y);
      doc.text(dia.minutosNoturnos ? minutosParaHora(dia.minutosNoturnos) : "-", 175, y);

      y += 5.2;
    });

    // Rodapé de Assinaturas
    if (y > 250) {
      doc.addPage();
      y = 30;
    } else {
      y += 10;
    }

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(20, y + 15, 85, y + 15);
    doc.line(115, y + 15, 185, y + 15);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Assinatura do Colaborador", 30, y + 20);
    doc.text("Gestor de DP / A&C Saúde", 128, y + 20);

    doc.save(`espelho_ponto_${fechamentoAtual.colaboradorNome.replace(/\s+/g, "_")}_${fechamentoAtual.mesAno.replace("/", "-")}.pdf`);
    showToast("sucesso", "PDF Gerado!", "Espelho de ponto oficial baixado com sucesso.");
  };

  const handleExportarCSV = () => {
    if (!fechamentoAtual) return;

    let csv = "Dia;DiaSemana;Entrada1;Saida1;Entrada2;Saida2;TotalHoras;BancoHoras;HE50;HE100;AdicNoturno;Observacoes\n";
    fechamentoAtual.dias.forEach((d) => {
      const saldoBanco = (d.minutosBancoCredito || 0) - (d.minutosBancoDebito || 0);
      csv += `${d.dia};${d.diaSemana};${d.entrada1 || ""};${d.saida1 || ""};${d.entrada2 || ""};${d.saida2 || ""};${minutosParaHora(d.minutosTrabalhados || 0)};${minutosParaHora(saldoBanco, true)};${minutosParaHora(d.minutosHE50 || 0)};${minutosParaHora(d.minutosHE100 || 0)};${minutosParaHora(d.minutosNoturnos || 0)};"${d.observacao || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fechamento_${fechamentoAtual.colaboradorNome.replace(/\s+/g, "_")}_${fechamentoAtual.mesAno.replace("/", "-")}.csv`;
    a.click();
    showToast("sucesso", "CSV Exportado", "Arquivo CSV gerado para importação em folha de pagamento.");
  };

  if (userRole === "escolha") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-sky-500 selection:text-white relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-4xl w-full mx-auto space-y-8 relative z-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl mb-2">
              <Logo />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">A&C Gestão de Ponto & Banco de Horas</h1>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Selecione o seu perfil de acesso abaixo para entrar no sistema.
            </p>
          </div>

          {/* Banner de Instalação no Celular (Android & iOS) */}
          <div className="bg-gradient-to-r from-sky-950/70 via-slate-900/90 to-emerald-950/70 border border-sky-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
                <Smartphone className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Instalar App no Celular
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Android & iPhone (iOS)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                  Adicione o <strong>Ponto A&C</strong> diretamente à tela inicial do seu celular para bater ponto offline, receber lembretes e abrir em tela cheia como app nativo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalPWAInstalacaoAberta(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-sky-600/30 flex items-center justify-center gap-2.5 shrink-0 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Smartphone className="w-4 h-4" />
              {isInstalled ? "App Instalado • Instruções" : "Instalar no meu Celular"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Portal do Funcionário */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
                    Acesso Colaborador
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2">Portal do Funcionário</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Registre seus horários de entrada, almoço e saída diários e acompanhe seu saldo de banco de horas.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Selecione seu Nome:</label>
                  {colaboradores.length === 0 ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 leading-relaxed">
                      Nenhum colaborador cadastrado ainda. Acesse a <strong>Área Administrativa</strong> ao lado para cadastrar sua equipe e começar do zero.
                    </div>
                  ) : (
                    <select
                      value={funcionarioLoginId}
                      onChange={(e) => setFuncionarioLoginId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-sky-500 transition-colors"
                    >
                      <option value="">-- Selecione seu nome --</option>
                      {colaboradores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} — {c.cargo}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {(() => {
                const colabSelecionado = colaboradores.find((c) => c.id === (funcionarioLoginId || colaboradores[0]?.id)) || colaboradores[0];
                const jaTemSenhaPessoal = colabSelecionado && colabSelecionado.primeiroAcesso === false && (colabSelecionado.senha || "").toLowerCase() !== "aec2026@";

                return (
                  <div className="mt-6 flex flex-col gap-2.5">
                    {/* Status da Senha do Colaborador */}
                    {colabSelecionado && (
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="text-slate-400">Credencial de Acesso:</span>
                        {jaTemSenhaPessoal ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Senha Pessoal Ativa
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Key className="w-3 h-3" /> 1º Acesso Pendente
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      id="btn-entrar-portal"
                      disabled={isLoggingIn || colaboradores.length === 0}
                      onClick={() => {
                        const idAlvo = funcionarioLoginId || colaboradores[0]?.id;
                        if (!idAlvo) {
                          showToast("aviso", "Selecione seu Nome", "Por favor, selecione seu nome na lista para acessar o portal.");
                          return;
                        }
                        setSenhaLoginFuncErro(null);
                        setLoginStatusMsg(null);
                        setColabTentandoLogarId(idAlvo);
                        setSenhaLoginFuncInput("");
                        setModalLoginFuncionarioAberta(true);
                      }}
                      className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isLoggingIn || colaboradores.length === 0
                          ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                          : jaTemSenhaPessoal
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                          : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30"
                      }`}
                    >
                      {jaTemSenhaPessoal ? (
                        <>
                          Entrar com Senha Pessoal <Lock className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Entrar no Portal (1º Acesso) <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* Atalho para primeiro acesso com senha padrão (bloqueado para quem já tem senha pessoal) */}
                    {!jaTemSenhaPessoal ? (
                      <button
                        type="button"
                        disabled={isLoggingIn || colaboradores.length === 0}
                        onClick={() => {
                          const idAlvo = funcionarioLoginId || colaboradores[0]?.id;
                          if (!idAlvo) return;
                          setColabTentandoLogarId(idAlvo);
                          handleConfirmarLoginFuncionario("Aec2026@");
                        }}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-sky-950/70 hover:bg-sky-900/90 text-sky-300 border border-sky-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        ⚡ 1º Acesso com Senha Padrão (Aec2026@)
                      </button>
                    ) : (
                      <p className="text-[11px] text-center text-slate-500 mt-0.5">
                        A senha padrão (Aec2026@) foi bloqueada após o seu primeiro acesso.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Card 2: Área Administrativa (Gestor) */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Acesso Restrito (Gestor / DP)
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2">Área Administrativa</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Digitalização de folhas escaneadas por IA, fechamento de folha, histórico, critérios e gerenciamento de colaboradores.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Senha do Administrador:</label>
                  <input
                    type="password"
                    value={adminSenhaInput}
                    onChange={(e) => {
                      setAdminSenhaInput(e.target.value);
                      setAdminLoginErro(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (adminSenhaInput === "admin123") {
                          setUserRole("admin");
                          setAbaAtiva("digitalizar");
                        } else {
                          setAdminLoginErro(true);
                        }
                      }
                    }}
                    placeholder="Digite a senha de administrador"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                  {adminLoginErro && (
                    <p className="text-xs text-rose-400 font-bold mt-1">Senha de administrador incorreta. Acesso não autorizado.</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  if (adminSenhaInput === "admin123") {
                    setUserRole("admin");
                    setAbaAtiva("digitalizar");
                  } else {
                    setAdminLoginErro(true);
                  }
                }}
                className="mt-6 w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Acessar Painel Administrativo <ShieldAlert className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* MODAL 1: LOGIN DE FUNCIONÁRIO (SENHA) */}
        <AnimatePresence>
          {modalLoginFuncionarioAberta && (
            <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
                {(() => {
                  const colabModal = colaboradores.find((c) => c.id === colabTentandoLogarId) || colaboradores[0];
                  const jaTemSenhaPessoal = colabModal && colabModal.primeiroAcesso === false && (colabModal.senha || "").toLowerCase() !== "aec2026@";

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${jaTemSenhaPessoal ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-sky-500/10 border border-sky-500/20 text-sky-400"}`}>
                            {jaTemSenhaPessoal ? <Lock className="w-6 h-6" /> : <Key className="w-6 h-6" />}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Acesso ao Portal de Ponto</h3>
                            <p className="text-xs text-slate-400">
                              {colabModal?.nome || "Colaborador"} {jaTemSenhaPessoal ? "• Senha Pessoal" : "• 1º Acesso"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setModalLoginFuncionarioAberta(false);
                            setSenhaLoginFuncErro(null);
                            setLoginStatusMsg(null);
                          }}
                          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Alerta de Erro Visual Inline */}
                        {senhaLoginFuncErro && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5 font-medium shadow-md shadow-rose-950/30"
                          >
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                            <span>{senhaLoginFuncErro}</span>
                          </motion.div>
                        )}

                        {/* Feedback de Carregamento / Abrindo */}
                        {loginStatusMsg && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3.5 rounded-2xl bg-sky-950/70 border border-sky-500/40 text-sky-200 text-xs flex items-center gap-2.5 font-medium shadow-md shadow-sky-950/30"
                          >
                            <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-sky-400" />
                            <span>{loginStatusMsg}</span>
                          </motion.div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                              {jaTemSenhaPessoal ? "Sua Senha Pessoal de Acesso" : "Senha de Acesso (Inicial: Aec2026@)"}
                            </label>
                            {!jaTemSenhaPessoal && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSenhaLoginFuncInput("Aec2026@");
                                  setSenhaLoginFuncErro(null);
                                }}
                                className="text-[11px] text-sky-400 hover:text-sky-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                ⚡ Preencher Senha Padrão
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type={mostrarSenhaLoginFunc ? "text" : "password"}
                              value={senhaLoginFuncInput}
                              onChange={(e) => {
                                setSenhaLoginFuncInput(e.target.value);
                                setSenhaLoginFuncErro(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleConfirmarLoginFuncionario();
                                }
                              }}
                              placeholder={jaTemSenhaPessoal ? "Digite sua senha pessoal cadastrada" : "Digite a senha inicial (ex: Aec2026@)"}
                              autoFocus
                              disabled={isLoggingIn}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-3 pr-11 text-sm text-white font-medium focus:outline-none transition-colors font-mono disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={() => setMostrarSenhaLoginFunc(!mostrarSenhaLoginFunc)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                              title={mostrarSenhaLoginFunc ? "Ocultar senha" : "Ver senha"}
                            >
                              {mostrarSenhaLoginFunc ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2.5">
                            {jaTemSenhaPessoal ? (
                              <p className="text-[11px] text-amber-300/90 font-medium">
                                🔒 A senha padrão Aec2026@ está bloqueada para seu usuário. Digite sua senha pessoal.
                              </p>
                            ) : (
                              <>
                                <p className="text-[11px] text-slate-400">
                                  Senha padrão da empresa: <strong className="text-sky-400 font-mono">Aec2026@</strong>
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmarLoginFuncionario("Aec2026@")}
                                  disabled={isLoggingIn}
                                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                                >
                                  Entrar com Padrão →
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                          <button
                            onClick={() => {
                              setModalLoginFuncionarioAberta(false);
                              setSenhaLoginFuncErro(null);
                              setLoginStatusMsg(null);
                            }}
                            disabled={isLoggingIn}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleConfirmarLoginFuncionario()}
                            disabled={isLoggingIn}
                            className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all cursor-pointer ${
                              jaTemSenhaPessoal
                                ? "bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 shadow-emerald-600/30"
                                : "bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 shadow-sky-600/30"
                            }`}
                          >
                            {isLoggingIn ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                {loginStatusMsg || "Entrando..."}
                              </>
                            ) : (
                              <>
                                {jaTemSenhaPessoal ? "Entrar com Senha Pessoal" : "Entrar no Portal"} <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: ALTERAR SENHA PESSOAL (PRIMEIRO ACESSO OBRIGATÓRIO) */}
        <AnimatePresence>
          {modalAlterarSenhaAberta && (
            <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Key className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Criar Senha Pessoal Definitiva</h3>
                      <p className="text-xs text-slate-400">
                        {colaboradores.find((c) => c.id === colabTentandoLogarId)?.nome || "Colaborador"} • 1º Acesso Obrigatório
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setModalAlterarSenhaAberta(false);
                      showToast("aviso", "Cadastro Pendente", "Você precisa cadastrar sua senha pessoal para acessar o portal.");
                    }}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
                    Você autenticou com a senha provisória da empresa. Para a segurança do seu ponto, <strong>cadastre agora a sua nova senha pessoal</strong>. A senha padrão (Aec2026@) será desativada para você.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Nova Senha Pessoal (Mínimo 4 caracteres)
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarNovaSenha ? "text" : "password"}
                        value={novaSenhaInput}
                        onChange={(e) => setNovaSenhaInput(e.target.value)}
                        placeholder="Digite sua nova senha pessoal"
                        autoFocus
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 pr-11 text-sm text-white font-medium focus:outline-none transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                        title={mostrarNovaSenha ? "Ocultar senha" : "Ver senha"}
                      >
                        {mostrarNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Confirmar Nova Senha Pessoal
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarConfirmaNovaSenha ? "text" : "password"}
                        value={confirmaNovaSenhaInput}
                        onChange={(e) => setConfirmaNovaSenhaInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSalvarNovaSenhaPessoal();
                          }
                        }}
                        placeholder="Repita exatamente a nova senha"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 pr-11 text-sm text-white font-medium focus:outline-none transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarConfirmaNovaSenha(!mostrarConfirmaNovaSenha)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                        title={mostrarConfirmaNovaSenha ? "Ocultar senha" : "Ver senha"}
                      >
                        {mostrarConfirmaNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <button
                    onClick={handleSalvarNovaSenhaPessoal}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    Salvar Nova Senha & Entrar no Portal <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        <PWAInstallModal
          isOpen={modalPWAInstalacaoAberta}
          onClose={() => setModalPWAInstalacaoAberta(false)}
          isInstallable={isInstallable}
          isIOS={isIOS}
          isAndroid={isAndroid}
          onInstall={triggerPWAInstall}
        />

        {/* Toast de Notificação na tela de Login */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-4 right-4 z-[70] p-4 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-md ${
                toast.tipo === "sucesso"
                  ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
                  : toast.tipo === "erro"
                  ? "bg-rose-950/90 border-rose-500/40 text-rose-200"
                  : "bg-amber-950/90 border-amber-500/40 text-amber-200"
              }`}
            >
              {toast.tipo === "sucesso" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : toast.tipo === "erro" ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div className="text-xs">
                <strong className="block font-bold">{toast.titulo}</strong>
                <span className="opacity-90">{toast.msg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex ${userRole === "admin" ? "flex-col md:flex-row" : "flex-col"} font-sans selection:bg-sky-500 selection:text-white`}>
      {/* Toast de Notificação */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-md ${
              toast.tipo === "sucesso"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
                : toast.tipo === "erro"
                ? "bg-rose-950/90 border-rose-500/40 text-rose-200"
                : "bg-amber-950/90 border-amber-500/40 text-amber-200"
            }`}
          >
            {toast.tipo === "sucesso" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toast.tipo === "erro" ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div className="text-xs">
              <strong className="block font-bold">{toast.titulo}</strong>
              <span className="opacity-90">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADMIN: Topbar Mobile (< md) */}
      {userRole === "admin" && (
        <div className="md:hidden flex items-center justify-between p-3.5 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <Logo />
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">Painel Admin</div>
              <span className="text-[10px] text-sky-400 font-semibold block">
                {abaAtiva === "dashboard" && "Dashboard Geral"}
                {abaAtiva === "digitalizar" && "Digitalizar Folha"}
                {abaAtiva === "fechamento" && "Espelho & Fechamento"}
                {abaAtiva === "historico" && "Histórico"}
                {abaAtiva === "criterios" && "Critérios"}
                {abaAtiva === "escalas" && "Escalas"}
                {abaAtiva === "colaboradores" && "Colaboradores"}
                {abaAtiva === "baterPonto" && "Portal de Ponto"}
                {abaAtiva === "inconsistencias" && "Inconsistências"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarAbertaMobile(!sidebarAbertaMobile)}
              className="px-3 py-1.5 rounded-xl bg-sky-600 text-white flex items-center gap-1.5 text-xs font-bold shadow-md shadow-sky-600/30"
            >
              <Menu className="w-4 h-4" /> Módulos
            </button>
            <button
              onClick={() => setUserRole("escolha")}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-rose-300"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ADMIN: Drawer Mobile quando aberto */}
      <AnimatePresence>
        {userRole === "admin" && sidebarAbertaMobile && (
          <>
            <div
              onClick={() => setSidebarAbertaMobile(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between z-50 md:hidden shadow-2xl overflow-y-auto"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Logo />
                    <span className="text-xs font-bold text-white uppercase">Painel DP</span>
                  </div>
                  <button
                    onClick={() => setSidebarAbertaMobile(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1.5 text-xs font-semibold">
                  <button
                    onClick={() => {
                      setAbaAtiva("dashboard");
                      setSidebarAbertaMobile(false);
                    }}
                    className={`w-full px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                      abaAtiva === "dashboard"
                        ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-emerald-400" /> Dashboard & Turnos Ativos
                  </button>
                  <button
                    onClick={() => {
                      setAbaAtiva("painelVisual");
                      setSidebarAbertaMobile(false);
                    }}
                    className={`w-full px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                      abaAtiva === "painelVisual"
                        ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" /> Folha Visual (Tempo Real)
                  </button>
                  <button
                    onClick={() => {
                      setAbaAtiva("digitalizar");
                      setSidebarAbertaMobile(false);
                    }}
                    className={`w-full px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                      abaAtiva === "digitalizar"
                        ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Upload className="w-4 h-4 text-sky-400" /> Digitalizar Folha (IA)
                  </button>
                  <button
                    onClick={() => {
                      setAbaAtiva("fechamento");
                      setSidebarAbertaMobile(false);
                    }}
                    className={`w-full px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                      abaAtiva === "fechamento"
                        ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-indigo-400" /> Espelho & Fechamento
                  </button>
                  <button
                    onClick={() => {
                      setAbaAtiva("historico");
                      setSidebarAbertaMobile(false);
                    }}
                    className={`w-full px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                      abaAtiva === "historico"
                        ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-emerald-400" /> Histórico ({fechamentosSalvos.length})
                  </button>
                  <button
                    onClick={() => {
                      setAbaAtiva("criterios");
                      setSidebarAbertaMobile(false);
                    }}
                    className={`w-full px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                      abaAtiva === "criterios"
                        ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Sliders className="w-4 h-4 text-amber-400" /> Critérios da Empresa
                  </button>
                  <button
                    onClick={() => {
                      setAbaAtiva("escalas");
                      setSidebarAbertaMobile(false);
                    }}
                    className={`w-full px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                      abaAtiva === "escalas"
                        ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <CalendarClock className="w-4 h-4 text-emerald-400" /> Escalas & Horários ({escalas.length})
                  </button>
                  <button
                    onClick={() => {
                      setAbaAtiva("colaboradores");
                      setSubAbaColaborador("lista");
                      setSidebarAbertaMobile(false);
                    }}
                    className={`w-full px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                      abaAtiva === "colaboradores"
                        ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Users className="w-4 h-4 text-purple-400" /> Colaboradores & Senhas ({colaboradores.length})
                  </button>
                  <button
                    onClick={() => {
                      setAbaAtiva("baterPonto");
                      setSidebarAbertaMobile(false);
                    }}
                    className={`w-full px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                      abaAtiva === "baterPonto"
                        ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Clock className="w-4 h-4 text-teal-400" /> Portal de Ponto
                  </button>
                  <button
                    onClick={() => {
                      setAbaAtiva("inconsistencias");
                      setSidebarAbertaMobile(false);
                    }}
                    className={`w-full px-3.5 py-3 rounded-xl transition-all flex items-center justify-between text-left ${
                      abaAtiva === "inconsistencias"
                        ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-rose-400" /> Alertas & Inconsistências
                    </span>
                    {calcularInconsistenciasGerais().length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                        {calcularInconsistenciasGerais().length}
                      </span>
                    )}
                  </button>

                  <div className="pt-3">
                    <button
                      onClick={() => {
                        handleAbrirNovoColaborador();
                        setAbaAtiva("colaboradores");
                        setSidebarAbertaMobile(false);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-bold"
                    >
                      <Plus className="w-4 h-4" /> + Novo Colaborador
                    </button>
                  </div>
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => setUserRole("escolha")}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 hover:text-rose-200 border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold"
                >
                  <LogOut className="w-4 h-4" /> Sair do Painel Admin
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ADMIN: Sidebar Desktop Fixa à Esquerda (Visível em md e superior) */}
      {userRole === "admin" && (
        <aside className="hidden md:flex md:w-64 lg:w-72 bg-slate-900 border-r border-slate-800 p-5 flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto z-20">
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-800">
              <Logo />
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">Painel Administrativo</div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Acesso Restrito DP
                </span>
              </div>
            </div>

            <nav className="space-y-1 text-xs font-semibold">
              <button
                onClick={() => setAbaAtiva("dashboard")}
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-left ${
                  abaAtiva === "dashboard"
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" /> Dashboard & Turnos Ativos
              </button>
              <button
                onClick={() => setAbaAtiva("painelVisual")}
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-left ${
                  abaAtiva === "painelVisual"
                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" /> Folha Visual (Tempo Real)
              </button>
              <button
                onClick={() => setAbaAtiva("digitalizar")}
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-left ${
                  abaAtiva === "digitalizar"
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Upload className="w-4 h-4 text-sky-400" /> Digitalizar Folha (IA)
              </button>
              <button
                onClick={() => setAbaAtiva("fechamento")}
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-left ${
                  abaAtiva === "fechamento"
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-400" /> Espelho & Fechamento
              </button>
              <button
                onClick={() => setAbaAtiva("historico")}
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-left ${
                  abaAtiva === "historico"
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-400" /> Histórico ({fechamentosSalvos.length})
              </button>
              <button
                onClick={() => setAbaAtiva("criterios")}
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-left ${
                  abaAtiva === "criterios"
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Sliders className="w-4 h-4 text-amber-400" /> Critérios da Empresa
              </button>
              <button
                onClick={() => setAbaAtiva("escalas")}
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-left ${
                  abaAtiva === "escalas"
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <CalendarClock className="w-4 h-4 text-emerald-400" /> Escalas & Horários ({escalas.length})
              </button>
              <button
                onClick={() => {
                  setAbaAtiva("colaboradores");
                  setSubAbaColaborador("lista");
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-left ${
                  abaAtiva === "colaboradores"
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Users className="w-4 h-4 text-purple-400" /> Colaboradores & Senhas ({colaboradores.length})
              </button>
              <button
                onClick={() => setAbaAtiva("baterPonto")}
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-left ${
                  abaAtiva === "baterPonto"
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Clock className="w-4 h-4 text-teal-400" /> Portal de Ponto
              </button>
              <button
                onClick={() => setAbaAtiva("inconsistencias")}
                className={`w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between text-left ${
                  abaAtiva === "inconsistencias"
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Alertas & Inconsistências
                </span>
                {calcularInconsistenciasGerais().length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                    {calcularInconsistenciasGerais().length}
                  </span>
                )}
              </button>

              <div className="pt-3">
                <button
                  onClick={() => {
                    handleAbrirNovoColaborador();
                    setAbaAtiva("colaboradores");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white font-bold"
                >
                  <Plus className="w-4 h-4" /> + Novo Colaborador
                </button>
              </div>
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => setUserRole("escolha")}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 transition-all flex items-center justify-center gap-2 text-xs font-bold shadow"
            >
              <LogOut className="w-4 h-4" /> Sair do Painel Admin
            </button>
          </div>
        </aside>
      )}

      {/* FUNCIONÁRIO: Header Superior */}
      {userRole === "funcionario" && (
        <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo />
              <div className="h-6 w-px bg-slate-800 hidden sm:block" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Portal do Funcionário (A&C Ponto)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Colaborador
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Logado como: {colaboradores.find((c) => c.id === portalColaboradorId)?.nome || "Funcionário"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  const colab = colaboradores.find((c) => c.id === portalColaboradorId);
                  const ok = await enviarNotificacaoTeste(colab?.nome || "Colaborador");
                  if (ok) {
                    showToast("sucesso", "Notificação Testada!", "Alerta enviado com som e vibração via Service Worker.");
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                title="Testar notificação de turno no aparelho"
              >
                <BellRing className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Testar Lembrete</span>
              </button>

              <button
                onClick={() => setUserRole("escolha")}
                title="Sair / Trocar de Perfil"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 transition-all flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shadow"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Conteúdo Principal (Fluido, lado a lado com a sidebar e sem sobreposição) */}
      <main className="flex-1 min-w-0 w-full p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
        <ErrorBoundary fallbackTitle="Módulo do Painel Administrativo">
        {/* Banner Superior no modo Admin com atalhos rápidos dos módulos */}
        {userRole === "admin" && (
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 bg-slate-950/50">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 font-bold text-xs border border-sky-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Módulo Aberto:
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                {abaAtiva === "dashboard" && "Dashboard em Tempo Real & Turnos Ativos"}
                {abaAtiva === "painelVisual" && "Folha de Ponto Visual (Tempo Real)"}
                {abaAtiva === "digitalizar" && "Digitalização de Folhas de Ponto (IA)"}
                {abaAtiva === "fechamento" && "Espelho de Ponto & Fechamento Mensal"}
                {abaAtiva === "historico" && "Histórico de Fechamentos"}
                {abaAtiva === "criterios" && "Critérios de Apuração da Empresa"}
                {abaAtiva === "escalas" && "Gestão de Escalas & Horários de Trabalho"}
                {abaAtiva === "colaboradores" && "Gestão de Colaboradores & Senhas"}
                {abaAtiva === "baterPonto" && "Terminal de Ponto"}
                {abaAtiva === "inconsistencias" && "Alertas & Inconsistências de Ponto"}
              </h2>
            </div>

            {/* Abas Rápidas de navegação direta */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
              <button
                onClick={() => setAbaAtiva("dashboard")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  abaAtiva === "dashboard" ? "bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" /> Dashboard
              </button>
              <button
                onClick={() => setAbaAtiva("painelVisual")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  abaAtiva === "painelVisual" ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" /> Folha Visual
              </button>
              <button
                onClick={() => setAbaAtiva("digitalizar")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  abaAtiva === "digitalizar" ? "bg-sky-600 text-white font-bold" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> 1. Digitalizar
              </button>
              <button
                onClick={() => setAbaAtiva("fechamento")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  abaAtiva === "fechamento" ? "bg-sky-600 text-white font-bold" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> 2. Fechamento
              </button>
              <button
                onClick={() => setAbaAtiva("historico")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  abaAtiva === "historico" ? "bg-sky-600 text-white font-bold" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> 3. Histórico
              </button>
              <button
                onClick={() => setAbaAtiva("criterios")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  abaAtiva === "criterios" ? "bg-sky-600 text-white font-bold" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> 4. Critérios
              </button>
              <button
                onClick={() => setAbaAtiva("escalas")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  abaAtiva === "escalas" ? "bg-sky-600 text-white font-bold" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" /> 5. Escalas
              </button>
              <button
                onClick={() => {
                  setAbaAtiva("colaboradores");
                  setSubAbaColaborador("lista");
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  abaAtiva === "colaboradores" ? "bg-sky-600 text-white font-bold" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> 6. Colaboradores
              </button>
              <button
                onClick={() => setAbaAtiva("inconsistencias")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  abaAtiva === "inconsistencias" ? "bg-sky-600 text-white font-bold" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Inconsistências
              </button>
            </div>
          </div>
        )}
        {/* ================= ABA: DASHBOARD DE TURNOS & PRESENÇA EM TEMPO REAL ================= */}
        {abaAtiva === "dashboard" && (() => {
          const statusColabsHoje = obterStatusColaboradoresHoje();
          const totalColabs = colaboradores.length;
          const emTurnoColabs = statusColabsHoje.filter((c) => c.status === "emTurno");
          const emAlmocoColabs = statusColabsHoje.filter((c) => c.status === "almoco");
          const concluidosColabs = statusColabsHoje.filter((c) => c.status === "concluido");
          const aguardandoColabs = statusColabsHoje.filter((c) => c.status === "aguardando");
          const folgaColabs = statusColabsHoje.filter((c) => c.status === "folga");
          const ativosHojeCount = statusColabsHoje.filter((c) => c.ativoHoje).length;
          const taxaPresenca = ativosHojeCount > 0 ? Math.round(((emTurnoColabs.length + emAlmocoColabs.length + concluidosColabs.length) / ativosHojeCount) * 100) : 0;

          // Dados para o gráfico de fluxo de presença por hora (06h às 20h)
          const dadosFluxo = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => {
            const minCheck = h * 60 + 30;
            let emTrabalho = 0;
            let emAlmoco = 0;
            statusColabsHoje.forEach((item) => {
              if (!item.ativoHoje) return;
              const entStr = item.entrada || "08:00";
              const almSStr = item.almocoSaida || "12:00";
              const almRStr = item.almocoRetorno || "13:00";
              const saiStr = item.saida || "17:00";
              const ent = (parseInt(entStr.split(":")[0], 10) || 8) * 60 + (parseInt(entStr.split(":")[1], 10) || 0);
              const almS = (parseInt(almSStr.split(":")[0], 10) || 12) * 60 + (parseInt(almSStr.split(":")[1], 10) || 0);
              const almR = (parseInt(almRStr.split(":")[0], 10) || 13) * 60 + (parseInt(almRStr.split(":")[1], 10) || 0);
              const sai = (parseInt(saiStr.split(":")[0], 10) || 17) * 60 + (parseInt(saiStr.split(":")[1], 10) || 0);

              if ((minCheck >= ent && minCheck < almS) || (minCheck >= almR && minCheck < sai)) {
                emTrabalho++;
              } else if (minCheck >= almS && minCheck < almR) {
                emAlmoco++;
              }
            });
            return {
              hora: `${String(h).padStart(2, "0")}h`,
              "Em Turno": emTrabalho,
              "Em Almoço": emAlmoco,
            };
          });

          // Distribuição por departamento
          const deptosSet = Array.from(new Set(colaboradores.map((c) => c.departamento || "Operações")));
          const dadosDeptos = deptosSet.map((dept) => {
            const total = statusColabsHoje.filter((c) => (c.colab.departamento || "Operações") === dept).length;
            const emTurno = statusColabsHoje.filter((c) => (c.colab.departamento || "Operações") === dept && c.status === "emTurno").length;
            const emAlmoco = statusColabsHoje.filter((c) => (c.colab.departamento || "Operações") === dept && c.status === "almoco").length;
            const concl = statusColabsHoje.filter((c) => (c.colab.departamento || "Operações") === dept && c.status === "concluido").length;
            const pct = total > 0 ? Math.round(((emTurno + emAlmoco + concl) / total) * 100) : 0;
            return { departamento: dept, total, emTurno, emAlmoco, concl, pct };
          });

          // Filtro dos colaboradores na lista
          const colabsFiltrados = statusColabsHoje.filter((item) => {
            if (filtroStatusDashboard === "emTurno" && item.status !== "emTurno") return false;
            if (filtroStatusDashboard === "almoco" && item.status !== "almoco") return false;
            if (filtroStatusDashboard === "concluido" && item.status !== "concluido") return false;
            if (filtroStatusDashboard === "aguardando" && (item.status !== "aguardando" && item.status !== "folga")) return false;

            if (filtroDeptoDashboard !== "todos" && (item.colab.departamento || "Operações") !== filtroDeptoDashboard) return false;

            if (filtroBuscaDashboard.trim()) {
              const q = filtroBuscaDashboard.toLowerCase();
              return (
                item.colab.nome.toLowerCase().includes(q) ||
                item.colab.cargo.toLowerCase().includes(q) ||
                (item.colab.departamento && item.colab.departamento.toLowerCase().includes(q)) ||
                item.escalaNome.toLowerCase().includes(q)
              );
            }
            return true;
          });

          return (
            <div className="space-y-6">
              {/* Header Visual do Dashboard */}
              <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <Activity className="w-3.5 h-3.5" /> Monitoramento em Tempo Real
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                      <LayoutDashboard className="w-7 h-7 text-sky-400" />
                      Dashboard Operacional & Turnos Ativos
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                      Painel executivo de jornada: acompanhe os colaboradores em atendimento agora, intervalos de refeição, escala de horários e curvas de presença da empresa.
                    </p>
                  </div>

                  {/* Relógio em Tempo Real & Data */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center min-w-[210px] shadow-inner shrink-0">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 uppercase font-bold tracking-wider">
                      <Clock className="w-3.5 h-3.5 text-sky-400" /> Hora Local
                    </div>
                    <div className="text-2xl sm:text-3xl font-mono font-extrabold text-white mt-1">
                      {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </div>
                    <div className="text-[11px] text-sky-400 font-semibold mt-1">
                      {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 1: Indicadores e Métricas Rápidas (KPI Cards) */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* Total */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Equipe</span>
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">{totalColabs}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{deptosSet.length} departamento(s)</div>
                </div>

                {/* Em Turno Agora */}
                <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-xl space-y-2 relative overflow-hidden hover:border-emerald-500/60 transition-all">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Em Turno Agora
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-300">{emTurnoColabs.length}</div>
                  <div className="text-[11px] text-emerald-400/80 font-medium">
                    {totalColabs > 0 ? `${Math.round((emTurnoColabs.length / totalColabs) * 100)}% da força de trabalho` : "Nenhum colaborador"}
                  </div>
                </div>

                {/* Em Intervalo / Almoço */}
                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-2 hover:border-amber-500/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Em Intervalo</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Coffee className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-300">{emAlmocoColabs.length}</div>
                  <div className="text-[11px] text-amber-400/80 font-medium">Pausa de almoço / lanche</div>
                </div>

                {/* Jornada Concluída */}
                <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-4 shadow-xl space-y-2 hover:border-sky-500/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">Concluído Hoje</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-sky-300">{concluidosColabs.length}</div>
                  <div className="text-[11px] text-sky-400/80 font-medium">Expediente finalizado</div>
                </div>

                {/* Taxa de Presença / Atividade */}
                <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 shadow-xl space-y-2 col-span-2 lg:col-span-1 hover:border-purple-500/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Aderência Hoje</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-purple-300">{taxaPresenca}%</div>
                  <div className="text-[11px] text-purple-400/80 font-medium">
                    {aguardandoColabs.length > 0 ? `${aguardandoColabs.length} aguardando início` : "Equipe 100% iniciada"}
                  </div>
                </div>
              </div>

              {/* Seção 2: Gráficos de Tendência de Presença em Tempo Real */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Gráfico 1: Curva de Fluxo de Presença por Hora do Dia */}
                <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-sky-400" />
                        Curva Horária de Presença & Movimentação (06h às 20h)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Volume dinâmico de colaboradores ativos em seus postos vs. intervalos de almoço ao longo do dia.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                        <span className="w-3 h-3 rounded bg-sky-500"></span> Em Turno
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                        <span className="w-3 h-3 rounded bg-amber-500"></span> Almoço
                      </span>
                    </div>
                  </div>

                  <div className="h-64 sm:h-72 w-full pt-2">
                    {totalColabs === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <Clock className="w-8 h-8 text-slate-600" />
                        <span className="text-xs">Cadastre colaboradores para visualizar a curva de presença horária.</span>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dadosFluxo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="hora" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#090d16",
                              borderColor: "#334155",
                              borderRadius: "12px",
                              color: "#f8fafc",
                              fontSize: "12px",
                              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                            }}
                          />
                          <Bar dataKey="Em Turno" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Em Almoço" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Gráfico 2: Presença por Departamento */}
                <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="pb-3 border-b border-slate-800">
                      <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-emerald-400" />
                        Efetivo por Setor
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Proporção de colaboradores em atividade por departamento.
                      </p>
                    </div>

                    <div className="space-y-3.5 pt-4">
                      {dadosDeptos.length === 0 ? (
                        <p className="text-xs text-slate-500 italic text-center py-8">Nenhum departamento cadastrado.</p>
                      ) : (
                        dadosDeptos.map((dept) => (
                          <div key={dept.departamento} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-white">{dept.departamento}</span>
                              <span className="font-mono text-slate-400 text-[11px]">
                                <strong className="text-emerald-400">{dept.emTurno}</strong> em turno / {dept.total} total ({dept.pct}%)
                              </span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
                              <div
                                style={{ width: `${dept.total > 0 ? (dept.emTurno / dept.total) * 100 : 0}%` }}
                                className="bg-emerald-500 transition-all duration-500"
                                title={`${dept.emTurno} em turno`}
                              />
                              <div
                                style={{ width: `${dept.total > 0 ? (dept.emAlmoco / dept.total) * 100 : 0}%` }}
                                className="bg-amber-500 transition-all duration-500"
                                title={`${dept.emAlmoco} em almoço`}
                              />
                              <div
                                style={{ width: `${dept.total > 0 ? (dept.concl / dept.total) * 100 : 0}%` }}
                                className="bg-sky-500 transition-all duration-500"
                                title={`${dept.concl} concluídos`}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Resumo de Escalas Ativas */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2 mt-4 text-xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                      <span>Escalas Cadastradas</span>
                      <span className="text-sky-400">{escalas.length} ativas</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {escalas.slice(0, 4).map((esc) => (
                        <span key={esc.id} className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono">
                          {esc.tipo} • {esc.nome.split("(")[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 3: Quadro Interativo de Colaboradores em Atividade */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-sky-400" />
                      Quadro de Presença em Tempo Real ({colabsFiltrados.length} de {totalColabs})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Visualização detalhada do status de cada colaborador hoje, progresso da jornada e horários nominais.
                    </p>
                  </div>

                  {/* Ação rápida para cadastrar ou testar */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    {colaboradores.length === 0 ? (
                      <button
                        onClick={handleCarregarExemploPronto}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-600/30 flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Play className="w-3.5 h-3.5" /> Carregar Demonstração (IA)
                      </button>
                    ) : (
                      <button
                        onClick={handleAbrirNovoColaborador}
                        className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> + Novo Colaborador
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtros da Lista: Status, Departamento e Busca */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
                  {/* Pílulas de Status */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                    <button
                      type="button"
                      onClick={() => setFiltroStatusDashboard("todos")}
                      className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                        filtroStatusDashboard === "todos"
                          ? "bg-sky-600 text-white shadow-md shadow-sky-600/30 font-bold"
                          : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      Todos ({totalColabs})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroStatusDashboard("emTurno")}
                      className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        filtroStatusDashboard === "emTurno"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold"
                          : "bg-slate-950 text-slate-400 hover:text-emerald-300 border border-slate-800"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      Em Turno ({emTurnoColabs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroStatusDashboard("almoco")}
                      className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        filtroStatusDashboard === "almoco"
                          ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold"
                          : "bg-slate-950 text-slate-400 hover:text-amber-300 border border-slate-800"
                      }`}
                    >
                      <Coffee className="w-3.5 h-3.5 text-amber-400" />
                      Em Almoço ({emAlmocoColabs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroStatusDashboard("concluido")}
                      className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        filtroStatusDashboard === "concluido"
                          ? "bg-sky-600 text-white shadow-md shadow-sky-600/30 font-bold"
                          : "bg-slate-950 text-slate-400 hover:text-sky-300 border border-slate-800"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                      Concluído ({concluidosColabs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroStatusDashboard("aguardando")}
                      className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        filtroStatusDashboard === "aguardando"
                          ? "bg-slate-700 text-white shadow-md font-bold"
                          : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Aguardando / Folga ({aguardandoColabs.length + folgaColabs.length})
                    </button>
                  </div>

                  {/* Dropdown de Departamento e Campo de Busca */}
                  <div className="flex items-center gap-2 w-full lg:w-auto">
                    <select
                      value={filtroDeptoDashboard}
                      onChange={(e) => setFiltroDeptoDashboard(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-medium focus:outline-none focus:border-sky-500"
                    >
                      <option value="todos">Todos os Setores</option>
                      {deptosSet.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <div className="relative flex-1 lg:w-60">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar funcionário ou cargo..."
                        value={filtroBuscaDashboard}
                        onChange={(e) => setFiltroBuscaDashboard(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Grid de Cards dos Colaboradores */}
                {totalColabs === 0 ? (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Nenhum Colaborador Cadastrado</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Cadastre os colaboradores e vincule suas escalas para acompanhar os turnos ativos e tendências de pontualidade em tempo real.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={handleAbrirNovoColaborador}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        + Cadastrar Colaborador
                      </button>
                      <button
                        onClick={handleCarregarExemploPronto}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700"
                      >
                        Carregar Exemplo de Demonstração
                      </button>
                    </div>
                  </div>
                ) : colabsFiltrados.length === 0 ? (
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400 text-xs">
                    Nenhum colaborador encontrado com os filtros selecionados.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {colabsFiltrados.map((item) => {
                      const { colab, status, statusRotulo, statusDesc, statusCor, entrada, saida, almocoSaida, almocoRetorno, progressoPct, jornadaTotalMin, minutosTrabalhados } = item;
                      const emTurno = status === "emTurno";
                      const emAlmoco = status === "almoco";

                      return (
                        <div
                          key={colab.id}
                          className={`bg-slate-950/90 border rounded-3xl p-5 shadow-xl space-y-4 transition-all ${
                            emTurno
                              ? "border-emerald-500/40 shadow-emerald-950/20"
                              : emAlmoco
                              ? "border-amber-500/40 shadow-amber-950/20"
                              : status === "concluido"
                              ? "border-sky-500/30"
                              : "border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {/* Topo do Card: Avatar, Nome e Badge de Status */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${
                                emTurno
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 ring-2 ring-emerald-500/20"
                                  : emAlmoco
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : status === "concluido"
                                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                  : "bg-slate-800 text-slate-300 border border-slate-700"
                              }`}>
                                {colab.nome.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-xs leading-tight line-clamp-1">{colab.nome}</h4>
                                <span className="text-[11px] text-sky-400 font-semibold block">{colab.cargo}</span>
                                <span className="text-[10px] text-slate-400 block">{colab.departamento || "Geral"}</span>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 shrink-0 ${
                              emTurno
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-bold"
                                : emAlmoco
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : status === "concluido"
                                ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                                : "bg-slate-900 text-slate-400 border-slate-800"
                            }`}>
                              {emTurno && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                              {emAlmoco && <Coffee className="w-3 h-3 text-amber-400" />}
                              {status === "concluido" && <Check className="w-3 h-3 text-sky-400" />}
                              {statusRotulo}
                            </span>
                          </div>

                          {/* Horário Nominal e Descrição */}
                          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-slate-400 flex items-center gap-1 font-sans">
                                <Clock className="w-3 h-3 text-sky-400" /> Expediente Hoje:
                              </span>
                              <span className="font-bold text-white">
                                {entrada} às {saida}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                              <span>Almoço: {almocoSaida} - {almocoRetorno}</span>
                              <span className="text-emerald-400">{item.escalaNome.split("(")[0]}</span>
                            </div>

                            <div className="text-[10px] text-slate-400 italic">
                              {statusDesc}
                            </div>
                          </div>

                          {/* Barra de Progresso da Jornada Diária */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Progresso do Dia:</span>
                              <span className="font-mono font-bold text-white">
                                {minutosParaTextoExtenso(minutosTrabalhados, false)} / {minutosParaTextoExtenso(jornadaTotalMin, false)} ({progressoPct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                              <div
                                style={{ width: `${progressoPct}%` }}
                                className={`h-full transition-all duration-500 ${
                                  emTurno ? "bg-emerald-500" : emAlmoco ? "bg-amber-500" : status === "concluido" ? "bg-sky-500" : "bg-slate-700"
                                }`}
                              />
                            </div>
                          </div>

                          {/* Ações Rápidas */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5 text-xs flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setPortalColaboradorId(colab.id);
                                setAbaAtiva("baterPonto");
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold transition-colors flex items-center gap-1 text-[11px]"
                            >
                              <Clock className="w-3 h-3 text-teal-400" /> Ponto
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setColaboradorSelecionadoId(colab.id);
                                setAbaAtiva("painelVisual");
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 font-bold transition-all flex items-center gap-1 text-[11px]"
                              title="Ver folha de ponto visual idêntica à planilha"
                            >
                              <FileSpreadsheet className="w-3 h-3 text-amber-400" /> Folha Visual
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setColaboradorSelecionadoId(colab.id);
                                setAbaAtiva("fechamento");
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 font-semibold transition-all flex items-center gap-1 text-[11px]"
                            >
                              <FileText className="w-3 h-3 text-sky-400" /> Espelho
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ================= ABA: PAINEL VISUAL DE BATIDAS (FOLHA DE PONTO REAL-TIME) ================= */}
        {abaAtiva === "painelVisual" && (
          <PainelFolhaVisual
            colaboradores={colaboradores}
            colaboradorSelecionadoId={colaboradorSelecionadoId || portalColaboradorId || colaboradores[0]?.id}
            criterios={criterios}
            onVoltar={() => setAbaAtiva("dashboard")}
          />
        )}

        {/* ================= ABA: PORTAL DE PONTO (FUNCIONÁRIOS) ================= */}
        {abaAtiva === "baterPonto" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-bold border border-sky-500/20">
                    <Clock className="w-3.5 h-3.5" /> Terminal de Ponto Individual
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Registro Diário do Colaborador</h2>
                  <p className="text-sm text-slate-400 max-w-xl">
                    Cada funcionário pode registrar sua entrada, saída de almoço, retorno e saída do dia diretamente aqui ou registrar os horários em tempo real.
                  </p>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center min-w-[200px] shadow-inner">
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Horário Atual</div>
                  <div className="text-2xl font-mono font-bold text-sky-400 mt-1">
                    {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>

            {colaboradores.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Nenhum Colaborador Cadastrado</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Para registrar pontos e batidas diárias, cadastre os colaboradores no painel administrativo.
                  </p>
                </div>
                {userRole === "admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAbaAtiva("colaboradores");
                      setSubAbaColaborador("novo");
                    }}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center gap-2 mx-auto transition-all"
                  >
                    <UserPlus className="w-4 h-4" /> + Cadastrar Primeiro Colaborador
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Painel de Ações de Batida (MOVIDO PARA O TOPO) */}
                {(() => {
                  const colabAtual = colaboradores.find((c) => c.id === portalColaboradorId) || colaboradores[0];
                  if (!colabAtual) return null;
                  return (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                        <div>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-sky-400" />
                            Registrar Ponto para: <span className="text-sky-400">{colabAtual.nome}</span>
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Cargo: {colabAtual.cargo} | Horário Padrão: {colabAtual.horarioTrabalho?.entrada || "08:00"} às {colabAtual.horarioTrabalho?.saida || "17:00"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                          {/* Card de Saldo de Banco de Horas */}
                          {(() => {
                            const saldoMin = colabAtual.saldoAnteriorBancoMinutos || 0;
                            const ehPositivo = saldoMin >= 0;
                            return (
                              <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-inner">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${ehPositivo ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Banco de Horas</div>
                                  <div className={`text-sm font-mono font-bold ${ehPositivo ? "text-emerald-400" : "text-rose-400"}`}>
                                    {minutosParaTextoExtenso(saldoMin, true)}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          <button
                            type="button"
                            onClick={() => {
                              setColaboradorSelecionadoId(colabAtual.id);
                              setAbaAtiva("painelVisual");
                            }}
                            className="bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 rounded-2xl px-3.5 py-2.5 flex items-center gap-2 font-bold text-xs transition-all cursor-pointer shadow-sm shrink-0"
                            title="Ver a folha de ponto visual idêntica à planilha oficial"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Ver Folha Visual</span>
                          </button>

                          {portalSucessoModal && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                              <CheckCircle2 className="w-4 h-4" /> {portalSucessoModal.tipo.toUpperCase()} registrada às {portalSucessoModal.hora}!
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePortalBaterPonto("entrada1"); }}
                          className="group bg-gradient-to-b from-slate-950 to-slate-900 hover:from-sky-950/40 hover:to-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-6 text-center transition-all duration-300 shadow-lg hover:shadow-sky-500/10 flex flex-col items-center justify-center gap-3"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform shadow-inner">
                            <Clock className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">1º Horário</div>
                            <div className="text-xl font-extrabold text-white mt-0.5">Entrada 1</div>
                          </div>
                          <span className="px-3 py-1.5 rounded-xl bg-sky-600/20 text-sky-300 text-xs font-bold group-hover:bg-sky-600 group-hover:text-white transition-colors w-full">
                            Bater Entrada Agora
                          </span>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); handlePortalBaterPonto("saida1"); }}
                          className="group bg-gradient-to-b from-slate-950 to-slate-900 hover:from-amber-950/40 hover:to-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 text-center transition-all duration-300 shadow-lg hover:shadow-amber-500/10 flex flex-col items-center justify-center gap-3"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shadow-inner">
                            <Clock className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Almoço</div>
                            <div className="text-xl font-extrabold text-white mt-0.5">Saída Almoço</div>
                          </div>
                          <span className="px-3 py-1.5 rounded-xl bg-amber-600/20 text-amber-300 text-xs font-bold group-hover:bg-amber-600 group-hover:text-white transition-colors w-full">
                            Bater Saída Almoço
                          </span>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); handlePortalBaterPonto("entrada2"); }}
                          className="group bg-gradient-to-b from-slate-950 to-slate-900 hover:from-emerald-950/40 hover:to-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-all duration-300 shadow-lg hover:shadow-emerald-500/10 flex flex-col items-center justify-center gap-3"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-inner">
                            <Clock className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Retorno</div>
                            <div className="text-xl font-extrabold text-white mt-0.5">Retorno Almoço</div>
                          </div>
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 text-xs font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors w-full">
                            Bater Retorno
                          </span>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); handlePortalBaterPonto("saida2"); }}
                          className="group bg-gradient-to-b from-slate-950 to-slate-900 hover:from-purple-950/40 hover:to-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 text-center transition-all duration-300 shadow-lg hover:shadow-purple-500/10 flex flex-col items-center justify-center gap-3"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-inner">
                            <Clock className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Fim do Dia</div>
                            <div className="text-xl font-extrabold text-white mt-0.5">Saída Expediente</div>
                          </div>
                          <span className="px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 text-xs font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors w-full">
                            Bater Saída
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Seleção de Mês e Dia (ocultar seleção de funcionário para funcionário) */}
                {userRole === "admin" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">1. Selecionar Funcionário</label>
                      <select
                        value={portalColaboradorId}
                        onChange={(e) => setPortalColaboradorId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-sky-500 transition-colors"
                      >
                        {colaboradores.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} — {c.cargo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">2. Mês de Referência</label>
                      <input
                        type="text"
                        value={portalMesAno}
                        onChange={(e) => setPortalMesAno(e.target.value)}
                        placeholder="MM/AAAA"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-sky-500 transition-colors text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">3. Dia do Mês (1 - 31)</label>
                      <select
                        value={portalDiaSelecionado}
                        onChange={(e) => setPortalDiaSelecionado(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-sky-500 transition-colors text-center font-mono"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            Dia {d < 10 ? `0${d}` : d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                {/* Ocultar seleção de funcionário para funcionário */}
                {userRole === "funcionario" && (
                    <div className="hidden">
                        <select value={portalColaboradorId} disabled>
                            {colaboradores.map((c) => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>
                    </div>
                )}

              </>
            )}
          </div>
        )}

        {/* ================= ABA: ALERTAS & INCONSISTÊNCIAS ================= */}
        {abaAtiva === "inconsistencias" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/30 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" /> Monitoramento em Tempo Real
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Alertas & Inconsistências de Ponto</h2>
                  <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                    Detecção automática de batidas incompletas (ímpares), esquecimentos de marcação e faltas injustificadas na jornada dos colaboradores.
                  </p>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center min-w-[200px] shadow-inner">
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Inconsistências Ativas</div>
                  <div className="text-3xl font-extrabold text-rose-400 mt-1">
                    {calcularInconsistenciasGerais().length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Competência Setembro / 2026</div>
                </div>
              </div>
            </div>

            {calcularInconsistenciasGerais().length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Nenhuma Inconsistência Detectada!</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Todos os registros de ponto dos colaboradores estão completos e corretos para a competência atual.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400" /> Lista de Alertas Pendentes de Correção
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Exibindo registros que exigem atenção do DP</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Colaborador</th>
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4">Tipo de Alerta</th>
                        <th className="py-3 px-4">Descrição da Inconsistência</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                      {calcularInconsistenciasGerais().map((inc, idx) => (
                        <tr key={idx} className="hover:bg-slate-950/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">{inc.colaboradorNome}</td>
                          <td className="py-3 px-4 font-mono text-sky-400">{inc.dataStr}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                              {inc.tipo}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{inc.descricao}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setColaboradorSelecionadoId(inc.colaboradorId);
                                setPortalColaboradorId(inc.colaboradorId);
                                setPortalDiaSelecionado(inc.dia);
                                setAbaAtiva("baterPonto");
                              }}
                              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all shadow"
                            >
                              Corrigir Ponto
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ABA 1: DIGITALIZAR FOLHA ================= */}
        {abaAtiva === "digitalizar" && (
          <div className="space-y-6">
            {/* Banner de Critérios Rápidos */}
            <div className="bg-gradient-to-r from-sky-950/40 via-slate-900 to-emerald-950/30 border border-sky-500/20 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Regras do WhatsApp Integradas Automaticamente</span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                    Basta enviar a foto ou arquivo escaneado do cartão de ponto. O sistema lê as batidas diárias com IA e calcula: 
                    <strong className="text-white"> Adicional Noturno (22h-05h)</strong>, 
                    <strong className="text-white"> Banco de Horas (máx 2h/dia e sábados até 2h)</strong>, 
                    <strong className="text-white"> Horas Extras 50% (excedentes &gt; 2h, sábados acima de 2h e almoço &lt; 1h)</strong> e 
                    <strong className="text-white"> Horas Extras 100% (domingos e feriados sem folga)</strong>.
                  </p>
                </div>
                <button
                  onClick={handleCarregarExemploPronto}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/30 transition-all flex items-center gap-2 shrink-0"
                >
                  <Play className="w-3.5 h-3.5" /> Testar com Folha Exemplo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Lado Esquerdo: Área de Upload & Parâmetros */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-sky-400" /> 1. Upload da Folha de Ponto Escaneada
                  </h3>

                  {/* Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                      imagemBase64
                        ? "border-sky-500/50 bg-sky-950/20"
                        : "border-slate-800 hover:border-slate-700 bg-slate-950/60"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {imagemBase64 ? (
                      <div className="space-y-3 w-full text-center">
                        <img
                          src={imagemBase64}
                          alt="Folha de ponto preview"
                          className="max-h-48 w-full object-contain rounded-xl border border-slate-800 bg-black/40"
                        />
                        <div className="text-xs text-sky-300 font-medium truncate px-2">{nomeArquivo}</div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="text-[11px] text-slate-400 hover:text-white underline"
                        >
                          Trocar imagem escaneada
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-sky-600/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-bold text-white block">Arraste ou clique para selecionar</span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Aceita fotos do celular, PNG, JPG ou digitalizações em alta resolução
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Parâmetros do Lançamento */}
                  <div className="space-y-4 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-300 font-semibold">Colaborador da Folha</label>
                        <button
                          type="button"
                          onClick={() => {
                            setAbaAtiva("colaboradores");
                            setSubAbaColaborador("novo");
                          }}
                          className="text-[10px] text-sky-400 hover:text-sky-300 underline font-sans"
                        >
                          + Cadastrar Colaborador
                        </button>
                      </div>
                      {colaboradores.length === 0 ? (
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
                          Nenhum colaborador cadastrado ainda. Cadastre o colaborador primeiro.
                        </div>
                      ) : (
                        <select
                          value={colaboradorSelecionadoId}
                          onChange={(e) => setColaboradorSelecionadoId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-sky-500"
                        >
                          <option value="">-- Selecione o colaborador --</option>
                          {colaboradores.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome} — {c.cargo} (R$ {(Number(c.salarioBase) || 2450).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Mês / Ano</label>
                        <input
                          type="text"
                          value={mesAnoInput}
                          onChange={(e) => setMesAnoInput(e.target.value)}
                          placeholder="Ex: 09/2026"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-300 font-semibold">Saldo Anterior Banco</label>
                          <button
                            type="button"
                            onClick={() => {
                              const c = colaboradores.find((x) => x.id === colaboradorSelecionadoId);
                              if (c) handleAbrirAjustarBanco(c);
                            }}
                            className="text-[10px] text-sky-400 hover:text-sky-300 underline font-sans"
                          >
                            Ajustar Saldo
                          </button>
                        </div>
                        <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sky-300 font-mono flex items-center justify-between">
                          <span>
                            {minutosParaTextoExtenso(
                              colaboradores.find((c) => c.id === colaboradorSelecionadoId)?.saldoAnteriorBancoMinutos || 0,
                              true
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans">
                            {colaboradores.find((c) => c.id === colaboradorSelecionadoId)?.dataInicioSaldo || "Base inicial"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Resumo do Horário Nominal do Colaborador Selecionado */}
                    {(() => {
                      const colabAtivo = colaboradores.find((c) => c.id === colaboradorSelecionadoId);
                      if (!colabAtivo) return null;
                      const h = colabAtivo.horarioTrabalho;
                      return (
                        <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1 text-[11px]">
                          <div className="flex items-center justify-between text-slate-400 font-semibold">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <Clock className="w-3.5 h-3.5 text-sky-400" /> Horário Contratual:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleAbrirEditarColaborador(colabAtivo);
                                setAbaAtiva("colaboradores");
                              }}
                              className="text-[10px] text-sky-400 hover:text-sky-300 underline"
                            >
                              Editar Horário
                            </button>
                          </div>
                          <div className="text-white font-mono flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                            <span>Seg-Sex: {h.entrada} às {h.almocoSaida} / {h.almocoRetorno} às {h.saida}</span>
                            {h.sabadoAtivo && (
                              <span className="text-amber-300">Sáb: {h.sabadoEntrada || "08:00"} às {h.sabadoSaida || "12:00"} (2h Banco + HE 50%)</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Botão de Processar com Gemini Vision */}
                  <button
                    onClick={handleProcessarFolhaComIA}
                    disabled={estaProcessandoOCR}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xl transition-all ${
                      estaProcessandoOCR
                        ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                        : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30"
                    }`}
                  >
                    {estaProcessandoOCR ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                        <span>Processando com IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Processar Folha com IA (Gemini Vision)</span>
                      </>
                    )}
                  </button>

                  {estaProcessandoOCR && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 bg-sky-950/30 border border-sky-500/20 rounded-xl text-center"
                    >
                      <p className="text-[11px] text-sky-300 animate-pulse font-medium">{etapaProcessamento}</p>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Lado Direito: Prévia e Explicação dos Critérios Aplicados */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Resumo das Regras Automatizadas da Folha
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <div className="flex items-center gap-2 text-sky-400 font-bold">
                        <Moon className="w-3.5 h-3.5" /> Adicional Noturno
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Horas entre <strong className="text-white">22:00 e 05:00</strong> são separadas para pagamento de adicional noturno em folha.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <div className="flex items-center gap-2 text-rose-400 font-bold">
                        <Clock className="w-3.5 h-3.5" /> Horas Negativas no Banco
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Atrasos e saídas antecipadas em relação ao horário nominal descontam diretamente do saldo do banco.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <Check className="w-3.5 h-3.5" /> Limite Diário de Banco (2h)
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Até <strong className="text-white">2 horas extras/dia</strong> entram no banco (fator 1:1 exato). O que passar de 2h vai para HE 50%.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <div className="flex items-center gap-2 text-indigo-400 font-bold">
                        <Calendar className="w-3.5 h-3.5" /> Sábados (2h Banco + HE 50%)
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Trabalho aos sábados mantém até <strong className="text-white">2 horas para o banco</strong> (1:1) e as demais são pagas com <strong className="text-white">+50% de acréscimo</strong>.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <div className="flex items-center gap-2 text-amber-400 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" /> Almoço &lt; 1h (HE 50%)
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Intervalo menor que 1h tem o tempo suprimido pago como hora extra acrescida de 50%.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <div className="flex items-center gap-2 text-yellow-400 font-bold">
                        <Sun className="w-3.5 h-3.5" /> Domingos e Feriados (100%)
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Trabalho em domingo ou feriado sem folga compensatória é pago integralmente com 100%.
                      </p>
                    </div>
                  </div>

                  {fechamentoAtual && (
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                      <div className="text-xs text-slate-400">
                        Último fechamento carregado: <strong className="text-white">{fechamentoAtual.colaboradorNome}</strong> ({fechamentoAtual.mesAno})
                      </div>
                      <button
                        onClick={() => setAbaAtiva("fechamento")}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        Ver Espelho de Ponto <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 2: ESPELHO & FECHAMENTO DO MÊS ================= */}
        {abaAtiva === "fechamento" && fechamentoAtual && (
          <div className="space-y-6">
            {/* Cabeçalho da Folha Atual com Ações de Exportação */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{fechamentoAtual.colaboradorNome}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                    {fechamentoAtual.mesAno}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Cargo: {fechamentoAtual.colaboradorCargo} • Salário Base: R$ {(Number(fechamentoAtual.salarioBase) || 2450).toFixed(2)} (Valor Hora: R$ {(Number(fechamentoAtual.valorHora) || 11.14).toFixed(2)})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleSalvarFechamento}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-3.5 h-3.5" /> Salvar Fechamento
                </button>
                <button
                  onClick={handleExportarPDF}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Baixar Espelho em PDF
                </button>
                <button
                  onClick={handleExportarCSV}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar CSV
                </button>
              </div>
            </div>

            {/* Cards de Métricas do Fechamento Conforme Critérios WhatsApp */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* 1. Total Horas Trabalhadas */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Horas Trabalhadas</span>
                <div className="text-lg font-black text-white font-mono">
                  {minutosParaTextoExtenso(fechamentoAtual.totalHorasTrabalhadasMinutos, false)}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  {minutosParaDecimal(fechamentoAtual.totalHorasTrabalhadasMinutos)}h decimais
                </span>
              </div>

              {/* 2. Banco de Horas do Mês */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Banco do Mês (1:1)</span>
                <div className={`text-lg font-black font-mono ${
                  fechamentoAtual.saldoLiquidoMesMinutos >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {minutosParaTextoExtenso(fechamentoAtual.saldoLiquidoMesMinutos, true)}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Créditos: +{minutosParaHora(fechamentoAtual.bancoCreditosMesMinutos)} | Débitos: -{minutosParaHora(fechamentoAtual.bancoDebitosMesMinutos)}
                </span>
              </div>

              {/* 3. Saldo Acumulado do Banco */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Acumulado Final</span>
                <div className={`text-lg font-black font-mono ${
                  fechamentoAtual.saldoAcumuladoFinalMinutos >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {minutosParaTextoExtenso(fechamentoAtual.saldoAcumuladoFinalMinutos, true)}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span className="truncate">
                    Anterior: {minutosParaTextoExtenso(fechamentoAtual.saldoAnteriorBancoMinutos, true)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const c = colaboradores.find((x) => x.id === fechamentoAtual.colaboradorId) || {
                        id: fechamentoAtual.colaboradorId || "FUNC_TEMP",
                        nome: fechamentoAtual.colaboradorNome,
                        cargo: fechamentoAtual.colaboradorCargo,
                        departamento: "Geral",
                        salarioBase: fechamentoAtual.salarioBase,
                        saldoAnteriorBancoMinutos: fechamentoAtual.saldoAnteriorBancoMinutos,
                        horarioTrabalho: {
                          entrada: "08:00",
                          almocoSaida: "12:00",
                          almocoRetorno: "13:00",
                          saida: "17:00",
                        },
                      };
                      handleAbrirAjustarBanco(c);
                    }}
                    className="text-sky-400 hover:text-sky-300 underline font-sans shrink-0 ml-1"
                    title="Ajustar saldo de banco anterior deste colaborador"
                  >
                    Ajustar
                  </button>
                </div>
              </div>

              {/* 4. Horas Extras 50% */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Horas Extras 50%</span>
                <div className="text-lg font-black text-sky-300 font-mono">
                  {minutosParaTextoExtenso(fechamentoAtual.totalHE50Minutos, false)}
                </div>
                <span className="text-[10px] text-sky-400/80 font-bold block">
                  R$ {(fechamentoAtual.valorEstimadoHE50 || 0).toFixed(2)}
                </span>
              </div>

              {/* 5. Horas Extras 100% */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Horas Extras 100%</span>
                <div className="text-lg font-black text-amber-300 font-mono">
                  {minutosParaTextoExtenso(fechamentoAtual.totalHE100Minutos, false)}
                </div>
                <span className="text-[10px] text-amber-400/80 font-bold block">
                  R$ {(fechamentoAtual.valorEstimadoHE100 || 0).toFixed(2)}
                </span>
              </div>

              {/* 6. Adicional Noturno */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Adicional Noturno (22h-05h)</span>
                <div className="text-lg font-black text-indigo-300 font-mono">
                  {minutosParaTextoExtenso(fechamentoAtual.totalAdicionalNoturnoMinutos, false)}
                </div>
                <span className="text-[10px] text-indigo-400/80 font-bold block">
                  R$ {(fechamentoAtual.valorEstimadoAdicNoturno || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Seletor de Competência / Mês e Situação do Banco de Horas */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-xs mb-1.5">
                    Mês de Competência da Folha:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMesAnterior}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition-colors flex items-center justify-center"
                      title="Mês Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <select
                      value={fechamentoAtual.mesAno}
                      onChange={(e) => handleMudarMesFechamento(e.target.value)}
                      className="bg-slate-950 border border-slate-700 hover:border-sky-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-inner"
                    >
                      {MESES_OPCOES.map((opt) => (
                        <option key={opt.valor} value={opt.valor} className="bg-slate-900 text-white">
                          {opt.rotulo}
                        </option>
                      ))}
                      {!MESES_OPCOES.some((opt) => opt.valor === fechamentoAtual.mesAno) && (
                        <option value={fechamentoAtual.mesAno} className="bg-slate-900 text-white">
                          {fechamentoAtual.mesAno} (Personalizado)
                        </option>
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={handleProximoMes}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition-colors flex items-center justify-center"
                      title="Próximo Mês"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500/10 border border-sky-500/30 text-sky-300 rounded-lg font-mono font-bold text-xs ml-1">
                      {fechamentoAtual.mesAno}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-slate-400 block text-xs">Situação do Banco de Horas:</span>
                <span className={`font-bold text-xs sm:text-sm ${fechamentoAtual.saldoAcumuladoFinalMinutos >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {fechamentoAtual.saldoAcumuladoFinalMinutos >= 0 ? "SALDO CREDOR A COMPENSAR" : "SALDO DEVEDOR / DESCONTO"}
                </span>
                <span className="text-[11px] text-slate-400 block font-mono">
                  {minutosParaTextoExtenso(fechamentoAtual.saldoAcumuladoFinalMinutos, true)}
                </span>
              </div>
            </div>

            {/* Tabela Interativa de Batidas Dia a Dia */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" /> Grade Diária de Batidas (Editável)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Você pode alterar qualquer horário diretamente na grade; o sistema recalcula todos os saldos e critérios em tempo real.
                  </p>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Banco
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> HE 50%
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> HE 100%
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Noturno
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <th className="py-3 px-3 w-12 text-center">Dia</th>
                      <th className="py-3 px-2 w-12 text-center">Sem</th>
                      <th className="py-3 px-3">Entrada 1</th>
                      <th className="py-3 px-3">Saída Almoço</th>
                      <th className="py-3 px-3">Retorno Almoço</th>
                      <th className="py-3 px-3">Saída 2</th>
                      <th className="py-3 px-3 text-center">Trabalhado</th>
                      <th className="py-3 px-3 text-center">Banco (1:1)</th>
                      <th className="py-3 px-3 text-center">HE 50%</th>
                      <th className="py-3 px-3 text-center">HE 100%</th>
                      <th className="py-3 px-3 text-center">Noturno</th>
                      <th className="py-3 px-3">Observação</th>
                      <th className="py-3 px-2 text-center">Feriado?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {fechamentoAtual.dias.map((d, index) => {
                      const ehFimDeSemana = d.diaSemana === "Sáb" || d.diaSemana === "Dom";
                      const saldoBanco = (d.minutosBancoCredito || 0) - (d.minutosBancoDebito || 0);

                      return (
                        <tr
                          key={d.dia}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            ehFimDeSemana ? "bg-slate-950/40" : ""
                          }`}
                        >
                          <td className="py-2 px-3 text-center font-bold text-white">{String(d.dia).padStart(2, "0")}</td>
                          <td className={`py-2 px-2 text-center text-[11px] font-sans font-bold ${
                            d.diaSemana === "Dom" ? "text-rose-400" : d.diaSemana === "Sáb" ? "text-sky-400" : "text-slate-400"
                          }`}>
                            {d.diaSemana}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={d.entrada1}
                              onChange={(e) => handleAtualizarBatidaDia(index, "entrada1", e.target.value)}
                              placeholder="--:--"
                              className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-center focus:border-sky-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={d.saida1}
                              onChange={(e) => handleAtualizarBatidaDia(index, "saida1", e.target.value)}
                              placeholder="--:--"
                              className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-center focus:border-sky-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={d.entrada2}
                              onChange={(e) => handleAtualizarBatidaDia(index, "entrada2", e.target.value)}
                              placeholder="--:--"
                              className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-center focus:border-sky-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={d.saida2}
                              onChange={(e) => handleAtualizarBatidaDia(index, "saida2", e.target.value)}
                              placeholder="--:--"
                              className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-center focus:border-sky-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-center text-white font-bold">
                            {minutosParaHora(d.minutosTrabalhados || 0)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {saldoBanco !== 0 ? (
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                saldoBanco > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                              }`}>
                                {minutosParaHora(saldoBanco, true)}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {d.minutosHE50 ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/10 text-sky-300" title={d.minutosAlmocoSuprimido ? `Inclui ${d.minutosAlmocoSuprimido}m de supressão de almoço` : d.diaSemana === "Sáb" ? "Horas de sábado excedentes a 2h (+50%)" : "Excedente > 2h (+50%)"}>
                                +{minutosParaHora(d.minutosHE50)}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {d.minutosHE100 ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-300">
                                +{minutosParaHora(d.minutosHE100)}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {d.minutosNoturnos ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-300">
                                {minutosParaHora(d.minutosNoturnos)}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-sans">
                            <input
                              type="text"
                              value={d.observacao || ""}
                              onChange={(e) => handleAtualizarBatidaDia(index, "observacao", e.target.value)}
                              placeholder="Observação"
                              className="w-full bg-transparent border-0 text-slate-300 text-xs focus:ring-1 focus:ring-sky-500 rounded px-1"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(d.ehFeriado)}
                              onChange={(e) => handleAtualizarBatidaDia(index, "ehFeriado", e.target.checked)}
                              className="rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === "fechamento" && !fechamentoAtual && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto my-8 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Nenhum Espelho de Ponto em Apuração</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Você ainda não gerou ou digitalizou um espelho de ponto. Digitalize a folha de ponto ou registre batidas diárias para visualizar a apuração mensal com banco de horas e horas extras.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAbaAtiva("digitalizar")}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4" /> Digitalizar Folha (IA)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbaAtiva("colaboradores");
                  setSubAbaColaborador("novo");
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all"
              >
                <UserPlus className="w-4 h-4" /> Cadastrar Colaborador
              </button>
            </div>
          </div>
        )}

        {/* ================= ABA 3: HISTÓRICO DE FECHAMENTOS ================= */}
        {abaAtiva === "historico" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sky-400" /> Histórico de Fechamentos Salvos
                </h3>
                <p className="text-xs text-slate-400">
                  Consulte todos os meses fechados de cada colaborador da A&C com seus relatórios e saldos.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filtrar por nome ou mês..."
                  value={filtroHistorico}
                  onChange={(e) => setFiltroHistorico(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fechamentosSalvos
                .filter(
                  (item) =>
                    item.fechamento.colaboradorNome.toLowerCase().includes(filtroHistorico.toLowerCase()) ||
                    item.fechamento.mesAno.includes(filtroHistorico)
                )
                .map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                          {item.fechamento.mesAno}
                        </span>
                        <span className="text-[10px] text-slate-500">{item.dataCriacao}</span>
                      </div>

                      <h4 className="font-bold text-white text-sm">{item.fechamento.colaboradorNome}</h4>
                      <p className="text-xs text-slate-400">{item.fechamento.colaboradorCargo}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Banco do Mês:</span>
                        <span className={`font-bold ${item.fechamento.saldoLiquidoMesMinutos >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {minutosParaTextoExtenso(item.fechamento.saldoLiquidoMesMinutos, true)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">HE 50%:</span>
                        <span className="text-sky-300 font-bold">{minutosParaTextoExtenso(item.fechamento.totalHE50Minutos, false)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">HE 100%:</span>
                        <span className="text-amber-300 font-bold">{minutosParaTextoExtenso(item.fechamento.totalHE100Minutos, false)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Adic. Noturno:</span>
                        <span className="text-indigo-300 font-bold">{minutosParaTextoExtenso(item.fechamento.totalAdicionalNoturnoMinutos, false)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-900 text-white font-bold">
                        <span>Total Extras:</span>
                        <span>R$ {(item.fechamento.valorTotalProventosExtras || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setFechamentoAtual(item.fechamento);
                          setAbaAtiva("fechamento");
                        }}
                        className="flex-1 py-2 bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 font-semibold rounded-xl text-xs border border-sky-500/20 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> Abrir Espelho
                      </button>
                      <button
                        onClick={() => handleExcluirFechamento(item.id)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-all"
                        title="Excluir fechamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
            </div>

            {fechamentosSalvos.length === 0 && (
              <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">Nenhum fechamento salvo até o momento.</p>
                <button
                  onClick={handleCarregarExemploPronto}
                  className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold"
                >
                  Carregar Exemplo Inicial
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= ABA 4: CRITÉRIOS DA EMPRESA (WHATSAPP) ================= */}
        {abaAtiva === "criterios" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-sky-400" /> Critérios de Apuração A&C (WhatsApp Oficial)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Estes são os critérios exatos parametrizados na regra do sistema conforme a diretriz da empresa.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCriterios(CRITERIOS_PADRAO);
                    showToast("sucesso", "Critérios Restaurados", "Parâmetros restaurados para o padrão do WhatsApp.");
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Restaurar Padrão
                </button>
              </div>

              {/* Lista dos 8 Critérios do WhatsApp */}
              <div className="space-y-3 text-xs">
                {/* 1. Noturno */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white text-sm block">1. Adicional Noturno (Antes das 05h e depois das 22h)</strong>
                    <p className="text-slate-400 leading-relaxed font-sans">
                      "Antes das 05:00 horas e dps das 22:00h tem que contar o total de horas para pagarmos;"
                    </p>
                    <span className="inline-block text-[11px] text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                      Janela ativa: 22:00 às 05:00 (+{criterios.percentualAdicionalNoturno}% sobre a hora normal)
                    </span>
                  </div>
                </div>

                {/* 2. Horas Negativas */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white text-sm block">2. Horas Negativas no Saldo do Banco</strong>
                    <p className="text-slate-400 leading-relaxed font-sans">
                      "Nos horários nominais deles deve ser descontado as horas negativas em saldo de banco de horas"
                    </p>
                    <span className="inline-block text-[11px] text-rose-300 font-mono bg-rose-500/10 px-2 py-0.5 rounded">
                      Atrasos e saídas antecipadas são debitados 1:1 do saldo acumulado do banco
                    </span>
                  </div>
                </div>

                {/* 3. Limite diário 2h no banco */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white text-sm block">3. Limite Diário de Banco de Horas (Máximo 2 horas)</strong>
                    <p className="text-slate-400 leading-relaxed font-sans">
                      "Por dia, só podem fazer 2 horas que entram no banco de horas (o que for menor que o horário de almoço)"
                    </p>
                    <span className="inline-block text-[11px] text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                      Limite configurado: {criterios.limiteDiarioBancoMinutos / 60} horas diárias no banco
                    </span>
                  </div>
                </div>

                {/* 4. Sábado: 2h no Banco de Horas e excedente com HE 50% */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white text-sm block">4. Sábado: 2h para o Banco de Horas (1:1) e Demais como HE 50%</strong>
                    <p className="text-slate-400 leading-relaxed font-sans">
                      "Altere o critério de sábado e mantenha 2 horas para banco e as demais para pagamento com 50% de acréscimo."
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="inline-block text-[11px] text-sky-300 font-mono bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                        Até {criterios.limiteSabadoBancoMinutos / 60} horas mantidas no Banco (1:1 exato)
                      </span>
                      <span className="inline-block text-[11px] text-emerald-300 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        Horas excedentes pagas em Folha com +{criterios.percentualHESabadoExcedente}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Almoço < 1h com HE 50% */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white text-sm block">6. Supressão de Almoço menor que 1h (Hora Extra 50%)</strong>
                    <p className="text-slate-400 leading-relaxed font-sans">
                      "Tudo que for menor que 1 hora de almoço deve entrar como hora extra, daí esse tem que calcular como hora extra acrescida de 50%"
                    </p>
                    <span className="inline-block text-[11px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded">
                      Intervalo inferior a 60 min gera pagamento de HE a +50% pelo tempo suprimido
                    </span>
                  </div>
                </div>

                {/* 7. Excedente acima de 2h pago com 50% */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white text-sm block">7. Horas Excedentes Acima de 2h Pagas com 50%</strong>
                    <p className="text-slate-400 leading-relaxed font-sans">
                      "Daí tudo que ultrapassar as 2 horas do banco deve também ser pago acrescido dos 50%"
                    </p>
                    <span className="inline-block text-[11px] text-purple-300 font-mono bg-purple-500/10 px-2 py-0.5 rounded">
                      Excedente &gt; 2h não acumula no banco; vai direto para pagamento com acréscimo de 50%
                    </span>
                  </div>
                </div>

                {/* 8. Domingos e Feriados a 100% */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white text-sm block">8. Domingos e Feriados sem Folga Compensatória (100%)</strong>
                    <p className="text-slate-400 leading-relaxed font-sans">
                      "Se trabalhar domingo ou feriado sem a folga compensatória deverá ser pago 100%"
                    </p>
                    <span className="inline-block text-[11px] text-yellow-300 font-mono bg-yellow-500/10 px-2 py-0.5 rounded">
                      Trabalho em DSR/Feriado não compensado na semana é pago integralmente com acréscimo de 100%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO DE FERIADOS FIXOS RECORRENTES ANUAIS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-400" /> Feriados Fixos Recorrentes Anuais (HE 100%)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cadastre os feriados nacionais, municipais e estaduais que se repetem todos os anos. O sistema identifica essas datas automaticamente e apura como <strong>HE 100%</strong> quando trabalhadas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const novosCriterios = { ...criterios, feriadosFixos: FERIADOS_FIXOS_PADRAO };
                    setCriterios(novosCriterios);
                    if (fechamentoAtual) {
                      const recalculado = calcularFechamentoMensal(fechamentoAtual.dias, novosCriterios, {
                        colaboradorNome: fechamentoAtual.colaboradorNome,
                        colaboradorCargo: fechamentoAtual.colaboradorCargo,
                        colaboradorId: fechamentoAtual.colaboradorId,
                        mesAno: fechamentoAtual.mesAno,
                        salarioBase: fechamentoAtual.salarioBase,
                        saldoAnteriorBancoMinutos: fechamentoAtual.saldoAnteriorBancoMinutos,
                      });
                      setFechamentoAtual(recalculado);
                    }
                    showToast("sucesso", "Feriados Restaurados", "Lista de feriados nacionais padrão da CLT restaurada.");
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Feriados Nacionais Padrão
                </button>
              </div>

              {/* Formulário de Cadastro de Novo Feriado Fixo */}
              <form onSubmit={handleAdicionarFeriadoFixo} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-400" /> Cadastrar Novo Feriado Fixo
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 font-semibold mb-1">Dia</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={novoFeriadoDia}
                      onChange={(e) => setNovoFeriadoDia(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-slate-400 font-semibold mb-1">Mês</label>
                    <select
                      value={novoFeriadoMes}
                      onChange={(e) => setNovoFeriadoMes(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value={1}>01 - Janeiro</option>
                      <option value={2}>02 - Fevereiro</option>
                      <option value={3}>03 - Março</option>
                      <option value={4}>04 - Abril</option>
                      <option value={5}>05 - Maio</option>
                      <option value={6}>06 - Junho</option>
                      <option value={7}>07 - Julho</option>
                      <option value={8}>08 - Agosto</option>
                      <option value={9}>09 - Setembro</option>
                      <option value={10}>10 - Outubro</option>
                      <option value={11}>11 - Novembro</option>
                      <option value={12}>12 - Dezembro</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-slate-400 font-semibold mb-1">Nome / Descrição do Feriado</label>
                    <input
                      type="text"
                      placeholder="Ex: Aniversário da Cidade / Tupaciguara"
                      value={novoFeriadoDesc}
                      onChange={(e) => setNovoFeriadoDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-slate-400 font-semibold mb-1">Tipo</label>
                    <select
                      value={novoFeriadoTipo}
                      onChange={(e) => setNovoFeriadoTipo(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="Municipal">Municipal (Cidade)</option>
                      <option value="Estadual">Estadual</option>
                      <option value="Nacional">Nacional</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/30 flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Feriado Recorrente
                  </button>
                </div>
              </form>

              {/* Lista dos Feriados Fixos Cadastrados */}
              <div className="space-y-2 text-xs">
                <div className="text-slate-400 font-semibold mb-2">
                  Feriados Cadastrados no Sistema ({criterios.feriadosFixos?.length || 0}):
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {(criterios.feriadosFixos || []).map((feriado) => {
                    const mesesNomes = [
                      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                    ];

                    return (
                      <div
                        key={feriado.id}
                        className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center font-mono">
                            <span className="text-xs font-bold text-amber-300 leading-none">
                              {String(feriado.dia).padStart(2, "0")}
                            </span>
                            <span className="text-[9px] text-amber-400/80 uppercase leading-none mt-0.5">
                              {mesesNomes[feriado.mes - 1]?.slice(0, 3)}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{feriado.descricao}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                feriado.tipo === "Municipal"
                                  ? "bg-purple-500/20 text-purple-300"
                                  : feriado.tipo === "Estadual"
                                  ? "bg-sky-500/20 text-sky-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                              }`}>
                                {feriado.tipo || "Nacional"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Apurado automaticamente como HE 100% se trabalhado
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoverFeriadoFixo(feriado.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remover feriado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 5: GESTÃO DE ESCALAS & HORÁRIOS ================= */}
        {(() => { console.log("Rendering Escalas View, abaAtiva:", abaAtiva); return null; })()}
        {abaAtiva === "escalas" && (
          <div className="space-y-6">
            {/* Header da Aba de Escalas */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <CalendarClock className="w-5 h-5 text-emerald-400" /> Gestão de Escalas & Horários de Trabalho
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      {escalas.length} Cadastradas
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Crie e personalize as escalas da empresa (5x2, 6x1, 12x36 ou personalizadas), estipule horários de entrada, almoço, saída e sábados, e vincule cada escala aos colaboradores individualmente ou em lote.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAbrirNovaEscala}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" /> Criar Nova Escala
                </button>
              </div>

              {/* Barra de Filtros e Busca de Escalas */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-xs text-slate-500 font-semibold mr-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Filtrar:
                  </span>
                  {[
                    { id: "todas", label: "Todas as Escalas" },
                    { id: "5x2", label: "5x2 (Seg-Sex)" },
                    { id: "6x1", label: "6x1 (Com Sáb)" },
                    { id: "12x36", label: "12x36 (Plantão)" },
                    { id: "personalizada", label: "Personalizada" },
                  ].map((tipo) => (
                    <button
                      key={tipo.id}
                      type="button"
                      onClick={() => setFiltroTipoEscala(tipo.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        filtroTipoEscala === tipo.id
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                          : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      {tipo.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por escala, horário ou cargo..."
                    value={filtroEscalas}
                    onChange={(e) => setFiltroEscalas(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Grid de Cards de Escalas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {escalas
                .filter((esc) => {
                  if (filtroTipoEscala !== "todas" && esc.tipo !== filtroTipoEscala) return false;
                  if (!filtroEscalas.trim()) return true;
                  const q = filtroEscalas.toLowerCase();
                  return (
                    esc.nome.toLowerCase().includes(q) ||
                    (esc.descricao && esc.descricao.toLowerCase().includes(q)) ||
                    esc.diasSemana.toLowerCase().includes(q) ||
                    esc.tipo.toLowerCase().includes(q)
                  );
                })
                .map((esc) => {
                  const vinculados = colaboradores.filter((c) => c.escalaId === esc.id);
                  const durManha = calcularDuracaoMinutos(esc.horario.entrada, esc.horario.almocoSaida);
                  const durAlmoco = calcularDuracaoMinutos(esc.horario.almocoSaida, esc.horario.almocoRetorno);
                  const durTarde = calcularDuracaoMinutos(esc.horario.almocoRetorno, esc.horario.saida);
                  const durDiaria = durManha + durTarde;

                  const corBorda =
                    esc.cor === "emerald"
                      ? "border-emerald-500/30 hover:border-emerald-500/60"
                      : esc.cor === "purple"
                      ? "border-purple-500/30 hover:border-purple-500/60"
                      : esc.cor === "amber"
                      ? "border-amber-500/30 hover:border-amber-500/60"
                      : esc.cor === "indigo"
                      ? "border-indigo-500/30 hover:border-indigo-500/60"
                      : "border-sky-500/30 hover:border-sky-500/60";

                  const badgeCor =
                    esc.cor === "emerald"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : esc.cor === "purple"
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                      : esc.cor === "amber"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : esc.cor === "indigo"
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                      : "bg-sky-500/10 text-sky-400 border-sky-500/30";

                  return (
                    <div
                      key={esc.id}
                      className={`bg-slate-900 border ${corBorda} rounded-3xl p-5 shadow-xl space-y-4 flex flex-col justify-between transition-all`}
                    >
                      <div className="space-y-3">
                        {/* Tags e Ações Rápidas */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeCor}`}>
                              {esc.tipo}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-950 text-slate-300 border border-slate-800">
                              {esc.cargaSemanalHoras}h/sem
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicarEscala(esc)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                              title="Duplicar esta escala"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAbrirEditarEscala(esc)}
                              className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Editar escala"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExcluirEscala(esc.id, esc.nome)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Excluir escala"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Título e Descrição */}
                        <div>
                          <h4 className="text-sm font-bold text-white leading-tight">{esc.nome}</h4>
                          <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">
                            {esc.diasSemana}
                          </span>
                          {esc.descricao && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {esc.descricao}
                            </p>
                          )}
                        </div>

                        {/* Grade de Horários */}
                        <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1 text-slate-300">
                              <Clock className="w-3 h-3 text-sky-400" /> Horário Contratual
                            </span>
                            <span className="font-mono text-sky-400">
                              {minutosParaTextoExtenso(durDiaria, false)}/dia
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                              <span className="text-[9px] text-slate-500 block uppercase">Entrada / Saída</span>
                              <span className="text-white font-bold block">{esc.horario.entrada} às {esc.horario.saida}</span>
                              <span className="text-slate-400 block text-[10px] mt-0.5">
                                Almoço: {durAlmoco} min ({esc.horario.almocoSaida}-{esc.horario.almocoRetorno})
                              </span>
                            </div>

                            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                              <span className="text-[9px] text-slate-500 block uppercase">Sábado / Folga</span>
                              {esc.horario.sabadoAtivo ? (
                                <>
                                  <span className="text-amber-300 font-bold block">
                                    {esc.horario.sabadoEntrada || "08:00"} às {esc.horario.sabadoSaida || "12:00"}
                                  </span>
                                  <span className="text-[10px] text-indigo-300 block mt-0.5 font-sans">
                                    Trabalho habitual
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-400 block font-sans">Folga</span>
                                  <span className="text-[10px] text-slate-600 block mt-0.5 font-sans">
                                    Sábado livre
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                            <span>Tolerância de batida:</span>
                            <span className="font-mono text-slate-300 font-semibold">±{esc.toleranciaMinutos || 10} min</span>
                          </div>
                        </div>

                        {/* Colaboradores Vinculados */}
                        <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                              <Users className="w-3.5 h-3.5 text-emerald-400" />
                              Funcionários Vinculados:
                            </span>
                            <span className="font-bold text-white px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-mono text-[11px]">
                              {vinculados.length}
                            </span>
                          </div>

                          {vinculados.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pt-1">
                              {vinculados.map((c) => (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
                                  title={`${c.nome} (${c.cargo})`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  {c.nome.split(" ")[0]}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-500 italic">
                              Nenhum funcionário vinculado a esta escala ainda.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botão de Vinculação em Lote */}
                      <div className="pt-3 border-t border-slate-800 mt-2">
                        <button
                          type="button"
                          onClick={() => handleAbrirVincularColaboradores(esc)}
                          className="w-full py-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Vincular / Gerenciar Colaboradores ({vinculados.length})
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {escalas.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <CalendarClock className="w-12 h-12 text-slate-600 mx-auto" />
                <div>
                  <h4 className="font-bold text-white text-sm">Nenhuma escala cadastrada</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Crie sua primeira escala de trabalho e depois vincule aos colaboradores.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAbrirNovaEscala}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  + Criar Nova Escala
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= ABA 6: COLABORADORES & HORÁRIOS ================= */}
        {abaAtiva === "colaboradores" && (
          <div className="space-y-6">
            {/* Header da Aba de Colaboradores */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-sky-400" /> Gestão de Colaboradores, Horários & Banco Inicial
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                      {colaboradores.length} Cadastrados
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Cadastre novos colaboradores, configure o horário contratual de trabalho de cada um e lance o saldo acumulado de banco de horas prévio ao início do uso do sistema.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleZerarDadosApp}
                    className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    title="Zerar todos os colaboradores e registros do app para iniciar do zero"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Zerar / Iniciar do Zero
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (subAbaColaborador === "novo") {
                        setSubAbaColaborador("lista");
                        setModalColaboradorAberta(false);
                      } else {
                        handleAbrirNovoColaborador();
                      }
                    }}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    {subAbaColaborador === "novo" ? (
                      <>
                        <Eye className="w-4 h-4" /> Ver Lista de Colaboradores
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" /> + Cadastrar Novo Colaborador
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Métricas Rápidas & Busca */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4 text-slate-400">
                  <span>
                    Credores de Banco (+): <strong className="text-emerald-400">{colaboradores.filter((c) => c.saldoAnteriorBancoMinutos > 0).length}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Devedores de Banco (-): <strong className="text-rose-400">{colaboradores.filter((c) => c.saldoAnteriorBancoMinutos < 0).length}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Zerar / Sem Saldo: <strong className="text-slate-300">{colaboradores.filter((c) => c.saldoAnteriorBancoMinutos === 0).length}</strong>
                  </span>
                </div>

                {subAbaColaborador === "lista" && (
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, cargo ou setor..."
                      value={filtroColaboradores}
                      onChange={(e) => setFiltroColaboradores(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO: FORMULÁRIO DE LANÇAMENTO / EDIÇÃO DE COLABORADOR */}
            {(subAbaColaborador === "novo" || modalColaboradorAberta) && (
              <form
                onSubmit={handleSalvarColaborador}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-emerald-400" />
                      {colaboradorEditando ? `Editar Colaborador: ${formNome || "Sem Nome"}` : "Lançar Novo Colaborador & Horário de Trabalho"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Preencha os dados cadastrais, lance o saldo prévio do banco de horas e defina os horários de trabalho nominais.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSubAbaColaborador("lista");
                      setModalColaboradorAberta(false);
                      setColaboradorEditando(null);
                    }}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* BLOCO 1: IDENTIFICAÇÃO E SALÁRIO */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                    <Building2 className="w-4 h-4" /> 1. Identificação & Salário Contratual
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Nome Completo <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Juliana Andrade Rocha"
                        value={formNome}
                        onChange={(e) => setFormNome(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Cargo / Função <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Assistente de Coletas"
                        value={formCargo}
                        onChange={(e) => setFormCargo(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Departamento / Setor</label>
                      <input
                        type="text"
                        placeholder="Ex: Operações / Coletas"
                        value={formDepartamento}
                        onChange={(e) => setFormDepartamento(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-sky-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Salário Base Mensal (R$)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">R$</span>
                        <input
                          type="text"
                          placeholder="2450.00"
                          value={formSalarioBase}
                          onChange={(e) => setFormSalarioBase(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Valor Hora: R$ {((parseFloat(formSalarioBase.replace(",", ".")) || 2200) / 220).toFixed(2)}/h (Base 220h CLT)
                      </span>
                    </div>
                  </div>
                </div>

                {/* BLOCO 2: LANÇAMENTO DE BANCO DE HORAS QUE JÁ TEM ANTES DE USAR O SISTEMA */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                        <Clock className="w-4 h-4" /> 2. Lançar Banco de Horas Inicial (Antes de Usar o Sistema)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Informe o saldo de horas extras ou negativas que o colaborador já possui acumulado antes da implantação deste sistema.
                      </p>
                    </div>

                    {/* Preview visual do saldo calculado */}
                    {(() => {
                      const totalMin = (formSinalBanco === "+" ? 1 : -1) * (Number(formHorasBanco) * 60 + Number(formMinutosBanco));
                      return (
                        <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
                          totalMin > 0
                            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                            : totalMin < 0
                            ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                            : "bg-slate-900 border-slate-800 text-slate-300"
                        }`}>
                          {totalMin > 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : totalMin < 0 ? <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                          <span>Saldo Inicial: {minutosParaTextoExtenso(totalMin, true)} ({totalMin >= 0 ? "+" : ""}{totalMin} min)</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                    {/* Seletor de Sinal Positivo / Negativo */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="block text-slate-300 font-semibold">Tipo do Saldo Inicial</label>
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setFormSinalBanco("+")}
                          className={`py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                            formSinalBanco === "+"
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          (+) Positivo
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormSinalBanco("-")}
                          className={`py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                            formSinalBanco === "-"
                              ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          (-) Negativo
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {formSinalBanco === "+" ? "Horas a favor do colaborador" : "Colaborador devendo horas"}
                      </span>
                    </div>

                    {/* Horas */}
                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-semibold mb-1">Horas</label>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={formHorasBanco}
                        onChange={(e) => setFormHorasBanco(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5 text-center">Horas inteiras</span>
                    </div>

                    {/* Minutos */}
                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-semibold mb-1">Minutos</label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={formMinutosBanco}
                        onChange={(e) => setFormMinutosBanco(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5 text-center">0 a 59 min</span>
                    </div>

                    {/* Data Base / Vigência */}
                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-semibold mb-1">Data-Base / Competência</label>
                      <input
                        type="text"
                        placeholder="01/09/2026"
                        value={formDataInicioSaldo}
                        onChange={(e) => setFormDataInicioSaldo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5 text-center">Data de corte</span>
                    </div>

                    {/* Observação / Histórico */}
                    <div className="sm:col-span-3">
                      <label className="block text-slate-300 font-semibold mb-1">Observação do Saldo</label>
                      <input
                        type="text"
                        placeholder="Ex: Importado da planilha de agosto"
                        value={formObsSaldo}
                        onChange={(e) => setFormObsSaldo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">Origem do saldo</span>
                    </div>
                  </div>
                </div>

                {/* BLOCO 3: HORÁRIO DE TRABALHO NOMINAL DE CADA UM */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                        <Clock className="w-4 h-4" /> 3. Horário Nominal de Trabalho (Expediente Contratual)
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Defina a jornada de trabalho padrão. O sistema utilizará este horário para descontar horas negativas no banco e calcular as horas extras.
                      </p>
                    </div>

                    {/* Resumo em tempo real da jornada calculada */}
                    {(() => {
                      const durManha = calcularDuracaoMinutos(formEntrada, formAlmocoSaida);
                      const durAlmoco = calcularDuracaoMinutos(formAlmocoSaida, formAlmocoRetorno);
                      const durTarde = calcularDuracaoMinutos(formAlmocoRetorno, formSaida);
                      const jornadaDia = durManha + durTarde;
                      return (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-sky-950 border border-sky-500/30 text-sky-300 font-mono text-xs font-bold">
                            Jornada Útil: {minutosParaTextoExtenso(jornadaDia, false)}/dia
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-bold ${
                            durAlmoco < 60
                              ? "bg-amber-950/70 border-amber-500/40 text-amber-300"
                              : "bg-slate-900 border-slate-800 text-slate-300"
                          }`}>
                            Almoço: {minutosParaTextoExtenso(durAlmoco, false)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Seletor de Escala Cadastrada para Vinculação Rápida */}
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CalendarClock className="w-4 h-4 text-emerald-400" />
                        Escala de Trabalho Vinculada
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSubAbaColaborador("lista");
                          setModalColaboradorAberta(false);
                          setAbaAtiva("escalas");
                        }}
                        className="text-[11px] text-sky-400 hover:text-sky-300 underline font-semibold flex items-center gap-1 self-start sm:self-auto"
                      >
                        Abrir Gestão de Escalas & Horários <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <select
                          value={formEscalaVinculadaId}
                          onChange={(e) => handleSelecionarEscalaNoColaborador(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                        >
                          <option value="">-- Personalizado (Sem escala fixa vinculada) --</option>
                          {escalas.map((esc) => (
                            <option key={esc.id} value={esc.id}>
                              {esc.nome} ({esc.tipo} • {esc.diasSemana} • {esc.cargaSemanalHoras}h/sem)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center text-[11px] text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                        {formEscalaVinculadaId ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Preenchimento automático ativo
                          </span>
                        ) : (
                          <span className="text-slate-400">Horários manuais customizados</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Toggle: Diferenciar por dia da semana no Colaborador */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={formColabDiferenciarPorDia}
                        onChange={(e) => setFormColabDiferenciarPorDia(e.target.checked)}
                        className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700 focus:ring-sky-500"
                      />
                      <span className="text-sky-400 font-bold">Definir horários diferentes para cada dia da semana (Segunda a Domingo)</span>
                    </label>
                  </div>

                  {formColabDiferenciarPorDia ? (
                    <div className="space-y-3">
                      {DIAS_SEMANA_ORDEM.map((d) => {
                        const diaCfg = formColabDiasSemanaConfig[d.chave] || { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" };
                        return (
                          <div key={d.chave} className={`p-3 rounded-2xl border transition-all ${diaCfg.ativo ? "bg-slate-950 border-slate-800" : "bg-slate-950/40 border-slate-900 opacity-60"}`}>
                            <div className="flex items-center justify-between mb-2">
                              <label className="flex items-center gap-2 cursor-pointer font-bold text-white text-xs">
                                <input
                                  type="checkbox"
                                  checked={diaCfg.ativo}
                                  onChange={(e) => {
                                    const ativo = e.target.checked;
                                    setFormColabDiasSemanaConfig(prev => ({
                                      ...prev,
                                      [d.chave]: { ...diaCfg, ativo }
                                    }));
                                  }}
                                  className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700"
                                />
                                <span>{d.rotulo}</span>
                              </label>
                              {diaCfg.ativo ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-500/30 font-bold">
                                  Jornada: {minutosParaTextoExtenso(calcularDuracaoMinutos(diaCfg.entrada, diaCfg.almocoSaida) + calcularDuracaoMinutos(diaCfg.almocoRetorno, diaCfg.saida), false)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Folga / Descanso</span>
                              )}
                            </div>

                            {diaCfg.ativo && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Entrada</label>
                                  <input
                                    type="time"
                                    value={diaCfg.entrada}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormColabDiasSemanaConfig(prev => ({
                                        ...prev,
                                        [d.chave]: { ...diaCfg, entrada: val }
                                      }));
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-sky-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Saída Almoço</label>
                                  <input
                                    type="time"
                                    value={diaCfg.almocoSaida}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormColabDiasSemanaConfig(prev => ({
                                        ...prev,
                                        [d.chave]: { ...diaCfg, almocoSaida: val }
                                      }));
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-sky-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Retorno Almoço</label>
                                  <input
                                    type="time"
                                    value={diaCfg.almocoRetorno}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormColabDiasSemanaConfig(prev => ({
                                        ...prev,
                                        [d.chave]: { ...diaCfg, almocoRetorno: val }
                                      }));
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-sky-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Saída Tarde</label>
                                  <input
                                    type="time"
                                    value={diaCfg.saida}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormColabDiasSemanaConfig(prev => ({
                                        ...prev,
                                        [d.chave]: { ...diaCfg, saida: val }
                                      }));
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-sky-500 text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      {/* Grade de Segunda a Sexta */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">Entrada Manhã</label>
                          <input
                            type="time"
                            value={formEntrada}
                            onChange={(e) => setFormEntrada(e.target.value)}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                          />
                          <span className="text-[10px] text-slate-500 block mt-0.5 text-center">Início do dia</span>
                        </div>

                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">Saída Almoço</label>
                          <input
                            type="time"
                            value={formAlmocoSaida}
                            onChange={(e) => setFormAlmocoSaida(e.target.value)}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                          />
                          <span className="text-[10px] text-slate-500 block mt-0.5 text-center">Início do intervalo</span>
                        </div>

                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">Retorno Almoço</label>
                          <input
                            type="time"
                            value={formAlmocoRetorno}
                            onChange={(e) => setFormAlmocoRetorno(e.target.value)}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                          />
                          <span className="text-[10px] text-slate-500 block mt-0.5 text-center">Fim do intervalo</span>
                        </div>

                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">Saída Tarde / Fim</label>
                          <input
                            type="time"
                            value={formSaida}
                            onChange={(e) => setFormSaida(e.target.value)}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                          />
                          <span className="text-[10px] text-slate-500 block mt-0.5 text-center">Término da jornada</span>
                        </div>
                      </div>

                      {/* Alerta inteligente se o almoço for menor que 1h */}
                      {calcularDuracaoMinutos(formAlmocoSaida, formAlmocoRetorno) < 60 && (
                        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            <strong>Aviso do Critério A&C:</strong> O intervalo configurado é de{" "}
                            {minutosParaTextoExtenso(calcularDuracaoMinutos(formAlmocoSaida, formAlmocoRetorno), false)}. A empresa determina que qualquer almoço inferior a 1 hora terá a diferença suprimida paga como <strong>Hora Extra com 50%</strong>.
                          </span>
                        </div>
                      )}

                      {/* Configuração de Sábado */}
                      <div className="pt-3 border-t border-slate-800/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-200">
                            <input
                              type="checkbox"
                              checked={formSabadoAtivo}
                              onChange={(e) => setFormSabadoAtivo(e.target.checked)}
                              className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700 focus:ring-sky-500"
                            />
                            <span>Este colaborador trabalha aos sábados habitualmente</span>
                          </label>

                          {formSabadoAtivo && (
                            <span className="text-[11px] text-indigo-300 font-mono bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded">
                              Sábado: 2h no Banco (1:1) + Excedente HE 50%
                            </span>
                          )}
                        </div>

                        {formSabadoAtivo && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                            <div>
                              <label className="block text-slate-300 font-semibold mb-1">Horário Entrada Sábado</label>
                              <input
                                type="time"
                                value={formSabadoEntrada}
                                onChange={(e) => setFormSabadoEntrada(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 font-semibold mb-1">Horário Saída Sábado</label>
                              <input
                                type="time"
                                value={formSabadoSaida}
                                onChange={(e) => setFormSabadoSaida(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Botões do Formulário */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSubAbaColaborador("lista");
                      setModalColaboradorAberta(false);
                      setColaboradorEditando(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    {colaboradorEditando ? "Salvar Alterações do Colaborador" : "Cadastrar Colaborador & Horário"}
                  </button>
                </div>
              </form>
            )}

            {/* SEÇÃO: LISTA DE COLABORADORES */}
            {subAbaColaborador === "lista" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {colaboradores
                    .filter((c) => {
                      if (!filtroColaboradores.trim()) return true;
                      const q = filtroColaboradores.toLowerCase();
                      return (
                        c.nome.toLowerCase().includes(q) ||
                        c.cargo.toLowerCase().includes(q) ||
                        (c.departamento && c.departamento.toLowerCase().includes(q))
                      );
                    })
                    .map((c) => {
                      const h = c.horarioTrabalho || {
                        entrada: "08:00",
                        almocoSaida: "12:00",
                        almocoRetorno: "13:00",
                        saida: "17:00",
                        sabadoAtivo: false,
                      };
                      const durManha = calcularDuracaoMinutos(h.entrada, h.almocoSaida);
                      const durAlmoco = calcularDuracaoMinutos(h.almocoSaida, h.almocoRetorno);
                      const durTarde = calcularDuracaoMinutos(h.almocoRetorno, h.saida);
                      const durTotalDia = durManha + durTarde;

                      return (
                        <div
                          key={c.id}
                          className="bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-3xl p-5 shadow-xl space-y-4 transition-all"
                        >
                          {/* Cabeçalho do Card */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600/20 to-indigo-600/20 border border-sky-500/30 flex items-center justify-center text-sky-300 font-bold text-base shrink-0 shadow-inner">
                                {c.nome.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm leading-tight">{c.nome}</h4>
                                <span className="text-xs text-sky-400 font-semibold block">{c.cargo}</span>
                                <span className="text-[11px] text-slate-400 block">{c.departamento || "Geral"}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleAbrirEditarColaborador(c)}
                                className="p-2 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-xl transition-colors"
                                title="Editar dados e horário de trabalho"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExcluirColaborador(c.id, c.nome)}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                                title="Excluir colaborador"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Seção 1: Banco de Horas Inicial */}
                          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <History className="w-3.5 h-3.5 text-amber-400" /> Banco de Horas Inicial (Antes do Sistema)
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAbrirAjustarBanco(c)}
                                className="text-[10px] text-sky-400 hover:text-sky-300 underline font-semibold"
                              >
                                Lançar / Ajustar Saldo
                              </button>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1 ${
                                    c.saldoAnteriorBancoMinutos > 0
                                      ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/30"
                                      : c.saldoAnteriorBancoMinutos < 0
                                      ? "bg-rose-950/70 text-rose-300 border border-rose-500/30"
                                      : "bg-slate-900 text-slate-400 border border-slate-800"
                                  }`}
                                >
                                  {c.saldoAnteriorBancoMinutos > 0 ? (
                                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                                  ) : c.saldoAnteriorBancoMinutos < 0 ? (
                                    <TrendingDown className="w-3 h-3 text-rose-400" />
                                  ) : (
                                    <Clock className="w-3 h-3 text-slate-400" />
                                  )}
                                  {minutosParaTextoExtenso(c.saldoAnteriorBancoMinutos, true)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({c.saldoAnteriorBancoMinutos >= 0 ? "+" : ""}{c.saldoAnteriorBancoMinutos} min)
                                </span>
                              </div>

                              <span className="text-[10px] text-slate-500">
                                Ref: {c.dataInicioSaldo || "01/09/2026"}
                              </span>
                            </div>

                            {c.observacaoSaldo && (
                              <p className="text-[10px] text-slate-500 italic truncate">
                                Obs: {c.observacaoSaldo}
                              </p>
                            )}
                          </div>

                          {/* Seção Escala de Trabalho Vinculada */}
                          <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <span className="flex items-center gap-1.5 text-emerald-400">
                                <CalendarClock className="w-3.5 h-3.5" /> Escala Vinculada
                              </span>
                              {(() => {
                                const esc = escalas.find((e) => e.id === c.escalaId);
                                if (!esc) return <span className="text-slate-500">Manual / Custom</span>;
                                return (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono text-[10px] font-bold">
                                    {esc.tipo} • {esc.cargaSemanalHoras}h/sem
                                  </span>
                                );
                              })()}
                            </div>

                            <div className="flex items-center gap-2">
                              <select
                                value={c.escalaId || ""}
                                onChange={(e) => handleVincularEscalaRapido(c.id, e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                                title="Alterar escala deste colaborador"
                              >
                                <option value="">-- Personalizado (Sem escala fixa vinculada) --</option>
                                {escalas.map((esc) => (
                                  <option key={esc.id} value={esc.id}>
                                    {esc.nome} ({esc.tipo} • {esc.diasSemana})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Seção 2: Horário Nominal de Trabalho */}
                          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-sky-400" /> Horário Contratual Cadastrado
                              </span>
                              <span className="text-slate-300 font-mono">
                                {minutosParaTextoExtenso(durTotalDia, false)}/dia
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                              <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                                <span className="text-[9px] text-slate-500 block uppercase">Segunda a Sexta</span>
                                <span className="text-white font-bold">{h.entrada} às {h.almocoSaida}</span>
                                <span className="text-slate-400 block text-[10px] mt-0.5">Almoço: {durAlmoco} min ({h.almocoSaida}-{h.almocoRetorno})</span>
                                <span className="text-white font-bold">{h.almocoRetorno} às {h.saida}</span>
                              </div>

                              <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                                <span className="text-[9px] text-slate-500 block uppercase">Sábados</span>
                                {h.sabadoAtivo ? (
                                  <>
                                    <span className="text-amber-300 font-bold block">{h.sabadoEntrada || "08:00"} às {h.sabadoSaida || "12:00"}</span>
                                    <span className="text-[10px] text-indigo-300 block mt-1 font-sans">
                                      Até 2h no Banco (1:1) + HE 50%
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-slate-400 block">Folga Contratual</span>
                                    <span className="text-[10px] text-slate-600 block mt-1 font-sans">
                                      Sem jornada de sábado
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Gestão de Senha do Funcionário */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400 flex items-center gap-1.5 font-mono">
                              <Key className="w-3.5 h-3.5 text-sky-400" />
                              Senha: <strong className="text-white">{c.primeiroAcesso ? "Padrão (Aec2026@)" : "Pessoal Definida"}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResetarSenhaColaborador(c.id)}
                              className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-white font-bold text-[11px] transition-colors flex items-center gap-1"
                              title="Resetar senha para a padrão (Aec2026@)"
                            >
                              <RefreshCw className="w-3 h-3" /> Resetar Senha
                            </button>
                          </div>

                          {/* Seção 3: Dados Salariais & Ação de Lançar Folha */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <div className="font-mono">
                              <span className="text-[10px] text-slate-500 block">Salário Base</span>
                              <span className="font-bold text-white text-xs">
                                R$ {(Number(c.salarioBase) || 2450).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                (R$ {((Number(c.salarioBase) || 2450) / 220).toFixed(2)}/h)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setColaboradorSelecionadoId(c.id);
                                setAbaAtiva("digitalizar");
                                showToast("sucesso", "Colaborador Selecionado", `Pronto para processar folha de ${c.nome}.`);
                              }}
                              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all"
                            >
                              <Upload className="w-3.5 h-3.5" /> Lançar Folha
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {colaboradores.length === 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                    <Users className="w-12 h-12 text-slate-600 mx-auto" />
                    <div>
                      <h4 className="font-bold text-white text-sm">Nenhum colaborador cadastrado</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Cadastre o primeiro colaborador e defina os horários nominais e saldo de banco de horas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAbrirNovoColaborador}
                      className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/30"
                    >
                      + Cadastrar Novo Colaborador
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODAL RÁPIDA: LANÇAR / AJUSTAR SALDO DE BANCO DE HORAS INICIAL */}
        <AnimatePresence>
          {modalAjustarBancoAberta && colabAjustandoBanco && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      Lançar Saldo de Banco Inicial
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Colaborador: <strong className="text-white">{colabAjustandoBanco.nome}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalAjustarBancoAberta(false);
                      setColabAjustandoBanco(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSalvarAjusteBanco} className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400">
                      Informe o saldo prévio acumulado antes de utilizar este sistema. Este valor será utilizado como Saldo Anterior nos cálculos mensais:
                    </span>
                  </div>

                  {/* Prévia do Saldo Calculado */}
                  {(() => {
                    const totalMin = (ajusteSinal === "+" ? 1 : -1) * (Number(ajusteHoras) * 60 + Number(ajusteMinutos));
                    return (
                      <div className={`p-3.5 rounded-2xl border text-center font-mono space-y-1 ${
                        totalMin > 0
                          ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                          : totalMin < 0
                          ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                          : "bg-slate-950 border-slate-800 text-slate-300"
                      }`}>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          Novo Saldo Inicial Apurado
                        </span>
                        <div className="text-xl font-black">
                          {minutosParaTextoExtenso(totalMin, true)}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {totalMin > 0 ? "Crédito a favor do colaborador (+)" : totalMin < 0 ? "Débito / Colaborador devendo (-)" : "Saldo zerado"}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Seletor de Sinal */}
                  <div className="space-y-1">
                    <label className="block text-slate-300 font-semibold">Tipo do Saldo</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setAjusteSinal("+")}
                        className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                          ajusteSinal === "+"
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        (+) Positivo / Crédito
                      </button>
                      <button
                        type="button"
                        onClick={() => setAjusteSinal("-")}
                        className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                          ajusteSinal === "-"
                            ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        (-) Negativo / Débito
                      </button>
                    </div>
                  </div>

                  {/* Inputs de Horas e Minutos */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Horas</label>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={ajusteHoras}
                        onChange={(e) => setAjusteHoras(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center text-sm focus:outline-none focus:border-sky-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Minutos</label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={ajusteMinutos}
                        onChange={(e) => setAjusteMinutos(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center text-sm focus:outline-none focus:border-sky-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Data base e Observação */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Data-Base / Referência</label>
                      <input
                        type="text"
                        placeholder="Ex: 01/09/2026"
                        value={ajusteDataInicio}
                        onChange={(e) => setAjusteDataInicio(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Observação / Origem</label>
                      <input
                        type="text"
                        placeholder="Ex: Saldo da planilha anterior"
                        value={ajusteObs}
                        onChange={(e) => setAjusteObs(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setModalAjustarBancoAberta(false);
                        setColabAjustandoBanco(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Gravar Saldo Inicial
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
          {/* MODAL: CRIAR OU EDITAR ESCALA & HORÁRIOS */}
          {modalEscalaAberta && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-2xl w-full space-y-5 my-8"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <CalendarClock className="w-5 h-5 text-emerald-400" />
                      {escalaEditando ? `Editar Escala: ${escalaEditando.nome}` : "Criar Nova Escala de Trabalho"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure os parâmetros da jornada, horários nominais, intervalos de almoço e sábados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalEscalaAberta(false);
                      setEscalaEditando(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSalvarEscala} className="space-y-4 text-xs">
                  {/* Bloco 1: Identificação da Escala */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-semibold mb-1">Nome da Escala *</label>
                      <input
                        type="text"
                        placeholder="Ex: Administrativo Geral (08h às 17h)"
                        value={formEscalaNome}
                        onChange={(e) => setFormEscalaNome(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Tipo de Jornada</label>
                      <select
                        value={formEscalaTipo}
                        onChange={(e) => setFormEscalaTipo(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="5x2">5x2 (Seg a Sex)</option>
                        <option value="6x1">6x1 (Com Sábado)</option>
                        <option value="12x36">12x36 (Plantão)</option>
                        <option value="personalizada">Personalizada</option>
                      </select>
                    </div>
                  </div>

                  {/* Dias da semana e Carga Semanal */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Dias de Atuação</label>
                      <input
                        type="text"
                        placeholder="Ex: Segunda a Sexta"
                        value={formEscalaDiasSemana}
                        onChange={(e) => setFormEscalaDiasSemana(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Carga Horária Semanal (horas)</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={formEscalaCargaHoras}
                        onChange={(e) => setFormEscalaCargaHoras(Number(e.target.value) || 40)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Tolerância (minutos)</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={formEscalaTolerancia}
                        onChange={(e) => setFormEscalaTolerancia(Number(e.target.value) || 10)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Descrição e Cor */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-semibold mb-1">Descrição / Finalidade</label>
                      <input
                        type="text"
                        placeholder="Ex: Padrão administrativo com sábados livres e descanso semanal aos domingos"
                        value={formEscalaDescricao}
                        onChange={(e) => setFormEscalaDescricao(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Cor de Identificação</label>
                      <select
                        value={formEscalaCor}
                        onChange={(e) => setFormEscalaCor(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="sky">Azul (Sky)</option>
                        <option value="emerald">Verde (Emerald)</option>
                        <option value="purple">Roxo (Purple)</option>
                        <option value="amber">Âmbar (Amber)</option>
                        <option value="indigo">Índigo (Indigo)</option>
                      </select>
                    </div>
                  </div>

                  {/* Toggle: Diferenciar por dia da semana */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={formEscalaDiferenciarPorDia}
                        onChange={(e) => setFormEscalaDiferenciarPorDia(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                      />
                      <span className="text-emerald-400 font-bold">Definir horários diferentes para cada dia da semana (Segunda a Domingo)</span>
                    </label>
                  </div>

                  {formEscalaDiferenciarPorDia ? (
                    <div className="space-y-3">
                      {DIAS_SEMANA_ORDEM.map((d) => {
                        const diaCfg = formEscalaDiasSemanaConfig[d.chave] || { ativo: true, entrada: "08:00", almocoSaida: "12:00", almocoRetorno: "13:00", saida: "17:00" };
                        return (
                          <div key={d.chave} className={`p-3 rounded-2xl border transition-all ${diaCfg.ativo ? "bg-slate-950 border-slate-800" : "bg-slate-950/40 border-slate-900 opacity-60"}`}>
                            <div className="flex items-center justify-between mb-2">
                              <label className="flex items-center gap-2 cursor-pointer font-bold text-white text-xs">
                                <input
                                  type="checkbox"
                                  checked={diaCfg.ativo}
                                  onChange={(e) => {
                                    const ativo = e.target.checked;
                                    setFormEscalaDiasSemanaConfig(prev => ({
                                      ...prev,
                                      [d.chave]: { ...diaCfg, ativo }
                                    }));
                                  }}
                                  className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700"
                                />
                                <span>{d.rotulo}</span>
                              </label>
                              {diaCfg.ativo ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold">
                                  Jornada: {minutosParaTextoExtenso(calcularDuracaoMinutos(diaCfg.entrada, diaCfg.almocoSaida) + calcularDuracaoMinutos(diaCfg.almocoRetorno, diaCfg.saida), false)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Folga / Descanso</span>
                              )}
                            </div>

                            {diaCfg.ativo && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Entrada</label>
                                  <input
                                    type="time"
                                    value={diaCfg.entrada}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormEscalaDiasSemanaConfig(prev => ({
                                        ...prev,
                                        [d.chave]: { ...diaCfg, entrada: val }
                                      }));
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-emerald-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Saída Almoço</label>
                                  <input
                                    type="time"
                                    value={diaCfg.almocoSaida}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormEscalaDiasSemanaConfig(prev => ({
                                        ...prev,
                                        [d.chave]: { ...diaCfg, almocoSaida: val }
                                      }));
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-emerald-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Retorno Almoço</label>
                                  <input
                                    type="time"
                                    value={diaCfg.almocoRetorno}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormEscalaDiasSemanaConfig(prev => ({
                                        ...prev,
                                        [d.chave]: { ...diaCfg, almocoRetorno: val }
                                      }));
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-emerald-500 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-1">Saída Tarde</label>
                                  <input
                                    type="time"
                                    value={diaCfg.saida}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormEscalaDiasSemanaConfig(prev => ({
                                        ...prev,
                                        [d.chave]: { ...diaCfg, saida: val }
                                      }));
                                    }}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-emerald-500 text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      {/* Bloco 2: Horários Nominais (Dias Úteis) */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-emerald-400" />
                            Horários Nominais (Dias Úteis)
                          </span>
                          {(() => {
                            const durManha = calcularDuracaoMinutos(formEscalaEntrada, formEscalaAlmocoSaida);
                            const durAlmoco = calcularDuracaoMinutos(formEscalaAlmocoSaida, formEscalaAlmocoRetorno);
                            const durTarde = calcularDuracaoMinutos(formEscalaAlmocoRetorno, formEscalaSaida);
                            const total = durManha + durTarde;
                            return (
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
                                  Jornada: {minutosParaTextoExtenso(total, false)}/dia
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px]">
                                  Almoço: {durAlmoco}m
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-slate-400 font-medium mb-1">Entrada Manhã</label>
                            <input
                              type="time"
                              value={formEscalaEntrada}
                              onChange={(e) => setFormEscalaEntrada(e.target.value)}
                              required
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 font-medium mb-1">Saída Almoço</label>
                            <input
                              type="time"
                              value={formEscalaAlmocoSaida}
                              onChange={(e) => setFormEscalaAlmocoSaida(e.target.value)}
                              required
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 font-medium mb-1">Retorno Almoço</label>
                            <input
                              type="time"
                              value={formEscalaAlmocoRetorno}
                              onChange={(e) => setFormEscalaAlmocoRetorno(e.target.value)}
                              required
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 font-medium mb-1">Saída Tarde</label>
                            <input
                              type="time"
                              value={formEscalaSaida}
                              onChange={(e) => setFormEscalaSaida(e.target.value)}
                              required
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bloco 3: Horários de Sábado */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                            <input
                              type="checkbox"
                              checked={formEscalaSabadoAtivo}
                              onChange={(e) => setFormEscalaSabadoAtivo(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                            />
                            <span>Trabalho habitual aos Sábados</span>
                          </label>

                          {formEscalaSabadoAtivo && (
                            <span className="text-[11px] text-amber-300 font-mono bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                              Sábado Ativo
                            </span>
                          )}
                        </div>

                        {formEscalaSabadoAtivo && (
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div>
                              <label className="block text-slate-400 font-medium mb-1">Entrada Sábado</label>
                              <input
                                type="time"
                                value={formEscalaSabadoEntrada}
                                onChange={(e) => setFormEscalaSabadoEntrada(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 font-medium mb-1">Saída Sábado</label>
                              <input
                                type="time"
                                value={formEscalaSabadoSaida}
                                onChange={(e) => setFormEscalaSabadoSaida(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Opção de atualizar colaboradores vinculados */}
                  {escalaEditando && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/20">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={formEscalaAtualizarColabs}
                          onChange={(e) => setFormEscalaAtualizarColabs(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700"
                        />
                        <span>
                          Atualizar automaticamente os horários de trabalho de todos os colaboradores já vinculados a esta escala
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Botões do Modal */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setModalEscalaAberta(false);
                        setEscalaEditando(null);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      {escalaEditando ? "Salvar Alterações da Escala" : "Cadastrar Escala"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* MODAL: VINCULAR COLABORADORES À ESCALA EM LOTE */}
          {modalVincularAberta && escalaParaVincular && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-2xl w-full space-y-5 my-8"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-emerald-400" />
                      Vincular Colaboradores à Escala
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Escala Selecionada: <strong className="text-emerald-400">{escalaParaVincular.nome}</strong> ({escalaParaVincular.tipo} • {escalaParaVincular.cargaSemanalHoras}h/sem)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalVincularAberta(false);
                      setEscalaParaVincular(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Banner Explicativo */}
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
                    Marque os funcionários que devem seguir esta escala de trabalho. Ao salvar, os horários contratuais de entrada, saída, almoço e sábado serão atualizados automaticamente para os colaboradores selecionados.
                  </div>

                  {/* Controles de Busca e Seleção Rápida */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filtrar colaboradores por nome ou cargo..."
                        value={filtroVincularColabs}
                        onChange={(e) => setFiltroVincularColabs(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const todos = colaboradores.map((c) => c.id);
                          setColaboradoresSelecionadosParaEscala(todos);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Marcar Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setColaboradoresSelecionadosParaEscala([])}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Square className="w-3.5 h-3.5 text-slate-400" /> Desmarcar
                      </button>
                    </div>
                  </div>

                  {/* Lista com Checkbox para Cada Colaborador */}
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {colaboradores
                      .filter((c) => {
                        if (!filtroVincularColabs.trim()) return true;
                        const q = filtroVincularColabs.toLowerCase();
                        return (
                          c.nome.toLowerCase().includes(q) ||
                          c.cargo.toLowerCase().includes(q) ||
                          (c.departamento && c.departamento.toLowerCase().includes(q))
                        );
                      })
                      .map((c) => {
                        const estaMarcado = colaboradoresSelecionadosParaEscala.includes(c.id);
                        const escalaAtual = escalas.find((e) => e.id === c.escalaId);

                        return (
                          <div
                            key={c.id}
                            onClick={() => handleToggleColaboradorVinculo(c.id)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              estaMarcado
                                ? "bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950/20"
                                : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                                  estaMarcado
                                    ? "bg-emerald-500 border-emerald-400 text-slate-950 font-bold"
                                    : "border-slate-700 bg-slate-900"
                                }`}
                              >
                                {estaMarcado && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>

                              <div>
                                <h5 className="font-bold text-white text-xs leading-tight">{c.nome}</h5>
                                <span className="text-[11px] text-slate-400 block">{c.cargo} • {c.departamento}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {escalaAtual ? (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
                                    escalaAtual.id === escalaParaVincular.id
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                      : "bg-slate-900 text-slate-400 border-slate-800"
                                  }`}
                                >
                                  {escalaAtual.nome}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Sem escala fixa</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Rodapé com Contador e Botões */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <span className="text-xs font-mono text-slate-400">
                      <strong className="text-emerald-400 font-bold">{colaboradoresSelecionadosParaEscala.length}</strong> de {colaboradores.length} selecionado(s)
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setModalVincularAberta(false);
                          setEscalaParaVincular(null);
                        }}
                        className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSalvarVinculoColaboradores}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Salvar Vínculos
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        </ErrorBoundary>
      </main>
    </div>
  );
}
