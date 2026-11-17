export type NivelPrecisaoGps = "alta" | "media" | "baixa" | "indisponivel";
export type StatusCapturaGps = "ocioso" | "capturando" | "sucesso" | "erro";

export interface LeituraGeolocalizacao {
  lat?: number;
  lon?: number;
  precisaoMetros?: number;
  nivelPrecisao: NivelPrecisaoGps;
  rotuloPrecisao: string;
  descricaoPrecisao: string;
  distanciaMetros?: number;
  dentroDaSede?: boolean;
  endereco: string;
  capturadaEmIso: string;
  capturadaHoraTexto: string;
  status: StatusCapturaGps;
  erroMensagem?: string;
  fonte: "gps_tempo_real" | "fallback_sem_gps";
}

export const SEDE_EMPRESA_PADRAO = {
  nome: "Base Tupaciguara MG — Rua Modesto Alves Prudente, 266",
  lat: -18.59969,
  lon: -48.016335,
  raioPermitidoMetros: 200,
};

/**
 * Calcula a distância em metros entre duas coordenadas (fórmula de Haversine).
 */
export function calcularDistanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Classifica o nível de precisão do sinal GPS com base no raio de erro em metros.
 */
export function classificarPrecisaoGps(precisaoMetros?: number): {
  nivel: NivelPrecisaoGps;
  rotulo: string;
  descricao: string;
} {
  if (
    precisaoMetros === undefined ||
    precisaoMetros === null ||
    Number.isNaN(precisaoMetros)
  ) {
    return {
      nivel: "indisponivel",
      rotulo: "GPS Indisponível",
      descricao: "Não foi possível obter a precisão do sinal de localização.",
    };
  }

  const metros = Math.round(precisaoMetros);

  if (metros <= 25) {
    return {
      nivel: "alta",
      rotulo: "Sinal Forte · Alta Precisão",
      descricao: `Localização exata por satélite/GPS (margem de ±${metros} m).`,
    };
  }

  if (metros <= 100) {
    return {
      nivel: "media",
      rotulo: "Sinal Moderado · Precisão Média",
      descricao: `Localização aproximada por Wi-Fi/rede móvel (margem de ±${metros} m).`,
    };
  }

  return {
    nivel: "baixa",
    rotulo: "Sinal Fraco · Baixa Precisão",
    descricao: `Sinal impreciso por antena/IP (margem de ±${metros} m). Aproxime-se de área aberta se possível.`,
  };
}

export function formatarDistanciaLegivel(distanciaMetros?: number): string {
  if (distanciaMetros === undefined || distanciaMetros === null) {
    return "Distância não medida";
  }
  if (distanciaMetros >= 1000) {
    return `${(distanciaMetros / 1000).toFixed(1).replace(".", ",")} km da sede`;
  }
  return `${distanciaMetros} m da sede`;
}

/**
 * Captura a geolocalização do dispositivo em tempo real no momento exato da chamada.
 */
export function capturarGeolocalizacaoTempoReal(
  timeoutMs = 10000
): Promise<LeituraGeolocalizacao> {
  return new Promise((resolve) => {
    const agora = new Date();
    const horaTexto = agora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({
        nivelPrecisao: "indisponivel",
        rotuloPrecisao: "GPS Não Suportado",
        descricaoPrecisao: "Este navegador ou dispositivo não oferece suporte à API de geolocalização.",
        endereco: "Geolocalização não suportada pelo dispositivo",
        capturadaEmIso: agora.toISOString(),
        capturadaHoraTexto: horaTexto,
        status: "erro",
        erroMensagem: "Navegador sem suporte a geolocalização.",
        fonte: "fallback_sem_gps",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const capturaMomento = new Date();
        const capturaHora = capturaMomento.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const lat = Number(position.coords.latitude.toFixed(6));
        const lon = Number(position.coords.longitude.toFixed(6));
        const precisaoMetros = Math.max(1, Math.round(position.coords.accuracy));
        const classificacao = classificarPrecisaoGps(precisaoMetros);
        const distanciaMetros = calcularDistanciaMetros(
          lat,
          lon,
          SEDE_EMPRESA_PADRAO.lat,
          SEDE_EMPRESA_PADRAO.lon
        );
        const dentroDaSede = distanciaMetros <= SEDE_EMPRESA_PADRAO.raioPermitidoMetros;

        const endereco = dentroDaSede
          ? `${SEDE_EMPRESA_PADRAO.nome} (GPS ±${precisaoMetros} m)`
          : `Lat ${lat.toFixed(5)}, Lon ${lon.toFixed(5)} (${formatarDistanciaLegivel(distanciaMetros)})`;

        resolve({
          lat,
          lon,
          precisaoMetros,
          nivelPrecisao: classificacao.nivel,
          rotuloPrecisao: classificacao.rotulo,
          descricaoPrecisao: classificacao.descricao,
          distanciaMetros,
          dentroDaSede,
          endereco,
          capturadaEmIso: capturaMomento.toISOString(),
          capturadaHoraTexto: capturaHora,
          status: "sucesso",
          fonte: "gps_tempo_real",
        });
      },
      (error) => {
        const erroMomento = new Date();
        const erroHora = erroMomento.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        let erroMensagem = "Não foi possível capturar a localização GPS.";
        if (error.code === error.PERMISSION_DENIED) {
          erroMensagem = "Permissão de localização negada no navegador. Libere o acesso ao GPS para registrar coordenadas reais.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          erroMensagem = "Sinal GPS indisponível no dispositivo neste momento.";
        } else if (error.code === error.TIMEOUT) {
          erroMensagem = "Tempo esgotado ao aguardar o sinal de satélite GPS.";
        }

        resolve({
          nivelPrecisao: "indisponivel",
          rotuloPrecisao: "GPS Indisponível",
          descricaoPrecisao: erroMensagem,
          endereco: "Localização GPS não capturada (sem permissão ou sinal)",
          capturadaEmIso: erroMomento.toISOString(),
          capturadaHoraTexto: erroHora,
          status: "erro",
          erroMensagem,
          fonte: "fallback_sem_gps",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  });
}
