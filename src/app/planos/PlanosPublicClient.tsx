'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Loader2, CreditCard, Shield, Zap,
  Crown, CalendarDays, Clock, Star, AlertCircle,
  User, Mail, Lock, Eye, EyeOff, Building2, Tag, X, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { PlanoDB } from '@/lib/mercadopago';

interface PlanosPublicClientProps {
  planos: PlanoDB[];
}

const periodoLabels: Record<number, string> = {
  1: '/mes',
  3: '/trimestre',
  6: '/semestre',
  12: '/ano',
};

export default function PlanosPublicClient({ planos }: PlanosPublicClientProps) {
  const router = useRouter();
  const [selectedPlano, setSelectedPlano] = useState<PlanoDB | null>(null);
  const [showSignupDialog, setShowSignupDialog] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cupom
  const [cupomInput, setCupomInput] = useState('');
  const [cupomValido, setCupomValido] = useState<Record<string, unknown> | null>(null);
  const [cupomLoading, setCupomLoading] = useState(false);
  const [cupomId, setCupomId] = useState<string | null>(null);

  const handleSelectPlano = (plano: PlanoDB) => {
    if (!plano.mercadopago_plan_id) {
      setError('Este plano ainda nao esta disponivel para compra. Aguarde a configuracao pelo administrador.');
      return;
    }
    setSelectedPlano(plano);
    setShowSignupDialog(true);
  };

  const handleCloseDialog = () => {
    setShowSignupDialog(false);
    setSelectedPlano(null);
    setError(null);
    setSuccess(null);
    setNome('');
    setEmail('');
    setSenha('');
    setConfirmarSenha('');
    setCupomInput('');
    setCupomValido(null);
    setCupomId(null);
  };

  const handleValidarCupom = async () => {
    if (!cupomInput.trim() || !selectedPlano) return;
    setCupomLoading(true);
    setCupomValido(null);
    setCupomId(null);
    try {
      const res = await fetch(`/api/cupons/validate?codigo=${encodeURIComponent(cupomInput.trim())}&planoId=${selectedPlano.id}`);
      const data = await res.json();
      if (data.valid) {
        setCupomValido(data);
        setCupomId(data.cupom.id);
      } else {
        setCupomValido(null);
        setCupomId(null);
        setError(data.error || 'Cupom inválido.');
      }
    } catch {
      setError('Erro ao validar cupom.');
    } finally {
      setCupomLoading(false);
    }
  };

  const handleRemoverCupom = () => {
    setCupomInput('');
    setCupomValido(null);
    setCupomId(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Validacoes client-side
    const nomeTrimmed = nome.trim();
    if (!nomeTrimmed || nomeTrimmed.length < 2) {
      setError('Informe seu nome completo.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('E-mail invalido.');
      return;
    }

    if (senha.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(senha)) {
      setError('A senha deve conter pelo menos 1 letra maiuscula.');
      return;
    }
    if (!/\d/.test(senha)) {
      setError('A senha deve conter pelo menos 1 numero.');
      return;
    }
    if (senha !== confirmarSenha) {
      setError('As senhas nao conferem.');
      return;
    }

    if (!selectedPlano) {
      setError('Selecione um plano.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/signup-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeTrimmed,
          email: email.trim().toLowerCase(),
          senha,
          planoId: selectedPlano.id,
          ...(cupomId ? { cupomId } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao processar. Tente novamente.');
        setLoading(false);
        return;
      }

      // Sucesso — redirecionar para o checkout do Mercado Pago
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError('Erro: URL de checkout nao recebida.');
        setLoading(false);
      }
    } catch {
      setError('Erro de conexao. Tente novamente.');
      setLoading(false);
    }
  };

  // Calcular economia relativa ao plano mensal
  const mensalPrice = planos.find(p => p.periodo_meses === 1)?.preco || 49.9;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-lg">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  Espelho de <span className="text-gray-400 font-normal">Vendas</span>
                </h1>
                <p className="text-[11px] text-gray-400 font-medium">Planos de Assinatura</p>
              </div>
            </div>
            <a
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Ja tenho conta
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10 sm:mb-14"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-4">
              <Zap className="w-3.5 h-3.5" />
              Crie sua conta e comece agora
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Escolha seu plano
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mt-3 max-w-xl mx-auto">
              Cadastre-se e pague para ter acesso completo ao espelho de vendas
              de todos os empreendimentos. Cancele quando quiser, sem multa.
            </p>
          </motion.div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 flex-1">{error}</p>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                  X
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Plan cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {planos.map((plano, index) => {
              const isPopular = plano.popular;
              const precoMensal = Number(plano.preco) / plano.periodo_meses;
              const economia = mensalPrice > 0
                ? Math.round((1 - precoMensal / mensalPrice) * 100)
                : 0;
              const semMpId = !plano.mercadopago_plan_id;

              return (
                <motion.div
                  key={plano.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 * index }}
                  className={`relative rounded-2xl border-2 transition-all duration-300 flex flex-col ${
                    isPopular
                      ? 'border-amber-400 shadow-lg shadow-amber-100 scale-[1.02]'
                      : 'border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-amber-500 text-white border-0 px-3 py-1 text-xs font-bold shadow-sm">
                        <Star className="w-3 h-3 mr-1" />
                        Mais popular
                      </Badge>
                    </div>
                  )}

                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{plano.nome}</h3>
                    <p className="text-xs text-gray-500 mt-1">{plano.descricao}</p>

                    <div className="mt-4 mb-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-bold text-gray-900">
                          R$ {Number(plano.preco).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">
                          {periodoLabels[plano.periodo_meses] || `/${plano.periodo_meses} meses`}
                        </span>
                        {economia > 0 && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 border-0">
                            Economia de {economia}%
                          </Badge>
                        )}
                      </div>
                      {plano.periodo_meses > 1 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Equivalente a R$ {precoMensal.toFixed(2).replace('.', ',')}/mes
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2.5 flex-1">
                      {(plano.features as string[]).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6">
                      {semMpId ? (
                        <Button
                          disabled
                          className="w-full h-11 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
                        >
                          Em breve
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSelectPlano(plano)}
                          className={`w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            isPopular
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg'
                              : 'bg-gray-900 hover:bg-gray-800 text-white'
                          }`}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Assinar agora
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Pagamento seguro</p>
              <p className="text-xs text-gray-500 mt-1">Pix e cartao via Mercado Pago</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <CalendarDays className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Cancele quando quiser</p>
              <p className="text-xs text-gray-500 mt-1">Sem multa ou taxa de cancelamento</p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Acesso imediato</p>
              <p className="text-xs text-gray-500 mt-1">Liberacao automatica apos pagamento</p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm mt-auto">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Crown className="w-4 h-4" />
            <span className="font-semibold text-gray-600">Espelho de Vendas</span>
            <span>-</span>
            <span>Planos de Assinatura</span>
          </div>
        </div>
      </footer>

      {/* Dialog de cadastro + assinatura */}
      <Dialog open={showSignupDialog} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar conta e assinar</DialogTitle>
            <DialogDescription>
              Preencha seus dados para criar a conta. Voce sera redirecionado ao pagamento apos o cadastro.
            </DialogDescription>
          </DialogHeader>

          {selectedPlano && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-xs text-amber-600 font-medium">Plano selecionado</p>
              <p className="text-base font-bold text-gray-900">{selectedPlano.nome}</p>
              <p className="text-xl font-bold text-gray-900">
                R$ {Number(selectedPlano.preco).toFixed(2).replace('.', ',')}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  {periodoLabels[selectedPlano.periodo_meses]}
                </span>
              </p>
              {cupomValido && (
                <div className="mt-2 pt-2 border-t border-amber-200/50">
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Cupom aplicado: {String(cupomValido.cupom.codigo)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    <span className="line-through">R$ {Number(cupomValido.calculo.valor_original).toFixed(2).replace('.', ',')}</span>
                    <span className="font-bold text-emerald-600 ml-2">R$ {Number(cupomValido.calculo.valor_final).toFixed(2).replace('.', ',')}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Campo de cupom */}
          <div className="mb-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              <Tag className="w-3 h-3 inline mr-1 -mt-0.5" />
              Cupom de desconto
            </label>
            {cupomValido ? (
              <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-medium text-emerald-700 flex-1">{String(cupomValido.cupom.codigo)}</span>
                <span className="text-xs text-emerald-600">-{cupomValido.cupom.tipo_desconto === 'percentual' ? `${Number(cupomValido.cupom.valor_desconto)}%` : `R$ ${Number(cupomValido.cupom.valor_desconto).toFixed(2).replace('.', ',')}`}</span>
                <button type="button" onClick={handleRemoverCupom} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cupomInput}
                  onChange={(e) => setCupomInput(e.target.value.toUpperCase())}
                  placeholder="CODIGO"
                  className="flex-1 h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && !cupomLoading && handleValidarCupom()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidarCupom}
                  disabled={cupomLoading || !cupomInput.trim()}
                  className="h-10 px-4 rounded-xl text-xs font-semibold"
                >
                  {cupomLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {/* Nome */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Nome completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 transition-all"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Min. 8 chars, 1 maiuscula, 1 numero"
                  className="w-full h-10 pl-10 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                Confirmar senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 transition-all"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              className="flex-1 rounded-xl"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Criando conta...
                </>
              ) : (
                'Criar e pagar'
              )}
            </Button>
          </DialogFooter>

          <p className="text-[10px] text-gray-400 text-center mt-2">
            Ao criar sua conta, voce concorda com nossos termos de uso.
            O acesso sera liberado automaticamente apos a confirmacao do pagamento.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
