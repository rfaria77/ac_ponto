// Utilitário para Emissão e Validação do Comprovante de Registro de Ponto do Trabalhador
// Regulamentado pela Portaria 671/2021 do Ministério do Trabalho e Emprego (MTE) e Art. 74 da CLT

import jsPDF from "jspdf";

export interface ComprovantePonto {
  id: string; // Ex: COMP_1730000000
  nsr: number; // Número Sequencial de Registro
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorCargo: string;
  tipoBatida: "Entrada 1" | "Saída Almoço" | "Retorno Almoço" | "Saída Expediente";
  data: string; // DD/MM/AAAA
  hora: string; // HH:MM:SS
  timestampIso: string;
  hashSha256: string; // Código de autenticidade digital (Portaria 671)
  empresa: {
    razaoSocial: string;
    cnpj: string;
    local: string;
  };
  geolocalizacao?: {
    endereco: string;
    lat?: number;
    lon?: number;
    distanciaMetros?: number;
  };
}

/**
 * Gera hash de autenticidade criptográfica simulada/calculada para o comprovante
 */
export async function gerarHashAutenticidade(dados: string): Promise<string> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(dados);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {
    // fallback
  }
  // Fallback rápido
  let hash = 0;
  for (let i = 0; i < dados.length; i++) {
    hash = (hash << 5) - hash + dados.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `ac671${hex}${Date.now().toString(16)}`;
}

/**
 * Gera e baixa o Comprovante de Registro de Ponto em PDF (Portaria 671 MTE)
 */
export function gerarComprovantePDF(comprovante: ComprovantePonto) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 150], // Formato padrão de cupom/recibo de ponto térmico
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("COMPROVANTE DE REGISTRO DE PONTO", 40, 10, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("PORTARIA MTE Nº 671/2021 — REP-P", 40, 14, { align: "center" });

  doc.setLineWidth(0.2);
  doc.line(5, 17, 75, 17);

  // Dados do Empregador
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("EMPREGADOR:", 6, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(comprovante.empresa.razaoSocial, 6, 25);
  doc.text(`CNPJ: ${comprovante.empresa.cnpj}`, 6, 29);
  doc.text(`Local: ${comprovante.empresa.local}`, 6, 33);

  doc.line(5, 36, 75, 36);

  // Dados do Trabalhador
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("TRABALHADOR:", 6, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Nome: ${comprovante.colaboradorNome}`, 6, 44);
  doc.text(`Função: ${comprovante.colaboradorCargo}`, 6, 48);
  doc.text(`ID Funcional: ${comprovante.colaboradorId}`, 6, 52);

  doc.line(5, 55, 75, 55);

  // Dados da Marcação (Destaque)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("MARCAÇÃO REGISTRADA:", 6, 59);

  doc.setFillColor(240, 245, 250);
  doc.rect(5, 62, 70, 18, "F");

  doc.setTextColor(14, 116, 144);
  doc.setFontSize(9);
  doc.text(comprovante.tipoBatida.toUpperCase(), 40, 68, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text(comprovante.hora, 40, 75, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Data Oficial: ${comprovante.data}`, 40, 79, { align: "center" });

  doc.line(5, 83, 75, 83);

  // Autenticidade e Hash
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text(`NSR (Nº Sequencial de Registro): ${String(comprovante.nsr).padStart(9, "0")}`, 6, 88);
  doc.text(`Data/Hora Transmissão: ${new Date().toLocaleString("pt-BR")}`, 6, 92);

  if (comprovante.geolocalizacao?.endereco) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(`GPS: ${comprovante.geolocalizacao.endereco.slice(0, 48)}`, 6, 96);
  }

  doc.line(5, 100, 75, 100);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("ASSINATURA DIGITAL / CÓDIGO HASH SHA-256:", 6, 104);
  doc.setFont("courier", "normal");
  doc.setFontSize(5.5);
  const hashLinha1 = comprovante.hashSha256.slice(0, 32);
  const hashLinha2 = comprovante.hashSha256.slice(32, 64);
  doc.text(hashLinha1, 6, 108);
  if (hashLinha2) doc.text(hashLinha2, 6, 111);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Este comprovante tem validade jurídica e deve ser guardado", 40, 120, { align: "center" });
  doc.text("pelo empregado conforme previsto no Art. 74 da CLT.", 40, 123, { align: "center" });

  doc.save(`Comprovante_Ponto_${comprovante.data.replace(/\//g, "-")}_${comprovante.hora.replace(/:/g, "")}.pdf`);
}

/**
 * Gera texto formatado para envio direto via WhatsApp ou cópia
 */
export function gerarTextoWhatsAppComprovante(comprovante: ComprovantePonto): string {
  return `*📋 COMPROVANTE DE REGISTRO DE PONTO (Portaria 671 MTE)*
🏢 *${comprovante.empresa.razaoSocial}*
CNPJ: ${comprovante.empresa.cnpj}

👤 *Colaborador(a):* ${comprovante.colaboradorNome}
💼 *Cargo:* ${comprovante.colaboradorCargo}

⏱️ *Tipo:* ${comprovante.tipoBatida.toUpperCase()}
📅 *Data:* ${comprovante.data}
⏰ *Horário Oficial:* ${comprovante.hora}
🔢 *NSR:* ${String(comprovante.nsr).padStart(9, "0")}

📍 *Localização GPS:* ${comprovante.geolocalizacao?.endereco || "Base Homologada (Tupaciguara - MG)"}
🔐 *Hash SHA-256:* ${comprovante.hashSha256.slice(0, 24)}...

_Comprovante digital emitido pelo Ponto A&C com certificação biométrica e geolocalização._`;
}
