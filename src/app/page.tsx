"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  LayoutDashboard,
  BarChart3,
  Users,
} from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Vendas em Tempo Real",
    desc: "Visão em tempo real de todas as unidades dos seus empreendimentos.",
  },
  {
    icon: BarChart3,
    title: "Gestão Inteligente",
    desc: "Controle de disponibilidade, reservas e vendas em um só lugar.",
  },
  {
    icon: Users,
    title: "Equipe Coordenada",
    desc: "Coordenadores e corretores com permissões e acessos definidos.",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const reason = searchParams.get("reason");
    if (reason === "unauthorized") return "Este e-mail não tem permissão de administrador.";
    if (reason === "unauthenticated") return "Faça login para acessar.";
    if (reason === "login_error") return "Erro inesperado. Tente novamente.";
    return "";
  });

  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await createClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos"
          : error.message
        );
        setLoading(false);
        return;
      }

      if (data.user) {
        const isAdminEmail = data.user.email?.toLowerCase() === "prosperosdirecional@gmail.com";

        try {
          const supabase = createClient();

          let profile: Record<string, unknown> | null = null;

          const { data: pFull, error: errFull } = await supabase
            .from("profiles")
            .select("role, mfa_enabled, must_change_password, must_setup_mfa")
            .eq("id", data.user.id)
            .maybeSingle();

          if (!errFull && pFull) {
            profile = pFull as Record<string, unknown> | null;
          } else {
            const { data: pBase, error: errBase } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", data.user.id)
              .maybeSingle();
            if (!errBase) profile = pBase as Record<string, unknown> | null;
          }

          if (profile?.must_change_password) {
            document.cookie = "first_login_step=change_password; path=/; max-age=3600; SameSite=Lax";
            router.push("/change-password");
            router.refresh();
            return;
          }

          if (profile?.must_setup_mfa) {
            document.cookie = "first_login_step=setup_mfa; path=/; max-age=3600; SameSite=Lax";
            router.push("/mfa-onboarding");
            router.refresh();
            return;
          }

          let hasMfa = profile?.mfa_enabled ?? false;
          if (!hasMfa) {
            const [totpRes, passkeyRes] = await Promise.all([
              supabase
                .from("user_totp")
                .select("id")
                .eq("user_id", data.user.id)
                .eq("verified", true)
                .maybeSingle(),
              supabase
                .from("user_passkeys")
                .select("*", { count: "exact", head: true })
                .eq("user_id", data.user.id),
            ]);
            if (totpRes.data) hasMfa = true;
            if (!hasMfa && passkeyRes.count && passkeyRes.count > 0) hasMfa = true;
          }

          const isAdmin =
            (!profile && isAdminEmail) || profile?.role === "admin_sistema";
          if (isAdmin) {
            document.cookie =
              "subscription_status=active; path=/; max-age=300; SameSite=Lax";
          } else {
            try {
              const refreshRes = await fetch('/api/subscription-refresh');
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                if (refreshData.status) {
                  document.cookie = `subscription_status=${refreshData.status}; path=/; max-age=300; SameSite=Lax`;
                }
              } else {
                const { data: subProfile } = await supabase
                  .from("profiles")
                  .select("subscription_status")
                  .eq("id", data.user.id)
                  .maybeSingle();
                const subStatus =
                  (subProfile as Record<string, unknown> | null)?.subscription_status ||
                  "none";
                if (subStatus !== "none") {
                  document.cookie = `subscription_status=${subStatus}; path=/; max-age=300; SameSite=Lax`;
                }
              }
            } catch {
              const { data: subProfile } = await supabase
                .from("profiles")
                .select("subscription_status")
                .eq("id", data.user.id)
                .maybeSingle();
              const subStatus =
                (subProfile as Record<string, unknown> | null)?.subscription_status ||
                "none";
              if (subStatus !== "none") {
                document.cookie = `subscription_status=${subStatus}; path=/; max-age=300; SameSite=Lax`;
              }
            }
          }

          const finalRedirect = isAdmin
            ? "/admin-sistema"
            : "/projetos";

          if (
            !isAdmin &&
            document.cookie.includes("subscription_status=pending")
          ) {
            router.push("/aguardando-pagamento");
            router.refresh();
            return;
          }

          if (hasMfa) {
            await fetch('/api/mfa/require', { method: 'POST' }).catch(() => {});
            router.push(`/mfa-verify?redirect=${encodeURIComponent(finalRedirect)}`);
          } else {
            router.push(finalRedirect);
          }
        } catch {
          router.push('/?reason=login_error');
        }
        router.refresh();
      }
    } catch {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* ── Left Panel: Login Form ── */}
      <div className="flex flex-col w-full lg:w-[480px] xl:w-[520px] bg-white relative z-10 shrink-0">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[400px] mx-auto px-6 sm:px-8 lg:px-10 py-8 sm:py-10 lg:py-12">
            {/* Logo */}
            <div className="mb-6">
              <img
                src="/quadra-desk-logo.jpeg"
                alt="Quadra Desk"
                className="w-full max-w-[240px] sm:max-w-[280px] h-auto"
              />
            </div>

            <div className="w-full h-px bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 mb-7" />

            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Bem-vindo de volta
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Acesse espelhos de vendas e simuladores de pagamento.
            </p>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="username"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full h-12 pl-11 pr-11 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Sign-up link */}
            <div className="text-center mt-5">
              <p className="text-sm text-slate-500">
                Não tem conta?{" "}
                <a
                  href="/planos"
                  className="text-slate-900 font-semibold hover:underline underline-offset-2 transition-all"
                >
                  Criar conta
                </a>
              </p>
            </div>

            {/* Secure badge */}
            <div className="mt-5 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-600">Ambiente seguro</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-400">Criptografia de ponta a ponta</span>
            </div>
          </div>
        </div>


      </div>

      {/* ── Right Panel: Hero / Features ── */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between relative overflow-hidden"
        style={{ backgroundColor: '#1a2332' }}
      >
        {/* Background image with overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 to-transparent" />

        {/* Top: subtle branding */}
        <div className="relative z-10 p-8 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-white/50 tracking-wider uppercase">
            Plataforma ativa
          </span>
        </div>

        {/* Center: Feature carousel */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-12">
          <div className="relative max-w-lg w-full h-[180px]">
            {features.map((feature, idx) => {
              const isActive = idx === activeFeature;
              const isPrev = idx === (activeFeature - 1 + features.length) % features.length;
              const isNext = idx === (activeFeature + 1) % features.length;
              let translateX = "translate-x-[120%]";
              if (isActive) translateX = "translate-x-0";
              else if (isPrev) translateX = "-translate-x-[120%]";
              return (
                <div
                  key={feature.title}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                    isActive
                      ? `opacity-100 ${translateX}`
                      : `opacity-0 ${translateX} pointer-events-none`
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-3xl xl:text-4xl font-bold text-white mb-3 leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 text-base xl:text-lg leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: indicators + stats */}
        <div className="relative z-10 p-8">
          {/* Feature indicators */}
          <div className="flex items-center gap-2 mb-6">
            {features.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveFeature(idx)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  idx === activeFeature
                    ? "w-8 bg-white"
                    : "w-1.5 bg-white/30 hover:bg-white/50"
                }`}
                aria-label={`Feature ${idx + 1}`}
              />
            ))}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-8">
            <div>
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-white/40 mt-0.5">Online</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white">SSL</p>
              <p className="text-xs text-white/40 mt-0.5">Criptografado</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white">MFA</p>
              <p className="text-xs text-white/40 mt-0.5">Autenticação dupla</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-slate-400 animate-pulse" />
            <span className="text-sm font-medium text-slate-400">Carregando...</span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
