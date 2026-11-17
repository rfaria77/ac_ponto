import React, { useEffect, useState } from "react";
import {
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Navigation,
  Check,
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
  tipoComprovante: ComprovantePonto["tipoBatida"];
  acaoRotulo: string;
}

const ETAPAS_BATIDA: EtapaBatidaConfig[] = [
  {
    campo: "entrada1",
    etapaCurta: "1ª Batida",
    titulo: "Entrada 1",
    tipoComprovante: "Entrada 1",
    acaoRotulo: "Bater Entrada",
  },
  {
    campo: "saida1",
    etapaCurta: "2ª Batida",
    titulo: "Saída Almoço",
    tipoComprovante: "Saída Almoço",
    acaoRotulo: "Bater Almoço",
  },
  {
    campo: "entrada2",
    etapaCurta: "3ª Batida",
    titulo: "Retorno Almoço",
    tipoComprovante: "Retorno Almoço",
    acaoRotulo: "Bater Retorno",
  },
  {
    campo: "saida2",
    etapaCurta: "4ª Batida",
    titulo: "Saída Expediente",
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

export const RelogioPortalAtual: React.FC = () => {
  const [agora, setAgora] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setAgora(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="text-3xl sm:text-4xl font-mono tabular-nums font-extrabold text-white tracking-tight">
        {agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-xs text-slate-400 mt-1 capitalize">
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
  const [leituraGps, setLeituraGps] = useState<LeituraGeolocalizacao | null>(null);
  const [verificandoSinal, setVerificandoSinal] = useState<boolean>(false);
  const [campoCapturando, setCampoCapturando] = useState<CampoPortalBatida | null>(null);

  const verificarSinalGps = async () => {
    if (verificandoSinal || campoCapturando) return;
    setVerificandoSinal(true);
    const leitura = await capturarGeolocalizacaoTempoReal(8000);
    setLeituraGps(leitura);
    setVerificandoSinal(false);
  };

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

  // Identifica automaticamente qual é a próxima batida pendente
  const proximaEtapa: EtapaBatidaConfig | null =
    ETAPAS_BATIDA.find((etapa) => !batidaDoDia?.[etapa.campo]) || null;

  const totalBatidasHoje = ETAPAS_BATIDA.filter((etapa) =>
    Boolean(batidaDoDia?.[etapa.campo])
  ).length;

  const executarBatida = async (campo: CampoPortalBatida) => {
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

  const obterComprovanteDaEtapa = (tipoBatida: ComprovantePonto["tipoBatida"]) => {
    return comprovantesDoDia.find((c) => c.tipoBatida === tipoBatida);
  };

  return (
    <div className="space-y-6">
      {/* 1. Terminal Central: Relógio + Ação Principal com GPS Integrado */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-5 shadow-inner relative overflow-hidden">
        {/* Glow sutil */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Relógio Digital */}
        <RelogioPortalAtual />

        {/* Botão de Ação Principal (Hero Action) */}
        <div className="w-full max-w-sm space-y-2">
          {proximaEtapa ? (
            <button
              type="button"
              disabled={campoCapturando !== null}
              onClick={() => executarBatida(proximaEtapa.campo)}
              className="w-full py-4 px-6 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60 active:scale-[0.99]"
            >
              {campoCapturando === proximaEtapa.campo ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Obtendo GPS e Registrando...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  <span>Registrar {proximaEtapa.titulo}</span>
                </>
              )}
            </button>
          ) : (
            <div className="py-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Jornada Completa: 4 de 4 batidas registradas hoje!</span>
            </div>
          )}

          {/* Status do GPS (Discreto, 1 linha, sem poluição) */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            {buscandoGps && !leituraGps ? (
              <span className="flex items-center gap-1.5 text-sky-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verificando sinal GPS...</span>
              </span>
            ) : leituraGps?.nivelPrecisao === "indisponivel" ? (
              <span className="flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>GPS Indisponível (sem permissão)</span>
              </span>
            ) : leituraGps ? (
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>
                  {leituraGps.dentroDaSede ? "Na sede" : "Local externo"}
                  {leituraGps.precisaoMetros !== undefined && ` · ±${leituraGps.precisaoMetros}m`}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-[11px] text-emerald-400 font-medium">GPS Ativo</span>
              </span>
            ) : null}

            <button
              type="button"
              disabled={buscandoGps}
              onClick={verificarSinalGps}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
              title="Calibrar sinal GPS"
            >
              <RefreshCw className={`w-3 h-3 ${verificandoSinal ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Timeline das 4 Batidas do Dia (Design Linear, Limpo e Intuitivo) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">
            Jornada de {dataReferenciaStr}
          </span>
          <span className="font-mono tabular-nums text-[11px]">
            {totalBatidasHoje} de 4 registradas
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ETAPAS_BATIDA.map((etapa, idx) => {
            const horaRegistrada = batidaDoDia?.[etapa.campo] || "";
            const jaRegistrada = Boolean(horaRegistrada);
            const ehProxima = proximaEtapa?.campo === etapa.campo;
            const estaCapturandoEsta = campoCapturando === etapa.campo;
            const compEtapa = obterComprovanteDaEtapa(etapa.tipoComprovante);
            const precisaoEtapa = compEtapa?.geolocalizacao?.precisaoMetros;

            return (
              <div
                key={etapa.campo}
                onClick={() => {
                  if (campoCapturando === null) {
                    executarBatida(etapa.campo);
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                  ehProxima
                    ? "bg-sky-950/40 border-sky-500/50 hover:border-sky-400 shadow-sm"
                    : jaRegistrada
                    ? "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    : "bg-slate-950/30 border-slate-800/60 opacity-60 hover:opacity-100 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {idx + 1}ª · {etapa.titulo}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                      estaCapturandoEsta
                        ? "bg-sky-500 text-white"
                        : jaRegistrada
                        ? "bg-emerald-500/20 text-emerald-400"
                        : ehProxima
                        ? "bg-sky-500/20 text-sky-300"
                        : "bg-slate-900 text-slate-500"
                    }`}
                  >
                    {estaCapturandoEsta ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : jaRegistrada ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-lg font-mono tabular-nums font-bold text-white">
                    {jaRegistrada ? horaRegistrada : "--:--"}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {jaRegistrada ? (
                      <span className="text-emerald-400">
                        Gravado {precisaoEtapa !== undefined ? `(±${precisaoEtapa}m)` : ""}
                      </span>
                    ) : ehProxima ? (
                      <span className="text-sky-300 font-medium">Clique para bater</span>
                    ) : (
                      <span>Aguardando</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
