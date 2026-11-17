import React, { useEffect, useState } from "react";
import {
  Clock,
  Crosshair,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Zap,
  Navigation,
} from "lucide-react";
import { BatidaDia } from "../lib/calculosPonto";
import { ComprovantePonto } from "../utils/comprovantePonto";
import {
  LeituraGeolocalizacao,
  NivelPrecisaoGps,
  capturarGeolocalizacaoTempoReal,
  formatarDistanciaLegivel,
} from "../utils/geolocalizacao";

export type CampoPortalBatida = "entrada1" | "saida1" | "entrada2" | "saida2";

interface EtapaBatidaConfig {
  campo: CampoPortalBatida;
  etapaCurta: string;
  titulo: string;
  subtitulo: string;
  tipoComprovante: ComprovantePonto["tipoBatida"];
  acaoRotulo: string;
}

const ETAPAS_BATIDA: EtapaBatidaConfig[] = [
  {
    campo: "entrada1",
    etapaCurta: "1º Horário",
    titulo: "Entrada 1",
    subtitulo: "Início do expediente",
    tipoComprovante: "Entrada 1",
    acaoRotulo: "Bater Entrada",
  },
  {
    campo: "saida1",
    etapaCurta: "Almoço",
    titulo: "Saída Almoço",
    subtitulo: "Início do intervalo",
    tipoComprovante: "Saída Almoço",
    acaoRotulo: "Bater Saída Almoço",
  },
  {
    campo: "entrada2",
    etapaCurta: "Retorno",
    titulo: "Retorno Almoço",
    subtitulo: "Fim do intervalo",
    tipoComprovante: "Retorno Almoço",
    acaoRotulo: "Bater Retorno",
  },
  {
    campo: "saida2",
    etapaCurta: "Fim do Dia",
    titulo: "Saída Expediente",
    subtitulo: "Encerramento da jornada",
    tipoComprovante: "Saída Expediente",
    acaoRotulo: "Bater Saída",
  },
];

interface PortalAtalhoRapidoGPSProps {
  colaboradorId: string;
  colaboradorNome: string;
  dataReferenciaStr: string; // DD/MM/AAAA
  batidaDoDia?: BatidaDia;
  comprovantesDoDia: ComprovantePonto[];
  onRegistrarBatidaComGps: (
    campo: CampoPortalBatida,
    leituraGps: LeituraGeolocalizacao
  ) => Promise<void> | void;
}

function getEstiloNivelGps(nivel: NivelPrecisaoGps, capturando: boolean) {
  if (capturando) {
    return {
      containerClass: "bg-sky-950/50 border-sky-500/40",
      badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      textClass: "text-sky-300",
      barrasAtivas: 2,
      barColor: "bg-sky-400",
    };
  }
  switch (nivel) {
    case "alta":
      return {
        containerClass: "bg-emerald-950/35 border-emerald-500/35",
        badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        textClass: "text-emerald-300",
        barrasAtivas: 3,
        barColor: "bg-emerald-400",
      };
    case "media":
      return {
        containerClass: "bg-sky-950/45 border-sky-500/35",
        badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
        textClass: "text-sky-300",
        barrasAtivas: 2,
        barColor: "bg-sky-400",
      };
    case "baixa":
      return {
        containerClass: "bg-amber-950/35 border-amber-500/35",
        badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        textClass: "text-amber-300",
        barrasAtivas: 1,
        barColor: "bg-amber-400",
      };
    default:
      return {
        containerClass: "bg-rose-950/30 border-rose-500/30",
        badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        textClass: "text-rose-300",
        barrasAtivas: 0,
        barColor: "bg-rose-400",
      };
  }
}

export const RelogioPortalAtual: React.FC = () => {
  const [agora, setAgora] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setAgora(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center min-w-[200px] shadow-inner">
      <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Horário Atual</div>
      <div className="text-2xl font-mono tabular-nums font-bold text-sky-400 mt-1">
        {agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-[11px] text-slate-500 mt-1">
        {agora.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
      </div>
    </div>
  );
};

export const PortalAtalhoRapidoGPS: React.FC<PortalAtalhoRapidoGPSProps> = ({
  colaboradorId,
  dataReferenciaStr,
  batidaDoDia,
  comprovantesDoDia,
  onRegistrarBatidaComGps,
}) => {
  const [horaAgora, setHoraAgora] = useState<string>(() =>
    new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  );
  const [leituraGps, setLeituraGps] = useState<LeituraGeolocalizacao | null>(null);
  const [verificandoSinal, setVerificandoSinal] = useState<boolean>(false);
  const [campoCapturando, setCampoCapturando] = useState<CampoPortalBatida | null>(null);

  // Relógio ao vivo isolado neste painel para evitar re-renderizações globais
  useEffect(() => {
    const timer = setInterval(() => {
      setHoraAgora(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const verificarSinalGps = async () => {
    if (verificandoSinal || campoCapturando) return;
    setVerificandoSinal(true);
    const leitura = await capturarGeolocalizacaoTempoReal(9000);
    setLeituraGps(leitura);
    setVerificandoSinal(false);
  };

  // Verifica automaticamente o sinal GPS ao entrar na aba ou trocar de colaborador
  useEffect(() => {
    let ativo = true;
    setVerificandoSinal(true);
    capturarGeolocalizacaoTempoReal(8000).then((leitura) => {
      if (!ativo) return;
      setLeituraGps(leitura);
      setVerificandoSinal(false);
    });
    return () => {
      ativo = false;
    };
  }, [colaboradorId]);

  // Identifica automaticamente qual é a próxima batida pendente no dia
  const proximaEtapa: EtapaBatidaConfig | null =
    ETAPAS_BATIDA.find((etapa) => !batidaDoDia?.[etapa.campo]) || null;

  const totalBatidasHoje = ETAPAS_BATIDA.filter((etapa) =>
    Boolean(batidaDoDia?.[etapa.campo])
  ).length;

  const executarAtalhoRapido = async (campo: CampoPortalBatida) => {
    if (campoCapturando) return;
    setCampoCapturando(campo);
    try {
      const gpsNoMomentoDoClique = await capturarGeolocalizacaoTempoReal(10000);
      setLeituraGps(gpsNoMomentoDoClique);
      await onRegistrarBatidaComGps(campo, gpsNoMomentoDoClique);
    } finally {
      setCampoCapturando(null);
    }
  };

  const buscandoGps = verificandoSinal || campoCapturando !== null;
  const estiloGps = getEstiloNivelGps(
    leituraGps?.nivelPrecisao ?? "indisponivel",
    buscandoGps && !leituraGps
  );

  const obterComprovanteDaEtapa = (tipoBatida: ComprovantePonto["tipoBatida"]) => {
    return comprovantesDoDia.find((c) => c.tipoBatida === tipoBatida);
  };

  return (
    <div className="space-y-5">
      {/* 1. Barra de Status da Precisão do Sinal GPS */}
      <div
        className={`rounded-2xl border p-4 transition-colors ${estiloGps.containerClass}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center shrink-0">
              {buscandoGps ? (
                <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
              ) : leituraGps?.nivelPrecisao === "indisponivel" ? (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              ) : (
                <Crosshair className={`w-5 h-5 ${estiloGps.textClass}`} />
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {campoCapturando
                    ? "Capturando geolocalização para registrar batida..."
                    : verificandoSinal && !leituraGps
                    ? "Verificando precisão do sinal GPS..."
                    : leituraGps?.rotuloPrecisao || "Aguardando leitura de GPS"}
                </span>

                {/* Medidor visual de barras de sinal GPS + raio exato em metros */}
                {leituraGps?.precisaoMetros !== undefined && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-mono tabular-nums font-bold ${estiloGps.badgeClass}`}
                  >
                    <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                      <span
                        className={`w-1 h-1.5 rounded-xs ${
                          estiloGps.barrasAtivas >= 1 ? estiloGps.barColor : "bg-slate-700"
                        }`}
                      />
                      <span
                        className={`w-1 h-2 rounded-xs ${
                          estiloGps.barrasAtivas >= 2 ? estiloGps.barColor : "bg-slate-700"
                        }`}
                      />
                      <span
                        className={`w-1 h-3 rounded-xs ${
                          estiloGps.barrasAtivas >= 3 ? estiloGps.barColor : "bg-slate-700"
                        }`}
                      />
                    </span>
                    ±{leituraGps.precisaoMetros} m
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-300">
                {leituraGps?.status === "sucesso" &&
                leituraGps.lat !== undefined &&
                leituraGps.lon !== undefined ? (
                  <>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-200">
                      <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                      {leituraGps.lat.toFixed(5)}, {leituraGps.lon.toFixed(5)}
                    </span>
                    <span aria-hidden="true" className="text-slate-500">
                      ·
                    </span>
                    <span>
                      {leituraGps.dentroDaSede
                        ? `Na sede (${formatarDistanciaLegivel(leituraGps.distanciaMetros)})`
                        : `Externo (${formatarDistanciaLegivel(leituraGps.distanciaMetros)})`}
                    </span>
                    <span aria-hidden="true" className="text-slate-500">
                      ·
                    </span>
                    <span className="font-mono tabular-nums text-slate-400">
                      Leitura às {leituraGps.capturadaHoraTexto}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-300">
                    {leituraGps?.descricaoPrecisao ||
                      "A localização exata será capturada no momento do clique."}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={buscandoGps}
            onClick={verificarSinalGps}
            className="px-3.5 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verificandoSinal ? "animate-spin" : ""}`} />
            <span>Atualizar GPS</span>
          </button>
        </div>
      </div>

      {/* 2. Card de Atalho Rápido Automático (1 Clique com GPS no momento do clique) */}
      <div className="rounded-2xl bg-slate-950/80 border border-sky-500/30 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-sky-300 font-bold">
            <Zap className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Atalho Rápido · Batida Automática</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-400 font-medium font-mono tabular-nums">
              {dataReferenciaStr} ({totalBatidasHoje}/4 batidas)
            </span>
          </div>

          {proximaEtapa ? (
            <p className="text-sm text-slate-200">
              Próxima batida detectada:{" "}
              <strong className="text-white">{proximaEtapa.titulo}</strong>{" "}
              <span className="text-slate-400 text-xs">
                — captura horário atual (
                <span className="font-mono tabular-nums text-sky-300">{horaAgora}</span>) e
                geolocalização no clique.
              </span>
            </p>
          ) : (
            <p className="text-sm text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              Todas as 4 batidas de {dataReferenciaStr} já foram registradas. Você ainda pode
              atualizar qualquer etapa abaixo se necessário.
            </p>
          )}
        </div>

        {proximaEtapa && (
          <button
            type="button"
            disabled={campoCapturando !== null}
            onClick={() => executarAtalhoRapido(proximaEtapa.campo)}
            className="w-full md:w-auto px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {campoCapturando === proximaEtapa.campo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Capturando GPS e registrando...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Registrar {proximaEtapa.titulo} Agora</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 3. Botões de Atalho Rápido por Etapa (Captura GPS no clique) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {ETAPAS_BATIDA.map((etapa) => {
          const horaRegistrada = batidaDoDia?.[etapa.campo] || "";
          const jaRegistrada = Boolean(horaRegistrada);
          const ehProxima = proximaEtapa?.campo === etapa.campo;
          const estaCapturandoEsta = campoCapturando === etapa.campo;
          const compEtapa = obterComprovanteDaEtapa(etapa.tipoComprovante);
          const precisaoEtapa = compEtapa?.geolocalizacao?.precisaoMetros;

          return (
            <button
              key={etapa.campo}
              type="button"
              disabled={campoCapturando !== null}
              onClick={() => executarAtalhoRapido(etapa.campo)}
              className={`group rounded-2xl p-4 sm:p-5 text-left transition-all border flex flex-col justify-between gap-4 cursor-pointer disabled:opacity-60 ${
                ehProxima
                  ? "bg-sky-950/40 border-sky-400/70 hover:border-sky-300 shadow-lg shadow-sky-600/15"
                  : jaRegistrada
                  ? "bg-slate-950/90 border-emerald-500/35 hover:border-emerald-400/60"
                  : "bg-slate-950/70 border-slate-800 hover:border-sky-500/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold">
                    {etapa.etapaCurta}
                  </div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {etapa.titulo}
                  </div>
                </div>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    estaCapturandoEsta
                      ? "bg-sky-500/20 border-sky-400/40 text-sky-300"
                      : jaRegistrada
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : ehProxima
                      ? "bg-sky-500/20 border-sky-400/40 text-sky-300"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  {estaCapturandoEsta ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : jaRegistrada ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>
              </div>

              <div className="space-y-2.5 w-full">
                {jaRegistrada ? (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono tabular-nums font-bold text-emerald-300">
                      Registrada às {horaRegistrada}
                    </span>
                    {precisaoEtapa !== undefined && (
                      <span className="font-mono tabular-nums text-[11px] text-slate-400">
                        GPS ±{precisaoEtapa} m
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    {ehProxima ? (
                      <span className="text-sky-300 font-semibold">
                        Próxima batida automática
                      </span>
                    ) : (
                      <span>{etapa.subtitulo}</span>
                    )}
                  </div>
                )}

                <span
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                    estaCapturandoEsta
                      ? "bg-sky-600 text-white"
                      : ehProxima
                      ? "bg-sky-600 group-hover:bg-sky-500 text-white"
                      : jaRegistrada
                      ? "bg-slate-900 group-hover:bg-slate-800 text-slate-300 border border-slate-700"
                      : "bg-sky-600/20 group-hover:bg-sky-600 text-sky-300 group-hover:text-white"
                  }`}
                >
                  {estaCapturandoEsta ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Obtendo GPS...</span>
                    </>
                  ) : jaRegistrada ? (
                    <>
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Atualizar com GPS</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{etapa.acaoRotulo}</span>
                    </>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
