export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlanosClient from './PlanosClient';
import type { PlanoDB } from '@/lib/mercadopago';

export default async function PlanosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  // Buscar planos ativos
  const { data: planosData, error } = await supabase
    .from('planos')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  const planos: PlanoDB[] = (planosData || []).map((p) => ({
    ...p,
    features: Array.isArray(p.features) ? p.features : [],
  }));

  // Buscar assinatura ativa do usuário
  const { data: assinaturaAtiva } = await supabase
    .from('assinaturas')
    .select('id, status, plano:planos(id, nome)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  // Buscar perfil para nome
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin_sistema';

  return (
    <PlanosClient
      userEmail={user.email || ''}
      userName={profile?.display_name || user.email || ''}
      isAdmin={isAdmin}
      planos={planos}
      assinaturaAtiva={assinaturaAtiva || null}
    />
  );
}
