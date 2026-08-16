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
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
function getBackUrl(path: string): string {
  // Validar que APP_URL e uma URL https valida
  try {
    const url = new URL(APP_URL);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
      throw new Error('APP_URL deve usar HTTPS');
    }
  } catch {
    // Se APP_URL nao e uma URL valida, usar fallback seguro
    console.warn('[MP] NEXT_PUBLIC_APP_URL invalido. Usando fallback.');
    return `${path}`;
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
 * Verifica se o usuário possui assinatura ativa.
 */
export function isSubscriptionActive(assinatura: AssinaturaDB | null): boolean {
  if (!assinatura) return false;
  return assinatura.status === 'active';
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
 */
export async function createMpSubscription(params: {
  planoId: string;
  userEmail: string;
  planoNome: string;
  /** Se informado, sobrescreve o valor da assinatura (usado para cupons) */
  customAmount?: number;
}): Promise<{ init_point: string; subscription_id: string }> {
  const client = getPreApprovalClient();

  const body: Record<string, unknown> = {
    preapproval_plan_id: params.planoId,
    payer_email: params.userEmail,
    reason: `Assinatura - ${params.planoNome}`,
    status: 'pending',
    back_url: getBackUrl('/assinatura'),
  };

  // Se há valor customizado (cupom), enviar auto_recurring com o desconto
  if (params.customAmount && params.customAmount > 0) {
    body.auto_recurring = {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: params.customAmount,
      currency_id: 'BRL',
    };
  }

  const response = await client.create({ body });

  if (!response.init_point) {
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
