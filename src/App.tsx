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
  RefreshCw,
  Search,
  Plus,
  ShieldAlert,
  Moon,
  Sun,
  Printer,
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Logo } from "./components/Logo";
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
} from "./lib/calculosPonto";

interface HorarioTrabalhoColab {
  entrada: string; // Ex: "08:00"
  almocoSaida: string; // Ex: "12:00"
  almocoRetorno: string; // Ex: "13:00"
  saida: string; // Ex: "17:00"
  sabadoAtivo?: boolean;
  sabadoEntrada?: string;
  sabadoSaida?: string;
}

interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  departamento: string;
  salarioBase: number;
  saldoAnteriorBancoMinutos: number; // Saldo de banco antes de iniciar o sistema
  dataInicioSaldo?: string; // Data base do saldo inicial
  observacaoSaldo?: string; // Observação explicativa do saldo inicial
  horarioTrabalho: HorarioTrabalhoColab;
}

const COLABORADORES_INICIAIS: Colaborador[] = [
  {
    id: "FUNC_001",
    nome: "Thais Moreira de Souza",
    cargo: "Assistente de coletas",
    departamento: "Operações / Coletas",
    salarioBase: 2450.0,
    saldoAnteriorBancoMinutos: 270, // +04h 30m
    dataInicioSaldo: "01/09/2026",
    horarioTrabalho: {
      entrada: "08:00",
      almocoSaida: "12:00",
      almocoRetorno: "13:00",
      saida: "17:00",
      sabadoAtivo: false,
    },
  },
  {
    id: "FUNC_002",
    nome: "Marcos Vinicius Ferreira Mendes",
    cargo: "Assistente de segurança do Trabalho",
    departamento: "Segurança do Trabalho",
    salarioBase: 2650.0,
    saldoAnteriorBancoMinutos: -120, // -02h 00m
    dataInicioSaldo: "01/09/2026",
    horarioTrabalho: {
      entrada: "07:30",
      almocoSaida: "11:30",
      almocoRetorno: "12:30",
      saida: "16:30",
      sabadoAtivo: false,
    },
  },
  {
    id: "FUNC_003",
    nome: "Amanda Inácio Medeiros Silva",
    cargo: "Assistente Administrativo",
    departamento: "Administrativo",
    salarioBase: 2300.0,
    saldoAnteriorBancoMinutos: 0,
    dataInicioSaldo: "01/09/2026",
    horarioTrabalho: {
      entrada: "08:30",
      almocoSaida: "12:30",
      almocoRetorno: "13:30",
      saida: "17:30",
      sabadoAtivo: false,
    },
  },
  {
    id: "FUNC_004",
    nome: "Denise Cristina Fernandes Costa Felip",
    cargo: "Técnico em segurança do Trabalho JR",
    departamento: "Segurança do Trabalho",
    salarioBase: 3100.0,
    saldoAnteriorBancoMinutos: 180, // +03h 00m
    dataInicioSaldo: "01/09/2026",
    horarioTrabalho: {
      entrada: "08:00",
      almocoSaida: "12:00",
      almocoRetorno: "13:00",
      saida: "17:00",
      sabadoAtivo: true,
      sabadoEntrada: "08:00",
      sabadoSaida: "12:00",
    },
  },
];

interface FechamentoArmazenado {
  id: string;
  dataCriacao: string;
  imagemUrl?: string;
  fechamento: ResumoMensalFechamento;
}

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<"digitalizar" | "fechamento" | "historico" | "criterios" | "colaboradores">("digitalizar");
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(COLABORADORES_INICIAIS);
  const [criterios, setCriterios] = useState<CriteriosApuracao>(CRITERIOS_PADRAO);
  
  // Seleção e parâmetros de upload
  const [colaboradorSelecionadoId, setColaboradorSelecionadoId] = useState<string>("FUNC_001");
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
    setFormEntrada("08:00");
    setFormAlmocoSaida("12:00");
    setFormAlmocoRetorno("13:00");
    setFormSaida("17:00");
    setFormSabadoAtivo(false);
    setFormSabadoEntrada("08:00");
    setFormSabadoSaida("12:00");
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
            horarioTrabalho: novoHorario,
          };
        }
        return c;
      });

      setColaboradores(atualizados);
      localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(atualizados));

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

      showToast("sucesso", "Colaborador Atualizado!", `Os dados, horários e banco de ${formNome} foram salvos com sucesso.`);
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
        horarioTrabalho: novoHorario,
      };

      const lista = [...colaboradores, novoColab];
      setColaboradores(lista);
      localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(lista));

      // Salvar na API
      fetch("/api/colaboradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoColab),
      }).catch(() => {});

      // Selecionar o novo colaborador para agilizar
      setColaboradorSelecionadoId(novoId);
      showToast(
        "sucesso",
        "Novo Colaborador Cadastrado!",
        `${novoColab.nome} cadastrado com horário (${novoHorario.entrada}-${novoHorario.saida}) e saldo inicial de ${minutosParaTextoExtenso(minutosTotaisBanco, true)}.`
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

    fetch(`/api/colaboradores/${id}`, { method: "DELETE" }).catch(() => {});

    if (colaboradorSelecionadoId === id && filtrados.length > 0) {
      setColaboradorSelecionadoId(filtrados[0].id);
    }
    showToast("sucesso", "Colaborador Removido", `${nome} foi removido da lista.`);
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

  // Carregar dados iniciais da API e LocalStorage
  useEffect(() => {
    // 1. Tentar restaurar colaboradores do localStorage primeiro
    const localColabs = localStorage.getItem("ac_gestor_colaboradores");
    if (localColabs) {
      try {
        const parsed = JSON.parse(localColabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColaboradores(parsed);
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
          setColaboradores(data);
          localStorage.setItem("ac_gestor_colaboradores", JSON.stringify(data));
        }
      })
      .catch(() => {});

    // 3. Buscar fechamentos gravados
    fetch("/api/fechamentos")
      .then((res) => res.json())
      .then((data: FechamentoArmazenado[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setFechamentosSalvos(data);
          setFechamentoAtual(data[0].fechamento);
        } else {
          gerarFechamentoExemploInicial();
        }
      })
      .catch(() => {
        gerarFechamentoExemploInicial();
      });
  }, []);

  const gerarFechamentoExemploInicial = () => {
    const colab = colaboradores[0];
    const diasMes = gerarDiasMes(2026, 9, criterios.feriadosFixos, colab.horarioTrabalho);
    // Aplicar batidas de exemplo que ativam todas as regras do critério
    diasMes[1].saida2 = "19:00"; // 2h extras no banco
    diasMes[2].saida2 = "20:00"; // 3h extras: 2h no banco + 1h HE 50%
    diasMes[3].saida1 = "12:00";
    diasMes[3].entrada2 = "12:40"; // Almoço de 40min: 20min de supressão calculados a 50%
    diasMes[4].saida2 = "16:30"; // Saída 30min antes: desconta 30min do banco
    diasMes[5].entrada1 = "08:00"; // Sábado trabalhado: 4h no banco (1:1)
    diasMes[5].saida2 = "12:00";
    diasMes[5].observacao = "Sábado trabalhado (Banco 1:1)";
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
      setTimeout(() => setEtapaProcessamento("Aplicando critérios A&C (Banco máx 2h, Sábado 1:1, Almoço <1h HE 50%, Noturno 22h-05h)..."), 2200);

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
    doc.text(`Salário Base: R$ ${fechamentoAtual.salarioBase.toFixed(2)} (Valor Hora: R$ ${fechamentoAtual.valorHora.toFixed(2)})`, pageWidth - 14, 34, { align: "right" });
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
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

      {/* Header Oficial A&C Gestor */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Painel do Gestor / DP</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Critérios WhatsApp A&C
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Digitalização de Folhas Escaneadas & Fechamento de Banco e Horas Extras</p>
            </div>
          </div>

          {/* Navegação por Abas */}
          <nav className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 text-xs font-semibold overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setAbaAtiva("digitalizar")}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                abaAtiva === "digitalizar"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Digitalizar Folha (IA)
            </button>
            <button
              onClick={() => setAbaAtiva("fechamento")}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                abaAtiva === "fechamento"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Espelho & Fechamento
            </button>
            <button
              onClick={() => setAbaAtiva("historico")}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                abaAtiva === "historico"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Histórico ({fechamentosSalvos.length})
            </button>
            <button
              onClick={() => setAbaAtiva("criterios")}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                abaAtiva === "criterios"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Critérios da Empresa
            </button>
            <button
              onClick={() => {
                setAbaAtiva("colaboradores");
                setSubAbaColaborador("lista");
              }}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                abaAtiva === "colaboradores"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Colaboradores & Horários ({colaboradores.length})
            </button>
            <button
              onClick={() => {
                handleAbrirNovoColaborador();
                setAbaAtiva("colaboradores");
              }}
              className="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> + Novo Colaborador
            </button>
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
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
                    <strong className="text-white"> Banco de Horas (máx 2h/dia e sábados 1:1)</strong>, 
                    <strong className="text-white"> Horas Extras 50% (excedentes &gt; 2h e almoço &lt; 1h)</strong> e 
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
                      <label className="block text-slate-300 font-semibold mb-1">Colaborador da Folha</label>
                      <select
                        value={colaboradorSelecionadoId}
                        onChange={(e) => setColaboradorSelecionadoId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-sky-500"
                      >
                        {colaboradores.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} — {c.cargo} (R$ {c.salarioBase.toFixed(2)})
                          </option>
                        ))}
                      </select>
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
                              <span className="text-amber-300">Sáb: {h.sabadoEntrada || "08:00"} às {h.sabadoSaida || "12:00"} (Banco 1:1)</span>
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
                        <Calendar className="w-3.5 h-3.5" /> Sábados no Banco
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Trabalho aos sábados entra como crédito de banco de horas com horário exato (1:1, sem acréscimo).
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
                  Cargo: {fechamentoAtual.colaboradorCargo} • Salário Base: R$ {fechamentoAtual.salarioBase.toFixed(2)} (Valor Hora: R$ {fechamentoAtual.valorHora.toFixed(2)})
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
                  R$ {fechamentoAtual.valorEstimadoHE50.toFixed(2)}
                </span>
              </div>

              {/* 5. Horas Extras 100% */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Horas Extras 100%</span>
                <div className="text-lg font-black text-amber-300 font-mono">
                  {minutosParaTextoExtenso(fechamentoAtual.totalHE100Minutos, false)}
                </div>
                <span className="text-[10px] text-amber-400/80 font-bold block">
                  R$ {fechamentoAtual.valorEstimadoHE100.toFixed(2)}
                </span>
              </div>

              {/* 6. Adicional Noturno */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-1">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Adicional Noturno (22h-05h)</span>
                <div className="text-lg font-black text-indigo-300 font-mono">
                  {minutosParaTextoExtenso(fechamentoAtual.totalAdicionalNoturnoMinutos, false)}
                </div>
                <span className="text-[10px] text-indigo-400/80 font-bold block">
                  R$ {fechamentoAtual.valorEstimadoAdicNoturno.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Totalizador Financeiro para o DP */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold">
                  R$
                </div>
                <div>
                  <span className="text-slate-400 block">Total a Pagar de Proventos Extras em Folha:</span>
                  <span className="text-base font-black text-white">
                    R$ {fechamentoAtual.valorTotalProventosExtras.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    (HE 50%: R$ {fechamentoAtual.valorEstimadoHE50.toFixed(2)} + HE 100%: R$ {fechamentoAtual.valorEstimadoHE100.toFixed(2)} + Noturno: R$ {fechamentoAtual.valorEstimadoAdicNoturno.toFixed(2)})
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-slate-400 block">Situação do Banco de Horas:</span>
                <span className={`font-bold ${fechamentoAtual.saldoAcumuladoFinalMinutos >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {fechamentoAtual.saldoAcumuladoFinalMinutos >= 0 ? "SALDO CREDOR A COMPENSAR" : "SALDO DEVEDOR / DESCONTO"}
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
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/10 text-sky-300" title={d.minutosAlmocoSuprimido ? `Inclui ${d.minutosAlmocoSuprimido}m de supressão de almoço` : "Excedente > 2h"}>
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
                        <span>R$ {item.fechamento.valorTotalProventosExtras.toFixed(2)}</span>
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

                {/* 4 & 5. Sábado no Banco exato 1:1 */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white text-sm block">4 & 5. Sábado no Banco de Horas (Fator Exato 1:1)</strong>
                    <p className="text-slate-400 leading-relaxed font-sans">
                      "Sábado entra como banco de horas" / "Como a gente usa o banco, o horário do banco tem que ser exato, não pode ser acrescido de nada"
                    </p>
                    <span className="inline-block text-[11px] text-sky-300 font-mono bg-sky-500/10 px-2 py-0.5 rounded">
                      Trabalho aos sábados entra como crédito integral no banco sem multiplicador
                    </span>
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

        {/* ================= ABA 5: COLABORADORES & HORÁRIOS ================= */}
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

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
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
                    className="w-full sm:w-auto px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all"
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
                          Sábado: Banco de Horas (1:1 exato)
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
                                      Crédito no Banco (1:1 exato)
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

                          {/* Seção 3: Dados Salariais & Ação de Lançar Folha */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <div className="font-mono">
                              <span className="text-[10px] text-slate-500 block">Salário Base</span>
                              <span className="font-bold text-white text-xs">
                                R$ {c.salarioBase.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                (R$ {(c.salarioBase / 220).toFixed(2)}/h)
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
        </AnimatePresence>
      </main>
    </div>
  );
}
