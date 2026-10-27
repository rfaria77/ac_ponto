// Utilitários de Exportação Fiscal AFD e AFDT - Portaria 671/2021 MTE (REP-P)
// Suporte oficial para integração com sistemas de folha de pagamento (TOTVS, Domínio, Senior, Contmatic, etc.)

import { BatidaDia, ResumoMensalFechamento } from "../lib/calculosPonto";

export interface DadosEmpresaFiscal {
  razaoSocial: string;
  cnpj: string;
  localidade: string;
  repNumero: string;
}

export const DADOS_EMPRESA_PADRAO: DadosEmpresaFiscal = {
  razaoSocial: "A&C SAUDE E SEGURANCA DO TRABALHO LTDA",
  cnpj: "12345678000190",
  localidade: "Tupaciguara - MG",
  repNumero: "REP-P_AC_2026_001",
};

/**
 * Formata número com zeros à esquerda
 */
function padLeft(valor: string | number, tamanho: number): string {
  const str = String(valor ?? "");
  return str.padStart(tamanho, "0").slice(-tamanho);
}

/**
 * Formata texto com espaços à direita
 */
function padRight(valor: string, tamanho: number): string {
  const str = String(valor ?? "");
  return str.padEnd(tamanho, " ").slice(0, tamanho);
}

/**
 * Remove formatação de CNPJ/CPF/PIS
 */
function apenasDigitos(texto: string): string {
  return (texto || "").replace(/\D/g, "");
}

/**
 * Gera arquivo AFD (Arquivo Fonte de Dados) conforme layout oficial REP-P - Portaria 671/2021 MTE
 */
export function gerarArquivoAFD(
  colaborador: { id: string; nome: string; cpf?: string; pis?: string },
  fechamento: ResumoMensalFechamento,
  empresa: DadosEmpresaFiscal = DADOS_EMPRESA_PADRAO
): string {
  const linhas: string[] = [];
  let nsr = 1;

  const cnpjDigitos = padLeft(apenasDigitos(empresa.cnpj) || "12345678000190", 14);
  const pisCpf = padLeft(apenasDigitos(colaborador.pis || colaborador.cpf || "12345678901") || "12345678901", 12);
  const [mesStr, anoStr] = (fechamento.mesAno || "09/2026").split("/");
  const mesNum = parseInt(mesStr, 10) || 9;
  const anoNum = parseInt(anoStr, 10) || 2026;

  const dataInicioStr = `01${padLeft(mesNum, 2)}${anoNum}`;
  const totalDiasMes = fechamento.dias.length || 30;
  const dataFimStr = `${padLeft(totalDiasMes, 2)}${padLeft(mesNum, 2)}${anoNum}`;
  const agora = new Date();
  const dataGeracaoStr = `${padLeft(agora.getDate(), 2)}${padLeft(agora.getMonth() + 1, 2)}${agora.getFullYear()}`;
  const horaGeracaoStr = `${padLeft(agora.getHours(), 2)}${padLeft(agora.getMinutes(), 2)}`;

  // REGISTRO TIPO 1: CABEÇALHO DO ARQUIVO AFD
  const reg1 =
    padLeft(nsr++, 9) +
    "1" + // Tipo registro
    "1" + // Tipo identificador (1 = CNPJ)
    cnpjDigitos +
    padLeft(0, 12) + // CEI/CAEPF
    padRight(empresa.razaoSocial.toUpperCase(), 150) +
    padRight(empresa.repNumero, 17) +
    dataInicioStr +
    dataFimStr +
    dataGeracaoStr +
    horaGeracaoStr;
  linhas.push(reg1);

  // REGISTRO TIPO 2: CADASTRO DO EMPREGADO (Portaria 671)
  const reg2 =
    padLeft(nsr++, 9) +
    "2" +
    dataGeracaoStr +
    horaGeracaoStr +
    "I" + // Tipo operação (I = Inclusão / Ativo)
    pisCpf +
    padRight(colaborador.nome.toUpperCase(), 100);
  linhas.push(reg2);

  let qtdTipo3 = 0;

  // REGISTRO TIPO 3: MARCAÇÕES DE PONTO CRONOLÓGICAS (Portaria 671)
  fechamento.dias.forEach((dia) => {
    const diaFormatado = padLeft(dia.dia, 2);
    const dataBatida = `${diaFormatado}${padLeft(mesNum, 2)}${anoNum}`;

    const batidasDoDia: string[] = [];
    if (dia.entrada1) batidasDoDia.push(dia.entrada1);
    if (dia.saida1) batidasDoDia.push(dia.saida1);
    if (dia.entrada2) batidasDoDia.push(dia.entrada2);
    if (dia.saida2) batidasDoDia.push(dia.saida2);

    batidasDoDia.forEach((horario) => {
      const [hh, mm] = horario.split(":");
      const horaFormatada = `${padLeft(hh || "00", 2)}${padLeft(mm || "00", 2)}`;

      const reg3 =
        padLeft(nsr++, 9) +
        "3" + // Tipo registro (Marcação de ponto)
        dataBatida +
        horaFormatada +
        pisCpf;

      linhas.push(reg3);
      qtdTipo3++;
    });
  });

  // REGISTRO TIPO 9: TRAILER (TOTALIZADORES)
  const totalRegistros = linhas.length + 1;
  const reg9 =
    padLeft(999999999, 9) +
    "9" +
    padLeft(1, 9) + // Qtd tipo 2
    padLeft(qtdTipo3, 9) + // Qtd tipo 3
    padLeft(totalRegistros, 9); // Total de registros
  linhas.push(reg9);

  return linhas.join("\r\n");
}

/**
 * Gera arquivo AFDT (Arquivo Fonte de Dados Tratado) com entradas, intervalos e abonos
 */
export function gerarArquivoAFDT(
  colaborador: { id: string; nome: string; cpf?: string; pis?: string },
  fechamento: ResumoMensalFechamento,
  empresa: DadosEmpresaFiscal = DADOS_EMPRESA_PADRAO
): string {
  const linhas: string[] = [];
  let nsr = 1;

  const cnpjDigitos = padLeft(apenasDigitos(empresa.cnpj) || "12345678000190", 14);
  const pisCpf = padLeft(apenasDigitos(colaborador.pis || colaborador.cpf || "12345678901") || "12345678901", 12);
  const [mesStr, anoStr] = (fechamento.mesAno || "09/2026").split("/");
  const mesNum = parseInt(mesStr, 10) || 9;
  const anoNum = parseInt(anoStr, 10) || 2026;

  // Cabeçalho AFDT
  linhas.push(
    `000000001|AFDT|${empresa.razaoSocial.toUpperCase()}|${cnpjDigitos}|${fechamento.mesAno}|MTE-PORTARIA-671/2021`
  );

  fechamento.dias.forEach((dia) => {
    const dataStr = `${padLeft(dia.dia, 2)}/${padLeft(mesNum, 2)}/${anoNum}`;
    const batidas = [
      { ordem: 1, tipo: "E", hora: dia.entrada1 },
      { ordem: 2, tipo: "S", hora: dia.saida1 },
      { ordem: 3, tipo: "E", hora: dia.entrada2 },
      { ordem: 4, tipo: "S", hora: dia.saida2 },
    ];

    batidas.forEach((b) => {
      if (b.hora) {
        nsr++;
        linhas.push(
          `${padLeft(nsr, 9)}|${pisCpf}|${dataStr}|${b.hora}|${b.tipo}|${b.ordem}|ORIGINAL|A&C PONTO ELETRONICO`
        );
      }
    });

    if (dia.observacao && (dia.observacao.includes("Atestado") || dia.observacao.includes("Férias") || dia.observacao.includes("Feriado"))) {
      nsr++;
      linhas.push(
        `${padLeft(nsr, 9)}|${pisCpf}|${dataStr}|00:00|ABONO|0|${dia.observacao.toUpperCase()}|JUSTIFICATIVA DEPARTAMENTO PESSOAL`
      );
    }
  });

  linhas.push(`999999999|TOTAL_REGISTROS|${linhas.length + 1}`);
  return linhas.join("\r\n");
}

/**
 * Dispara download no navegador de arquivo texto
 */
export function baixarArquivoTexto(conteudo: string, nomeArquivo: string) {
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
