"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { validatePassword } from "@/lib/password-validation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validation = validatePassword(password);
  const allRulesMet = validation.valid;
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const canSubmit = allRulesMet && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/first-login/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao alterar senha");
      }

      setSuccess(true);
      // Redirecionar para configuração de MFA após 1.5s
      setTimeout(() => {
        router.push("/mfa-onboarding");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#0D1B2A] text-white shadow-lg">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center h-16 gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Primeiro Acesso
              </h1>
              <p className="text-[11px] text-gray-400 font-medium">
                Etapa 1 de 2 — Definir senha
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">Progresso</span>
              <span className="text-xs font-bold text-gray-900">1 / 2</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0D1B2A] to-gray-600 rounded-full transition-all duration-500"
                style={{ width: success ? "100%" : "50%" }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header do card */}
            <div className="bg-gradient-to-r bg-[#0D1B2A] p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                {success ? (
                  <Check className="w-8 h-8 text-emerald-400" />
                ) : (
                  <Lock className="w-8 h-8 text-white/80" />
                )}
              </div>
              <h2 className="text-xl font-bold text-white">
                {success ? "Senha definida!" : "Defina sua nova senha"}
              </h2>
              <p className="text-white/60 text-sm mt-1">
                {success
                  ? "Agora vamos configurar a segurança adicional"
                  : "Esta será sua senha pessoal de acesso ao sistema"}
              </p>
            </div>

            {success ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm text-gray-600">
                  Redirecionando para a configuração de segurança...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
                    <X className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Nova senha */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua nova senha"
                      autoFocus
                      className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Regras de senha */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Requisitos da senha
                  </p>
                  {validation.rules.map((rule) => (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-2 text-xs transition-colors ${
                        rule.met ? "text-emerald-600" : "text-gray-400"
                      }`}
                    >
                      {rule.met ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      {rule.label}
                    </div>
                  ))}
                </div>

                {/* Confirmar senha */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className={`w-full h-11 pl-10 pr-10 rounded-xl border bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all ${
                        confirmPassword && !passwordsMatch
                          ? "border-red-300 focus:border-red-400"
                          : "border-gray-200 focus:border-gray-300"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                  )}
                  {confirmPassword && passwordsMatch && (
                    <p className="text-xs text-emerald-500 mt-1">As senhas coincidem</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="w-full h-11 rounded-xl bg-[#0D1B2A] to-gray-700 text-white font-semibold text-sm hover:from-gray-800 hover:to-gray-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Definindo senha...
                    </>
                  ) : (
                    <>
                      Definir senha e continuar
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
