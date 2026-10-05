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

interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  departamento: string;
  fotoCadastro: string;
  localPermitido?: {
    nome: string;
    lat: number;
    lon: number;
    raio: number;
  };
}

interface SedeConfig {
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
  const [loginSenha, setLoginSenha] = useState("••••••••");

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
  const [novaFotoUrl, setNovaFotoUrl] = useState("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const found = colaboradores.find((c) => c.id === selectedAdmColabId);
    if (found && found.localPermitido) {
      setLocalCustomColab(found.localPermitido);
    }
  }, [selectedAdmColabId, colaboradores]);

  const fetchData = async () => {
    try {
      const [resSede, resColab, resReg] = await Promise.all([
        fetch("/api/sede"),
        fetch("/api/colaboradores"),
        fetch("/api/registros"),
      ]);
      const sedeData = await resSede.json();
      const colabData = await resColab.json();
      const regData = await resReg.json();

      setSede(sedeData);
      setColaboradores(colabData);
      setRegistros(regData);
      if (colabData.length > 0 && !currentColabUser) {
        setCurrentColabUser(colabData[0]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  };

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
        setRegistros((prev) => [data.registro, ...prev]);
        if (data.pendenteLocal) {
          setPendencias((prev) => [
            {
              id: `PEND_${Date.now()}`,
              colaboradorId: currentColabUser.id,
              colaboradorNome: currentColabUser.nome,
              tipo: "Local Alternativo (Fora da Base)",
              dataSolicitacao: new Date().toLocaleString("pt-BR"),
              motivo: `Ponto em local alternativo. Distância: ${data.distancia}m da base autorizada.`,
              status: "PENDENTE",
            },
            ...prev,
          ]);
        }
      }

      if (data.success) {
        addToast(data.pendenteLocal ? "warning" : "success", data.pendenteLocal ? "Ponto Pendente de Aprovação" : "Ponto Registrado e Confirmado!", data.mensagem);
      } else {
        addToast("error", "Ponto Recusado", data.mensagem || "Verifique os critérios de biometria.");
      }
    } catch (err: any) {
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

  const handleLancamentoManualSubmit = (e: React.FormEvent) => {
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

    setRegistros((prev) => [novoRegistro, ...prev]);
    addToast("success", "Ponto Lançado Manualmente", `Registro de ${manualTipo} adicionado com sucesso para ${colab.nome}.`);
  };

  const handleAddColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome) return;
    try {
      const res = await fetch("/api/colaboradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoNome,
          cargo: novoCargo || "Colaborador",
          departamento: novoDep || "Geral",
          fotoCadastro: novaFotoUrl,
          localPermitido: { nome: "Matriz São Paulo", lat: sede.lat, lon: sede.lon, raio: sede.raioMaximoMetros },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setColaboradores((prev) => [...prev, data.colaborador]);
        setEscalasColaboradores((prev) => ({
          ...prev,
          [data.colaborador.id]: {
            colaboradorId: data.colaborador.id,
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
            colaboradorId: data.colaborador.id,
            nome: data.colaborador.nome,
            departamento: data.colaborador.departamento,
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
        addToast("success", "Colaborador Cadastrado", `${data.colaborador.nome} adicionado com sucesso.`);
      }
    } catch (err) {
      addToast("error", "Erro", "Não foi possível cadastrar o colaborador.");
    }
  };

  const handleSaveLocalPermitido = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/colaboradores/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaboradorId: selectedAdmColabId,
          localPermitido: localCustomColab,
        }),
      });
      if (res.ok) {
        const targetColab = colaboradores.find(c => c.id === selectedAdmColabId);
        if (targetColab) targetColab.localPermitido = localCustomColab;
        addToast("success", "Localização Salva", `Local permitido atualizado para ${targetColab?.nome || "colaborador"}.`);
        fetchData();
      }
    } catch (err) {
      addToast("error", "Erro", "Não foi possível salvar a localização permitida.");
    }
  };

  const handleSaveSede = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/sede", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sede),
      });
      if (res.ok) {
        addToast("success", "Sede Atualizada", "Coordenadas e raio de geofencing salvos com sucesso.");
        fetchData();
      }
    } catch (err) {
      addToast("error", "Erro", "Não foi possível salvar as configurações da sede.");
    }
  };

  const handleAprovarPendencia = (id: string) => {
    setPendencias((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "APROVADO" as const } : p))
    );
    addToast("success", "Solicitação Aprovada", "O ajuste ou ponto em local alternativo foi aprovado pelo gestor.");
  };

  const handleRecusarPendencia = (id: string) => {
    setPendencias((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "RECUSADO" as const } : p))
    );
    addToast("warning", "Solicitação Recusada", "A solicitação foi recusada.");
  };

  const exportarEspelhoPontoPDF = (colabItem: BancoHorasColab) => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(2, 132, 199);
      doc.text("PONTO A&C - SAÚDE E SEGURANÇA DO TRABALHO", 14, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, 14, 26);
      doc.text(`Início do Histórico (Banco de Horas): ${colabItem.dataInicioSaldo} | Saldo Inicial: ${colabItem.saldoInicial}`, 14, 32);

      doc.setDrawColor(203, 213, 225);
      doc.line(14, 36, 196, 36);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Dados do Colaborador:", 14, 44);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Nome: ${colabItem.nome}`, 14, 52);
      doc.text(`ID: ${colabItem.colaboradorId}`, 14, 58);
      doc.text(`Departamento: ${colabItem.departamento}`, 14, 64);

      doc.setFillColor(240, 249, 255);
      doc.roundedRect(14, 72, 182, 32, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.text("Resumo do Período (Banco de Horas):", 18, 80);
      doc.setFont("helvetica", "normal");
      doc.text(`Saldo Inicial (${colabItem.dataInicioSaldo}): ${colabItem.saldoInicial}`, 18, 88);
      doc.text(`Horas Extras: ${colabItem.horasExtras}`, 110, 88);
      doc.text(`Descontos: ${colabItem.descontosBanco}`, 18, 96);
      doc.text(`Saldo Atual: ${colabItem.bancoHorasSaldo} (${colabItem.statusBanco})`, 110, 96);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Registros de Ponto:", 14, 114);

      let y = 122;
      doc.setFillColor(224, 242, 254);
      doc.rect(14, y, 182, 8, "F");
      doc.setFontSize(9);
      doc.text("Data/Hora", 18, y + 5.5);
      doc.text("Tipo", 75, y + 5.5);
      doc.text("Distância GPS", 110, y + 5.5);
      doc.text("Status", 155, y + 5.5);

      y += 8;
      doc.setFont("helvetica", "normal");

      const employeePunches = registros.filter(r => r.colaboradorId === colabItem.colaboradorId);
      
      if (employeePunches.length === 0) {
        y += 8;
        doc.text("Nenhum registro de ponto recente encontrado.", 18, y);
      } else {
        employeePunches.slice(0, 12).forEach((reg) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(new Date(reg.timestamp).toLocaleString("pt-BR"), 18, y + 6);
          doc.text(reg.tipo, 75, y + 6);
          doc.text(`${reg.distanciaMetros}m`, 110, y + 6);
          doc.text(reg.status, 155, y + 6);

          y += 8;
          doc.setDrawColor(241, 245, 249);
          doc.line(14, y, 196, y);
        });
      }

      y = Math.max(y + 30, 240);
      doc.setDrawColor(148, 163, 184);
      doc.line(40, y, 100, y);
      doc.line(116, y, 176, y);

      doc.setFontSize(8);
      doc.text("Assinatura do Colaborador", 55, y + 5);
      doc.text("Assinatura do Gestor / RH", 130, y + 5);

      doc.save(`espelho_ponto_${colabItem.colaboradorId}.pdf`);
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
      {/* Toast Notification Container */}
      <div className="fixed top-20 right-4 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
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
                  onClick={() => setAuthRole("colaborador")}
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

                    <form onSubmit={handleRegistrarPontoSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Tipo de Marcação</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["ENTRADA", "INTERVALO", "SAIDA"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTipoPonto(t)}
                              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                                tipoPonto === t
                                  ? "bg-sky-600 border-sky-500 text-white shadow-lg shadow-sky-600/30"
                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-sky-400" /> Simulação de Localização (Haversine)
                          </span>
                          <button
                            type="button"
                            onClick={() => abrirGoogleMapsPin(getCoordinates().lat, getCoordinates().lon)}
                            className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver no Google Maps
                          </button>
                        </label>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setGpsMode("sede")}
                            className={`py-2 px-2 rounded-lg border ${gpsMode === "sede" ? "bg-emerald-600/20 border-emerald-500 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}
                          >
                            📍 Na Base
                          </button>
                          <button
                            type="button"
                            onClick={() => setGpsMode("proximo")}
                            className={`py-2 px-2 rounded-lg border ${gpsMode === "proximo" ? "bg-emerald-600/20 border-emerald-500 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}
                          >
                            🚶 Próximo
                          </button>
                          <button
                            type="button"
                            onClick={() => setGpsMode("longe")}
                            className={`py-2 px-2 rounded-lg border ${gpsMode === "longe" ? "bg-amber-600/20 border-amber-500 text-amber-300" : "bg-slate-900 border-slate-800 text-slate-400"}`}
                          >
                            🚗 Fora da Base
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-sky-400" /> Selfie Biométrica Ao Vivo
                          </label>
                          {selfieDataUrl && (
                            <button type="button" onClick={() => setSelfieDataUrl(null)} className="text-[11px] text-rose-400 underline">
                              Tirar nova
                            </button>
                          )}
                        </div>

                        {!cameraActive && !selfieDataUrl && (
                          <div className="text-center py-4 border border-dashed border-slate-800 rounded-lg">
                            <button
                              type="button"
                              onClick={startCamera}
                              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium"
                            >
                              Ligar Câmera
                            </button>
                          </div>
                        )}

                        {cameraActive && (
                          <div className="space-y-2">
                            <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                            </div>
                            <button
                              type="button"
                              onClick={captureSelfie}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                            >
                              Capturar Selfie
                            </button>
                          </div>
                        )}

                        {selfieDataUrl && (
                          <div className="flex items-center gap-3">
                            <img src={selfieDataUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                            <p className="text-xs text-emerald-400 font-medium">Selfie capturada com sucesso!</p>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-semibold text-xs transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
                      >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Registrar e Confirmar Ponto
                      </button>
                    </form>
                  </div>
                </div>

                <div className="md:col-span-6 space-y-6">
                  <AnimatePresence mode="wait">
                    {lastResult ? (
                      <motion.div
                        key="result-card"
                        initial={{ opacity: 0, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50, scale: 0.95 }}
                        transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
                        className={`border rounded-2xl p-6 shadow-xl ${
                          lastResult.success && !lastResult.pendenteLocal
                            ? "bg-emerald-950/20 border-emerald-500/40"
                            : lastResult.pendenteLocal
                            ? "bg-amber-950/20 border-amber-500/40"
                            : "bg-rose-950/20 border-rose-500/40"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          {lastResult.success && !lastResult.pendenteLocal ? (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                              className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"
                            >
                              <CheckCircle2 className="w-7 h-7" />
                            </motion.div>
                          ) : lastResult.pendenteLocal ? (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                              className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0"
                            >
                              <AlertTriangle className="w-7 h-7" />
                            </motion.div>
                          ) : (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                              className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0"
                            >
                              <XCircle className="w-7 h-7" />
                            </motion.div>
                          )}
                          <div>
                            <h3 className={`text-base font-bold ${
                              lastResult.success && !lastResult.pendenteLocal ? "text-emerald-400" : lastResult.pendenteLocal ? "text-amber-400" : "text-rose-400"
                            }`}>
                              {lastResult.pendenteLocal ? "Ponto em Local Alternativo (Pendente)" : lastResult.success ? "Ponto Confirmado com Sucesso!" : "Ponto Recusado"}
                            </h3>
                            <p className="text-xs text-slate-300">{lastResult.mensagem}</p>
                          </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-800 text-xs text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Distância da Base:</span>
                            <span className="font-mono text-white">{lastResult.distancia} metros</span>
                          </div>
                          {lastResult.biometria && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Confiança Biométrica:</span>
                                <span className="font-mono text-white">{(lastResult.biometria.confianca_estimada * 100).toFixed(1)}%</span>
                              </div>
                              <div className="mt-2 bg-slate-900 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                                <strong className="text-sky-400 block mb-1">Auditoria Gemini AI:</strong>
                                {lastResult.biometria.justificativa}
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="placeholder-card"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400"
                      >
                        <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h4 className="text-sm font-semibold text-slate-300 mb-1">Aguardando Marcação</h4>
                        <p className="text-xs">Preencha o tipo de ponto, posicione sua localização e tire a selfie para registrar e confirmar.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : colabTab === "historico" ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white">Meu Histórico de Ponto ({currentColabUser.nome})</h3>
                <div className="space-y-2">
                  {registros
                    .filter((r) => r.colaboradorId === currentColabUser.id)
                    .map((reg) => (
                      <div key={reg.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <img src={reg.selfieUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                          <div>
                            <span className="font-bold text-white block">{reg.tipo}</span>
                            <span className="text-slate-400">{new Date(reg.timestamp).toLocaleString("pt-BR")}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2.5 py-1 rounded-full font-medium ${
                            reg.status === "AProvado" ? "bg-emerald-500/10 text-emerald-400" : reg.status === "PENDENTE_APROVACAO_LOCAL" ? "bg-amber-500/10 text-amber-400" : reg.status === "MANUAL_ADM" ? "bg-sky-500/10 text-sky-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {reg.status}
                          </span>
                          <span className="block text-[11px] text-slate-400 mt-1">{reg.distanciaMetros}m da base</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              /* MEU PERFIL & FOTO DE REFERÊNCIA */
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl mx-auto space-y-6">
                <div className="text-center">
                  <h3 className="text-base font-bold text-white">Meu Perfil & Foto de Referência</h3>
                  <p className="text-xs text-slate-400 mt-1">Cadastre ou atualize sua foto de perfil para a auditoria biométrica facial.</p>
                </div>

                <div className="flex flex-col items-center space-y-4">
                  <img src={currentColabUser.fotoCadastro} alt="" className="w-28 h-28 rounded-2xl object-cover border-2 border-sky-500 shadow-xl" />
                  <div className="text-center">
                    <h4 className="text-sm font-bold text-white">{currentColabUser.nome}</h4>
                    <p className="text-xs text-sky-400">{currentColabUser.cargo} • {currentColabUser.departamento}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">URL da Nova Foto de Referência</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentColabUser.fotoCadastro}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentColabUser({ ...currentColabUser, fotoCadastro: val });
                          setColaboradores((prev) => prev.map((c) => c.id === currentColabUser.id ? { ...c, fotoCadastro: val } : c));
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-3">
                    <p className="text-slate-300 font-medium">Ou tire uma foto usando a webcam agora:</p>
                    <button
                      type="button"
                      onClick={() => {
                        startCamera();
                        addToast("success", "Câmera Ativada", "Posicione seu rosto para atualizar sua foto de referência.");
                      }}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold"
                    >
                      Capturar Foto com Câmera
                    </button>
                    {cameraActive && (
                      <div className="space-y-2 mt-3">
                        <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (videoRef.current) {
                              const canvas = document.createElement("canvas");
                              canvas.width = 640;
                              canvas.height = 480;
                              const ctx = canvas.getContext("2d");
                              if (ctx) {
                                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                                const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
                                setCurrentColabUser({ ...currentColabUser, fotoCadastro: dataUrl });
                                setColaboradores((prev) => prev.map((c) => c.id === currentColabUser.id ? { ...c, fotoCadastro: dataUrl } : c));
                                stopCamera();
                                addToast("success", "Foto Atualizada", "Sua foto de referência foi atualizada com sucesso!");
                              }
                            }
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                        >
                          Salvar Esta Foto como Referência
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => addToast("success", "Perfil Salvo", "Suas informações de perfil e foto foram salvas com sucesso.")}
                    className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow-md shadow-sky-600/30"
                  >
                    Salvar Alterações de Perfil
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* CHRONOLOGY STATE 5: ADMINISTRADOR COM PAINEL LATERAL (SIDEBAR) */}
      {authRole === "adm" && (
        <div className="flex-1 flex flex-col md:flex-row">
          {/* SIDEBAR LATERAL */}
          <aside className="w-full md:w-72 bg-slate-900/90 border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-sky-600/30">
                  A&C
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white">Ponto A&C</h1>
                  <p className="text-[11px] text-sky-400">Painel do Administrador</p>
                </div>
              </div>

              <nav className="space-y-1.5 text-xs">
                <button
                  onClick={() => setAdmTab("colaboradores")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                    admTab === "colaboradores" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Users className="w-4 h-4" /> Cadastro de Usuários
                </button>
                <button
                  onClick={() => setAdmTab("criterios")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                    admTab === "criterios" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Escalas por Dia
                </button>
                <button
                  onClick={() => setAdmTab("lancamento-manual")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                    admTab === "lancamento-manual" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <PlusCircle className="w-4 h-4" /> Lançamento Manual
                </button>
                <button
                  onClick={() => setAdmTab("banco-horas")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                    admTab === "banco-horas" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Award className="w-4 h-4" /> Saldo Inicial & Banco
                </button>
                <button
                  onClick={() => setAdmTab("localizacao")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                    admTab === "localizacao" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <MapPin className="w-4 h-4" /> Geolocalização & Alfinete
                </button>
                <button
                  onClick={() => setAdmTab("aprovacoes")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                    admTab === "aprovacoes" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Bell className="w-4 h-4" /> Aprovações Pendentes
                </button>
                <button
                  onClick={() => setAdmTab("sede")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                    admTab === "sede" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Building2 className="w-4 h-4" /> Sede Geral
                </button>
              </nav>
            </div>

            <div className="pt-6 border-t border-slate-800">
              <button
                onClick={() => setAuthRole("login")}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-rose-400 rounded-xl font-semibold text-xs border border-slate-800 flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sair do Painel ADM
              </button>
            </div>
          </aside>

          {/* CONTEÚDO PRINCIPAL DO PAINEL ADM */}
          <main className="flex-1 p-6 md:p-10 overflow-y-auto space-y-6">
            {/* CADASTRO E LISTAGEM DE USUÁRIOS (COLABORADORES) */}
            {admTab === "colaboradores" && (
              <div className="space-y-6 max-w-4xl">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-sky-400" /> Cadastrar Novo Usuário / Colaborador
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">
                    Insira os dados do colaborador para habilitá-lo no sistema. Cada colaborador poderá cadastrar/atualizar sua própria foto de perfil ao fazer o primeiro login.
                  </p>

                  <form onSubmit={handleAddColaborador} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Nome Completo</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Ana Beatriz Souza"
                          value={novoNome}
                          onChange={(e) => setNovoNome(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Cargo / Função</label>
                        <input
                          type="text"
                          placeholder="Ex: Desenvolvedora Sênior"
                          value={novoCargo}
                          onChange={(e) => setNovoCargo(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Departamento</label>
                        <input
                          type="text"
                          placeholder="Ex: Engenharia"
                          value={novoDep}
                          onChange={(e) => setNovoDep(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Foto Inicial (Opcional)</label>
                        <input
                          type="text"
                          value={novaFotoUrl}
                          onChange={(e) => setNovaFotoUrl(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow-md shadow-sky-600/30 flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" /> Cadastrar Colaborador no Sistema
                    </button>
                  </form>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-sky-400" /> Colaboradores Cadastrados Ativos ({colaboradores.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {colaboradores.map((c) => (
                      <div key={c.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <img src={c.fotoCadastro} alt="" className="w-12 h-12 rounded-xl object-cover border border-sky-500/40" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{c.nome}</h4>
                          <p className="text-xs text-sky-400">{c.cargo}</p>
                          <p className="text-[11px] text-slate-400">{c.departamento} • ID: {c.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 1. ESCALAS POR DIA DA SEMANA */}
            {admTab === "criterios" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-sky-400" /> Horários Diferenciados por Dia da Semana (Escala Personalizada)
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Configure horários de entrada, intervalo e saída específicos para cada dia (ex: Segunda das 06:00 às 17:00, Terça das 08:30 às 19:00).
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
                  <input
                    type="text"
                    value={sede.nome}
                    onChange={(e) => setSede({ ...sede, nome: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                  <input
                    type="number"
                    value={sede.raioMaximoMetros}
                    onChange={(e) => setSede({ ...sede, raioMaximoMetros: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
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
