/**
 * Integração com Mercado Pago — Assinaturas e Pagamentos
 *
 * Utiliza o SDK oficial mercadopago v3+.
 * Toda comunicação com a API do MP acontece server-side apenas.
 */

import { MercadoPagoConfig, PreApproval, Payment, PreApprovalPlan } from 'mercadopago';

// ── Configuração ──────────────────────────────────────────────

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET;

// back_url validado na inicializacao
// Resolver URL base do app — tentar múltiplas fontes
function resolveAppUrl(): string {
  // 1. Variável de ambiente explícita (pode ser server-side)
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.APP_URL) return process.env.APP_URL;
  // 2. Vercel fornece VERCEL_URL automaticamente
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}

const APP_URL = resolveAppUrl();
if (!APP_URL) {
  console.warn('[MP] Nenhuma URL base configurada (NEXT_PUBLIC_APP_URL, APP_URL ou VERCEL_URL). O back_url do Mercado Pago pode ficar invalido.');
} else {
  console.log('[MP] URL base configurada:', APP_URL);
}

function getBackUrl(path: string): string {
  if (!APP_URL) {
    throw new Error(
      'Nenhuma URL base configurada para o Mercado Pago. ' +
      'Defina NEXT_PUBLIC_APP_URL, APP_URL ou VERCEL_URL no painel da Vercel.'
    );
  }
  return `${APP_URL.replace(/\/$/, '')}${path}`;
}

let _client: PreApproval | null = null;
let _paymentClient: Payment | null = null;
let _planClient: PreApprovalPlan | null = null;

function getMpConfig(): MercadoPagoConfig {
  if (!MP_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurada nas variáveis de ambiente.');
  }
  return new MercadoPagoConfig({
    accessToken: MP_ACCESS_TOKEN,
    options: { timeout: 15000 },
  });
}

/**
 * Retorna o cliente de pré-aprovações (assinaturas) do Mercado Pago.
 * Singleton para reaproveitar a conexão.
 */
export function getPreApprovalClient(): PreApproval {
  if (!_client) {
    _client = new PreApproval(getMpConfig());
  }
  return _client;
}

/**
 * Retorna o cliente de pagamentos do Mercado Pago.
 */
export function getPaymentClient(): Payment {
  if (!_paymentClient) {
    _paymentClient = new Payment(getMpConfig());
  }
  return _paymentClient;
}

/**
 * Retorna o cliente de planos de pré-aprovação.
 */
export function getPreApprovalPlanClient(): PreApprovalPlan {
  if (!_planClient) {
    _planClient = new PreApprovalPlan(getMpConfig());
  }
  return _planClient;
}

/**
 * Retorna o segredo do webhook para verificação de assinatura.
 */
export function getWebhookSecret(): string {
  if (!MP_WEBHOOK_SECRET) {
    throw new Error('MERCADOPAGO_WEBHOOK_SECRET não configurada.');
  }
  return MP_WEBHOOK_SECRET;
}

// ── Tipos ─────────────────────────────────────────────────────

export interface PlanoDB {
  id: string;
  nome: string;
  descricao: string;
  periodo_meses: number;
  preco: number;
  features: string[];
  popular: boolean;
  maior_economia: boolean;
  ativo: boolean;
  ordem: number;
  mercadopago_plan_id: string | null;
}

export interface AssinaturaDB {
  id: string;
  user_id: string;
  plano_id: string;
  mercadopago_subscription_id: string | null;
  mercadopago_payer_id: string | null;
  status: 'pending' | 'active' | 'cancelled' | 'paused' | 'expired' | 'cancelled_by_user';
  metodo_pagamento: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  ultimo_pagamento_em: string | null;
  proximo_ciclo_em: string | null;
  cancelado_em: string | null;
  motivo_cancelamento: string;
  created_at: string;
  updated_at: string;
  // Join com plano
  plano?: PlanoDB;
}

export interface PagamentoDB {
  id: string;
  assinatura_id: string | null;
  user_id: string;
  mercadopago_payment_id: string | null;
  mercadopago_preapproval_id: string | null;
  valor: number;
  metodo_pagamento: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled' | 'in_process';
  data_pagamento: string | null;
  detalhes: Record<string, unknown>;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Verifica se o usuário possui assinatura ativa E dentro do período válido.
 */
export function isSubscriptionActive(assinatura: AssinaturaDB | null): boolean {
  if (!assinatura) return false;
  if (assinatura.status === 'lifetime') return true;
  if (assinatura.status !== 'active') return false;
  // Verificar data_fim
  if (assinatura.data_fim) {
    return new Date(assinatura.data_fim) > new Date();
  }
  // Sem data_fim (plano pré-migration) — considerar ativo
  return true;
}

/**
 * Retorna o status legível da assinatura em português.
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    active: 'Ativa',
    cancelled: 'Cancelada',
    paused: 'Pausada',
    expired: 'Expirada',
    cancelled_by_user: 'Cancelada pelo usuário',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    refunded: 'Estornado',
    in_process: 'Em processamento',
  };
  return labels[status] || status;
}

/**
 * Verifica a assinatura do webhook do Mercado Pago usando x-signature.
 * Ref: https://www.mercadopago.com.br/developers/pt/docs/webhooks/webhooks-management
 */
export async function verifyWebhookSignature(
  xSignature: string | null,
  body: string
): Promise<boolean> {
  if (!xSignature || !MP_WEBHOOK_SECRET) return false;

  try {
    const parts = xSignature.split(',');
    let ts = '';
    let v1 = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') v1 = value;
    }

    if (!ts || !v1) return false;

    // Verificar se o timestamp está dentro de 5 minutos
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(ts, 10)) > 300) return false;

    // Gerar hash esperado
    const crypto = await import('crypto');
    const manifest = `id=${JSON.parse(body).data?.id};ts=${ts};`;
    const expectedHash = crypto
      .createHmac('sha256', MP_WEBHOOK_SECRET)
      .update(manifest)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(v1, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch {
    return false;
  }
}

// ── Operações com a API do Mercado Pago ──────────────────────

/**
 * Cria um plano de assinatura no Mercado Pago.
 * Retorna o ID do plano criado no MP.
 */
export async function createMpPlan(params: {
  planoId: string;
  nome: string;
  periodoMeses: number;
  preco: number;
}): Promise<string> {
  const client = getPreApprovalPlanClient();

  const backUrl = getBackUrl('/assinatura');
  if (!backUrl.startsWith('http')) {
    throw new Error(
      `NEXT_PUBLIC_APP_URL não configurada. Valor atual: "${process.env.NEXT_PUBLIC_APP_URL || '(vazio)'}". ` +
      `Defina esta variável no painel do Vercel (ex: https://seudominio.com).`
    );
  }

  try {
    const response = await client.create({
      body: {
        reason: params.nome,
        auto_recurring: {
          frequency: params.periodoMeses,
          frequency_type: 'months',
          transaction_amount: params.preco,
          currency_id: 'BRL',
        },
        payment_methods_allowed: {
          payment_types: [
            { id: 'credit_card' },
            { id: 'debit_card' },
            { id: 'ticket' },
            { id: 'bank_transfer' },
          ],
        },
        back_url: backUrl,
        status: 'active',
      },
    });

    if (!response.id) {
      throw new Error('Mercado Pago não retornou ID do plano.');
    }

    return response.id;
  } catch (err: unknown) {
    // Capturar erro detalhado da API do Mercado Pago
    const mpErr = err as { message?: string; response?: { data?: { message?: string; error?: string; cause?: string[] }; status?: number } };
    const detail = mpErr?.response?.data?.message
      || mpErr?.response?.data?.error
      || (Array.isArray(mpErr?.response?.data?.cause) ? mpErr.response.data.cause.join('; ') : null)
      || mpErr?.message
      || 'Erro desconhecido';
    const status = mpErr?.response?.status;
    throw new Error(`Mercado Pago API (${status || 'sem status'}): ${detail}`);
  }
}

/**
 * Cria uma assinatura (preapproval) no Mercado Pago.
 * Retorna a URL de init_point para redirecionar o usuário ao checkout.
 *
 * ESTRATÉGIA HÍBRIDA:
 * - SEM cupom → redireciona para o init_point do plano MP diretamente.
 *   O plano agora tem payment_methods_allowed com PIX, cartão, etc.
 *   Nenhuma chamada à API é necessária — a URL é construída a partir do ID do plano.
 * - COM cupom → cria assinatura standalone (auto_recurring + status:pending).
 *   Aceita apenas cartão, mas aplica o desconto do cupom.
 *
 * A associação plano ↔ assinatura é rastreada no nosso DB via plano_id,
 * e o external_reference guarda o planoId para reconciliação via webhook.
 */
export async function createMpSubscription(params: {
  /** ID do plano no banco (UUID) — usado como external_reference */
  planoId: string;
  userEmail: string;
  planoNome: string;
  /** Preço original do plano */
  planoPreco: number;
  /** Frequência do plano em meses */
  planoPeriodoMeses: number;
  /** Se informado, sobrescreve o valor (cupom) → força standalone (só cartão) */
  customAmount?: number;
  /** ID do plano no Mercado Pago — obrigatório para redirect via init_point do plano */
  mercadopagoPlanId: string;
}): Promise<{ init_point: string; subscription_id: string }> {
  const backUrl = getBackUrl('/assinatura');
  if (!backUrl.startsWith('http')) {
    throw new Error(
      `NEXT_PUBLIC_APP_URL não configurada. Valor atual: "${process.env.NEXT_PUBLIC_APP_URL || '(vazio)'}". ` +
      `Defina esta variável no painel do Vercel (ex: https://seudominio.com).`
    );
  }

  // ── Caminho A: Sem cupom → redirect direto ao checkout do plano (PIX + cartão) ──
  if (!params.customAmount || params.customAmount <= 0) {
    const checkoutUrl = new URL('https://www.mercadopago.com.br/subscriptions/checkout');
    checkoutUrl.searchParams.set('preapproval_plan_id', params.mercadopagoPlanId);
    checkoutUrl.searchParams.set('external_reference', params.planoId);
    if (params.userEmail) {
      checkoutUrl.searchParams.set('payer_email', params.userEmail);
    }

    console.log('[createMpSubscription] Usando init_point do plano (sem cupom):', checkoutUrl.toString().substring(0, 100));

    return {
      init_point: checkoutUrl.toString(),
      subscription_id: '', // será preenchido pelo webhook
    };
  }

  // ── Caminho B: Com cupom → assinatura standalone (só cartão, com desconto) ──
  const client = getPreApprovalClient();

  const body: Record<string, unknown> = {
    payer_email: params.userEmail,
    reason: `Assinatura - ${params.planoNome}`,
    back_url: backUrl,
    status: 'pending',
    auto_recurring: {
      frequency: params.planoPeriodoMeses,
      frequency_type: 'months',
      transaction_amount: params.customAmount,
      currency_id: 'BRL',
    },
    external_reference: params.planoId,
  };

  let response: Awaited<ReturnType<typeof client.create>>;
  try {
    response = await client.create({ body });
  } catch (mpErr: unknown) {
    const err = mpErr as {
      name?: string;
      status?: number;
      message?: string;
      error?: string;
      causes?: Array<{ code?: string; description?: string }>;
    };

    const mpStatus = err?.status;
    const mpMessage =
      (err?.causes && err.causes.length > 0
        ? err.causes.map(c => c.description).filter(Boolean).join('; ')
        : '') ||
      err?.error ||
      err?.message ||
      'Erro desconhecido';

    console.error('[createMpSubscription] Falha na API do Mercado Pago (cupom):', {
      error_type: err?.name,
      status: mpStatus,
      message: mpMessage,
      causes: err?.causes,
      planoId: params.planoId,
      email: params.userEmail,
    });

    throw new Error(`Mercado Pago API (${mpStatus || 'sem status'}): ${mpMessage}`);
  }

  if (!response.init_point) {
    console.error('[createMpSubscription] Resposta do MP sem init_point. Resposta parcial:', JSON.stringify({
      id: response.id,
      status: response.status,
      payer_id: response.payer_id,
    }));
    throw new Error('Mercado Pago não retornou init_point para o checkout.');
  }

  return {
    init_point: response.init_point,
    subscription_id: response.id || '',
  };
}

/**
 * Cancela uma assinatura no Mercado Pago.
 */
export async function cancelMpSubscription(subscriptionId: string): Promise<void> {
  const client = getPreApprovalClient();
  await client.update({ id: subscriptionId, body: { status: 'cancelled' } });
}

/**
 * Busca detalhes de uma assinatura no Mercado Pago.
 */
export async function getMpSubscription(subscriptionId: string) {
  const client = getPreApprovalClient();
  return client.get({ id: subscriptionId });
}

/**
 * Busca detalhes de um pagamento no Mercado Pago.
 */
export async function getMpPayment(paymentId: string) {
  const client = getPaymentClient();
  return client.get({ id: paymentId });
}
