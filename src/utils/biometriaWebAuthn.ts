// Utilitário de Autenticação Biométrica e Reconhecimento Facial (WebAuthn / Passkey)
// Sistema Ponto A&C - Suporte a Face ID, Touch ID, Biometria Android e Windows Hello

export interface RegistroBiometriaLocal {
  colaboradorId: string;
  colaboradorNome: string;
  credentialId: string; // Base64
  dataAtivacao: string;
  dispositivoNome: string;
}

const STORAGE_PREFIX_BIOMETRIA = "ponto_aec_biometria_device";

// Converte ArrayBuffer para string Base64Url
function bufferParaBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Converte Base64Url para ArrayBuffer
function base64ParaBuffer(base64: string): ArrayBuffer {
  const base64Standard = base64.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64Standard.length % 4;
  const padded = pad ? base64Standard + "=".repeat(4 - pad) : base64Standard;
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

// Detecta o nome amigável do sistema
export function obterNomeDispositivo(): string {
  if (typeof navigator === "undefined") return "Dispositivo";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "iPhone / iPad (Face ID / Touch ID)";
  if (/android/i.test(ua)) return "Celular Android (Biometria Digital / Facial)";
  if (/macintosh|mac os x/i.test(ua)) return "Mac (Touch ID)";
  if (/windows/i.test(ua)) return "Windows (Windows Hello / Biometria)";
  return "Este Dispositivo";
}

// Verifica se o navegador suporta autenticador de plataforma (Face ID / Impressão Digital)
export async function isBiometriaPlataformaSuportada(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      const disponivel = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return Boolean(disponivel);
    }
  } catch (e) {
    console.warn("Erro ao testar disponibilidade de biometria:", e);
  }
  return false;
}

// Verifica se este colaborador específico já tem a biometria cadastrada NESTE aparelho
export function temBiometriaCadastrada(colaboradorId: string): boolean {
  if (!colaboradorId || typeof localStorage === "undefined") return false;
  try {
    const chave = `${STORAGE_PREFIX_BIOMETRIA}_${colaboradorId}`;
    return Boolean(localStorage.getItem(chave));
  } catch (e) {
    return false;
  }
}

// Obtém os dados do registro da biometria
export function obterDadosBiometriaCadastrada(colaboradorId: string): RegistroBiometriaLocal | null {
  if (!colaboradorId || typeof localStorage === "undefined") return null;
  try {
    const chave = `${STORAGE_PREFIX_BIOMETRIA}_${colaboradorId}`;
    const salvo = localStorage.getItem(chave);
    if (salvo) {
      return JSON.parse(salvo);
    }
  } catch (e) {}
  return null;
}

// Cadastra a biometria/Face ID do aparelho para o colaborador (requer que o usuário já tenha digitado a senha)
export async function cadastrarBiometriaAparelho(
  colaboradorId: string,
  colaboradorNome: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  const suportado = await isBiometriaPlataformaSuportada();
  if (!suportado) {
    return {
      sucesso: false,
      mensagem: "Este aparelho ou navegador não possui suporte a leitor biométrico / Face ID.",
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBytes = new TextEncoder().encode(colaboradorId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Ponto A&C",
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: colaboradorId,
          displayName: colaboradorNome,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Face ID, Touch ID, Fingerprint nativo
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential || !credential.id) {
      return { sucesso: false, mensagem: "Cadastro de biometria não concluído." };
    }

    const registro: RegistroBiometriaLocal = {
      colaboradorId,
      colaboradorNome,
      credentialId: bufferParaBase64(credential.rawId),
      dataAtivacao: new Date().toISOString(),
      dispositivoNome: obterNomeDispositivo(),
    };

    const chave = `${STORAGE_PREFIX_BIOMETRIA}_${colaboradorId}`;
    localStorage.setItem(chave, JSON.stringify(registro));

    return {
      sucesso: true,
      mensagem: `Biometria vinculada com sucesso a ${obterNomeDispositivo()}!`,
    };
  } catch (err: any) {
    console.warn("Erro ao cadastrar biometria:", err);
    if (err?.name === "NotAllowedError") {
      return { sucesso: false, mensagem: "Acesso biométrico cancelado ou recusado no dispositivo." };
    }
    return {
      sucesso: false,
      mensagem: `Não foi possível registrar a biometria: ${err?.message || "Erro desconhecido"}`,
    };
  }
}

// Autentica o colaborador usando a biometria cadastrada neste aparelho
export async function autenticarComBiometriaAparelho(
  colaboradorId: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  const dados = obterDadosBiometriaCadastrada(colaboradorId);
  if (!dados) {
    return {
      sucesso: false,
      mensagem: "Nenhuma biometria ou Face ID cadastrado para o seu usuário neste aparelho. Digite a senha.",
    };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credentialRawId = base64ParaBuffer(dados.credentialId);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: credentialRawId,
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { sucesso: false, mensagem: "Validação biométrica não confirmada." };
    }

    return {
      sucesso: true,
      mensagem: `Biometria confirmada com sucesso! Bem-vindo(a), ${dados.colaboradorNome}.`,
    };
  } catch (err: any) {
    console.warn("Erro na autenticação biométrica:", err);
    if (err?.name === "NotAllowedError") {
      return { sucesso: false, mensagem: "Leitura biométrica/facial cancelada ou não reconhecida." };
    }
    return {
      sucesso: false,
      mensagem: "Falha na leitura biométrica. Digite a sua senha de acesso.",
    };
  }
}

// Remove o cadastro de biometria deste colaborador no aparelho
export function removerBiometriaAparelho(colaboradorId: string): void {
  try {
    const chave = `${STORAGE_PREFIX_BIOMETRIA}_${colaboradorId}`;
    localStorage.removeItem(chave);
  } catch (e) {}
}
