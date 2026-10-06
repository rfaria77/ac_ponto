import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "20mb" }));

// Initialize Gemini AI SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy-key",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Haversine formula for distance in meters
function calcularDistanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const raioTerraKm = 6371.0;
  const dlat = ((lat2 - lat1) * Math.PI) / 180;
  const dlon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return raioTerraKm * c * 1000;
}

let sedeConfig = {
  nome: "Matriz São Paulo / Sede Principal",
  lat: -23.550520,
  lon: -46.633308,
  raioMaximoMetros: 150.0,
};

let colaboradores = [
  {
    id: "FUNC_001",
    nome: "Ana Beatriz Souza",
    cargo: "Desenvolvedora Sênior",
    departamento: "Engenharia",
    fotoCadastro: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
    localPermitido: {
      nome: "Matriz São Paulo",
      lat: -23.550520,
      lon: -46.633308,
      raio: 150,
    },
  },
  {
    id: "FUNC_002",
    nome: "Carlos Eduardo Lima",
    cargo: "Analista de Suporte",
    departamento: "Operações",
    fotoCadastro: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    localPermitido: {
      nome: "Filial Paulista",
      lat: -23.561500,
      lon: -46.656000,
      raio: 150,
    },
  },
  {
    id: "FUNC_003",
    nome: "Mariana Costa Silva",
    cargo: "Gerente de Recursos Humanos",
    departamento: "RH",
    fotoCadastro: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    localPermitido: {
      nome: "Matriz São Paulo",
      lat: -23.550520,
      lon: -46.633308,
      raio: 150,
    },
  },
];

let registrosPonto: Array<{
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  timestamp: string;
  tipo: "ENTRADA" | "SAIDA" | "INTERVALO";
  status: "AProvado" | "RECUSADO_GEO" | "RECUSADO_BIO" | "RECUSADO_FOTO_ESTATICA" | "PENDENTE_APROVACAO_LOCAL";
  distanciaMetros: number;
  confiancaBiometrica: number;
  ehFotoAoVivo: boolean;
  justificativa: string;
  selfieUrl: string;
}> = [
  {
    id: "REG_101",
    colaboradorId: "FUNC_001",
    colaboradorNome: "Ana Beatriz Souza",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    tipo: "ENTRADA",
    status: "AProvado",
    distanciaMetros: 12.4,
    confiancaBiometrica: 0.96,
    ehFotoAoVivo: true,
    justificativa: "Alta correspondência facial com traços anatômicos e teste de vivacidade positivo.",
    selfieUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
  },
];

// API Routes
app.get("/api/sede", (req, res) => {
  res.json(sedeConfig);
});

app.post("/api/sede", (req, res) => {
  const { nome, lat, lon, raioMaximoMetros } = req.body;
  if (nome) sedeConfig.nome = nome;
  if (typeof lat === "number") sedeConfig.lat = lat;
  if (typeof lon === "number") sedeConfig.lon = lon;
  if (typeof raioMaximoMetros === "number") sedeConfig.raioMaximoMetros = raioMaximoMetros;
  res.json({ success: true, sede: sedeConfig });
});

app.get("/api/colaboradores", (req, res) => {
  res.json(colaboradores);
});

app.post("/api/colaboradores", (req, res) => {
  const { id, nome, cargo, departamento, fotoCadastro, localPermitido } = req.body;
  const novoColaborador = {
    id: id || `FUNC_00${colaboradores.length + 1}`,
    nome,
    cargo,
    departamento,
    fotoCadastro: fotoCadastro || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
    localPermitido: localPermitido || {
      nome: sedeConfig.nome,
      lat: sedeConfig.lat,
      lon: sedeConfig.lon,
      raio: sedeConfig.raioMaximoMetros,
    },
  };
  colaboradores.push(novoColaborador);
  res.json({ success: true, colaborador: novoColaborador });
});

app.post("/api/colaboradores/local", (req, res) => {
  const { colaboradorId, localPermitido } = req.body;
  const colab = colaboradores.find((c) => c.id === colaboradorId);
  if (!colab) return res.status(404).json({ error: "Colaborador não encontrado" });
  if (localPermitido) colab.localPermitido = localPermitido;
  res.json({ success: true, colaborador: colab });
});

app.get("/api/registros", (req, res) => {
  res.json(registrosPonto);
});

// Main Time Punch & Biometric AI Verification Endpoint
app.post("/api/registrar-ponto", async (req, res) => {
  try {
    const { colaboradorId, latUsuario, lonUsuario, selfieBase64, tipoPonto } = req.body;

    const colaborador = colaboradores.find((c) => c.id === colaboradorId);
    if (!colaborador) {
      return res.status(404).json({ error: "Colaborador não encontrado." });
    }

    // 1. Geolocation check against employee's assigned permitted location
    const baseLat = colaborador.localPermitido?.lat ?? sedeConfig.lat;
    const baseLon = colaborador.localPermitido?.lon ?? sedeConfig.lon;
    const raioPermitido = colaborador.localPermitido?.raio ?? sedeConfig.raioMaximoMetros;

    const distancia = calcularDistanciaMetros(latUsuario, lonUsuario, baseLat, baseLon);
    const distanciaArredondada = Math.round(distancia * 100) / 100;
    const geoValida = distancia <= raioPermitido;

    // 2. Gemini AI Biometric Verification
    let resultadoBio = {
      mesma_pessoa: true,
      confianca_estimada: 0.95,
      eh_foto_ao_vivo: true,
      justificativa: "Verificação biométrica simulada com sucesso (ou IA processada).",
    };

    if (selfieBase64 && selfieBase64.startsWith("data:image")) {
      try {
        const matches = selfieBase64.match(/^data:(.+);base64,(.+)$/);
        let mimeType = "image/jpeg";
        let base64Data = selfieBase64;
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        }

        let refPart: any;
        if (colaborador.fotoCadastro.startsWith("data:image")) {
          const refMatches = colaborador.fotoCadastro.match(/^data:(.+);base64,(.+)$/);
          refPart = {
            inlineData: {
              mimeType: refMatches ? refMatches[1] : "image/jpeg",
              data: refMatches ? refMatches[2] : "",
            },
          };
        } else {
          const fetchImg = await fetch(colaborador.fotoCadastro);
          const buffer = await fetchImg.arrayBuffer();
          const b64 = Buffer.from(buffer).toString("base64");
          refPart = {
            inlineData: {
              mimeType: "image/jpeg",
              data: b64,
            },
          };
        }

        const selfiePart = {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        };

        const prompt = `
        Você é um auditor biométrico especializado em verificação de identidade para controle de ponto eletrônico corporativo.
        
        Analise as duas imagens fornecidas:
        1. A primeira imagem é a foto de perfil cadastrada no sistema do colaborador ${colaborador.nome}.
        2. A segunda imagem é a selfie tirada pelo colaborador no momento de registrar o ponto.
        
        Sua tarefa:
        - Compare os traços anatômicos e faciais (formato do nariz, distância entre olhos, linha da mandíbula).
        - Verifique se a selfie ao vivo mostra indícios de fraude (ex: foto de tela de celular/notebook, reflexos de monitor, máscara ou foto impressa).
        - Retorne estritamente em formato JSON conforme o schema.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [prompt, "Foto Cadastro:", refPart, "Selfie Ponto:", selfiePart],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mesma_pessoa: {
                  type: Type.BOOLEAN,
                  description: "True se a selfie e a foto de referência forem da mesma pessoa",
                },
                confianca_estimada: {
                  type: Type.NUMBER,
                  description: "Nível de confiança entre 0.0 e 1.0",
                },
                eh_foto_ao_vivo: {
                  type: Type.BOOLEAN,
                  description: "True se parecer uma pessoa real e não uma foto de foto/tela estática",
                },
                justificativa: {
                  type: Type.STRING,
                  description: "Explicação sucinta dos traços analisados e liveness",
                },
              },
              required: ["mesma_pessoa", "confianca_estimada", "eh_foto_ao_vivo", "justificativa"],
            },
            temperature: 0.1,
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          resultadoBio = {
            mesma_pessoa: Boolean(parsed.mesma_pessoa),
            confianca_estimada: Number(parsed.confianca_estimada ?? 0.9),
            eh_foto_ao_vivo: Boolean(parsed.eh_foto_ao_vivo),
            justificativa: String(parsed.justificativa || "Análise concluída com sucesso."),
          };
        }
      } catch (aiErr) {
        console.error("Erro na chamada Gemini AI Biometria:", aiErr);
      }
    }

    // If outside permitted location -> Send to admin approval instead of hard reject
    let statusRegistro: "AProvado" | "RECUSADO_GEO" | "RECUSADO_BIO" | "RECUSADO_FOTO_ESTATICA" | "PENDENTE_APROVACAO_LOCAL" = "AProvado";
    if (!geoValida) {
      statusRegistro = "PENDENTE_APROVACAO_LOCAL";
    } else if (!resultadoBio.eh_foto_ao_vivo) {
      statusRegistro = "RECUSADO_FOTO_ESTATICA";
    } else if (!resultadoBio.mesma_pessoa || resultadoBio.confianca_estimada < 0.75) {
      statusRegistro = "RECUSADO_BIO";
    }

    const aprovado = statusRegistro === "AProvado" || statusRegistro === "PENDENTE_APROVACAO_LOCAL";

    const registro = {
      id: `REG_${Date.now()}`,
      colaboradorId: colaborador.id,
      colaboradorNome: colaborador.nome,
      timestamp: new Date().toISOString(),
      tipo: tipoPonto || "ENTRADA",
      status: statusRegistro,
      distanciaMetros: distanciaArredondada,
      confiancaBiometrica: resultadoBio.confianca_estimada,
      ehFotoAoVivo: resultadoBio.eh_foto_ao_vivo,
      justificativa: !geoValida 
        ? `Localização alternativa detectada a ${distanciaArredondada}m da base (${colaborador.localPermitido?.nome || "Sede"}). Requer aprovação do gestor.`
        : resultadoBio.justificativa,
      selfieUrl: selfieBase64 || colaborador.fotoCadastro,
    };

    registrosPonto.unshift(registro);

    res.json({
      success: aprovado,
      pendenteLocal: !geoValida,
      distancia: distanciaArredondada,
      biometria: resultadoBio,
      registro,
      mensagem: !geoValida
        ? `⚠️ Ponto realizado em local alternativo (${distanciaArredondada}m da base). Enviado para aprovação do Administrador.`
        : aprovado
        ? "✅ Ponto registrado com sucesso!"
        : "❌ Ponto recusado por incompatibilidade biométrica.",
    });
  } catch (err: any) {
    console.error("Erro ao registrar ponto:", err);
    res.status(500).json({ error: err.message || "Erro interno ao processar o ponto." });
  }
});

// Vite middleware setup for development vs production static serving
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 PontoFácil AI rodando na porta ${PORT}`);
});
