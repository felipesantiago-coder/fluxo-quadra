import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMpSubscription } from '@/lib/mercadopago';

// Regex para validacao de UUID v4
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/subscriptions/create
 * Cria uma assinatura no Mercado Pago para o plano escolhido.
 * Retorna a URL de checkout (init_point) para redirecionar o usuário.
 *
 * Body: { planoId: string, cupomId?: string }
 *
 * SEGURANCA:
 *  - Valida UUID do planoId
 *  - Verifica assinatura ativa (evita duplicata)
 *  - usa partial unique index como segunda barreira
 *  - Cupom: valida, incrementa usos atomicamente, registra uso
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const { planoId, cupomId } = body as { planoId?: string; cupomId?: string };

    if (!planoId) {
      return NextResponse.json({ error: 'planoId é obrigatório.' }, { status: 400 });
    }

    // Validar formato do planoId (UUID)
    if (!UUID_RE.test(planoId)) {
      return NextResponse.json({ error: 'planoId inválido.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Buscar o plano no banco
    const { data: plano, error: planoErr } = await adminClient
      .from('planos')
      .select('*')
      .eq('id', planoId)
      .eq('ativo', true)
      .single();

    if (planoErr || !plano) {
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    if (!plano.mercadopago_plan_id) {
      return NextResponse.json(
        { error: 'Plano ainda não sincronizado com o Mercado Pago. Contate o administrador.' },
        { status: 503 }
      );
    }

    // 2. Verificar se o usuário já tem assinatura ATIVA
    const { data: assinaturaAtiva } = await adminClient
      .from('assinaturas')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (assinaturaAtiva) {
      return NextResponse.json(
        { error: 'Você já possui uma assinatura ativa.', subscriptionId: assinaturaAtiva.id },
        { status: 409 }
      );
    }

    // 3. Verificar se há assinatura pendente para este plano
    let currentAssinaturaId: string | null = null;
    const { data: assinaturaPendente } = await adminClient
      .from('assinaturas')
      .select('id, status, mercadopago_subscription_id')
      .eq('user_id', user.id)
      .eq('plano_id', planoId)
      .in('status', ['pending', 'paused'])
      .maybeSingle();

    if (assinaturaPendente) {
      currentAssinaturaId = assinaturaPendente.id;
    }

    // ── 4. Validar cupom (se fornecido) ──
    let cupomValidado: Record<string, unknown> | null = null;
    let valorFinal = Number(plano.preco);
    let valorDescontado = 0;

    if (cupomId) {
      const now = new Date().toISOString();
      const { data: cupom } = await adminClient
        .from('cupons')
        .select('*')
        .eq('id', cupomId)
        .maybeSingle();

      if (!cupom) {
        return NextResponse.json({ error: 'Cupom não encontrado.' }, { status: 404 });
      }
      if (!cupom.ativo) {
        return NextResponse.json({ error: 'Este cupom não está mais ativo.' }, { status: 400 });
      }
      if (cupom.valido_a_partir && cupom.valido_a_partir > now) {
        return NextResponse.json({ error: 'Este cupom ainda não é válido.' }, { status: 400 });
      }
      if (cupom.valido_ate && cupom.valido_ate < now) {
        return NextResponse.json({ error: 'Este cupom expirou.' }, { status: 400 });
      }
      if (cupom.usos_maximos !== null && cupom.usos_atuais >= cupom.usos_maximos) {
        return NextResponse.json({ error: 'Este cupom já atingiu o limite de usos.' }, { status: 400 });
      }
      if (Array.isArray(cupom.planos_ids) && cupom.planos_ids.length > 0 && !cupom.planos_ids.includes(planoId)) {
        return NextResponse.json({ error: 'Este cupom não é válido para o plano selecionado.' }, { status: 400 });
      }

      // Calcular desconto
      const precoOriginal = Number(plano.preco);
      if (cupom.tipo_desconto === 'percentual') {
        valorDescontado = Math.round(precoOriginal * Number(cupom.valor_desconto) / 100 * 100) / 100;
      } else {
        valorDescontado = Math.min(Number(cupom.valor_desconto), precoOriginal);
      }
      valorFinal = Math.max(0, precoOriginal - valorDescontado);
      cupomValidado = cupom as Record<string, unknown>;
    }

    // 5. Criar assinatura no Mercado Pago (com desconto se aplicável)
    const mpResult = await createMpSubscription({
      planoId: plano.mercadopago_plan_id,
      userEmail: user.email || '',
      planoNome: plano.nome,
      customAmount: cupomValidado ? valorFinal : undefined,
      planoPeriodoMeses: plano.periodo_meses,
    });

    // 6. Registrar/atualizar assinatura no banco
    const agora = new Date().toISOString();

    if (assinaturaPendente) {
      const { error: updateErr } = await adminClient
        .from('assinaturas')
        .update({
          mercadopago_subscription_id: mpResult.subscription_id,
          status: 'pending',
          updated_at: agora,
        })
        .eq('id', assinaturaPendente.id);

      if (updateErr) {
        console.error('[POST /api/subscriptions/create] Erro ao atualizar assinatura pendente:', updateErr);
        if (updateErr.code === '23505') {
          return NextResponse.json(
            { error: 'Você já possui uma assinatura ativa ou pendente.' },
            { status: 409 }
          );
        }
      }
    } else {
      const { data: newAssinatura, error: insertErr } = await adminClient.from('assinaturas').insert({
        user_id: user.id,
        plano_id: planoId,
        mercadopago_subscription_id: mpResult.subscription_id,
        status: 'pending',
        data_inicio: null,
        data_fim: null,
      }).select('id').single();

      if (insertErr) {
        console.error('[POST /api/subscriptions/create] Erro ao criar assinatura:', insertErr);
        if (insertErr.code === '23505') {
          return NextResponse.json(
            { error: 'Você já possui uma assinatura ativa ou pendente. Tente novamente.' },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: 'Erro ao criar assinatura.' }, { status: 500 });
      }
      // Capturar ID da assinatura recém-criada para vincular ao cupom_usos
      if (newAssinatura) {
        currentAssinaturaId = newAssinatura.id;
      }
    }

    // 7. Registrar uso do cupom e incrementar (ATÔMICO via SQL raw)
    if (cupomValidado) {
      // FIX SEC-001: Usar RPC atômico para evitar TOCTOU race condition.
      // O SQL abaixo faz: UPDATE ... SET usos_atuais = usos_atuais + 1
      // WHERE id = $1 AND (usos_maximos IS NULL OR usos_atuais < usos_maximos)
      // Tudo em uma única operação atômica no PostgreSQL.
      const { data: incResult, error: incErr } = await adminClient.rpc('incrementar_uso_cupom', {
        p_cupom_id: cupomValidado.id,
      });

      if (incErr || !incResult) {
        console.error('[POST /api/subscriptions/create] Falha ao incrementar cupom:', incErr);
      } else if (incResult === false) {
        console.warn('[POST /api/subscriptions/create] Cupom esgotado (race condition detectada):', cupomValidado.id);
      }

      // Registrar uso detalhado (com assinatura_id para o webhook validar valor)
      await adminClient.from('cupom_usos').insert({
        cupom_id: cupomValidado.id,
        user_id: user.id,
        assinatura_id: currentAssinaturaId,
        plano_id: planoId,
        valor_original: Number(plano.preco),
        valor_descontado: valorDescontado,
        valor_final: valorFinal,
      });
    }

    const response: Record<string, unknown> = {
      checkoutUrl: mpResult.init_point,
      subscriptionId: mpResult.subscription_id,
    };

    if (cupomValidado) {
      response.desconto = {
        codigo: cupomValidado.codigo,
        valor_original: Number(plano.preco),
        valor_descontado: valorDescontado,
        valor_final: valorFinal,
      };
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error('[POST /api/subscriptions/create] Erro:', err);

    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('MERCADOPAGO_ACCESS_TOKEN')) {
      return NextResponse.json(
        { error: 'Integração com pagamento não configurada. Contate o administrador.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Erro ao criar assinatura.' }, { status: 500 });
  }
}
