import React, { useState } from "react";
import { Download, Smartphone, Apple, Check, X, Share2, PlusSquare, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  onInstall: () => Promise<boolean>;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isIOS,
  isAndroid,
  onInstall,
}) => {
  const [activeTab, setActiveTab] = useState<"android" | "ios">(isIOS ? "ios" : "android");
  const [instaladoSucesso, setInstaladoSucesso] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await onInstall();
    if (success) {
      setInstaladoSucesso(true);
      setTimeout(() => {
        onClose();
        setInstaladoSucesso(false);
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-bold border border-sky-500/20 mb-1">
                <Sparkles className="w-3 h-3" /> Aplicativo Instalável (PWA)
              </div>
              <h3 className="text-lg font-bold text-white">Instalar no Celular</h3>
              <p className="text-xs text-slate-400">Ponto A&C na sua tela inicial sem gastar memória</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("android")}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "android"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Android
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ios")}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "ios"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Apple className="w-4 h-4 text-slate-200" />
            iPhone / iPad (iOS)
          </button>
        </div>

        {/* Content - Android */}
        {activeTab === "android" && (
          <div className="space-y-4">
            {isInstallable ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/60 to-slate-950 border border-sky-500/30 space-y-3 text-center">
                <p className="text-xs text-slate-300">
                  Seu navegador é compatível com instalação direta em 1 clique!
                </p>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  {instaladoSucesso ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" /> Instalando Aplicativo...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Instalar Aplicativo Agora
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Para instalar no Google Chrome ou Samsung Internet no Android:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                    <p className="text-slate-300 mt-0.5">
                      Toque no menu de <strong className="text-white">três pontinhos (⋮)</strong> no canto superior direito do navegador.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                    <p className="text-slate-300 mt-0.5">
                      Toque na opção <strong className="text-white">"Instalar aplicativo"</strong> ou <strong className="text-white">"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                    <p className="text-slate-300 mt-0.5">
                      Confirme em <strong className="text-emerald-400">"Instalar"</strong>. O ícone aparecerá direto na sua tela de aplicativos.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content - iOS */}
        {activeTab === "ios" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-300">
              No iPhone ou iPad, a Apple requer a instalação através do navegador <strong className="text-white">Safari</strong>:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                <div>
                  <p className="text-slate-300 font-medium flex items-center gap-1.5">
                    Toque no botão <strong className="text-white">Compartilhar</strong>
                    <Share2 className="w-4 h-4 text-sky-400 inline shrink-0" />
                  </p>
                  <span className="text-[11px] text-slate-500 block">Fica na barra inferior do Safari (ícone de quadrado com seta para cima).</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                <div>
                  <p className="text-slate-300 font-medium flex items-center gap-1.5">
                    Selecione <strong className="text-white">"Adicionar à Tela de Início"</strong>
                    <PlusSquare className="w-4 h-4 text-emerald-400 inline shrink-0" />
                  </p>
                  <span className="text-[11px] text-slate-500 block">Role um pouco para baixo na lista de opções.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                <div>
                  <p className="text-slate-300 font-medium">
                    Toque em <strong className="text-emerald-400">"Adicionar"</strong> no canto superior direito
                  </p>
                  <span className="text-[11px] text-slate-500 block">Pronto! O app Ponto A&C abrirá em tela cheia como um app nativo da App Store.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vantagens */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-[11px] text-slate-400 leading-snug">
            <strong className="text-slate-200">Seguro e Leve:</strong> Sem ocupar espaço de armazenamento, com carregamento instantâneo e acesso em tela cheia.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Entendido / Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
