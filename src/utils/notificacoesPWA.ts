// Utilitário de Notificações Push & Alertas de Turno PWA
// Sistema Ponto A&C

import { HorarioTrabalhoColab, DiasSemanaChave } from "../lib/calculosPonto";

export interface ConfiguracaoNotificacoes {
  ativo: boolean;
  antecedenciaMinutos: number; // 0, 5, 10, 15
  lembreteEntrada: boolean;
  lembreteAlmocoSaida: boolean;
  lembreteAlmocoRetorno: boolean;
  lembreteSaida: boolean;
  somAtivo: boolean;
  vibrar: boolean;
}

export const CONFIG_NOTIFICACOES_PADRAO: ConfiguracaoNotificacoes = {
  ativo: true,
  antecedenciaMinutos: 5,
  lembreteEntrada: true,
  lembreteAlmocoSaida: true,
  lembreteAlmocoRetorno: true,
  lembreteSaida: true,
  somAtivo: true,
  vibrar: true,
};

export interface LembreteTurnoItem {
  id: "entrada" | "almocoSaida" | "almocoRetorno" | "saida";
  titulo: string;
  subtitulo: string;
  horaNominal: string;
  horaAlerta: string;
  minutosNominal: number;
  minutosAlerta: number;
  status: "passou" | "proximo" | "futuro" | "desativado";
  mensagem: string;
}

// Chave do localStorage para configurações
const STORAGE_PREFIX = "ponto_aec_notificacoes_config";

export function obterConfiguracaoNotificacoes(colaboradorId?: string): ConfiguracaoNotificacoes {
  const chave = colaboradorId ? `${STORAGE_PREFIX}_${colaboradorId}` : `${STORAGE_PREFIX}_global`;
  try {
    const salvo = localStorage.getItem(chave);
    if (salvo) {
      return { ...CONFIG_NOTIFICACOES_PADRAO, ...JSON.parse(salvo) };
    }
  } catch (e) {
    console.warn("Erro ao ler configuração de notificações", e);
  }
  return CONFIG_NOTIFICACOES_PADRAO;
}

export function salvarConfiguracaoNotificacoes(
  config: ConfiguracaoNotificacoes,
  colaboradorId?: string
): void {
  const chave = colaboradorId ? `${STORAGE_PREFIX}_${colaboradorId}` : `${STORAGE_PREFIX}_global`;
  try {
    localStorage.setItem(chave, JSON.stringify(config));
  } catch (e) {
    console.warn("Erro ao salvar configuração de notificações", e);
  }
}

// Verifica se a API de notificações é suportada
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

// Retorna o status atual da permissão
export function obterPermissaoNotificacao(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

// Solicita permissão do navegador para notificações
export async function solicitarPermissaoNotificacao(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error("Notificações não são suportadas neste navegador.");
  }
  try {
    const permissao = await Notification.requestPermission();
    return permissao;
  } catch (e) {
    console.error("Erro ao solicitar permissão de notificação", e);
    return Notification.permission;
  }
}

// Obtém o registro do Service Worker
export async function obterServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    // Tenta obter o worker já pronto
    const reg = await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.warn("Service worker pronto não localizado, tentando obter registro:", e);
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) return registrations[0];
    } catch (err) {}
    return null;
  }
}

// Sintetizador de áudio Web Audio API (Chime harmônico suave para alerta de ponto)
export function tocarSomNotificacao(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const agora = ctx.currentTime;

    // Primeiro tom suave (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, agora);
    gain1.gain.setValueAtTime(0, agora);
    gain1.gain.linearRampToValueAtTime(0.25, agora + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, agora + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(agora);
    osc1.stop(agora + 0.36);

    // Segundo tom harmônico agudo (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, agora + 0.15);
    gain2.gain.setValueAtTime(0, agora + 0.15);
    gain2.gain.linearRampToValueAtTime(0.3, agora + 0.19);
    gain2.gain.exponentialRampToValueAtTime(0.001, agora + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(agora + 0.15);
    osc2.stop(agora + 0.66);

    // Fechar contexto após tocar
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1000);
  } catch (e) {
    console.warn("Não foi possível reproduzir som de notificação:", e);
  }
}

// Dispara vibração do aparelho móvel
export function vibrarDispositivo(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 200]);
    } catch (e) {}
  }
}

// Dispara notificação usando o Service Worker ou a Notification API nativa
export async function dispararNotificacaoPWA(options: {
  titulo: string;
  mensagem: string;
  tipo?: string;
  url?: string;
  tag?: string;
  tocarSom?: boolean;
  vibrar?: boolean;
}): Promise<boolean> {
  const permissao = obterPermissaoNotificacao();
  if (permissao !== "granted") {
    console.warn("Notificação ignorada: permissão não concedida");
    return false;
  }

  // Tocar áudio se solicitado
  if (options.tocarSom !== false) {
    tocarSomNotificacao();
  }

  // Vibrar dispositivo se solicitado
  if (options.vibrar !== false) {
    vibrarDispositivo();
  }

  const notificationOptions = {
    body: options.mensagem,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: options.tag || "ponto-turno-lembrete",
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: options.url || "/?aba=baterPonto",
      tipo: options.tipo || "lembrete",
      timestamp: Date.now(),
    },
    actions: [
      {
        action: "bater_ponto",
        title: "⏱️ Bater Ponto Agora",
      },
      {
        action: "fechar",
        title: "Dispensar",
      },
    ],
  };

  // 1. Tenta usar o Service Worker (melhor suporte para PWAs em segundo plano e mobile)
  const reg = await obterServiceWorkerRegistration();
  if (reg && "showNotification" in reg) {
    try {
      await reg.showNotification(options.titulo, notificationOptions);
      return true;
    } catch (e) {
      console.warn("Falha ao exibir notificação via Service Worker, tentando fallback:", e);
    }
  }

  // 2. Fallback para Notification API nativa da janela
  try {
    const notif = new Notification(options.titulo, {
      body: options.mensagem,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: options.tag || "ponto-turno-lembrete",
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch (e) {
    console.error("Falha ao emitir notificação nativa:", e);
    return false;
  }
}

// Converte string "HH:MM" em minutos do dia
function horaParaMinutos(horaStr: string): number {
  if (!horaStr || !horaStr.includes(":")) return 0;
  const [h, m] = horaStr.split(":").map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

// Converte minutos do dia em "HH:MM"
function minutosParaHoraStr(minutos: number): string {
  const norm = ((minutos % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Obtém a sigla do dia da semana atual (Seg, Ter, Qua, Qui, Sex, Sáb, Dom)
export function obterDiaSemanaChaveHoje(data = new Date()): DiasSemanaChave {
  const d = data.getDay(); // 0 = Domingo, 1 = Segunda, ...
  const mapa: Record<number, DiasSemanaChave> = {
    0: "Dom",
    1: "Seg",
    2: "Ter",
    3: "Qua",
    4: "Qui",
    5: "Sex",
    6: "Sáb",
  };
  return mapa[d] || "Seg";
}

// Calcula os horários de trabalho efetivos para hoje
export function obterHorarioTrabalhoHoje(
  horario?: HorarioTrabalhoColab
): {
  ativo: boolean;
  entrada: string;
  almocoSaida: string;
  almocoRetorno: string;
  saida: string;
} {
  const padrao = {
    ativo: true,
    entrada: "08:00",
    almocoSaida: "12:00",
    almocoRetorno: "13:00",
    saida: "17:00",
  };

  if (!horario) return padrao;

  const diaChave = obterDiaSemanaChaveHoje();

  // Verifica configuração individual por dia
  if (horario.diferenciarPorDia && horario.diasSemanaConfig && horario.diasSemanaConfig[diaChave]) {
    const cfg = horario.diasSemanaConfig[diaChave];
    return {
      ativo: Boolean(cfg.ativo),
      entrada: cfg.entrada || "08:00",
      almocoSaida: cfg.almocoSaida || "12:00",
      almocoRetorno: cfg.almocoRetorno || "13:00",
      saida: cfg.saida || "17:00",
    };
  }

  // Verifica sábado
  if (diaChave === "Sáb") {
    if (horario.sabadoAtivo) {
      return {
        ativo: true,
        entrada: horario.sabadoEntrada || "08:00",
        almocoSaida: horario.sabadoSaida || "12:00",
        almocoRetorno: horario.sabadoSaida || "12:00",
        saida: horario.sabadoSaida || "12:00",
      };
    } else {
      return { ...padrao, ativo: false };
    }
  }

  // Domingo padrão é folga
  if (diaChave === "Dom") {
    return { ...padrao, ativo: false };
  }

  return {
    ativo: true,
    entrada: horario.entrada || "08:00",
    almocoSaida: horario.almocoSaida || "12:00",
    almocoRetorno: horario.almocoRetorno || "13:00",
    saida: horario.saida || "17:00",
  };
}

// Calcula os 4 lembretes diários e seus respectivos status para o colaborador
export function calcularLembretesTurnoHoje(
  horario?: HorarioTrabalhoColab,
  config?: ConfiguracaoNotificacoes,
  agora = new Date()
): LembreteTurnoItem[] {
  const cfg = config || CONFIG_NOTIFICACOES_PADRAO;
  const horarioHoje = obterHorarioTrabalhoHoje(horario);

  if (!horarioHoje.ativo) {
    return [];
  }

  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const antecedencia = cfg.antecedenciaMinutos || 0;

  const listaBruta: {
    id: "entrada" | "almocoSaida" | "almocoRetorno" | "saida";
    titulo: string;
    subtitulo: string;
    horaNominal: string;
    ativoNoConfig: boolean;
    mensagemTurno: string;
  }[] = [
    {
      id: "entrada",
      titulo: "Início do Expediente (Entrada)",
      subtitulo: "1ª Marcação do dia",
      horaNominal: horarioHoje.entrada,
      ativoNoConfig: cfg.lembreteEntrada,
      mensagemTurno:
        antecedencia > 0
          ? `Seu expediente começa em ${antecedencia} minutos (às ${horarioHoje.entrada}). Prepare-se para registrar seu ponto!`
          : `Horário de início de expediente (${horarioHoje.entrada}). Não se esqueça de registrar seu ponto de entrada!`,
    },
    {
      id: "almocoSaida",
      titulo: "Saída para Almoço / Intervalo",
      subtitulo: "2ª Marcação do dia",
      horaNominal: horarioHoje.almocoSaida,
      ativoNoConfig: cfg.lembreteAlmocoSaida,
      mensagemTurno:
        antecedencia > 0
          ? `Seu intervalo de almoço inicia em ${antecedencia} minutos (às ${horarioHoje.almocoSaida}).`
          : `Horário de almoço (${horarioHoje.almocoSaida}). Registre sua saída para descanso!`,
    },
    {
      id: "almocoRetorno",
      titulo: "Retorno do Almoço",
      subtitulo: "3ª Marcação do dia",
      horaNominal: horarioHoje.almocoRetorno,
      ativoNoConfig: cfg.lembreteAlmocoRetorno,
      mensagemTurno:
        antecedencia > 0
          ? `Seu intervalo termina em ${antecedencia} minutos (às ${horarioHoje.almocoRetorno}). Prepare-se para voltar!`
          : `Fim do intervalo de almoço (${horarioHoje.almocoRetorno}). Registre o retorno às atividades!`,
    },
    {
      id: "saida",
      titulo: "Fim do Expediente (Saída)",
      subtitulo: "4ª Marcação do dia",
      horaNominal: horarioHoje.saida,
      ativoNoConfig: cfg.lembreteSaida,
      mensagemTurno:
        antecedencia > 0
          ? `Seu expediente se encerra em ${antecedencia} minutos (às ${horarioHoje.saida}).`
          : `Horário de término do expediente (${horarioHoje.saida}). Registre sua saída e tenha um bom descanso!`,
    },
  ];

  let proximoMarcado = false;

  return listaBruta.map((item) => {
    const minNominal = horaParaMinutos(item.horaNominal);
    const minAlerta = minNominal - antecedencia;
    const horaAlertaStr = minutosParaHoraStr(minAlerta);

    let status: "passou" | "proximo" | "futuro" | "desativado" = "futuro";

    if (!cfg.ativo || !item.ativoNoConfig) {
      status = "desativado";
    } else if (minutosAgora > minAlerta + 5) {
      status = "passou";
    } else if (!proximoMarcado && minutosAgora <= minAlerta + 5) {
      status = "proximo";
      proximoMarcado = true;
    }

    return {
      id: item.id,
      titulo: item.titulo,
      subtitulo: item.subtitulo,
      horaNominal: item.horaNominal,
      horaAlerta: horaAlertaStr,
      minutosNominal: minNominal,
      minutosAlerta: minAlerta,
      status,
      mensagem: item.mensagemTurno,
    };
  });
}

// Verifica se há algum alerta devido no minuto atual e dispara caso ainda não tenha sido emitido hoje
export async function verificarEAlertarTurno(
  colaboradorId: string,
  colaboradorNome: string,
  horario?: HorarioTrabalhoColab,
  config?: ConfiguracaoNotificacoes
): Promise<LembreteTurnoItem | null> {
  const cfg = config || obterConfiguracaoNotificacoes(colaboradorId);
  if (!cfg.ativo) return null;

  const permissao = obterPermissaoNotificacao();
  if (permissao !== "granted") return null;

  const agora = new Date();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const dataHojeStr = agora.toISOString().split("T")[0]; // YYYY-MM-DD

  const lembretes = calcularLembretesTurnoHoje(horario, cfg, agora);

  for (const item of lembretes) {
    if (item.status === "desativado") continue;

    // Dispara se estamos no minuto exato do alerta ou até 2 minutos depois (margem para timers em background)
    const diff = minutosAgora - item.minutosAlerta;
    if (diff >= 0 && diff <= 2) {
      const storageKey = `ponto_aec_disparado_${colaboradorId}_${dataHojeStr}_${item.id}`;
      const jaDisparou = localStorage.getItem(storageKey);

      if (!jaDisparou) {
        localStorage.setItem(storageKey, new Date().toISOString());

        await dispararNotificacaoPWA({
          titulo: `⏰ Ponto A&C — ${item.titulo}`,
          mensagem: `${colaboradorNome}: ${item.mensagem}`,
          tipo: item.id,
          tag: `turno_${item.id}_${colaboradorId}`,
          tocarSom: cfg.somAtivo,
          vibrar: cfg.vibrar,
          url: "/?aba=baterPonto",
        });

        return item;
      }
    }
  }

  return null;
}

// Envia uma notificação imediata de demonstração/teste
export async function enviarNotificacaoTeste(colaboradorNome = "Colaborador"): Promise<boolean> {
  const permissao = obterPermissaoNotificacao();
  if (permissao !== "granted") {
    const res = await solicitarPermissaoNotificacao();
    if (res !== "granted") {
      return false;
    }
  }

  return await dispararNotificacaoPWA({
    titulo: "🔔 Ponto A&C — Teste de Notificação",
    mensagem: `Olá, ${colaboradorNome}! O sistema de alertas de ponto do PWA está ativo e funcionando perfeitamente com som e vibração.`,
    tipo: "teste",
    tag: "ponto-aec-teste",
    tocarSom: true,
    vibrar: true,
    url: "/?aba=baterPonto",
  });
}
