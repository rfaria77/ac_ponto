import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  Printer,
  Download,
  Share2,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  User,
  Zap,
  Trash2,
  Search,
  Filter,
  HeartPulse,
  Stethoscope,
  FileCheck2,
} from "lucide-react";
import {
  BatidaDia,
  CriteriosApuracao,
  ResumoMensalFechamento,
  calcularFechamentoMensal,
  gerarDiasMes,
  minutosParaHora,
  minutosParaTextoExtenso,
  horaParaMinutos,
  calcularDuracaoMinutos,
} from "../lib/calculosPonto";
import { db, cleanForFirestore } from "../lib/firebaseClient";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";
import jsPDF from "jspdf";

export interface ColaboradorVisual {
  id: string;
  nome: string;
  cargo: string;
  departamento: string;
  salarioBase: number;
  saldoAnteriorBancoMinutos: number;
  dataInicioSaldo?: string;
  fotoCadastro?: string;
  horarioTrabalho?: any;
}

interface PainelFolhaVisualProps {
  colaboradores: ColaboradorVisual[];
  colaboradorSelecionadoId?: string;
  criterios: CriteriosApuracao;
  onRegistrarPontoRapido?: (colabId: string, tipo: string) => void;
  onVoltar?: () => void;
}

export const PainelFolhaVisual: React.FC<PainelFolhaVisualProps> = ({
  colaboradores,
  colaboradorSelecionadoId: colabIdProp,
  criterios,
  onRegistrarPontoRapido,
  onVoltar,
}) => {
  // Colaborador Selecionado
  const [colabId, setColabId] = useState<string>(() => {
    return colabIdProp || (colaboradores.length > 0 ? colaboradores[0].id : "");
  });

  useEffect(() => {
    if (colabIdProp && colabIdProp !== colabId) {
      setColabId(colabIdProp);
    }
  }, [colabIdProp]);

  // Competência Mês/Ano (Padrão: Mês e ano atuais atualizados em tempo real)
  const [ano, setAno] = useState<number>(() => new Date().getFullYear());
  const [mes, setMes] = useState<number>(() => new Date().getMonth() + 1); // 1-12 (Mês atual em tempo real)

  // Grade de dias da folha
  const [diasFolha, setDiasFolha] = useState<BatidaDia[]>([]);
  const [celulaAtualizada, setCelulaAtualizada] = useState<{ dia: number; campo: string } | null>(null);
  const [ultimoRegistroTempoReal, setUltimoRegistroTempoReal] = useState<string | null>(null);
  const [totalBatidasRecebidas, setTotalBatidasRecebidas] = useState<number>(0);
  const [modalEdicaoAberta, setModalEdicaoAberta] = useState<boolean>(false);
  const [diaEditando, setDiaEditando] = useState<BatidaDia | null>(null);

  // Estados para Lançamento Rápido de Atestado Médico
  const [modalAtestadoAberta, setModalAtestadoAberta] = useState<boolean>(false);
  const [atestadoDataInicio, setAtestadoDataInicio] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [atestadoQtdDias, setAtestadoQtdDias] = useState<number>(1);
  const [atestadoTipo, setAtestadoTipo] = useState<string>("Atestado Médico (Dia Integral)");
  const [atestadoCidMotivo, setAtestadoCidMotivo] = useState<string>("");
  const [atestadosColab, setAtestadosColab] = useState<any[]>([]);

  const colaboradorAtual = useMemo(() => {
    return colaboradores.find((c) => c.id === colabId) || colaboradores[0] || null;
  }, [colaboradores, colabId]);

  // Listener para atestados médicos do colaborador atual no Firestore
  useEffect(() => {
    if (!colaboradorAtual) return;
    const unsubSolic = onSnapshot(collection(db, "solicitacoes_ajustes"), (snapshot) => {
      const lista: any[] = [];
      snapshot.forEach((docSnap) => {
        const item = { ...(docSnap.data() as any), id: docSnap.id };
        if (
          item.colaboradorId === colaboradorAtual.id &&
          (item.status === "Aprovado" || item.status === "Abonado") &&
          item.tipo?.includes("Atestado")
        ) {
          lista.push(item);
        }
      });
      setAtestadosColab(lista);
    }, (err) => {
      console.warn("Aviso listener atestados:", err);
    });
    return () => unsubSolic();
  }, [colaboradorAtual?.id]);

  // Gera ou recarrega a folha para o colaborador e mês selecionados
  useEffect(() => {
    if (!colaboradorAtual) return;

    // Tenta obter do localStorage primeiro para persistência local
    const chaveStorage = `folha_visual_${colaboradorAtual.id}_${ano}_${mes}`;
    const salvo = localStorage.getItem(chaveStorage);

    let diasIniciais: BatidaDia[];
    if (salvo) {
      try {
        diasIniciais = JSON.parse(salvo);
      } catch (e) {
        const base = gerarDiasMes(ano, mes, criterios.feriadosFixos);
        diasIniciais = base.map((d) => ({
          ...d,
          entrada1: "",
          saida1: "",
          entrada2: "",
          saida2: "",
          entrada3: "",
          saida3: "",
        }));
      }
    } else {
      const base = gerarDiasMes(ano, mes, criterios.feriadosFixos);
      diasIniciais = base.map((d) => ({
        ...d,
        entrada1: "",
        saida1: "",
        entrada2: "",
        saida2: "",
        entrada3: "",
        saida3: "",
      }));
    }

    setDiasFolha(diasIniciais);
  }, [colaboradorAtual?.id, ano, mes, criterios]);

  // Listener em tempo real com Firestore: sincroniza sempre que houver novas batidas
  useEffect(() => {
    if (!colaboradorAtual) return;

    const unsubComp = onSnapshot(collection(db, "comprovantes_ponto"), (snapshot) => {
      const comprovantesColab: any[] = [];
      const novasAlteracoes: any[] = [];

      snapshot.docs.forEach((docSnap) => {
        const comp = docSnap.data();
        if (comp.colaboradorId === colaboradorAtual.id) {
          let dataCorrigida = comp.data;
          if (dataCorrigida === "03/09/2026" && (comp.timestampIso?.startsWith("2026-11-03") || docSnap.id.startsWith("COMP_179370"))) {
            dataCorrigida = "03/11/2026";
          }
          comprovantesColab.push({ ...comp, data: dataCorrigida });
        }
      });

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const comp = change.doc.data();
          if (comp.colaboradorId === colaboradorAtual.id) {
            let dataCorrigida = comp.data;
            if (dataCorrigida === "03/09/2026" && (comp.timestampIso?.startsWith("2026-11-03") || change.doc.id.startsWith("COMP_179370"))) {
              dataCorrigida = "03/11/2026";
            }
            novasAlteracoes.push({ ...comp, data: dataCorrigida });
          }
        }
      });

      setDiasFolha(() => {
        const base = gerarDiasMes(ano, mes, criterios.feriadosFixos);
        const novosDias = base.map((d) => ({
          ...d,
          entrada1: "",
          saida1: "",
          entrada2: "",
          saida2: "",
          entrada3: "",
          saida3: "",
        }));

        comprovantesColab.forEach((comp) => {
          if (!comp.data) return;
          const partesData = comp.data.split("/");
          if (partesData.length === 3) {
            const diaComp = parseInt(partesData[0], 10);
            const mesComp = parseInt(partesData[1], 10);
            const anoComp = parseInt(partesData[2], 10);

            if (mesComp === mes && anoComp === ano) {
              const idx = novosDias.findIndex((d) => d.dia === diaComp);
              if (idx !== -1) {
                const horaLimpa = (comp.hora || "").slice(0, 5); // "HH:MM"
                const tipo = (comp.tipoBatida || "").toLowerCase();

                if (tipo.includes("entrada 1") || tipo === "entrada1") {
                  novosDias[idx].entrada1 = horaLimpa;
                } else if (tipo.includes("almoço") && tipo.includes("saída")) {
                  novosDias[idx].saida1 = horaLimpa;
                } else if (tipo.includes("almoço") && tipo.includes("retorno")) {
                  novosDias[idx].entrada2 = horaLimpa;
                } else if (tipo.includes("saída") || tipo.includes("expediente")) {
                  novosDias[idx].saida2 = horaLimpa;
                }
              }
            }
          }
        });

        // Aplica os atestados médicos cadastrados e aprovados para o colaborador no mês
        atestadosColab.forEach((atest) => {
          if (!atest.dataOcorrencia) return;
          let diaIni = 1;
          let mesAtest = mes;
          let anoAtest = ano;

          if (atest.dataOcorrencia.includes("/")) {
            const p = atest.dataOcorrencia.split("/");
            diaIni = parseInt(p[0], 10);
            mesAtest = parseInt(p[1], 10);
            anoAtest = parseInt(p[2], 10);
          } else if (atest.dataOcorrencia.includes("-")) {
            const p = atest.dataOcorrencia.split("-");
            anoAtest = parseInt(p[0], 10);
            mesAtest = parseInt(p[1], 10);
            diaIni = parseInt(p[2], 10);
          }

          if (mesAtest === mes && anoAtest === ano) {
            const qtdDias = Number(atest.diasAfastamento) || 1;
            for (let i = 0; i < qtdDias; i++) {
              const diaAlvo = diaIni + i;
              const idx = novosDias.findIndex((d) => d.dia === diaAlvo);
              if (idx !== -1) {
                novosDias[idx].observacao = "Atestado Médico (Abonado)";
                novosDias[idx].entrada1 = "";
                novosDias[idx].saida1 = "";
                novosDias[idx].entrada2 = "";
                novosDias[idx].saida2 = "";
                novosDias[idx].entrada3 = "";
                novosDias[idx].saida3 = "";
              }
            }
          }
        });

        // Destaque visual se houver batida em tempo real
        if (novasAlteracoes.length > 0) {
          novasAlteracoes.forEach((comp) => {
            if (!comp.data) return;
            const partes = comp.data.split("/");
            if (partes.length === 3 && parseInt(partes[1], 10) === mes && parseInt(partes[2], 10) === ano) {
              const diaComp = parseInt(partes[0], 10);
              const tipo = (comp.tipoBatida || "").toLowerCase();
              if (tipo.includes("entrada 1") || tipo === "entrada1") {
                setCelulaAtualizada({ dia: diaComp, campo: "entrada1" });
              } else if (tipo.includes("almoço") && tipo.includes("saída")) {
                setCelulaAtualizada({ dia: diaComp, campo: "saida1" });
              } else if (tipo.includes("almoço") && tipo.includes("retorno")) {
                setCelulaAtualizada({ dia: diaComp, campo: "entrada2" });
              } else if (tipo.includes("saída") || tipo.includes("expediente")) {
                setCelulaAtualizada({ dia: diaComp, campo: "saida2" });
              }
            }
          });

          setUltimoRegistroTempoReal(new Date().toLocaleTimeString("pt-BR"));
          setTotalBatidasRecebidas((prev) => prev + novasAlteracoes.length);

          setTimeout(() => {
            setCelulaAtualizada(null);
          }, 4000);
        }

        const chaveStorage = `folha_visual_${colaboradorAtual.id}_${ano}_${mes}`;
        localStorage.setItem(chaveStorage, JSON.stringify(novosDias));

        return novosDias;
      });
    }, (err) => {
      console.warn("Aviso listener visual comprovantes:", err);
    });

    // Também escuta registros_ponto gerais
    const unsubRegs = onSnapshot(collection(db, "registros_ponto"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const reg = change.doc.data();
          if (reg.colaboradorId === colaboradorAtual.id && reg.status === "AProvado") {
            setUltimoRegistroTempoReal(new Date().toLocaleTimeString("pt-BR"));
          }
        }
      });
    }, (err) => {
      console.warn("Aviso listener visual registros:", err);
    });

    return () => {
      unsubComp();
      unsubRegs();
    };
  }, [colaboradorAtual?.id, mes, ano, atestadosColab]);

  // Apuração do mês atual em tempo real
  const resumoMes: ResumoMensalFechamento = useMemo(() => {
    if (!colaboradorAtual || diasFolha.length === 0) {
      return {
        colaboradorNome: colaboradorAtual?.nome || "Colaborador",
        colaboradorCargo: colaboradorAtual?.cargo || "Cargo",
        colaboradorId: colaboradorAtual?.id,
        mesAno: `${String(mes).padStart(2, "0")}/${ano}`,
        diasTrabalhados: 0,
        diasFalta: 0,
        diasAtestado: 0,
        totalHorasTrabalhadasMinutos: 0,
        totalHorasNominaisMinutos: 0,
        saldoAnteriorBancoMinutos: 0,
        bancoCreditosMesMinutos: 0,
        bancoDebitosMesMinutos: 0,
        saldoLiquidoMesMinutos: 0,
        saldoAcumuladoFinalMinutos: 0,
        totalHE50Minutos: 0,
        totalHE100Minutos: 0,
        totalAdicionalNoturnoMinutos: 0,
        salarioBase: 2450,
        valorHora: 11.14,
        valorEstimadoHE50: 0,
        valorEstimadoHE100: 0,
        valorEstimadoAdicNoturno: 0,
        valorTotalProventosExtras: 0,
        dias: diasFolha,
      };
    }

    return calcularFechamentoMensal(diasFolha, criterios, {
      colaboradorNome: colaboradorAtual.nome,
      colaboradorCargo: colaboradorAtual.cargo,
      colaboradorId: colaboradorAtual.id,
      mesAno: `${String(mes).padStart(2, "0")}/${ano}`,
      salarioBase: colaboradorAtual.salarioBase,
      saldoAnteriorBancoMinutos: colaboradorAtual.saldoAnteriorBancoMinutos,
      horarioNominal: colaboradorAtual.horarioTrabalho,
    });
  }, [diasFolha, colaboradorAtual, mes, ano, criterios]);

  // Zerar todas as batidas da folha do mês atual
  const handleZerarBatidasMes = () => {
    if (!colaboradorAtual) return;
    const diasBase = gerarDiasMes(ano, mes, criterios.feriadosFixos);
    const diasLimpos = diasBase.map((d) => ({
      ...d,
      entrada1: "",
      saida1: "",
      entrada2: "",
      saida2: "",
      entrada3: "",
      saida3: "",
    }));

    setDiasFolha(diasLimpos);
    const chaveStorage = `folha_visual_${colaboradorAtual.id}_${ano}_${mes}`;
    localStorage.removeItem(chaveStorage);
    localStorage.removeItem(`folha_visual_${colaboradorAtual.id}_2025_5`);

    // Sincroniza estado zerado no Firestore
    setDoc(doc(db, "folhas_ponto", `${colaboradorAtual.id}_${ano}_${mes}`), cleanForFirestore({
      colaboradorId: colaboradorAtual.id,
      colaboradorNome: colaboradorAtual.nome,
      ano,
      mes,
      dias: diasLimpos,
      atualizadoEm: new Date().toISOString(),
    })).catch(() => {});
  };

  // Salvar alteração de batida manual
  const handleSalvarEdicaoDia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaEditando || !colaboradorAtual) return;

    const novosDias = diasFolha.map((d) => (d.dia === diaEditando.dia ? { ...diaEditando } : d));
    setDiasFolha(novosDias);

    const chaveStorage = `folha_visual_${colaboradorAtual.id}_${ano}_${mes}`;
    localStorage.setItem(chaveStorage, JSON.stringify(novosDias));

    // Salva no Firestore
    setDoc(doc(db, "folhas_ponto", `${colaboradorAtual.id}_${ano}_${mes}`), cleanForFirestore({
      colaboradorId: colaboradorAtual.id,
      colaboradorNome: colaboradorAtual.nome,
      ano,
      mes,
      dias: novosDias,
      atualizadoEm: new Date().toISOString(),
    })).catch(() => {});

    setModalEdicaoAberta(false);
    setDiaEditando(null);
  };

  // Formatação de Horas no formato HH:MM:SS ou HH:MM para os boxes do topo
  const formatarHorasExtensoComSegundos = (minutosTotal: number): string => {
    const abs = Math.abs(Math.round(minutosTotal));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  };

  // Salvar novo Atestado Médico diretamente da Folha Visual
  const handleSalvarNovoAtestado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colaboradorAtual) return;

    const idAtestado = `SOLIC_ATEST_${Date.now()}`;
    const diasQtd = Math.max(1, parseInt(String(atestadoQtdDias), 10) || 1);

    const novoAtestado = {
      id: idAtestado,
      colaboradorId: colaboradorAtual.id,
      colaboradorNome: colaboradorAtual.nome,
      tipo: "Atestado Médico" as const,
      dataOcorrencia: atestadoDataInicio, // YYYY-MM-DD ou DD/MM/YYYY
      descricao: `Atestado Médico: ${atestadoCidMotivo || "Consulta / Afastamento Legal CLT Art. 473"}`,
      status: "Aprovado" as const,
      dataSolicitacao: new Date().toLocaleDateString("pt-BR"),
      horarioSugerido: "08:00",
      campoAfetado: "entrada1" as const,
      diasAfastamento: diasQtd,
      tipoAtestado: atestadoTipo,
      cid: atestadoCidMotivo || undefined,
    };

    // 1. Salva no Firestore solicitacoes_ajustes
    try {
      await setDoc(doc(db, "solicitacoes_ajustes", idAtestado), cleanForFirestore(novoAtestado));
    } catch (err) {
      console.warn("Erro ao salvar atestado no Firestore:", err);
    }

    // 2. Salva no servidor local para persistência em disco
    try {
      await fetch("/api/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoAtestado),
      });
    } catch (e) {}

    // 3. Atualiza diasFolha marcando os dias do atestado como "Atestado Médico (Abonado)"
    let diaIni = 1;
    let mesAtest = mes;
    let anoAtest = ano;

    if (atestadoDataInicio.includes("-")) {
      const p = atestadoDataInicio.split("-");
      anoAtest = parseInt(p[0], 10);
      mesAtest = parseInt(p[1], 10);
      diaIni = parseInt(p[2], 10);
    } else if (atestadoDataInicio.includes("/")) {
      const p = atestadoDataInicio.split("/");
      diaIni = parseInt(p[0], 10);
      mesAtest = parseInt(p[1], 10);
      anoAtest = parseInt(p[2], 10);
    }

    if (mesAtest === mes && anoAtest === ano) {
      const novosDias = diasFolha.map((d) => {
        if (d.dia >= diaIni && d.dia < diaIni + diasQtd) {
          return {
            ...d,
            observacao: "Atestado Médico (Abonado)",
            entrada1: "",
            saida1: "",
            entrada2: "",
            saida2: "",
            entrada3: "",
            saida3: "",
            minutosTrabalhados: 0,
            minutosBancoCredito: 0,
            minutosBancoDebito: 0,
            ehFalta: false,
          };
        }
        return d;
      });

      setDiasFolha(novosDias);
      const chaveStorage = `folha_visual_${colaboradorAtual.id}_${ano}_${mes}`;
      localStorage.setItem(chaveStorage, JSON.stringify(novosDias));

      setDoc(doc(db, "folhas_ponto", `${colaboradorAtual.id}_${ano}_${mes}`), cleanForFirestore({
        colaboradorId: colaboradorAtual.id,
        colaboradorNome: colaboradorAtual.nome,
        ano,
        mes,
        dias: novosDias,
        atualizadoEm: new Date().toISOString(),
      })).catch(() => {});
    }

    setModalAtestadoAberta(false);
    setAtestadoCidMotivo("");
  };

  // Alternar rapidamente status de atestado direto na edição do dia
  const handleToggleAtestadoDia = (marcar: boolean) => {
    if (!diaEditando || !colaboradorAtual) return;

    if (marcar) {
      const diaAtualizado: BatidaDia = {
        ...diaEditando,
        observacao: "Atestado Médico (Abonado)",
        entrada1: "",
        saida1: "",
        entrada2: "",
        saida2: "",
        entrada3: "",
        saida3: "",
        minutosTrabalhados: 0,
        minutosBancoCredito: 0,
        minutosBancoDebito: 0,
      };
      setDiaEditando(diaAtualizado);

      const novosDias = diasFolha.map((d) => (d.dia === diaEditando.dia ? diaAtualizado : d));
      setDiasFolha(novosDias);

      const chaveStorage = `folha_visual_${colaboradorAtual.id}_${ano}_${mes}`;
      localStorage.setItem(chaveStorage, JSON.stringify(novosDias));

      setDoc(doc(db, "folhas_ponto", `${colaboradorAtual.id}_${ano}_${mes}`), cleanForFirestore({
        colaboradorId: colaboradorAtual.id,
        colaboradorNome: colaboradorAtual.nome,
        ano,
        mes,
        dias: novosDias,
        atualizadoEm: new Date().toISOString(),
      })).catch(() => {});

      // Registra também nas solicitações/ajustes
      const dataStr = `${String(diaEditando.dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
      const novoAtest = {
        id: `ATEST_DIA_${diaEditando.dia}_${colaboradorAtual.id}_${Date.now()}`,
        colaboradorId: colaboradorAtual.id,
        colaboradorNome: colaboradorAtual.nome,
        tipo: "Atestado Médico" as const,
        dataOcorrencia: dataStr,
        descricao: "Atestado Médico lançado pelo gestor na folha visual (Dia Abonado)",
        status: "Aprovado" as const,
        dataSolicitacao: new Date().toLocaleDateString("pt-BR"),
        horarioSugerido: "08:00",
        campoAfetado: "entrada1" as const,
        diasAfastamento: 1,
      };

      setDoc(doc(db, "solicitacoes_ajustes", novoAtest.id), cleanForFirestore(novoAtest)).catch(() => {});
      fetch("/api/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoAtest),
      }).catch(() => {});

      setModalEdicaoAberta(false);
      setDiaEditando(null);
    } else {
      const diaAtualizado: BatidaDia = {
        ...diaEditando,
        observacao: "",
      };
      setDiaEditando(diaAtualizado);

      const novosDias = diasFolha.map((d) => (d.dia === diaEditando.dia ? diaAtualizado : d));
      setDiasFolha(novosDias);

      const chaveStorage = `folha_visual_${colaboradorAtual.id}_${ano}_${mes}`;
      localStorage.setItem(chaveStorage, JSON.stringify(novosDias));

      setDoc(doc(db, "folhas_ponto", `${colaboradorAtual.id}_${ano}_${mes}`), cleanForFirestore({
        colaboradorId: colaboradorAtual.id,
        colaboradorNome: colaboradorAtual.nome,
        ano,
        mes,
        dias: novosDias,
        atualizadoEm: new Date().toISOString(),
      })).catch(() => {});
    }
  };

  // Cálculo individual do dia para coluna TOTAL e EXTRAS
  const calcularValoresLinha = (d: BatidaDia) => {
    const obs = (d.observacao || "").toLowerCase();
    const ehAtestado = obs.includes("atestado") || obs.includes("médico") || obs.includes("abonado");

    if (ehAtestado) {
      return {
        totalStr: "Abonado",
        extrasStr: "00:00",
        ehAtestado: true,
      };
    }

    const durManha = calcularDuracaoMinutos(d.entrada1, d.saida1);
    const durTarde = calcularDuracaoMinutos(d.entrada2, d.saida2);
    const durNoite = (d.entrada3 && d.saida3) ? calcularDuracaoMinutos(d.entrada3, d.saida3) : 0;
    const totalMin = durManha + durTarde + durNoite;

    // Jornada padrão (8h = 480min)
    const jornadaPadrao = 480;
    let extraMin = 0;
    if (totalMin > jornadaPadrao) {
      extraMin = totalMin - jornadaPadrao;
    }

    return {
      totalStr: totalMin > 0 ? minutosParaHora(totalMin) : "",
      extrasStr: extraMin > 0 ? minutosParaHora(extraMin) : (totalMin > 0 ? "00:00" : ""),
      ehAtestado: false,
    };
  };

  // Total de horas trabalhadas no mês formatado como na imagem: "16:43:00"
  const totalHorasTrabalhadasTop = formatarHorasExtensoComSegundos(resumoMes.totalHorasTrabalhadasMinutos);
  // Total de extras/banco do mês formatado como na imagem: "00:43:00"
  const totalExtrasTop = formatarHorasExtensoComSegundos(
    (resumoMes.totalHE50Minutos || 0) + (resumoMes.bancoCreditosMesMinutos || 0)
  );

  // Nome do mês por extenso em português
  const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const nomeMesExtenso = nomesMeses[mes - 1] || "Mês";

  // Exportar para PDF exatamente com o visual da folha
  const handleExportarPDF = () => {
    const docPdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(16);
    docPdf.text(`Folha de ponto | Mês de ${nomeMesExtenso} de ${ano}`, 105, 18, { align: "center" });

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(11);
    docPdf.text(`Funcionário: ${colaboradorAtual?.nome || "___________________________"}`, 14, 28);
    docPdf.text(`Cargo: ${colaboradorAtual?.cargo || "Operações"}`, 14, 34);

    // Sumários do topo
    docPdf.setFillColor(217, 232, 245); // light blue
    docPdf.rect(130, 24, 32, 8, "F");
    docPdf.rect(130, 24, 32, 8, "S");
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(9);
    docPdf.text(totalHorasTrabalhadasTop, 146, 29.5, { align: "center" });

    docPdf.setFillColor(252, 239, 210); // peach
    docPdf.rect(164, 24, 32, 8, "F");
    docPdf.rect(164, 24, 32, 8, "S");
    docPdf.text(totalExtrasTop, 180, 29.5, { align: "center" });

    // Tabela simples desenhada
    let y = 42;
    const colWidths = [24, 18, 18, 18, 18, 18, 18, 25, 25];

    // Cabeçalho
    docPdf.setFillColor(226, 177, 68); // Amber gold #e2b144
    docPdf.rect(14, y, 24 + 18 * 6, 8, "F");
    docPdf.setFontSize(8);
    docPdf.setFont("helvetica", "bold");
    docPdf.text("DATA", 26, y + 5.5, { align: "center" });
    docPdf.text("MANHÃ", 50, y + 5.5, { align: "center" });
    docPdf.text("TARDE", 86, y + 5.5, { align: "center" });
    docPdf.text("NOITE", 122, y + 5.5, { align: "center" });

    docPdf.setFillColor(217, 232, 245);
    docPdf.rect(14 + 24 + 18 * 6, y, 25, 8, "F");
    docPdf.text("TOTAL", 14 + 24 + 18 * 6 + 12.5, y + 5.5, { align: "center" });

    docPdf.setFillColor(252, 239, 210);
    docPdf.rect(14 + 24 + 18 * 6 + 25, y, 25, 8, "F");
    docPdf.text("EXTRAS", 14 + 24 + 18 * 6 + 25 + 12.5, y + 5.5, { align: "center" });

    y += 8;

    // Subcabeçalho
    docPdf.setFillColor(255, 255, 255);
    docPdf.setFontSize(7);
    docPdf.text("Data", 26, y + 4.5, { align: "center" });
    docPdf.text("Ent.", 42, y + 4.5, { align: "center" });
    docPdf.text("Saí.", 60, y + 4.5, { align: "center" });
    docPdf.text("Ent.", 78, y + 4.5, { align: "center" });
    docPdf.text("Saí.", 96, y + 4.5, { align: "center" });
    docPdf.text("Ent.", 114, y + 4.5, { align: "center" });
    docPdf.text("Saí.", 132, y + 4.5, { align: "center" });
    docPdf.text("Horas", 149.5, y + 4.5, { align: "center" });
    docPdf.text("Banco/HE", 174.5, y + 4.5, { align: "center" });
    y += 6;

    // Linhas
    diasFolha.forEach((d) => {
      if (y > 275) {
        docPdf.addPage();
        y = 15;
      }

      const { totalStr, extrasStr } = calcularValoresLinha(d);
      const dataStr = `${String(d.dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;

      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(7.5);
      docPdf.text(dataStr, 26, y + 4, { align: "center" });
      docPdf.text(d.entrada1 || "-", 42, y + 4, { align: "center" });
      docPdf.text(d.saida1 || "-", 60, y + 4, { align: "center" });
      docPdf.text(d.entrada2 || "-", 78, y + 4, { align: "center" });
      docPdf.text(d.saida2 || "-", 96, y + 4, { align: "center" });
      docPdf.text(d.entrada3 || "-", 114, y + 4, { align: "center" });
      docPdf.text(d.saida3 || "-", 132, y + 4, { align: "center" });

      docPdf.setFont("helvetica", "bold");
      docPdf.text(totalStr || "-", 149.5, y + 4, { align: "center" });
      docPdf.text(extrasStr || "-", 174.5, y + 4, { align: "center" });

      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(14, y + 5.5, 196, y + 5.5);

      y += 6;
    });

    docPdf.save(`Folha_Ponto_${colaboradorAtual?.nome?.replace(/\s+/g, "_")}_${mes}_${ano}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ferramentas Superior & Controles */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Seletor de Colaborador */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Painel Visual Espelho
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Folha de Ponto Mensal
              </h2>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={colabId}
              onChange={(e) => setColabId(e.target.value)}
              className="w-full sm:w-64 bg-slate-950 border border-slate-700 hover:border-amber-500 text-white font-medium text-xs sm:text-sm rounded-xl px-3 py-2.5 transition-colors focus:outline-none focus:border-amber-500"
            >
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.cargo})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Controles de Mês, Ano e Status Ao Vivo */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Mês e Ano */}
          <div className="inline-flex items-center bg-slate-950 border border-slate-700 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                if (mes === 1) {
                  setMes(12);
                  setAno(ano - 1);
                } else {
                  setMes(mes - 1);
                }
              }}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-bold text-white min-w-28 text-center">
              {nomeMesExtenso} / {ano}
            </span>
            <button
              type="button"
              onClick={() => {
                if (mes === 12) {
                  setMes(1);
                  setAno(ano + 1);
                } else {
                  setMes(mes + 1);
                }
              }}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Badge de Sincronização em Tempo Real */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Ao vivo</span>
            {ultimoRegistroTempoReal && (
              <span className="text-[10px] text-emerald-300/80">({ultimoRegistroTempoReal})</span>
            )}
          </div>

          {/* Botão Lançar Atestado Médico */}
          <button
            type="button"
            onClick={() => setModalAtestadoAberta(true)}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Lançar atestado médico para abonar dias deste colaborador sem descontar no banco de horas"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>+ Lançar Atestado</span>
          </button>

          {/* Botão Zerar Folha */}
          <button
            type="button"
            onClick={handleZerarBatidasMes}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Zerar e limpar todas as batidas deste mês"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Zerar Folha</span>
          </button>

          {/* Botão Imprimir */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Imprimir folha"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          {/* Botão Exportar PDF */}
          <button
            type="button"
            onClick={handleExportarPDF}
            className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Baixar em formato PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* PAINEL VISUAL - REPRODUÇÃO EXATA DA IMAGEM ENVIADA */}
      <div className="bg-white text-black p-4 sm:p-8 rounded-3xl shadow-2xl border border-gray-300 print:m-0 print:p-0 print:border-none print:shadow-none overflow-x-auto">
        <div className="min-w-[760px] max-w-4xl mx-auto space-y-4">
          {/* TÍTULO PRINCIPAL (Centralizado e idêntico à imagem) */}
          <div className="text-center pt-2">
            <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight font-sans">
              Folha de ponto | Mês de {ano === 2025 ? `${nomeMesExtenso} de 2025` : `${nomeMesExtenso} de ${ano}`}
            </h1>
          </div>

          {/* LINHA DO FUNCIONÁRIO E BOXES DE TOTAL/EXTRAS NO TOPO DIREITO */}
          <div className="flex items-end justify-between gap-4 pt-1 pb-1">
            {/* Funcionário sublinhado à esquerda */}
            <div className="flex-1 flex items-baseline gap-2">
              <span className="text-sm font-black text-black shrink-0">Funcionário:</span>
              <div className="flex-1 border-b-2 border-black pb-0.5 px-2">
                <span className="text-sm sm:text-base font-bold text-gray-900">
                  {colaboradorAtual?.nome || "_____________________________________"}
                </span>
                <span className="text-xs text-gray-600 ml-2">
                  ({colaboradorAtual?.cargo || "Assistente"})
                </span>
              </div>
            </div>

            {/* Boxes de resumo acima das colunas TOTAL e EXTRAS */}
            <div className="flex items-center gap-0 shrink-0">
              {/* Box Azul: TOTAL DE HORAS */}
              <div
                className="w-24 sm:w-28 py-1 px-2 border-2 border-black text-center font-bold text-xs sm:text-sm bg-[#D9E8F5] text-black shadow-inner"
                title="Total de Horas Trabalhadas no Mês"
              >
                {totalHorasTrabalhadasTop}
              </div>

              {/* Box Pêssego: EXTRAS / BANCO */}
              <div
                className="w-24 sm:w-28 py-1 px-2 border-2 border-l-0 border-black text-center font-bold text-xs sm:text-sm bg-[#FCEFD2] text-black shadow-inner"
                title="Total de Horas Extras e Banco do Mês"
              >
                {totalExtrasTop}
              </div>
            </div>
          </div>

          {/* TABELA PRINCIPAL DA FOLHA DE PONTO */}
          <div className="border-2 border-black rounded-none overflow-hidden">
            <table className="w-full border-collapse text-center select-none font-sans">
              <thead>
                {/* Linha 1 de Cabeçalho: Cores Dourada/Amarela #E2B144, Azul Claro #D9E8F5 e Pêssego #FCEFD2 */}
                <tr className="bg-[#E2B144] text-black border-b-2 border-black">
                  {/* DATA */}
                  <th
                    rowSpan={2}
                    className="border-r-2 border-black py-2 px-3 text-sm sm:text-base font-black tracking-wide w-28 bg-[#E2B144]"
                  >
                    Data
                  </th>

                  {/* MANHÃ */}
                  <th
                    colSpan={2}
                    className="border-r-2 border-black py-1.5 px-2 text-xs sm:text-sm font-black uppercase tracking-wider bg-[#E2B144]"
                  >
                    MANHÃ
                  </th>

                  {/* TARDE */}
                  <th
                    colSpan={2}
                    className="border-r-2 border-black py-1.5 px-2 text-xs sm:text-sm font-black uppercase tracking-wider bg-[#E2B144]"
                  >
                    TARDE
                  </th>

                  {/* NOITE */}
                  <th
                    colSpan={2}
                    className="border-r-2 border-black py-1.5 px-2 text-xs sm:text-sm font-black uppercase tracking-wider bg-[#E2B144]"
                  >
                    NOITE
                  </th>

                  {/* TOTAL (Cabeçalho da coluna) */}
                  <th
                    className="border-r-2 border-black py-1 px-2 text-xs font-black uppercase bg-[#D9E8F5] text-black w-24 sm:w-28"
                  >
                    TOTAL
                  </th>

                  {/* EXTRAS (Cabeçalho da coluna) */}
                  <th
                    className="py-1 px-2 text-xs font-black uppercase bg-[#FCEFD2] text-black w-24 sm:w-28"
                  >
                    EXTRAS
                  </th>
                </tr>

                {/* Linha 2 de Cabeçalho: Subcolunas de Entrada e Saída */}
                <tr className="bg-[#E2B144] text-black border-b-2 border-black text-xs font-black">
                  {/* MANHÃ */}
                  <th className="border-r border-black py-1 px-2 font-bold w-16 sm:w-20 bg-[#E2B144]">
                    Entrada
                  </th>
                  <th className="border-r-2 border-black py-1 px-2 font-bold w-16 sm:w-20 bg-[#E2B144]">
                    Saída
                  </th>

                  {/* TARDE */}
                  <th className="border-r border-black py-1 px-2 font-bold w-16 sm:w-20 bg-[#E2B144]">
                    Entrada
                  </th>
                  <th className="border-r-2 border-black py-1 px-2 font-bold w-16 sm:w-20 bg-[#E2B144]">
                    Saída
                  </th>

                  {/* NOITE */}
                  <th className="border-r border-black py-1 px-2 font-bold w-16 sm:w-20 bg-[#E2B144]">
                    Entrada
                  </th>
                  <th className="border-r-2 border-black py-1 px-2 font-bold w-16 sm:w-20 bg-[#E2B144]">
                    Saída
                  </th>

                  {/* Total e Extras não repetem o subcabeçalho, continuam a coluna */}
                  <th className="border-r-2 border-black py-0.5 px-2 bg-[#D9E8F5]"></th>
                  <th className="py-0.5 px-2 bg-[#FCEFD2]"></th>
                </tr>
              </thead>

              {/* CORPO DA TABELA: 1 LINHA PARA CADA DIA DO MÊS (1 a 31) */}
              <tbody className="divide-y divide-black text-xs font-medium">
                {diasFolha.map((d) => {
                  const { totalStr, extrasStr, ehAtestado } = calcularValoresLinha(d);
                  const dataFormatada = `${String(d.dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
                  const ehHoje =
                    new Date().getDate() === d.dia &&
                    new Date().getMonth() + 1 === mes &&
                    new Date().getFullYear() === ano;

                  const celulaEntrada1Atualizada = celulaAtualizada?.dia === d.dia && celulaAtualizada?.campo === "entrada1";
                  const celulaSaida1Atualizada = celulaAtualizada?.dia === d.dia && celulaAtualizada?.campo === "saida1";
                  const celulaEntrada2Atualizada = celulaAtualizada?.dia === d.dia && celulaAtualizada?.campo === "entrada2";
                  const celulaSaida2Atualizada = celulaAtualizada?.dia === d.dia && celulaAtualizada?.campo === "saida2";

                  return (
                    <tr
                      key={d.dia}
                      onClick={() => {
                        setDiaEditando(d);
                        setModalEdicaoAberta(true);
                      }}
                      className={`hover:bg-amber-50 cursor-pointer transition-colors group ${
                        ehAtestado ? "bg-emerald-50/60" : ehHoje ? "bg-emerald-50/70" : ""
                      }`}
                      title={ehAtestado ? "Dia abonado por atestado médico (Clique para ver/editar)" : "Clique na linha para editar horários deste dia"}
                    >
                      {/* COLUNA DATA */}
                      <td className="border-r-2 border-black py-1 px-2 text-center font-bold text-gray-900 whitespace-nowrap bg-gray-50/80 group-hover:bg-amber-100/50">
                        <div className="flex items-center justify-center gap-1">
                          {ehHoje && (
                            <span
                              className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"
                              title="Hoje"
                            ></span>
                          )}
                          <span>{dataFormatada}</span>
                        </div>
                      </td>

                      {/* SE FOR ATESTADO MÉDICO: EXIBE FAIXA DE ABONO INTEGRAL */}
                      {ehAtestado ? (
                        <td
                          colSpan={6}
                          className="border-r-2 border-black py-1.5 px-3 bg-emerald-50 text-emerald-950 font-bold text-xs tracking-wide"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <HeartPulse className="w-4 h-4 text-emerald-600 inline" />
                            <span>🏥 Atestado Médico — Dia Abonado Integralmente (Sem Débito no Banco)</span>
                          </div>
                        </td>
                      ) : (
                        <>
                          {/* MANHÃ - ENTRADA */}
                          <td
                            className={`border-r border-black py-1 px-2 font-mono text-center ${
                              celulaEntrada1Atualizada ? "bg-amber-300 font-bold animate-pulse text-black" : ""
                            }`}
                          >
                            {d.entrada1 || ""}
                          </td>

                          {/* MANHÃ - SAÍDA */}
                          <td
                            className={`border-r-2 border-black py-1 px-2 font-mono text-center ${
                              celulaSaida1Atualizada ? "bg-amber-300 font-bold animate-pulse text-black" : ""
                            }`}
                          >
                            {d.saida1 || ""}
                          </td>

                          {/* TARDE - ENTRADA */}
                          <td
                            className={`border-r border-black py-1 px-2 font-mono text-center ${
                              celulaEntrada2Atualizada ? "bg-amber-300 font-bold animate-pulse text-black" : ""
                            }`}
                          >
                            {d.entrada2 || ""}
                          </td>

                          {/* TARDE - SAÍDA */}
                          <td
                            className={`border-r-2 border-black py-1 px-2 font-mono text-center ${
                              celulaSaida2Atualizada ? "bg-amber-300 font-bold animate-pulse text-black" : ""
                            }`}
                          >
                            {d.saida2 || ""}
                          </td>

                          {/* NOITE - ENTRADA */}
                          <td className="border-r border-black py-1 px-2 font-mono text-center">
                            {d.entrada3 || ""}
                          </td>

                          {/* NOITE - SAÍDA */}
                          <td className="border-r-2 border-black py-1 px-2 font-mono text-center">
                            {d.saida3 || ""}
                          </td>
                        </>
                      )}

                      {/* TOTAL: COLUNA COM FUNDO AZUL SUAVE #D9E8F5 (OU VERDE SE ABONADO) */}
                      <td className={`border-r-2 border-black py-1 px-2 font-mono font-bold text-center ${
                        ehAtestado ? "bg-emerald-100 text-emerald-950" : "bg-[#D9E8F5] text-black"
                      }`}>
                        {totalStr}
                      </td>

                      {/* EXTRAS: COLUNA COM FUNDO PÊSSEGO/ÂMBAR #FCEFD2 (OU VERDE SE ABONADO) */}
                      <td className={`py-1 px-2 font-mono font-bold text-center ${
                        ehAtestado ? "bg-emerald-50 text-emerald-950" : "bg-[#FCEFD2] text-black"
                      }`}>
                        {extrasStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* RODAPÉ INFORMATIVO DA FOLHA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <span>Empresa: A&C Gestão de Ponto • Tupaciguara MG</span>
              <span>•</span>
              <span>Portaria 671 MTE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-600 font-medium">
                💡 Dica: Clique em qualquer dia para alterar horários ou abonar via atestado
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO RÁPIDA DE HORÁRIO POR DIA */}
      {modalEdicaoAberta && diaEditando && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Editar Batidas: Dia {String(diaEditando.dia).padStart(2, "0")}/{String(mes).padStart(2, "0")}/{ano}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Colaborador: {colaboradorAtual?.nome}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEdicaoAberta(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* SEÇÃO RÁPIDA DE ATESTADO MÉDICO */}
            {diaEditando.observacao?.toLowerCase().includes("atestado") ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-emerald-300">
                  <HeartPulse className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Este dia está <strong>Abonado por Atestado Médico</strong> (0 débito no banco).</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleAtestadoDia(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors shrink-0 cursor-pointer"
                >
                  ↺ Reabrir Horários
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  <span>Deseja abonar este dia sem desconto no salário e sem debitar no banco?</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleAtestadoDia(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span>Marcar como Atestado</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSalvarEdicaoDia} className="space-y-4">
              {/* MANHÃ */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Turno da Manhã</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Entrada Manhã</label>
                    <input
                      type="text"
                      placeholder="08:00"
                      value={diaEditando.entrada1}
                      onChange={(e) => setDiaEditando({ ...diaEditando, entrada1: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Saída Almoço</label>
                    <input
                      type="text"
                      placeholder="12:00"
                      value={diaEditando.saida1}
                      onChange={(e) => setDiaEditando({ ...diaEditando, saida1: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* TARDE */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Turno da Tarde</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Retorno Almoço</label>
                    <input
                      type="text"
                      placeholder="13:00"
                      value={diaEditando.entrada2}
                      onChange={(e) => setDiaEditando({ ...diaEditando, entrada2: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Saída Tarde</label>
                    <input
                      type="text"
                      placeholder="17:00"
                      value={diaEditando.saida2}
                      onChange={(e) => setDiaEditando({ ...diaEditando, saida2: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* NOITE */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Turno da Noite (Opcional)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Entrada Noite</label>
                    <input
                      type="text"
                      placeholder="22:00"
                      value={diaEditando.entrada3 || ""}
                      onChange={(e) => setDiaEditando({ ...diaEditando, entrada3: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Saída Noite</label>
                    <input
                      type="text"
                      placeholder="05:00"
                      value={diaEditando.saida3 || ""}
                      onChange={(e) => setDiaEditando({ ...diaEditando, saida3: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalEdicaoAberta(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Salvar Batidas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR NOVO ATESTADO MÉDICO */}
      {modalAtestadoAberta && colaboradorAtual && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-white animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Lançar Atestado Médico (Abono CLT)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Colaborador: <strong className="text-emerald-400">{colaboradorAtual.nome}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAtestadoAberta(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Banner de Garantia Legal (Sem desconto salarial e Sem débito de banco) */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                <FileCheck2 className="w-4 h-4" />
                <span>Regra de Abono Integral Conforme CLT:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-200/90">
                O período do atestado é <strong>integralmente abonado</strong>. O colaborador <strong>NÃO</strong> terá desconto salarial no dia e <strong>NÃO</strong> terá desconto/débito no saldo do banco de horas.
              </p>
            </div>

            <form onSubmit={handleSalvarNovoAtestado} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Data de Início */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data de Início do Afastamento
                  </label>
                  <input
                    type="date"
                    value={atestadoDataInicio}
                    onChange={(e) => setAtestadoDataInicio(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Quantidade de Dias */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantidade de Dias
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={atestadoQtdDias}
                    onChange={(e) => setAtestadoQtdDias(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5 text-center">
                    {atestadoQtdDias === 1 ? "1 dia abonado" : `${atestadoQtdDias} dias abonados consecutivos`}
                  </span>
                </div>
              </div>

              {/* Tipo de Afastamento */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Afastamento
                </label>
                <select
                  value={atestadoTipo}
                  onChange={(e) => setAtestadoTipo(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="integral">Atestado Médico (Dia Integral Abonado - Art. 473 CLT)</option>
                  <option value="parcial">Declaração de Comparecimento / Horas (Consulta)</option>
                </select>
              </div>

              {/* CID ou Motivo Médico */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  CID ou Motivo da Justificativa (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Consulta médica, repouso por 1 dia, CID J00..."
                  value={atestadoCidMotivo}
                  onChange={(e) => setAtestadoCidMotivo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAtestadoAberta(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <HeartPulse className="w-4 h-4" />
                  <span>Abonar Dia(s) na Folha</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
