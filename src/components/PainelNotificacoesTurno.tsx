import React, { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Smartphone,
  Sparkles,
  AlertTriangle,
  Play,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { HorarioTrabalhoColab } from "../lib/calculosPonto";
import {
  ConfiguracaoNotificacoes,
  CONFIG_NOTIFICACOES_PADRAO,
  obterConfiguracaoNotificacoes,
  salvarConfiguracaoNotificacoes,
  obterPermissaoNotificacao,
  solicitarPermissaoNotificacao,
  calcularLembretesTurnoHoje,
  enviarNotificacaoTeste,
  tocarSomNotificacao,
  isNotificationSupported,
} from "../utils/notificacoesPWA";

interface PainelNotificacoesTurnoProps {
  colaboradorId?: string;
  colaboradorNome?: string;
  horarioTrabalho?: HorarioTrabalhoColab;
  onNotificacaoEnviada?: (titulo: string, msg: string) => void;
}

export const PainelNotificacoesTurno: React.FC<PainelNotificacoesTurnoProps> = ({
  colaboradorId,
  colaboradorNome = "Colaborador",
  horarioTrabalho,
  onNotificacaoEnviada,
}) => {
  const [config, setConfig] = useState<ConfiguracaoNotificacoes>(() =>
    obterConfiguracaoNotificacoes(colaboradorId)
  );
  const [permissao, setPermissao] = useState<NotificationPermission | "unsupported">(() =>
    obterPermissaoNotificacao()
  );
  const [solicitando, setSolicitando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [painelExpandido, setPainelExpandido] = useState(true);
  const [horaAtual, setHoraAtual] = useState(new Date());

  // Atualiza hora atual a cada 10 segundos para atualizar status dos lembretes
  useEffect(() => {
    const timer = setInterval(() => {
      setHoraAtual(new Date());
      setPermissao(obterPermissaoNotificacao());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Recarrega configuração quando muda o colaborador
  useEffect(() => {
    setConfig(obterConfiguracaoNotificacoes(colaboradorId));
    setPermissao(obterPermissaoNotificacao());
  }, [colaboradorId]);

  const atualizarConfig = (novosValores: Partial<ConfiguracaoNotificacoes>) => {
    const atualizada = { ...config, ...novosValores };
    setConfig(atualizada);
    salvarConfiguracaoNotificacoes(atualizada, colaboradorId);
  };

  const handlePedirPermissao = async () => {
    setSolicitando(true);
    try {
      const res = await solicitarPermissaoNotificacao();
      setPermissao(res);
      if (res === "granted") {
        atualizarConfig({ ativo: true });
        if (onNotificacaoEnviada) {
          onNotificacaoEnviada(
            "Permissão Concedida!",
            "Os lembretes de ponto estão ativados para o seu expediente."
          );
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSolicitando(false);
    }
  };

  const handleTestar = async () => {
    setTestando(true);
    try {
      const sucesso = await enviarNotificacaoTeste(colaboradorNome);
      setPermissao(obterPermissaoNotificacao());
      if (sucesso && onNotificacaoEnviada) {
        onNotificacaoEnviada(
          "Notificação Enviada!",
          "Verifique a barra de notificações do seu celular ou computador."
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTestando(false);
    }
  };

  const lembretes = calcularLembretesTurnoHoje(horarioTrabalho, config, horaAtual);

  const suportado = isNotificationSupported();

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-sky-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden transition-all">
      {/* Luz ambiente de destaque no fundo */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cabeçalho do Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 relative z-10">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            {config.ativo && permissao === "granted" ? (
              <BellRing className="w-6 h-6 animate-pulse" />
            ) : (
              <Bell className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Notificações de Horário de Ponto
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                PWA Push
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Avisos no celular e computador nos horários de entrada, almoço e saída de {colaboradorNome}.
            </p>
          </div>
        </div>

        {/* Botão de Toggle de Expansão e Teste Rápido */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleTestar}
            disabled={testando}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            title="Disparar notificação de teste agora"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {testando ? "Enviando..." : "Testar Alerta"}
          </button>

          <button
            type="button"
            onClick={() => setPainelExpandido(!painelExpandido)}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title={painelExpandido ? "Recolher configurações" : "Expandir configurações"}
          >
            {painelExpandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Banner de Status de Permissão */}
      <div className="mt-4 relative z-10">
        {!suportado ? (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-300 flex items-center gap-3 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <strong className="block font-bold">Navegador Sem Suporte a Notificações</strong>
              <span>Instale o aplicativo (PWA) ou utilize o Google Chrome / Edge / Safari 16.4+.</span>
            </div>
          </div>
        ) : permissao === "granted" ? (
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Permissão Concedida:</strong> O navegador está autorizado a emitir notificações de ponto.
              </span>
            </div>
            <span className="hidden sm:inline-flex text-[11px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Pronto para tocar
            </span>
          </div>
        ) : permissao === "denied" ? (
          <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/30 text-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <BellOff className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <strong>Notificações Bloqueadas:</strong> O navegador bloqueou os alertas para este site.
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  Para reativar, clique no ícone de cadeado na barra de endereços e altere 'Notificações' para 'Permitir'.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-sky-950/50 border border-sky-500/30 text-sky-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <strong>Ativar Notificações no Dispositivo:</strong>
                <span className="block text-slate-400 text-[11px]">
                  Receba alertas automáticos antes do início e término de cada turno de trabalho.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePedirPermissao}
              disabled={solicitando}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-lg shadow-sky-600/30 shrink-0 transition-all cursor-pointer"
            >
              {solicitando ? "Solicitando..." : "🔔 Permitir Alertas"}
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo Configurável */}
      <AnimatePresence>
        {painelExpandido && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-5 pt-5 relative z-10"
          >
            {/* Controles Principais: Ativação, Antecedência e Som */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Toggle Master */}
              <div
                onClick={() => atualizarConfig({ ativo: !config.ativo })}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  config.ativo
                    ? "bg-slate-950 border-sky-500/50 shadow-md shadow-sky-950/30"
                    : "bg-slate-950/60 border-slate-800 opacity-60"
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-white block">Sistema de Alertas</span>
                  <span className="text-[11px] text-slate-400">
                    {config.ativo ? "Alertas programados ativos" : "Alertas pausados"}
                  </span>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-colors relative p-1 ${
                    config.ativo ? "bg-sky-600" : "bg-slate-800"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      config.ativo ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {/* Antecedência do Alerta */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Antecedência do Aviso</span>
                  <span className="text-[11px] text-sky-400 font-mono font-bold">
                    {config.antecedenciaMinutos === 0
                      ? "No horário exato"
                      : `${config.antecedenciaMinutos} min antes`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[11px] font-mono">
                  {[0, 5, 10, 15].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => atualizarConfig({ antecedenciaMinutos: min })}
                      className={`py-1 rounded-lg font-bold transition-all ${
                        config.antecedenciaMinutos === min
                          ? "bg-sky-600 text-white shadow-sm shadow-sky-600/30"
                          : "bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      {min === 0 ? "Exato" : `${min}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Som e Vibração */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white block">Áudio & Vibração</span>
                  <span className="text-[11px] text-slate-400">Chime harmônico no aviso</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const novoSom = !config.somAtivo;
                      atualizarConfig({ somAtivo: novoSom });
                      if (novoSom) tocarSomNotificacao();
                    }}
                    className={`p-2 rounded-xl border transition-all ${
                      config.somAtivo
                        ? "bg-sky-600/20 border-sky-500/40 text-sky-400"
                        : "bg-slate-900 border-slate-800 text-slate-500"
                    }`}
                    title={config.somAtivo ? "Som ativado (clique para mutar)" : "Som desativado"}
                  >
                    {config.somAtivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => atualizarConfig({ vibrar: !config.vibrar })}
                    className={`p-2 rounded-xl border transition-all ${
                      config.vibrar
                        ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                        : "bg-slate-900 border-slate-800 text-slate-500"
                    }`}
                    title={config.vibrar ? "Vibração ativada" : "Vibração desativada"}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Seleção dos 4 Momentos de Batida */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Momentos do Expediente para Notificar
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  {
                    key: "lembreteEntrada" as const,
                    label: "Início do Turno",
                    desc: "Entrada 1",
                    cor: "sky",
                  },
                  {
                    key: "lembreteAlmocoSaida" as const,
                    label: "Saída Almoço",
                    desc: "Início do intervalo",
                    cor: "amber",
                  },
                  {
                    key: "lembreteAlmocoRetorno" as const,
                    label: "Retorno Almoço",
                    desc: "Fim do intervalo",
                    cor: "emerald",
                  },
                  {
                    key: "lembreteSaida" as const,
                    label: "Fim do Expediente",
                    desc: "Saída 2",
                    cor: "purple",
                  },
                ].map((item) => {
                  const ativo = Boolean(config[item.key]);
                  return (
                    <label
                      key={item.key}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        ativo
                          ? "bg-slate-950 border-slate-700 shadow-sm"
                          : "bg-slate-950/40 border-slate-800/80 opacity-50"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">{item.label}</span>
                        <span className="text-[11px] text-slate-400">{item.desc}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={ativo}
                        onChange={(e) => atualizarConfig({ [item.key]: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700 focus:ring-sky-500 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Cronograma de Hoje do Colaborador */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Cronograma de Notificações para Hoje
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {horaAtual.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {lembretes.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  Hoje é dia de folga ou descanso para este colaborador. Nenhuma notificação programada.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {lembretes.map((l) => (
                    <div
                      key={l.id}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        l.status === "proximo"
                          ? "bg-sky-950/50 border-sky-500/50 shadow-md shadow-sky-950/40"
                          : l.status === "passou"
                          ? "bg-slate-900/50 border-slate-800/80 opacity-60"
                          : l.status === "desativado"
                          ? "bg-slate-900/30 border-slate-900 opacity-40"
                          : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-slate-200 truncate">{l.titulo}</span>
                        {l.status === "proximo" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-slate-950 animate-pulse font-mono shrink-0">
                            Próximo
                          </span>
                        ) : l.status === "passou" ? (
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">Passou</span>
                        ) : l.status === "desativado" ? (
                          <span className="text-[10px] text-slate-600 font-mono shrink-0">Inativo</span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-mono shrink-0">Agendado</span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-800/60">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Horário Ponto</span>
                          <span className="font-mono font-bold text-white text-sm">{l.horaNominal}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-sky-400/80 block">Disparo Alerta</span>
                          <span className="font-mono font-bold text-sky-300 text-sm">{l.horaAlerta}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Informações PWA e Garantia de Funcionamento */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Alertas integrados via <strong>Service Worker PWA</strong> com redirecionamento direto para a tela de registro de ponto.
                </span>
              </div>
              <button
                type="button"
                onClick={handlePedirPermissao}
                className="text-sky-400 hover:text-sky-300 underline font-semibold cursor-pointer shrink-0"
              >
                Rever Permissões
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
