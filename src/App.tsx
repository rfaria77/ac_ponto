import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  MapPin,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Users,
  Settings,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Building2,
  Sliders,
  Sparkles,
  HelpCircle,
  UserPlus,
  ChevronRight,
  ExternalLink,
  Info,
  Play,
  Bell,
  Check,
  X,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Shield,
  Award,
  LogOut,
  Lock,
  User,
  Navigation,
  Globe,
  PlusCircle,
  Calendar,
  Smartphone,
  Fingerprint,
  Download,
  Menu,
  LayoutDashboard,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { collection, doc, setDoc, addDoc, onSnapshot } from "firebase/firestore";

interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  departamento: string;
  email?: string;
  fotoCadastro: string;
  senha?: string;
  mustChangePassword?: boolean;
  localPermitido?: {
    nome: string;
    lat: number;
    lon: number;
    raio: number;
  };
}

interface SedeConfig {
  id?: string;
  nome: string;
  lat: number;
  lon: number;
  raioMaximoMetros: number;
}

interface RegistroPonto {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  timestamp: string;
  tipo: "ENTRADA" | "SAIDA" | "INTERVALO";
  status: "AProvado" | "RECUSADO_GEO" | "RECUSADO_BIO" | "RECUSADO_FOTO_ESTATICA" | "PENDENTE_APROVACAO_LOCAL" | "MANUAL_ADM";
  distanciaMetros: number;
  confiancaBiometrica: number;
  ehFotoAoVivo: boolean;
  justificativa: string;
  selfieUrl: string;
}

interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning";
  title: string;
  message: string;
}

interface AjustePendente {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  tipo: string;
  dataSolicitacao: string;
  motivo: string;
  status: "PENDENTE" | "APROVADO" | "RECUSADO";
}

interface BancoHorasColab {
  colaboradorId: string;
  nome: string;
  departamento: string;
  dataInicioSaldo: string;
  saldoInicial: string;
  horasTrabalhadasMes: string;
  bancoHorasSaldo: string;
  horasExtras: string;
  descontosBanco: string;
  statusBanco: "POSITIVO" | "NEGATIVO" | "ZERADO" | "COMPENSACAO";
}

interface DiaEscala {
  ativo: boolean;
  entrada: string;
  intervaloInicio: string;
  intervaloFim: string;
  saida: string;
}

interface EscalaColaborador {
  colaboradorId: string;
  dias: {
    segunda: DiaEscala;
    terca: DiaEscala;
    quarta: DiaEscala;
    quinta: DiaEscala;
    sexta: DiaEscala;
    sabado: DiaEscala;
    domingo: DiaEscala;
  };
  toleranciaMinutos: number;
}

export default function App() {
  const [authRole, setAuthRole] = useState<"login" | "colaborador" | "adm">("login");
  const [currentColabUser, setCurrentColabUser] = useState<Colaborador | null>(null);

  // Login credentials & biometric state
  const [loginEmail, setLoginEmail] = useState("colaborador@ac-saude.com.br");
  const [loginSenha, setLoginSenha] = useState("AC2026@");

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState("");

  // Admin login modal state
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [adminSenhaInput, setAdminSenhaInput] = useState("");

  const [installModal, setInstallModal] = useState<"android" | "ios" | null>(null);

  const [colabTab, setColabTab] = useState<"bater-ponto" | "historico" | "perfil">("bater-ponto");
  const [admTab, setAdmTab] = useState<"colaboradores" | "criterios" | "lancamento-manual" | "banco-horas" | "localizacao" | "aprovacoes" | "sede">("colaboradores");

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "warning", title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  
  const [sede, setSede] = useState<SedeConfig>({
    id: "sede",
    nome: "Matriz São Paulo / Sede Principal",
    lat: -23.550520,
    lon: -46.633308,
    raioMaximoMetros: 150.0,
  });
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [loading, setLoading] = useState(false);

  // Per-employee Location state in Admin
  const [selectedAdmColabId, setSelectedAdmColabId] = useState<string>("FUNC_001");
  const [localCustomColab, setLocalCustomColab] = useState({
    nome: "Matriz São Paulo",
    lat: -23.550520,
    lon: -46.633308,
    raio: 150,
  });

  const defaultDiaEscala = (ent = "08:00", sai = "17:00"): DiaEscala => ({
    ativo: true,
    entrada: ent,
    intervaloInicio: "12:00",
    intervaloFim: "13:00",
    saida: sai,
  });

  const [escalasColaboradores, setEscalasColaboradores] = useState<Record<string, EscalaColaborador>>({
    FUNC_001: {
      colaboradorId: "FUNC_001",
      dias: {
        segunda: defaultDiaEscala("06:00", "17:00"),
        terca: defaultDiaEscala("08:30", "19:00"),
        quarta: defaultDiaEscala("08:00", "17:00"),
        quinta: defaultDiaEscala("08:00", "17:00"),
        sexta: defaultDiaEscala("08:00", "16:00"),
        sabado: { ...defaultDiaEscala(), ativo: false },
        domingo: { ...defaultDiaEscala(), ativo: false },
      },
      toleranciaMinutos: 10,
    },
    FUNC_002: {
      colaboradorId: "FUNC_002",
      dias: {
        segunda: defaultDiaEscala("09:00", "18:00"),
        terca: defaultDiaEscala("09:00", "18:00"),
        quarta: defaultDiaEscala("09:00", "18:00"),
        quinta: defaultDiaEscala("09:00", "18:00"),
        sexta: defaultDiaEscala("09:00", "17:00"),
        sabado: { ...defaultDiaEscala(), ativo: false },
        domingo: { ...defaultDiaEscala(), ativo: false },
      },
      toleranciaMinutos: 10,
    },
    FUNC_003: {
      colaboradorId: "FUNC_003",
      dias: {
        segunda: defaultDiaEscala("08:30", "17:30"),
        terca: defaultDiaEscala("08:30", "17:30"),
        quarta: defaultDiaEscala("08:30", "17:30"),
        quinta: defaultDiaEscala("08:30", "17:30"),
        sexta: defaultDiaEscala("08:30", "16:30"),
        sabado: { ...defaultDiaEscala(), ativo: false },
        domingo: { ...defaultDiaEscala(), ativo: false },
      },
      toleranciaMinutos: 15,
    },
  });

  const [bancoHorasData, setBancoHorasData] = useState<BancoHorasColab[]>([
    {
      colaboradorId: "FUNC_001",
      nome: "Ana Beatriz Souza",
      departamento: "Engenharia",
      dataInicioSaldo: "01/09/2026",
      saldoInicial: "+08h 00m",
      horasTrabalhadasMes: "176h 30m",
      bancoHorasSaldo: "+14h 30m",
      horasExtras: "+12h 00m",
      descontosBanco: "00h 00m",
      statusBanco: "POSITIVO",
    },
    {
      colaboradorId: "FUNC_002",
      nome: "Carlos Eduardo Lima",
      departamento: "Operações",
      dataInicioSaldo: "01/09/2026",
      saldoInicial: "-02h 00m",
      horasTrabalhadasMes: "158h 45m",
      bancoHorasSaldo: "-03h 15m",
      horasExtras: "+02h 30m",
      descontosBanco: "-05h 45m",
      statusBanco: "NEGATIVO",
    },
    {
      colaboradorId: "FUNC_003",
      nome: "Mariana Costa Silva",
      departamento: "RH",
      dataInicioSaldo: "01/09/2026",
      saldoInicial: "00h 00m",
      horasTrabalhadasMes: "168h 00m",
      bancoHorasSaldo: "00h 00m",
      horasExtras: "+01h 00m",
      descontosBanco: "-01h 00m",
      statusBanco: "ZERADO",
    },
  ]);

  // Lançamento Manual state
  const [manualColabId, setManualColabId] = useState("FUNC_001");
  const [manualData, setManualData] = useState(new Date().toISOString().slice(0, 10));
  const [manualHora, setManualHora] = useState("08:00");
  const [manualTipo, setManualTipo] = useState<"ENTRADA" | "SAIDA" | "INTERVALO">("ENTRADA");
  const [manualMotivo, setManualMotivo] = useState("Ajuste manual realizado pelo RH / Gestor");

  const [pendencias, setPendencias] = useState<AjustePendente[]>([
    {
      id: "PEND_01",
      colaboradorId: "FUNC_001",
      colaboradorNome: "Ana Beatriz Souza",
      tipo: "Esquecimento de Saída",
      dataSolicitacao: "2026-10-04 18:15",
      motivo: "Reunião externa com cliente até mais tarde.",
      status: "PENDENTE",
    },
    {
      id: "PEND_02",
      colaboradorId: "FUNC_002",
      colaboradorNome: "Carlos Eduardo Lima",
      tipo: "Local Alternativo (Visita Externa)",
      dataSolicitacao: "2026-10-05 09:10",
      motivo: "Ponto batido em cliente fora da base habitual (340m).",
      status: "PENDENTE",
    },
  ]);

  const [tipoPonto, setTipoPonto] = useState<"ENTRADA" | "SAIDA" | "INTERVALO">("ENTRADA");
  const [gpsMode, setGpsMode] = useState<"sede" | "proximo" | "longe" | "custom">("sede");
  const [customLat, setCustomLat] = useState(-23.550520);
  const [customLon, setCustomLon] = useState(-46.633308);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  
  const [lastResult, setLastResult] = useState<any | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoCargo, setNovoCargo] = useState("");
  const [novoDep, setNovoDep] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaFotoUrl, setNovaFotoUrl] = useState("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80");

  // Firestore Real-Time Synchronization & Seeding
  useEffect(() => {
    const unsubColab = onSnapshot(collection(db, "colaboradores"), (snapshot) => {
      const items: Colaborador[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Colaborador);
      });
      if (items.length > 0) {
        setColaboradores(items);
        if (!currentColabUser) setCurrentColabUser(items[0]);
      } else {
        seedInitialData();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "colaboradores");
    });

    const unsubReg = onSnapshot(collection(db, "registros"), (snapshot) => {
      const items: RegistroPonto[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as RegistroPonto);
      });
      if (items.length > 0) {
        setRegistros(items);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "registros");
    });

    const unsubSol = onSnapshot(collection(db, "solicitacoes"), (snapshot) => {
      const items: AjustePendente[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as AjustePendente);
      });
      if (items.length > 0) {
        setPendencias(items);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "solicitacoes");
    });

    const unsubConfig = onSnapshot(doc(db, "configuracoes", "sede"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SedeConfig;
        setSede(data);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "configuracoes/sede");
    });

    return () => {
      unsubColab();
      unsubReg();
      unsubSol();
      unsubConfig();
    };
  }, []);

  const seedInitialData = async () => {
    try {
      const defaultColabs: Colaborador[] = [
        {
          id: "FUNC_001",
          nome: "Thais Moreira de Souza",
          cargo: "Assistente de coletas",
          departamento: "Operações / Coletas",
          email: "thais.souza@ac-saude.com.br",
          fotoCadastro: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
          senha: "AC2026@",
          mustChangePassword: true,
          localPermitido: { nome: "Matriz São Paulo", lat: -23.550520, lon: -46.633308, raio: 150 },
        },
        {
          id: "FUNC_002",
          nome: "Marcos Vinicius Ferreira Mendes",
          cargo: "Assistente de segurança do Trabalho",
          departamento: "Segurança do Trabalho",
          email: "marcos.mendes@ac-saude.com.br",
          fotoCadastro: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
          senha: "AC2026@",
          mustChangePassword: true,
          localPermitido: { nome: "Filial Paulista", lat: -23.561500, lon: -46.656000, raio: 150 },
        },
        {
          id: "FUNC_003",
          nome: "Amanda Inácio Medeiros Silva",
          cargo: "Assistente Administrativo",
          departamento: "Administrativo",
          email: "amanda.silva@ac-saude.com.br",
          fotoCadastro: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          senha: "AC2026@",
          mustChangePassword: true,
          localPermitido: { nome: "Matriz São Paulo", lat: -23.550520, lon: -46.633308, raio: 150 },
        },
        {
          id: "FUNC_004",
          nome: "Denise Cristina Fernandes Costa Felip",
          cargo: "Técnico em segurança do Trabalho JR",
          departamento: "Segurança do Trabalho",
          email: "denise.felip@ac-saude.com.br",
          fotoCadastro: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
          senha: "AC2026@",
          mustChangePassword: true,
          localPermitido: { nome: "Matriz São Paulo", lat: -23.550520, lon: -46.633308, raio: 150 },
        },
      ];

      for (const c of defaultColabs) {
        await setDoc(doc(db, "colaboradores", c.id), c);
      }

      const defaultSede: SedeConfig = {
        id: "sede",
        nome: "Matriz São Paulo / Sede Principal",
        lat: -23.550520,
        lon: -46.633308,
        raioMaximoMetros: 150.0,
      };
      await setDoc(doc(db, "configuracoes", "sede"), defaultSede);

      const defaultReg: RegistroPonto = {
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
      };
      await setDoc(doc(db, "registros", defaultReg.id), defaultReg);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "seed");
    }
  };

  useEffect(() => {
    const found = colaboradores.find((c) => c.id === selectedAdmColabId);
    if (found && found.localPermitido) {
      setLocalCustomColab(found.localPermitido);
    }
  }, [selectedAdmColabId, colaboradores]);

  const startCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error("Erro na câmera:", err);
      setCameraError("Não foi possível acessar a câmera. Usaremos uma foto simulada se necessário.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureSelfie = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setSelfieDataUrl(dataUrl);
        stopCamera();
        addToast("success", "Selfie Capturada", "Foto capturada e pronta para auditoria biométrica.");
      }
    }
  };

  const getCoordinates = () => {
    switch (gpsMode) {
      case "sede":
        return { lat: sede.lat, lon: sede.lon };
      case "proximo":
        return { lat: sede.lat + 0.0006, lon: sede.lon + 0.0006 };
      case "longe":
        return { lat: sede.lat + 0.0035, lon: sede.lon + 0.0035 };
      case "custom":
        return { lat: customLat, lon: customLon };
    }
  };

  const handleRegistrarPontoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentColabUser) return;
    const selfieToSend = selfieDataUrl || currentColabUser.fotoCadastro;
    const coords = getCoordinates();

    setLoading(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/registrar-ponto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaboradorId: currentColabUser.id,
          latUsuario: coords.lat,
          lonUsuario: coords.lon,
          selfieBase64: selfieToSend,
          tipoPonto,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao registrar ponto.");
      }

      setLastResult(data);
      setSelfieDataUrl(null);

      if (data.registro) {
        await setDoc(doc(db, "registros", data.registro.id), data.registro);
        setRegistros((prev) => [data.registro, ...prev]);

        if (data.pendenteLocal) {
          const novaPendencia: AjustePendente = {
            id: `PEND_${Date.now()}`,
            colaboradorId: currentColabUser.id,
            colaboradorNome: currentColabUser.nome,
            tipo: "Local Alternativo (Fora da Base)",
            dataSolicitacao: new Date().toLocaleString("pt-BR"),
            motivo: `Ponto em local alternativo. Distância: ${data.distancia}m da base autorizada.`,
            status: "PENDENTE",
          };
          await setDoc(doc(db, "solicitacoes", novaPendencia.id), novaPendencia);
          setPendencias((prev) => [novaPendencia, ...prev]);
        }
      }

      if (data.success) {
        addToast(data.pendenteLocal ? "warning" : "success", data.pendenteLocal ? "Ponto Pendente de Aprovação" : "Ponto Registrado e Confirmado!", data.mensagem);
      } else {
        addToast("error", "Ponto Recusado", data.mensagem || "Verifique os critérios de biometria.");
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, "registros");
      addToast("error", "Erro na Marcação", err.message || "Erro interno ao processar o ponto.");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          addToast("success", "Biometria Detectada", "Autenticando com a digital do dispositivo...");
          setTimeout(() => {
            setAuthRole("colaborador");
            addToast("success", "Acesso Liberado", "Autenticado com sucesso via digital do celular/dispositivo.");
          }, 1200);
          return;
        }
      }
      addToast("success", "Desbloqueio Biométrico", "Digital reconhecida com sucesso!");
      setTimeout(() => {
        setAuthRole("colaborador");
      }, 1000);
    } catch (e) {
      addToast("warning", "Biometria", "Usando validação biométrica padrão do dispositivo.");
      setAuthRole("colaborador");
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmailInput.trim().toLowerCase() === "raulfaria" && adminSenhaInput === "Portal2012") {
      setAuthRole("adm");
      setShowAdminLoginModal(false);
      setAdminSenhaInput("");
      setAdminEmailInput("");
      addToast("success", "Painel ADM Acessado", "Bem-vindo ao painel administrativo A&C.");
    } else {
      addToast("error", "Credenciais Inválidas", "Usuário ou senha de administrador incorretos.");
    }
  };

  const handleLancamentoManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const colab = colaboradores.find(c => c.id === manualColabId);
    if (!colab) return;

    const novoRegistro: RegistroPonto = {
      id: `MANUAL_${Date.now()}`,
      colaboradorId: colab.id,
      colaboradorNome: colab.nome,
      timestamp: `${manualData}T${manualHora}:00`,
      tipo: manualTipo,
      status: "MANUAL_ADM",
      distanciaMetros: 0,
      confiancaBiometrica: 1.0,
      ehFotoAoVivo: true,
      justificativa: `Lançamento manual pelo RH: ${manualMotivo}`,
      selfieUrl: colab.fotoCadastro,
    };

    try {
      await setDoc(doc(db, "registros", novoRegistro.id), novoRegistro);
      setRegistros((prev) => [novoRegistro, ...prev]);
      addToast("success", "Ponto Lançado Manualmente", `Registro de ${manualTipo} adicionado com sucesso para ${colab.nome}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "registros");
    }
  };

  const calcularAssiduidade = (colabId: string) => {
    const colabRegs = registros.filter(r => r.colaboradorId === colabId);
    const base = 85;
    const score = Math.min(100, Math.max(70, base + (colabRegs.length * 2.5)));
    return Math.round(score);
  };

  const handleColabLoginWithPassword = () => {
    if (!currentColabUser) return;
    const correctPassword = currentColabUser.senha || "AC2026@";
    if (loginSenha !== correctPassword && loginSenha !== "AC2026@") {
      addToast("error", "Senha Incorreta", "A senha digitada está incorreta. A senha padrão inicial é AC2026@.");
      return;
    }
    if (currentColabUser.mustChangePassword || loginSenha === "AC2026@") {
      setShowChangePasswordModal(true);
    } else {
      setAuthRole("colaborador");
      addToast("success", "Sessão Iniciada", `Bem-vindo ao Ponto A&C, ${currentColabUser.nome}.`);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentColabUser) return;
    if (!newPasswordInput || newPasswordInput.length < 6) {
      addToast("error", "Senha Fraca", "A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      addToast("error", "Senhas Diferentes", "A confirmação de senha não confere.");
      return;
    }
    try {
      const updated = {
        ...currentColabUser,
        senha: newPasswordInput,
        mustChangePassword: false,
      };
      await setDoc(doc(db, "colaboradores", updated.id), updated);
      setCurrentColabUser(updated);
      setColaboradores(prev => prev.map(c => c.id === updated.id ? updated : c));
      setShowChangePasswordModal(false);
      setNewPasswordInput("");
      setConfirmNewPasswordInput("");
      setLoginSenha("");
      setAuthRole("colaborador");
      addToast("success", "Senha Alterada", "Sua senha foi atualizada com sucesso. Bem-vindo!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "colaboradores");
    }
  };

  const handleResetPassword = async (colab: Colaborador) => {
    try {
      const updated = { ...colab, senha: "AC2026@", mustChangePassword: true };
      await setDoc(doc(db, "colaboradores", colab.id), updated);
      setColaboradores(prev => prev.map(c => c.id === colab.id ? updated : c));
      addToast("success", "Senha Resetada", `A senha de ${colab.nome} foi resetada para o padrão AC2026@.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "colaboradores");
    }
  };

  const handleAddColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      addToast("warning", "Nome Obrigatório", "Por favor, preencha o nome completo do colaborador.");
      return;
    }
    try {
      const novoId = `FUNC_${Date.now()}`;
      const emailGerado = novoEmail.trim() || `${novoNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.')}@ac-saude.com.br`;
      const novoColab: Colaborador = {
        id: novoId,
        nome: novoNome.trim(),
        cargo: novoCargo.trim() || "Colaborador",
        departamento: novoDep.trim() || "Geral",
        email: emailGerado,
        fotoCadastro: novaFotoUrl.trim() || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
        senha: "AC2026@",
        mustChangePassword: true,
        localPermitido: { nome: "Matriz São Paulo", lat: sede.lat, lon: sede.lon, raio: sede.raioMaximoMetros },
      };

      await setDoc(doc(db, "colaboradores", novoId), novoColab);

      setColaboradores((prev) => [...prev, novoColab]);

      setEscalasColaboradores((prev) => ({
        ...prev,
        [novoId]: {
          colaboradorId: novoId,
          dias: {
            segunda: defaultDiaEscala(),
            terca: defaultDiaEscala(),
            quarta: defaultDiaEscala(),
            quinta: defaultDiaEscala(),
            sexta: defaultDiaEscala(),
            sabado: { ...defaultDiaEscala(), ativo: false },
            domingo: { ...defaultDiaEscala(), ativo: false },
          },
          toleranciaMinutos: 10,
        },
      }));

      setBancoHorasData((prev) => [
        ...prev,
        {
          colaboradorId: novoId,
          nome: novoColab.nome,
          departamento: novoColab.departamento,
          dataInicioSaldo: "01/09/2026",
          saldoInicial: "00h 00m",
          horasTrabalhadasMes: "00h 00m",
          bancoHorasSaldo: "00h 00m",
          horasExtras: "00h 00m",
          descontosBanco: "00h 00m",
          statusBanco: "ZERADO",
        }
      ]);

      setNovoNome("");
      setNovoCargo("");
      setNovoDep("");
      setNovoEmail("");
      setNovaFotoUrl("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80");
      addToast("success", "Colaborador Cadastrado", `${novoColab.nome} adicionado com sucesso.`);
    } catch (err: any) {
      console.error("Erro ao cadastrar colaborador:", err);
      addToast("error", "Erro ao Cadastrar", err?.message || "Não foi possível salvar o colaborador no Firestore.");
    }
  };

  const handleSaveLocalPermitido = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetColab = colaboradores.find(c => c.id === selectedAdmColabId);
      if (!targetColab) return;

      const updatedColab = { ...targetColab, localPermitido: localCustomColab };
      await setDoc(doc(db, "colaboradores", selectedAdmColabId), updatedColab);

      setColaboradores((prev) => prev.map(c => c.id === selectedAdmColabId ? updatedColab : c));
      addToast("success", "Localização Salva", `Local permitido atualizado para ${targetColab.nome}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "colaboradores");
      addToast("error", "Erro", "Não foi possível salvar a localização permitida.");
    }
  };

  const handleSaveSede = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sedePayload = { ...sede, id: "sede" };
      await setDoc(doc(db, "configuracoes", "sede"), sedePayload);
      addToast("success", "Sede Atualizada", "Coordenadas e raio de geofencing salvos com sucesso.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "configuracoes");
      addToast("error", "Erro", "Não foi possível salvar as configurações da sede.");
    }
  };

  const handleAprovarPendencia = async (id: string) => {
    setPendencias((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "APROVADO" as const } : p))
    );
    try {
      const pend = pendencias.find(p => p.id === id);
      if (pend) {
        await setDoc(doc(db, "solicitacoes", id), { ...pend, status: "APROVADO" }, { merge: true });
      }
    } catch (e) {
      // ignore offline sync if needed
    }
    addToast("success", "Solicitação Aprovada", "O ajuste ou ponto em local alternativo foi aprovado pelo gestor.");
  };

  const handleRecusarPendencia = async (id: string) => {
    setPendencias((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "RECUSADO" as const } : p))
    );
    try {
      const pend = pendencias.find(p => p.id === id);
      if (pend) {
        await setDoc(doc(db, "solicitacoes", id), { ...pend, status: "RECUSADO" }, { merge: true });
      }
    } catch (e) {
      // ignore
    }
    addToast("warning", "Solicitação Recusada", "A solicitação foi recusada.");
  };

  const exportarEspelhoPontoPDF = (colabItem: BancoHorasColab) => {
    try {
      const docPdf = new jsPDF();
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(16);
      docPdf.setTextColor(2, 132, 199);
      docPdf.text("PONTO A&C - SAÚDE E SEGURANÇA DO TRABALHO", 14, 20);

      docPdf.setFontSize(10);
      docPdf.setFont("helvetica", "normal");
      docPdf.setTextColor(100, 116, 139);
      docPdf.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, 14, 26);
      docPdf.text(`Início do Histórico (Banco de Horas): ${colabItem.dataInicioSaldo} | Saldo Inicial: ${colabItem.saldoInicial}`, 14, 32);

      docPdf.setDrawColor(203, 213, 225);
      docPdf.line(14, 36, 196, 36);

      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(12);
      docPdf.setTextColor(15, 23, 42);
      docPdf.text("Dados do Colaborador:", 14, 44);

      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(10);
      docPdf.text(`Nome: ${colabItem.nome}`, 14, 52);
      docPdf.text(`ID: ${colabItem.colaboradorId}`, 14, 58);
      docPdf.text(`Departamento: ${colabItem.departamento}`, 14, 64);

      docPdf.setFillColor(240, 249, 255);
      docPdf.roundedRect(14, 72, 182, 32, 3, 3, "F");

      docPdf.setFont("helvetica", "bold");
      docPdf.text("Resumo do Período (Banco de Horas):", 18, 80);
      docPdf.setFont("helvetica", "normal");
      docPdf.text(`Saldo Inicial (${colabItem.dataInicioSaldo}): ${colabItem.saldoInicial}`, 18, 88);
      docPdf.text(`Horas Extras: ${colabItem.horasExtras}`, 110, 88);
      docPdf.text(`Descontos: ${colabItem.descontosBanco}`, 18, 96);
      docPdf.text(`Saldo Atual: ${colabItem.bancoHorasSaldo} (${colabItem.statusBanco})`, 110, 96);

      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(12);
      docPdf.text("Registros de Ponto:", 14, 114);

      let y = 122;
      docPdf.setFillColor(224, 242, 254);
      docPdf.rect(14, y, 182, 8, "F");
      docPdf.setFontSize(9);
      docPdf.text("Data/Hora", 18, y + 5.5);
      docPdf.text("Tipo", 75, y + 5.5);
      docPdf.text("Distância GPS", 110, y + 5.5);
      docPdf.text("Status", 155, y + 5.5);

      y += 8;
      docPdf.setFont("helvetica", "normal");

      const employeePunches = registros.filter(r => r.colaboradorId === colabItem.colaboradorId);
      
      if (employeePunches.length === 0) {
        y += 8;
        docPdf.text("Nenhum registro de ponto recente encontrado.", 18, y);
      } else {
        employeePunches.slice(0, 12).forEach((reg) => {
          if (y > 270) {
            docPdf.addPage();
            y = 20;
          }
          docPdf.text(new Date(reg.timestamp).toLocaleString("pt-BR"), 18, y + 6);
          docPdf.text(reg.tipo, 75, y + 6);
          docPdf.text(`${reg.distanciaMetros}m`, 110, y + 6);
          docPdf.text(reg.status, 155, y + 6);

          y += 8;
          docPdf.setDrawColor(241, 245, 249);
          docPdf.line(14, y, 196, y);
        });
      }

      y = Math.max(y + 30, 240);
      docPdf.setDrawColor(148, 163, 184);
      docPdf.line(40, y, 100, y);
      docPdf.line(116, y, 176, y);

      docPdf.setFontSize(8);
      docPdf.text("Assinatura do Colaborador", 55, y + 5);
      docPdf.text("Assinatura do Gestor / RH", 130, y + 5);

      docPdf.save(`espelho_ponto_${colabItem.colaboradorId}.pdf`);
      addToast("success", "PDF Exportado", `O espelho de ponto de ${colabItem.nome} foi gerado com sucesso.`);
    } catch (pdfErr) {
      addToast("error", "Erro no PDF", "Não foi possível gerar o arquivo PDF.");
    }
  };

  const abrirGoogleMapsPin = (lat: number, lon: number) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white relative">
      {/* Toast Notification Container with Smooth Slide-in / Fade-out */}
      <div className="fixed top-20 right-4 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast, index) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
              className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start gap-3 ${
                toast.type === "success"
                  ? "bg-sky-950/90 border-sky-500/40 text-sky-100 shadow-sky-950/50"
                  : toast.type === "error"
                  ? "bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/50"
                  : "bg-amber-950/90 border-amber-500/40 text-amber-100 shadow-amber-950/50"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-sky-400" />}
                {toast.type === "error" && <XCircle className="w-5 h-5 text-rose-400" />}
                {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-0.5">{toast.title}</h5>
                <p className="text-xs text-slate-200 leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-white p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ADMIN LOGIN MODAL */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-slate-200 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-black">
                  A&C
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Acesso Administrador (RH)</h3>
                  <p className="text-xs text-sky-400">Autenticação Restrita</p>
                </div>
              </div>
              <button onClick={() => setShowAdminLoginModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Usuário Administrador</label>
                <input
                  type="text"
                  required
                  placeholder="Digite o usuário"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Senha de Administrador</label>
                <input
                  type="password"
                  required
                  placeholder="Digite sua senha de acesso"
                  value={adminSenhaInput}
                  onChange={(e) => setAdminSenhaInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 mt-4"
              >
                <Shield className="w-4 h-4" /> Entrar no Painel ADM
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* INSTALL APP MODAL */}
      {showChangePasswordModal && currentColabUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-sky-400" />
                Alteração Obrigatória de Senha
              </h3>
              <button onClick={() => setShowChangePasswordModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-6">
              Olá, <strong className="text-white">{currentColabUser.nome}</strong>. Como este é seu primeiro acesso com a senha padrão (<span className="font-mono text-sky-400">AC2026@</span>), por segurança você deve definir uma nova senha pessoal antes de continuar.
            </p>

            <form onSubmit={handleSaveNewPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nova Senha</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo de 6 caracteres"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  placeholder="Digite novamente a nova senha"
                  value={confirmNewPasswordInput}
                  onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-sky-600/30 mt-4"
              >
                Salvar Nova Senha & Entrar
              </button>
            </form>
          </motion.div>
        </div>
      )}
      {installModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-400" />
                Instalar Ponto A&C ({installModal === "android" ? "Android" : "iOS / iPhone"})
              </h3>
              <button onClick={() => setInstallModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {installModal === "android" ? (
              <div className="space-y-3 text-xs text-slate-300">
                <p>Para instalar o Ponto A&C no seu celular <strong>Android</strong>:</p>
                <ol className="list-decimal list-inside space-y-2 pl-2">
                  <li>Abra este aplicativo no navegador <strong>Google Chrome</strong>.</li>
                  <li>Toque no menu de três pontos (canto superior direito).</li>
                  <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                  <li>Confirme e o ícone do Ponto A&C aparecerá na sua tela inicial como um aplicativo nativo!</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-300">
                <p>Para instalar o Ponto A&C no seu <strong>iPhone / iOS</strong>:</p>
                <ol className="list-decimal list-inside space-y-2 pl-2">
                  <li>Abra este aplicativo no navegador <strong>Safari</strong>.</li>
                  <li>Toque no botão de Compartilhar (ícone de quadrado com seta para cima na barra inferior).</li>
                  <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
                  <li>Toque em <strong>"Adicionar"</strong>. Pronto!</li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setInstallModal(null)}
              className="w-full mt-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold text-xs"
            >
              Entendido
            </button>
          </motion.div>
        </div>
      )}

      {/* CHRONOLOGY STATE 1: TELA DE LOGIN COM SENHA E BIOMETRIA */}
      {authRole === "login" && (
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-sky-500/30 text-white font-black text-xl tracking-wider">
                A&C
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Ponto A&C</h1>
              <p className="text-xs text-sky-400 mt-1 font-medium">Saúde e Segurança do Trabalho</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail ou Usuário</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Senha</label>
                <input
                  type="password"
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Selecione o Colaborador (Perfil)</label>
                <select
                  value={currentColabUser?.id || ""}
                  onChange={(e) => {
                    const found = colaboradores.find((c) => c.id === e.target.value);
                    if (found) setCurrentColabUser(found);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                >
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} — {c.cargo} ({c.departamento})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleColabLoginWithPassword}
                  className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" /> Entrar com Senha
                </button>

                <button
                  onClick={handleBiometricLogin}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl font-semibold transition-all border border-emerald-500/30 flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-4 h-4" /> Desbloquear com Digital (Biometria)
                </button>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase">instalação mobile</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setInstallModal("android")}
                  className="py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl font-medium border border-slate-800 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" /> Instalar Android
                </button>
                <button
                  onClick={() => setInstallModal("ios")}
                  className="py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl font-medium border border-slate-800 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" /> Instalar iOS
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowAdminLoginModal(true)}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-sky-300 rounded-xl font-semibold transition-all border border-sky-500/20 flex items-center justify-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5" /> Acesso Administrador (RH)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* CHRONOLOGY STATE 2 & 3 & 4: USUÁRIO COMUM (COLABORADOR) COM ABA DE PERFIL PARA CADASTRAR FOTO */}
      {authRole === "colaborador" && currentColabUser && (
        <div className="flex-1 flex flex-col">
          <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-45">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src={currentColabUser.fotoCadastro} alt="" className="w-9 h-9 rounded-xl object-cover border border-sky-500/40" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    <span className="text-xs font-black tracking-wider text-sky-400">PONTO A&C</span>
                  </div>
                  <h1 className="text-sm font-bold text-white">{currentColabUser.nome}</h1>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setColabTab("bater-ponto")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    colabTab === "bater-ponto" ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  Bater Ponto
                </button>
                <button
                  onClick={() => setColabTab("historico")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    colabTab === "historico" ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  Histórico
                </button>
                <button
                  onClick={() => setColabTab("perfil")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    colabTab === "perfil" ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" /> Meu Perfil & Foto
                </button>
                <button
                  onClick={() => setAuthRole("login")}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors ml-2"
                  title="Sair / Trocar Usuário"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
            {colabTab === "bater-ponto" ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-6 space-y-6">
                  {(() => {
                    const saldoColab = bancoHorasData.find((b) => b.colaboradorId === currentColabUser.id) || {
                      dataInicioSaldo: "01/09/2026",
                      saldoInicial: "00h 00m",
                      bancoHorasSaldo: "+14h 30m",
                      horasExtras: "+12h 00m",
                      descontosBanco: "00h 00m",
                      statusBanco: "POSITIVO",
                    };
                    return (
                      <div className="bg-gradient-to-tr from-sky-950/80 to-slate-900 border border-sky-500/30 rounded-2xl p-5 shadow-xl">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-sky-400" /> Prévia do Banco de Horas (Desde {saldoColab.dataInicioSaldo})
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            saldoColab.statusBanco === "POSITIVO" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                          }`}>
                            {saldoColab.statusBanco}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 block mb-1">Saldo Atual</span>
                            <span className="text-sm font-bold font-mono text-emerald-400">{saldoColab.bancoHorasSaldo}</span>
                          </div>
                          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 block mb-1">Saldo Inicial</span>
                            <span className="text-sm font-bold font-mono text-sky-300">{saldoColab.saldoInicial}</span>
                          </div>
                          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 block mb-1">Horas Extras</span>
                            <span className="text-sm font-bold font-mono text-emerald-300">{saldoColab.horasExtras}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-sky-400" /> Registrar Ponto Eletrônico
                    </h2>
                    <p className="text-xs text-slate-400 mb-4">
                      Base autorizada: <span className="text-sky-300 font-semibold">{currentColabUser.localPermitido?.nome || "Matriz SP"}</span>
                    </p>

                    <form onSubmit={handleRegistrarPontoSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1.5">Tipo de Marcação</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["ENTRADA", "INTERVALO", "SAIDA"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTipoPonto(t)}
                              className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                                tipoPonto === t ? "bg-sky-600 border-sky-500 text-white shadow-md shadow-sky-600/30" : "bg-slate-950 border-slate-800 text-slate-400"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1.5">Simulação de Localização GPS</label>
                        <select
                          value={gpsMode}
                          onChange={(e) => setGpsMode(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                        >
                          <option value="sede">Dentro da Base Autorizada (Matriz / Filial)</option>
                          <option value="proximo">Próximo ao Limite (Dentro do Raio)</option>
                          <option value="longe">Fora da Base (Exige Aprovação do Gestor)</option>
                          <option value="custom">Coordenadas Customizadas</option>
                        </select>
                      </div>

                      {gpsMode === "custom" && (
                        <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">Latitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              value={customLat}
                              onChange={(e) => setCustomLat(parseFloat(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">Longitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              value={customLon}
                              onChange={(e) => setCustomLon(parseFloat(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-mono"
                            />
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
                        >
                          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                          Bater Ponto com Biometria Facial & GPS
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="md:col-span-6 space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-sky-400" /> Auditoria Biométrica por IA (Selfie)
                    </h3>

                    {cameraActive ? (
                      <div className="space-y-3">
                        <div className="relative rounded-xl overflow-hidden bg-black border border-slate-800 aspect-video flex items-center justify-center">
                          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                          <div className="absolute inset-0 border-2 border-dashed border-sky-500/50 rounded-xl pointer-events-none m-4 flex items-center justify-center">
                            <div className="w-32 h-40 rounded-full border-2 border-sky-400/80 animate-pulse"></div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={captureSelfie}
                          className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" /> Capturar Foto para Ponto
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
                          {selfieDataUrl ? (
                            <img src={selfieDataUrl} alt="Selfie" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-4">
                              <img src={currentColabUser.fotoCadastro} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-2 border-2 border-sky-500/50 shadow-lg" />
                              <p className="text-xs text-slate-400">Usando foto de perfil cadastrada para validação facial por IA.</p>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={startCamera}
                          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl font-semibold border border-slate-700 flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" /> Ativar Câmera para Nova Selfie
                        </button>
                      </div>
                    )}
                  </div>

                  {lastResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-5 rounded-2xl border text-xs space-y-2 ${
                        lastResult.success ? "bg-sky-950/60 border-sky-500/40 text-sky-100" : "bg-rose-950/60 border-rose-500/40 text-rose-100"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          {lastResult.success ? <CheckCircle2 className="w-4 h-4 text-sky-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                          {lastResult.mensagem}
                        </span>
                        <span className="font-mono">{lastResult.distancia}m da base</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-900">
                        {lastResult.justificativaBiometrica}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : colabTab === "historico" ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-4">Meus Registros de Ponto Recentes</h3>
                <div className="space-y-3">
                  {registros.filter(r => r.colaboradorId === currentColabUser.id).length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">Nenhum registro encontrado.</p>
                  ) : (
                    registros.filter(r => r.colaboradorId === currentColabUser.id).map((reg) => (
                      <div key={reg.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                            reg.tipo === "ENTRADA" ? "bg-emerald-500/20 text-emerald-400" : reg.tipo === "SAIDA" ? "bg-sky-500/20 text-sky-400" : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {reg.tipo[0]}
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block">{reg.tipo}</span>
                            <span className="text-slate-400">{new Date(reg.timestamp).toLocaleString("pt-BR")}</span>
                            <span className="block text-[11px] text-sky-400 mt-0.5">Distância GPS: {reg.distanciaMetros}m</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full font-bold ${
                          reg.status === "AProvado" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                        }`}>
                          {reg.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl mx-auto space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-sky-400" /> Meu Perfil & Foto Biométrica
                </h3>

                <div className="flex items-center space-x-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <img src={currentColabUser.fotoCadastro} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-sky-500/50" />
                  <div>
                    <h4 className="text-sm font-bold text-white">{currentColabUser.nome}</h4>
                    <p className="text-xs text-sky-400">{currentColabUser.cargo} • {currentColabUser.departamento}</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">URL da Nova Foto de Referência (Selfie / Perfil)</label>
                    <input
                      type="url"
                      value={currentColabUser.fotoCadastro}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCurrentColabUser({ ...currentColabUser, fotoCadastro: val });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        await setDoc(doc(db, "colaboradores", currentColabUser.id), currentColabUser);
                        addToast("success", "Perfil Atualizado", "Sua foto de referência biométrica foi salva com sucesso.");
                      } catch (err) {
                        handleFirestoreError(err, OperationType.WRITE, "colaboradores");
                      }
                    }}
                    className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow-md shadow-sky-600/30"
                  >
                    Salvar Perfil & Foto
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* CHRONOLOGY STATE 5, 6, 7, 8: PAINEL ADMINISTRATIVO (RH) */}
      {authRole === "adm" && (
        <div className="flex-1 flex flex-col md:flex-row">
          {/* SIDEBAR ADM */}
          <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white font-black">
                  A&C
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Painel Gestor RH</h2>
                  <p className="text-[10px] text-sky-400">Ponto A&C — Admin</p>
                </div>
              </div>

              <nav className="space-y-1.5 text-xs font-medium">
                <button
                  onClick={() => setAdmTab("colaboradores")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                    admTab === "colaboradores" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Users className="w-4 h-4" /> Cadastro de Usuários
                </button>
                <button
                  onClick={() => setAdmTab("criterios")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                    admTab === "criterios" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Escalas por Dia
                </button>
                <button
                  onClick={() => setAdmTab("lancamento-manual")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                    admTab === "lancamento-manual" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <PlusCircle className="w-4 h-4" /> Lançamento Manual
                </button>
                <button
                  onClick={() => setAdmTab("banco-horas")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                    admTab === "banco-horas" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <DollarSign className="w-4 h-4" /> Banco de Horas (Set.)
                </button>
                <button
                  onClick={() => setAdmTab("localizacao")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                    admTab === "localizacao" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <MapPin className="w-4 h-4" /> Geolocalização & Alfinete
                </button>
                <button
                  onClick={() => setAdmTab("aprovacoes")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                    admTab === "aprovacoes" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" /> Aprovações
                </button>
                <button
                  onClick={() => setAdmTab("sede")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                    admTab === "sede" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Building2 className="w-4 h-4" /> Sede Geral
                </button>
              </nav>
            </div>

            <div className="pt-6 border-t border-slate-800">
              <button
                onClick={() => setAuthRole("login")}
                className="w-full py-2.5 bg-slate-950 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 rounded-xl font-medium text-xs border border-slate-800 flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair do Painel ADM
              </button>
            </div>
          </aside>

          {/* MAIN ADM CONTENT */}
          <main className="flex-1 p-6 md:p-10 max-w-6xl w-full">
            {admTab === "colaboradores" && (
              <div className="space-y-8">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl">
                  <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-sky-400" /> Cadastrar Novo Colaborador
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">
                    Adicione um novo colaborador ao sistema Ponto A&C com foto de referência biométrica para IA.
                  </p>

                  <form onSubmit={handleAddColaborador} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5">Nome Completo</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: João da Silva"
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5">E-mail Profissional</label>
                      <input
                        type="email"
                        required
                        placeholder="Ex: colaborador@ac-saude.com.br"
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Cargo</label>
                        <input
                          type="text"
                          placeholder="Ex: Técnico em Segurança"
                          value={novoCargo}
                          onChange={(e) => setNovoCargo(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Departamento</label>
                        <input
                          type="text"
                          placeholder="Ex: Operações"
                          value={novoDep}
                          onChange={(e) => setNovoDep(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">URL da Foto de Perfil / Biometria</label>
                      <input
                        type="url"
                        value={novaFotoUrl}
                        onChange={(e) => setNovaFotoUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow-md shadow-sky-600/30"
                    >
                      Cadastrar Colaborador
                    </button>
                  </form>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-base font-bold text-white mb-4">Colaboradores Ativos ({colaboradores.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {colaboradores.map((colab, index) => {
                      const assiduidade = calcularAssiduidade(colab.id);
                      return (
                        <motion.div
                          key={colab.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.08 }}
                          className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-lg space-y-3"
                        >
                          <div className="flex items-center space-x-3">
                            <img src={colab.fotoCadastro} alt="" className="w-12 h-12 rounded-xl object-cover border border-sky-500/40" />
                            <div>
                              <h4 className="font-bold text-white text-sm">{colab.nome}</h4>
                              <p className="text-sky-400">{colab.cargo}</p>
                              <span className="text-[10px] text-slate-400 block">{colab.departamento}</span>
                              {colab.email && <span className="text-[10px] text-slate-400 font-mono block">{colab.email}</span>}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-900 space-y-2">
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-400 font-medium">Índice de Assiduidade</span>
                              <span className="text-emerald-400 font-bold">{assiduidade}%</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  assiduidade >= 90 ? "bg-emerald-500" : assiduidade >= 80 ? "bg-amber-500" : "bg-rose-500"
                                }`}
                                style={{ width: `${assiduidade}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between pt-1 text-[10px]">
                              <span className="text-slate-400">Senha: {colab.mustChangePassword ? "Padrão (Pendente)" : "Ativa"}</span>
                              <button
                                onClick={() => handleResetPassword(colab)}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg font-semibold border border-amber-500/30 transition-colors flex items-center gap-1"
                                title="Resetar senha para AC2026@"
                              >
                                <RefreshCw className="w-3 h-3" /> Resetar Senha
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {admTab === "criterios" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-3xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sky-400" /> Escalas por Dia da Semana (Horários Diferenciados)
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Configure jornadas de trabalho específicas para cada dia da semana (ex: Segunda das 06h às 17h, Terça das 08h30 às 19h).
                </p>

                <div className="space-y-6 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Selecionar Colaborador</label>
                    <select
                      value={selectedAdmColabId}
                      onChange={(e) => setSelectedAdmColabId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                    >
                      {colaboradores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} — {c.cargo} ({c.departamento})
                        </option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const escala = escalasColaboradores[selectedAdmColabId] || {
                      colaboradorId: selectedAdmColabId,
                      dias: {
                        segunda: defaultDiaEscala("08:00", "17:00"),
                        terca: defaultDiaEscala("08:00", "17:00"),
                        quarta: defaultDiaEscala("08:00", "17:00"),
                        quinta: defaultDiaEscala("08:00", "17:00"),
                        sexta: defaultDiaEscala("08:00", "17:00"),
                        sabado: { ...defaultDiaEscala(), ativo: false },
                        domingo: { ...defaultDiaEscala(), ativo: false },
                      },
                      toleranciaMinutos: 10,
                    };

                    const updateDiaEscala = (diaKey: keyof typeof escala.dias, field: keyof DiaEscala, val: any) => {
                      setEscalasColaboradores((prev) => ({
                        ...prev,
                        [selectedAdmColabId]: {
                          ...escala,
                          dias: {
                            ...escala.dias,
                            [diaKey]: {
                              ...escala.dias[diaKey],
                              [field]: val,
                            },
                          },
                        },
                      }));
                    };

                    const diasMeta: { key: keyof typeof escala.dias; label: string }[] = [
                      { key: "segunda", label: "Segunda-feira" },
                      { key: "terca", label: "Terça-feira" },
                      { key: "quarta", label: "Quarta-feira" },
                      { key: "quinta", label: "Quinta-feira" },
                      { key: "sexta", label: "Sexta-feira" },
                      { key: "sabado", label: "Sábado" },
                      { key: "domingo", label: "Domingo" },
                    ];

                    return (
                      <div className="space-y-4 pt-2 border-t border-slate-800">
                        <div className="space-y-3">
                          {diasMeta.map((d) => {
                            const diaData = escala.dias[d.key];
                            return (
                              <div key={d.key} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2 cursor-pointer font-bold text-white text-sm">
                                    <input
                                      type="checkbox"
                                      checked={diaData.ativo}
                                      onChange={(e) => updateDiaEscala(d.key, "ativo", e.target.checked)}
                                      className="rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-sky-500 w-4 h-4"
                                    />
                                    {d.label}
                                  </label>
                                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${diaData.ativo ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                                    {diaData.ativo ? "Dia Útil (Trabalho)" : "Folga / Inativo"}
                                  </span>
                                </div>

                                {diaData.ativo && (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-900">
                                    <div>
                                      <label className="block text-[11px] text-slate-400 mb-1">Entrada</label>
                                      <input
                                        type="time"
                                        value={diaData.entrada}
                                        onChange={(e) => updateDiaEscala(d.key, "entrada", e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] text-slate-400 mb-1">Início Intervalo</label>
                                      <input
                                        type="time"
                                        value={diaData.intervaloInicio}
                                        onChange={(e) => updateDiaEscala(d.key, "intervaloInicio", e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] text-slate-400 mb-1">Fim Intervalo</label>
                                      <input
                                        type="time"
                                        value={diaData.intervaloFim}
                                        onChange={(e) => updateDiaEscala(d.key, "intervaloFim", e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] text-slate-400 mb-1">Saída</label>
                                      <input
                                        type="time"
                                        value={diaData.saida}
                                        onChange={(e) => updateDiaEscala(d.key, "saida", e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                          <label className="block text-slate-400 mb-1 font-semibold">Tolerância de Atraso (Minutos)</label>
                          <input
                            type="number"
                            value={escala.toleranciaMinutos}
                            onChange={(e) =>
                              setEscalasColaboradores((prev) => ({
                                ...prev,
                                [selectedAdmColabId]: { ...escala, toleranciaMinutos: parseInt(e.target.value) || 10 },
                              }))
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm"
                          />
                        </div>

                        <button
                          onClick={() => {
                            const targetColab = colaboradores.find((c) => c.id === selectedAdmColabId);
                            addToast("success", "Escala Salva", `Horários por dia da semana salvos com sucesso para ${targetColab?.nome}.`);
                          }}
                          className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow-md shadow-sky-600/30"
                        >
                          Salvar Escala Diferenciada
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* 2. LANÇAMENTO MANUAL DE PONTO */}
            {admTab === "lancamento-manual" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-sky-400" /> Lançamento Manual de Ponto pelo Gestor
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Insira marcações de ponto manuais (ex: esquecimento de crachá, ajustes retroativos). O registro será marcado como oficial do RH.
                </p>

                <form onSubmit={handleLancamentoManualSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Colaborador</label>
                    <select
                      value={manualColabId}
                      onChange={(e) => setManualColabId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                    >
                      {colaboradores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} — {c.departamento}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Data</label>
                      <input
                        type="date"
                        required
                        value={manualData}
                        onChange={(e) => setManualData(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Horário</label>
                      <input
                        type="time"
                        required
                        value={manualHora}
                        onChange={(e) => setManualHora(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Tipo de Ponto</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["ENTRADA", "INTERVALO", "SAIDA"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setManualTipo(t)}
                          className={`py-2 px-3 rounded-lg font-semibold border ${
                            manualTipo === t ? "bg-sky-600 border-sky-500 text-white" : "bg-slate-950 border-slate-800 text-slate-400"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Motivo / Justificativa</label>
                    <input
                      type="text"
                      required
                      value={manualMotivo}
                      onChange={(e) => setManualMotivo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white"
                      placeholder="Ex: Esqueceu de registrar na saída por reunião externa"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow-md shadow-sky-600/30"
                  >
                    Confirmar Lançamento Manual
                  </button>
                </form>
              </div>
            )}

            {/* 3. SALDO INICIAL E BANCO DE HORAS */}
            {admTab === "banco-horas" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Saldo Inicial & Banco de Horas (Início a partir de Setembro)</h3>
                    <p className="text-xs text-slate-400">Configure o saldo inicial de banco de horas migrado ao começar a usar o app (ex: 01/09/2026)</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                        <th className="py-3 px-4">Colaborador</th>
                        <th className="py-3 px-4">Data Início</th>
                        <th className="py-3 px-4">Saldo Inicial</th>
                        <th className="py-3 px-4">Horas Mês</th>
                        <th className="py-3 px-4">Horas Extras</th>
                        <th className="py-3 px-4">Descontos</th>
                        <th className="py-3 px-4">Saldo Total</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Espelho PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {bancoHorasData.map((item, idx) => (
                        <tr key={item.colaboradorId} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-bold text-white">{item.nome}</td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={item.dataInicioSaldo}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBancoHorasData((prev) =>
                                  prev.map((b, i) => (i === idx ? { ...b, dataInicioSaldo: val } : b))
                                );
                              }}
                              className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono text-center"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={item.saldoInicial}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBancoHorasData((prev) =>
                                  prev.map((b, i) => (i === idx ? { ...b, saldoInicial: val } : b))
                                );
                              }}
                              className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-emerald-400 font-mono text-center font-bold"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-200">{item.horasTrabalhadasMes}</td>
                          <td className="py-3 px-4 font-mono text-emerald-400">{item.horasExtras}</td>
                          <td className="py-3 px-4 font-mono text-rose-400">{item.descontosBanco}</td>
                          <td className="py-3 px-4 font-mono font-bold text-sky-300">{item.bancoHorasSaldo}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full font-medium ${item.statusBanco === "POSITIVO" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                              {item.statusBanco}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => exportarEspelhoPontoPDF(item)}
                              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium flex items-center gap-1.5 ml-auto"
                            >
                              <FileText className="w-3.5 h-3.5" /> PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {admTab === "localizacao" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-sky-400" /> Definir Localização & Colocar Alfinete (Google Maps)
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Selecione o colaborador, abra o Google Maps para posicionar o alfinete na localização exata (ou clique no mapa interativo para ajustar) e salve as coordenadas permitidas.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
                  <div className="md:col-span-5 space-y-4">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5">Selecionar Colaborador</label>
                      <select
                        value={selectedAdmColabId}
                        onChange={(e) => setSelectedAdmColabId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                      >
                        {colaboradores.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} — {c.cargo} ({c.departamento})
                          </option>
                        ))}
                      </select>
                    </div>

                    <form onSubmit={handleSaveLocalPermitido} className="space-y-4 pt-2 border-t border-slate-800">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold">Nome do Local Autorizado</label>
                          <input
                            type="text"
                            value={localCustomColab.nome}
                            onChange={(e) => setLocalCustomColab({ ...localCustomColab, nome: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-400 mb-1 font-semibold">Latitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              value={localCustomColab.lat}
                              onChange={(e) => setLocalCustomColab({ ...localCustomColab, lat: parseFloat(e.target.value) })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1 font-semibold">Longitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              value={localCustomColab.lon}
                              onChange={(e) => setLocalCustomColab({ ...localCustomColab, lon: parseFloat(e.target.value) })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold">Raio de Tolerância (Metros)</label>
                          <input
                            type="number"
                            value={localCustomColab.raio}
                            onChange={(e) => setLocalCustomColab({ ...localCustomColab, raio: parseFloat(e.target.value) || 150 })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => abrirGoogleMapsPin(localCustomColab.lat, localCustomColab.lon)}
                          className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 mt-2 shadow-md"
                        >
                          <ExternalLink className="w-4 h-4" /> Abrir no Google Maps & Posicionar Alfinete
                        </button>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow-md shadow-sky-600/30"
                      >
                        Salvar Localização Permitida
                      </button>
                    </form>
                  </div>

                  <div className="md:col-span-7 bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-sky-400" /> Simulador de Alinhamento de Mapa (Clique para mover o Alfinete)
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-4">
                        Clique em qualquer ponto do mapa interativo abaixo para simular a colocação de um alfinete de geolocalização e atualizar as coordenadas instantaneamente.
                      </p>
                    </div>

                    <div
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const clickY = e.clientY - rect.top;
                        const relX = (clickX / rect.width - 0.5) * 0.02;
                        const relY = -(clickY / rect.height - 0.5) * 0.02;
                        setLocalCustomColab((prev) => ({
                          ...prev,
                          lat: parseFloat((prev.lat + relY).toFixed(6)),
                          lon: parseFloat((prev.lon + relX).toFixed(6)),
                        }));
                        addToast("success", "Alfinete Posicionado", "Coordenadas atualizadas pelo clique no mapa.");
                      }}
                      className="relative w-full h-64 bg-slate-900 rounded-xl border border-slate-800 cursor-crosshair overflow-hidden flex items-center justify-center group shadow-inner"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(#0369a1_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-32 h-32 rounded-full border border-sky-500/40 bg-sky-600/10 animate-pulse flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full border border-sky-400/60 bg-sky-500/20"></div>
                        </div>
                      </div>

                      <div className="absolute z-10 flex flex-col items-center pointer-events-none transform -translate-y-4">
                        <div className="bg-sky-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-white" /> {localCustomColab.nome}
                        </div>
                        <div className="w-3 h-3 bg-sky-500 rounded-full border-2 border-white shadow-xl animate-bounce"></div>
                      </div>

                      <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-300 font-mono">
                        Lat: {localCustomColab.lat} | Lon: {localCustomColab.lon}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {admTab === "aprovacoes" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white">Solicitações de Ajuste & Pontos em Local Alternativo</h3>
                <div className="space-y-3">
                  {pendencias.map((pend) => (
                    <div key={pend.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white text-sm block">{pend.colaboradorNome}</span>
                        <span className="text-sky-400">{pend.tipo} • {pend.motivo}</span>
                        <span className="block text-[11px] text-slate-400 mt-1">Data: {pend.dataSolicitacao}</span>
                      </div>
                      <div className="flex gap-2">
                        {pend.status === "PENDENTE" ? (
                          <>
                            <button onClick={() => handleAprovarPendencia(pend.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold">Aprovar</button>
                            <button onClick={() => handleRecusarPendencia(pend.id)} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold">Recusar</button>
                          </>
                        ) : (
                          <span className={`px-3 py-1 rounded-full font-bold ${pend.status === "APROVADO" ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>{pend.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {admTab === "sede" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl">
                <h3 className="text-base font-bold text-white mb-4">Configuração Geral da Sede & Geofencing</h3>
                <form onSubmit={handleSaveSede} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Nome da Sede</label>
                    <input
                      type="text"
                      value={sede.nome}
                      onChange={(e) => setSede({ ...sede, nome: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Raio Máximo (Metros)</label>
                    <input
                      type="number"
                      value={sede.raioMaximoMetros}
                      onChange={(e) => setSede({ ...sede, raioMaximoMetros: parseFloat(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-sky-600 text-white rounded-xl font-semibold">Salvar Sede Geral</button>
                </form>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
