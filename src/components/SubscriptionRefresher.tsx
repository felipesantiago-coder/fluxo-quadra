'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * SubscriptionRefresher
 *
 * Componente invisível que periodicamente chama /api/subscription-refresh
 * para manter o cookie subscription_status atualizado (TTL curto de 5 min).
 *
 * Comportamento:
 * - Faz refresh a cada 4 minutos (dentro do TTL de 5 min do cookie)
 * - Só ativa para usuários logados (verifica presença de cookie de sessão Supabase)
 * - Pausa quando a aba não está visível (Page Visibility API)
 * - Não ativa em rotas públicas (/planos, /aguardando-pagamento, /)
 */
export default function SubscriptionRefresher() {
  const pathname = usePathname();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Rotas onde não precisa de refresh
    const publicPaths = ['/', '/planos', '/aguardando-pagamento', '/change-password', '/mfa-onboarding', '/mfa-verify', '/mfa-setup'];
    if (publicPaths.includes(pathname)) {
      return;
    }

    // Verificar se está logado (tem cookie de sessão Supabase)
    const hasSession = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith('sb-') && c.includes('-auth-token'));

    if (!hasSession) return;

    // Função de refresh
    const refresh = async () => {
      // Não fazer refresh se a aba não está visível
      if (document.hidden) return;
      try {
        await fetch('/api/subscription-refresh', { credentials: 'include' });
      } catch {
 // Silencioso — falha do refresh não deve impactar o usuário
      }
    };

    // Fazer um refresh imediato na primeira montagem
    refresh();

    // Depois, a cada 4 minutos
    intervalRef.current = setInterval(refresh, 4 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pathname]);

  return null; // Componente invisível
}
