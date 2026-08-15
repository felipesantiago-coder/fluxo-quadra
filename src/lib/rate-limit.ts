/**
 * SEC-007 FIX: Rate limiting in-memory para endpoints sensíveis.
 *
 * Em ambiente serverless (Vercel), cada instância mantém seu próprio mapa.
 * Isso não oferece rate limiting global perfeito, mas:
 * - Protege contra abuso direto em uma única instância
 * - Adiciona latência artificial em brute-force
 * - Complementa eventuais rate limiters do Vercel/infraestrutura
 *
 * Para rate limiting global, use um provedor externo (Upstash Redis, etc).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Mapa em memória: key -> { count, resetAt }
const store = new Map<string, RateLimitEntry>();

// Cleanup periódico para evitar memory leak
const CLEANUP_INTERVAL_MS = 60_000; // 1 minuto
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Janela de tempo em segundos (padrão: 60) */
  windowSeconds?: number;
  /** Máximo de requisições na janela (padrão: 10) */
  maxRequests?: number;
}

/**
 * Verifica rate limit para uma chave.
 * Retorna { success: true } se permitido, { success: false } se bloqueado.
 *
 * Uso:
 *   const { success, remaining } = rateLimit({ key: `validate:${ip}`, maxRequests: 5, windowSeconds: 60 });
 *   if (!success) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const windowMs = (options.windowSeconds ?? 60) * 1000;
  const maxRequests = options.maxRequests ?? 10;
  const now = Date.now();

  cleanup();

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // Nova janela
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Extrai IP do request (considera x-forwarded-for do Vercel).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}
