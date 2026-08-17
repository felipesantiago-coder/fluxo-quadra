import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSistema } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET ?userId=xxx
 * Retorna os IDs dos empreendimentos atribuídos ao coordenador.
 */
export async function GET(request: NextRequest) {
  const isAllowed = await requireAdminSistema();
  if (!isAllowed) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('coordenador_empreendimentos')
    .select('empreendimento_id')
    .eq('coordenador_id', userId);

  if (error) {
    // Tabela pode não existir ainda
    const code = (error as unknown as Record<string, unknown>)?.code;
    if (code === '42P01') {
      return NextResponse.json({ empreendimentoIds: [] });
    }
    console.error('Erro ao buscar atribuições:', error.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  return NextResponse.json({
    empreendimentoIds: (data || []).map((r: { empreendimento_id: string }) => r.empreendimento_id),
  });
}

/**
 * PUT { userId, empreendimentoIds: string[] }
 * Substitui todas as atribuições de um coordenador.
 * Admin pode atribuir todos os empreendimentos de uma vez.
 */
export async function PUT(request: NextRequest) {
  const isAllowed = await requireAdminSistema();
  if (!isAllowed) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const body = await request.json();
  const { userId, empreendimentoIds } = body as {
    userId: string;
    empreendimentoIds: string[];
  };

  if (!userId || !Array.isArray(empreendimentoIds)) {
    return NextResponse.json(
      { error: 'Campos userId e empreendimentoIds (array) são obrigatórios' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Verificar se o usuário é realmente coordenador
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || (profile as Record<string, unknown>).role !== 'coordenador') {
    return NextResponse.json({ error: 'Usuário não é um coordenador' }, { status: 400 });
  }

  // Delete existentes e inserir novos em uma transação lógica
  // (Supabase Admin Client tem permissão total)
  const { error: delErr } = await admin
    .from('coordenador_empreendimentos')
    .delete()
    .eq('coordenador_id', userId);

  if (delErr) {
    console.error('Erro ao limpar atribuições:', delErr.message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  if (empreendimentoIds.length > 0) {
    const rows = empreendimentoIds.map((empId: string) => ({
      coordenador_id: userId,
      empreendimento_id: empId,
    }));

    const { error: insErr } = await admin
      .from('coordenador_empreendimentos')
      .insert(rows);

    if (insErr) {
      console.error('Erro ao inserir atribuições:', insErr.message);
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, count: empreendimentoIds.length });
}
