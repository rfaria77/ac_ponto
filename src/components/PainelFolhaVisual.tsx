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

  // Competência Mês/Ano (Padrão: Setembro 2026, ou mês atual)
  const [ano, setAno] = useState<number>(2026);
  const [mes, setMes] = useState<number>(9); // 1-12

  // Grade de dias da folha
  const [diasFolha, setDiasFolha] = useState<BatidaDia[]>([]);
  const [celulaAtualizada, setCelulaAtualizada] = useState<{ dia: number; campo: string } | null>(null);
  const [ultimoRegistroTempoReal, setUltimoRegistroTempoReal] = useState<string | null>(null);
  const [totalBatidasRecebidas, setTotalBatidasRecebidas] = useState<number>(0);
  const [modalEdicaoAberta, setModalEdicaoAberta] = useState<boolean>(false);
  const [diaEditando, setDiaEditando] = useState<BatidaDia | null>(null);

  const colaboradorAtual = useMemo(() => {
    return colaboradores.find((c) => c.id === colabId) || colaboradores[0] || null;
  }, [colaboradores, colabId]);

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
      let houveAlteracao = false;
      const novasBatidas: any[] = [];

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const comp = change.doc.data();
          if (comp.colaboradorId === colaboradorAtual.id) {
            novasBatidas.push(comp);
            houveAlteracao = true;
          }
        }
      });

      if (houveAlteracao && novasBatidas.length > 0) {
        setDiasFolha((prevDias) => {
          const novosDias = [...prevDias];
          novasBatidas.forEach((comp) => {
            // comp.data formato: "DD/MM/YYYY"
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
                    setCelulaAtualizada({ dia: diaComp, campo: "entrada1" });
                  } else if (tipo.includes("almoço") && tipo.includes("saída")) {
                    novosDias[idx].saida1 = horaLimpa;
                    setCelulaAtualizada({ dia: diaComp, campo: "saida1" });
                  } else if (tipo.includes("almoço") && tipo.includes("retorno")) {
                    novosDias[idx].entrada2 = horaLimpa;
                    setCelulaAtualizada({ dia: diaComp, campo: "entrada2" });
                  } else if (tipo.includes("saída") || tipo.includes("expediente")) {
                    novosDias[idx].saida2 = horaLimpa;
                    setCelulaAtualizada({ dia: diaComp, campo: "saida2" });
                  }
                }
              }
            }
          });

          const chaveStorage = `folha_visual_${colaboradorAtual.id}_${ano}_${mes}`;
          localStorage.setItem(chaveStorage, JSON.stringify(novosDias));
          return novosDias;
        });

        setUltimoRegistroTempoReal(new Date().toLocaleTimeString("pt-BR"));
        setTotalBatidasRecebidas((prev) => prev + novasBatidas.length);

        // Remove o destaque da célula após 4 segundos
        setTimeout(() => {
          setCelulaAtualizada(null);
        }, 4000);
      }
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
  }, [colaboradorAtual?.id, mes, ano]);

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

  // Cálculo individual do dia para coluna TOTAL e EXTRAS
  const calcularValoresLinha = (d: BatidaDia) => {
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
                  const { totalStr, extrasStr } = calcularValoresLinha(d);
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
                        ehHoje ? "bg-emerald-50/70" : ""
                      }`}
                      title="Clique na linha para editar horários deste dia"
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

                      {/* TOTAL: COLUNA COM FUNDO AZUL SUAVE #D9E8F5 */}
                      <td className="border-r-2 border-black py-1 px-2 font-mono font-bold text-center bg-[#D9E8F5] text-black">
                        {totalStr}
                      </td>

                      {/* EXTRAS: COLUNA COM FUNDO PÊSSEGO/ÂMBAR #FCEFD2 */}
                      <td className="py-1 px-2 font-mono font-bold text-center bg-[#FCEFD2] text-black">
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
                💡 Dica: Clique em qualquer dia para alterar horários manualmente
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
    </div>
  );
};
