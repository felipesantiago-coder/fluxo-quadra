import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminSistema } from '@/lib/admin-auth';
import { createMpPlan } from '@/lib/mercadopago';

/**
 * GET /api/admin-sistema/planos
 * Admin lista todos os planos (incluindo inativos).
 */
export async function GET() {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('planos')
      .select('*')
      .order('ordem', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar planos.' }, { status: 500 });
    }

    return NextResponse.json({ planos: data || [] });
  } catch (err) {
    console.error('[GET /api/admin-sistema/planos] Erro:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

/**
 * POST /api/admin-sistema/planos
 * Dois comportamentos:
 *   - Body com planoId: sincroniza plano existente com o Mercado Pago
 *   - Body com nome, preco, etc.: cria um NOVO plano
 */
export async function POST(request: NextRequest) {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const body = await request.json();

    // ── Sincronizar plano existente com MP ──
    if (body.planoId && !body.nome) {
      const { data: plano, error: planoErr } = await supabase
        .from('planos')
        .select('*')
        .eq('id', body.planoId)
        .single();

      if (planoErr || !plano) {
        return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
      }

      if (plano.mercadopago_plan_id) {
        return NextResponse.json({
          message: 'Plano já sincronizado.',
          mercadopago_plan_id: plano.mercadopago_plan_id,
        });
      }

      const mpPlanId = await createMpPlan({
        planoId: plano.id,
        nome: plano.nome,
        periodoMeses: plano.periodo_meses,
        preco: Number(plano.preco),
      });

      const { error: updateErr } = await supabase
        .from('planos')
        .update({ mercadopago_plan_id: mpPlanId, updated_at: new Date().toISOString() })
        .eq('id', body.planoId);

      if (updateErr) {
        return NextResponse.json({ error: 'Erro ao salvar ID do plano.' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Plano criado no Mercado Pago com sucesso.',
        mercadopago_plan_id: mpPlanId,
      });
    }

    // ── Criar novo plano ──
    const { nome, descricao, periodo_meses, preco, features, popular, ativo, ordem } = body as {
      nome?: unknown;
      descricao?: unknown;
      periodo_meses?: unknown;
      preco?: unknown;
      features?: unknown;
      popular?: unknown;
      ativo?: unknown;
      ordem?: unknown;
    };

    // Validacao de tipos
    if (typeof nome !== 'string' || typeof periodo_meses !== 'number' || typeof preco !== 'number') {
      return NextResponse.json(
        { error: 'nome (string), periodo_meses (number) e preco (number) sao obrigatorios.' },
        { status: 400 }
      );
    }

    const trimmedNome = nome.trim().slice(0, 100);
    const trimmedDescricao = typeof descricao === 'string' ? descricao.trim().slice(0, 500) : '';

    if (!trimmedNome) {
      return NextResponse.json({ error: 'nome nao pode estar vazio.' }, { status: 400 });
    }

    if (!Number.isInteger(periodo_meses) || periodo_meses < 1 || periodo_meses > 36) {
      return NextResponse.json({ error: 'periodo_meses deve ser inteiro entre 1 e 36.' }, { status: 400 });
    }

    if (preco <= 0 || preco > 99999.99 || !Number.isFinite(preco)) {
      return NextResponse.json({ error: 'preco deve ser um numero positivo ate 99999.99.' }, { status: 400 });
    }

    // Validar features: array de strings com max 20 itens
    let validatedFeatures: string[] = [];
    if (Array.isArray(features)) {
      validatedFeatures = features
        .filter((f) => typeof f === 'string')
        .map((f) => String(f).trim().slice(0, 200))
        .filter((f) => f.length > 0)
        .slice(0, 20);
    }

    // Validar ordem
    const validatedOrdem = typeof ordem === 'number' && Number.isInteger(ordem) && ordem >= 0
      ? ordem
      : undefined;

    // Buscar maior ordem atual
    const { data: maxOrdem } = await supabase
      .from('planos')
      .select('ordem')
      .order('ordem', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: novoPlano, error: insertErr } = await supabase
      .from('planos')
      .insert({
        nome: trimmedNome,
        descricao: trimmedDescricao,
        periodo_meses,
        preco,
        features: validatedFeatures,
        popular: popular === true,
        ativo: ativo !== false,
        ordem: validatedOrdem ?? ((maxOrdem?.ordem || 0) + 1),
      })
      .select()
      .single();

    if (insertErr || !novoPlano) {
      console.error('[POST /api/admin-sistema/planos] Erro ao criar:', insertErr);
      return NextResponse.json({ error: 'Erro ao criar plano.' }, { status: 500 });
    }

    return NextResponse.json({ plano: novoPlano, message: 'Plano criado com sucesso.' }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin-sistema/planos] Erro:', err);
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('MERCADOPAGO_ACCESS_TOKEN')) {
      return NextResponse.json(
        { error: 'Token do Mercado Pago não configurado. Defina MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente.' },
        { status: 503 }
      );
    }
    if (msg.includes('NEXT_PUBLIC_APP_URL')) {
      return NextResponse.json(
        { error: msg },
        { status: 503 }
      );
    }
    if (msg.includes('Mercado Pago API')) {
      return NextResponse.json(
        { error: `Erro do Mercado Pago: ${msg}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: 'Erro ao criar/sincronizar plano.' }, { status: 500 });
  }
}

/**
 * PUT /api/admin-sistema/planos
 * Atualiza os dados de um plano existente.
 * Body: { id, nome?, descricao?, periodo_meses?, preco?, features?, popular?, ativo?, ordem? }
 *
 * Se o plano já estiver sincronizado com o MP e o preço ou período mudarem,
 * o mercadopago_plan_id será removido (precisa re-sincronizar).
 */
export async function PUT(request: NextRequest) {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, nome, descricao, periodo_meses, preco, features, popular, ativo, ordem } = body as {
      id?: string;
      nome?: unknown;
      descricao?: unknown;
      periodo_meses?: unknown;
      preco?: unknown;
      features?: unknown;
      popular?: unknown;
      ativo?: unknown;
      ordem?: unknown;
    };

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar plano atual para comparar mudanças
    const { data: planoAtual, error: fetchErr } = await supabase
      .from('planos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !planoAtual) {
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    // Montar objeto de atualização apenas com campos fornecidos
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    let precoChanged = false;
    let periodoChanged = false;

    if (nome !== undefined) {
      if (typeof nome !== 'string') {
        return NextResponse.json({ error: 'nome deve ser string.' }, { status: 400 });
      }
      updates.nome = String(nome).trim().slice(0, 100);
      if (!updates.nome) {
        return NextResponse.json({ error: 'nome nao pode estar vazio.' }, { status: 400 });
      }
    }

    if (descricao !== undefined) {
      updates.descricao = typeof descricao === 'string' ? descricao.trim().slice(0, 500) : '';
    }

    if (periodo_meses !== undefined) {
      if (typeof periodo_meses !== 'number' || !Number.isInteger(periodo_meses) || periodo_meses < 1 || periodo_meses > 36) {
        return NextResponse.json({ error: 'periodo_meses deve ser inteiro entre 1 e 36.' }, { status: 400 });
      }
      updates.periodo_meses = periodo_meses;
      periodoChanged = periodo_meses !== planoAtual.periodo_meses;
    }

    if (preco !== undefined) {
      if (typeof preco !== 'number' || !Number.isFinite(preco) || preco <= 0 || preco > 99999.99) {
        return NextResponse.json({ error: 'preco deve ser um numero positivo ate 99999.99.' }, { status: 400 });
      }
      updates.preco = preco;
      precoChanged = Number(preco) !== Number(planoAtual.preco);
    }

    if (features !== undefined) {
      if (Array.isArray(features)) {
        updates.features = features
          .filter((f) => typeof f === 'string')
          .map((f) => String(f).trim().slice(0, 200))
          .filter((f) => f.length > 0)
          .slice(0, 20);
      } else {
        return NextResponse.json({ error: 'features deve ser um array de strings.' }, { status: 400 });
      }
    }

    if (popular !== undefined) {
      updates.popular = popular === true;
    }

    if (ativo !== undefined) {
      updates.ativo = ativo === true;
    }

    if (ordem !== undefined) {
      if (typeof ordem === 'number' && Number.isInteger(ordem) && ordem >= 0) {
        updates.ordem = ordem;
      } else {
        return NextResponse.json({ error: 'ordem deve ser um inteiro nao negativo.' }, { status: 400 });
      }
    }

    // Se preço ou período mudou e o plano tem ID do MP, limpar o ID
    if ((precoChanged || periodoChanged) && planoAtual.mercadopago_plan_id) {
      updates.mercadopago_plan_id = null;
    }

    const { data: planoAtualizado, error: updateErr } = await supabase
      .from('planos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr || !planoAtualizado) {
      console.error('[PUT /api/admin-sistema/planos] Erro:', updateErr);
      return NextResponse.json({ error: 'Erro ao atualizar plano.' }, { status: 500 });
    }

    const response: Record<string, unknown> = { plano: planoAtualizado, message: 'Plano atualizado com sucesso.' };

    if ((precoChanged || periodoChanged) && planoAtual.mercadopago_plan_id) {
      response.mp_plan_cleared = true;
      response.mp_warning = 'Preço ou período alterado. O plano precisa ser re-sincronizado com o Mercado Pago.';
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error('[PUT /api/admin-sistema/planos] Erro:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin-sistema/planos
 * Remove um plano. Só permite se não houver assinaturas ativas vinculadas.
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar se existem assinaturas ativas ou pendentes vinculadas
    const { count, error: countErr } = await supabase
      .from('assinaturas')
      .select('id', { count: 'exact', head: true })
      .eq('plano_id', id)
      .in('status', ['active', 'pending']);

    if (countErr) {
      console.error('[DELETE /api/admin-sistema/planos] Erro ao verificar:', countErr);
      return NextResponse.json({ error: 'Erro ao verificar assinaturas.' }, { status: 500 });
    }

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: existem ${count} assinatura(s) ativa(s)/pendente(s) vinculada(s) a este plano. Desative o plano em vez de excluí-lo.` },
        { status: 409 }
      );
    }

    const { error: deleteErr } = await supabase
      .from('planos')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      console.error('[DELETE /api/admin-sistema/planos] Erro:', deleteErr);
      return NextResponse.json({ error: 'Erro ao excluir plano.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Plano excluído com sucesso.' });
  } catch (err) {
    console.error('[DELETE /api/admin-sistema/planos] Erro:', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
