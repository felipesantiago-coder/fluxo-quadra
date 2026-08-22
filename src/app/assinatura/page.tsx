export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AssinaturaClient from './AssinaturaClient';

interface AssinaturaPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AssinaturaPage({ searchParams }: AssinaturaPageProps) {
  const params = await searchParams;
  const returnedFromPayment = params?.payment === 'return';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  // Buscar perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <AssinaturaClient
      userName={profile?.display_name || user.email || ''}
      isAdmin={profile?.role === 'admin_sistema'}
      returnedFromPayment={returnedFromPayment}
    />
  );
}
