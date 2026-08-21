import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMpSubscription } from '@/lib/mercadopago';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Regex para validacao de UUID v4
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Regex para validacao basica de senha (min 8 chars, 1 maiuscula, 1 numero)
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

interface SignupSubscribeBody {
  nome: string;
  email: string;
  senha: string;
  planoId: string;
  cupomId?: string;
}

/**
 * POST /api/signup-subscribe
 *
 * Fluxo: Cria conta + assinatura pendente em uma única operação.
 * Retorna a URL de checkout do Mercado Pago.
 *
 * Body: { nome, email, senha, planoId, cupomId? }
 *
 * SEGURANCA:
 *  - Valida todos os campos de entrada
 *  - Cria user no Supabase Auth (service_role)
 *  - Atualiza perfil (criado pelo trigger) com subscription_status = 'pending'
 *  - Valida cupom e cria plano temporário no MP com preço descontado
 *  - Cria assinatura pendente no banco
 *  - Se qualquer etapa pós-auth falhar, faz cleanup do usuário
 */
export async function POST(request: NextRequest) {
  // SEC-007 FIX: Rate limiting — 5 cadastros por IP por minuto
  const ip = getClientIp(request);
  const rl = rateLimit(`signup_subscribe:${ip}`, { maxRequests: 5, windowSeconds: 60 });

  if (!rl.success) {
    return NextResponse.json(
      { error: 'Muitas tentativas de cadastro. Aguarde um momento.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    // 0. Verificar se MP está configurado
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Integração com pagamento não configurada. Contate o administrador.' },
        { status: 503 }
      );
    }

    // 1. Parse e validação do body
    const body = await request.json();
    const { nome, email, senha, planoId, cupomId } = body as SignupSubscribeBody;

    // LOG: registrar o que chegou (sem a senha)
    console.log('[signup-subscribe] Body recebido:', JSON.stringify({ nome, email, planoId, cupomId: cupomId || 'nenhum' }));

    // Validar nome
    const nomeTrimmed = (nome || '').trim();
    if (!nomeTrimmed || nomeTrimmed.length < 2) {
      return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres.' }, { status: 400 });
    }

    // Validar email
    const emailTrimmed = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }

    // Validar senha
    if (!senha || !PASSWORD_RE.test(senha)) {
      return NextResponse.json(
        { error: 'Senha deve ter pelo menos 8 caracteres, incluindo 1 letra maiúscula e 1 número.' },
        { status: 400 }
      );
    }

    // Validar planoId
    if (!planoId || !UUID_RE.test(planoId)) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
    }

    // 2. Buscar o plano (usando admin client para não precisar de auth)
    const adminClient = createAdminClient();

    const { data: plano, error: planoErr } = await adminClient
      .from('planos')
      .select('*')
      .eq('id', planoId)
      .eq('ativo', true)
      .single();

    if (planoErr || !plano) {
      console.error('[signup-subscribe] Plano não encontrado:', planoId, planoErr);
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    if (!plano.mercadopago_plan_id) {
      return NextResponse.json(
        { error: 'Plano ainda não disponível para compra. Aguarde a configuração.' },
        { status: 503 }
      );
    }

    console.log('[signup-subscribe] Plano encontrado:', plano.nome, '| preço:', plano.preco, '| MP plan:', plano.mercadopago_plan_id);

    // 3. Criar usuário no Supabase Auth
    //    Usamos o admin client (service_role) para criar o user diretamente
    const supabaseAdmin = createAdminClient();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailTrimmed,
      password: senha,
      email_confirm: true, // Auto-confirmar (o pagamento é a verificação real)
      user_metadata: {
        display_name: nomeTrimmed,
        signup_via: 'plan_checkout',
      },
    });

    if (authError || !authData.user) {
      console.error('[signup-subscribe] Erro ao criar usuário:', authError);

      // Verificar se é email já cadastrado
      if (authError?.message?.includes('already') || authError?.message?.includes('registered')) {
        return NextResponse.json(
          { error: 'Este e-mail já está cadastrado. Faça login para assinar um plano.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Erro ao criar conta. Verifique seus dados e tente novamente.' },
        { status: 400 }
      );
    }

    const userId = authData.user.id;
    console.log('[signup-subscribe] User criado:', userId, '| email:', emailTrimmed);

    try {
      // 4. Atualizar perfil do usuário
      //    O trigger handle_new_user() já criou o perfil via AFTER INSERT.
      //    Precisamos apenas garantir que email, display_name e subscription_status
      //    estejam corretos. Usamos UPDATE (não upsert) porque a linha já existe.
      //    Se por algum motivo o trigger não criou o perfil, fazemos INSERT como fallback.
      const { count: updatedCount, error: updateProfileErr } = await adminClient
        .from('profiles')
        .update({
          email: emailTrimmed,
          display_name: nomeTrimmed,
          subscription_status: 'pending',
        })
        .eq('id', userId);

      if (updateProfileErr) {
        console.error('[signup-subscribe] Erro ao atualizar perfil (UPDATE):', updateProfileErr);
      }

      if (!updateProfileErr && updatedCount === 0) {
        // O trigger não criou o perfil — fazer INSERT manual
        console.warn('[signup-subscribe] Perfil não encontrado via trigger, fazendo INSERT manual');
        const { error: insertProfileErr } = await adminClient
          .from('profiles')
          .insert({
            id: userId,
            email: emailTrimmed,
            display_name: nomeTrimmed,
            role: 'comum',
            subscription_status: 'pending',
          });

        if (insertProfileErr) {
          console.error('[signup-subscribe] Erro ao criar perfil (INSERT):', insertProfileErr);
          // Não abortar — o webhook pode reconciliar depois
        } else {
          console.log('[signup-subscribe] Perfil criado via INSERT manual com sucesso');
        }
      } else if (!updateProfileErr) {
        console.log('[signup-subscribe] Perfil atualizado com sucesso (trigger + update)');
      }

      // 5. Verificar se já existe assinatura ativa para este user (edge case)
      const { data: existingSub } = await adminClient
        .from('assinaturas')
        .select('id')
        .eq('user_id', userId)
        .in('status', ['active', 'pending'])
        .maybeSingle();

      if (existingSub) {
        return NextResponse.json(
          { error: 'Já existe uma assinatura para este usuário.' },
          { status: 409 }
        );
      }

      // 6. Validar cupom (se fornecido)
      let cupomValidado: Record<string, unknown> | null = null;
      let valorFinal = Number(plano.preco);
      let valorDescontado = 0;

      if (cupomId) {
        console.log('[signup-subscribe] Validando cupom:', cupomId);
        const now = new Date().toISOString();
        const { data: cupom, error: cupomErr } = await adminClient
          .from('cupons')
          .select('*')
          .eq('id', cupomId)
          .maybeSingle();

        if (cupomErr) {
          console.error('[signup-subscribe] Erro ao buscar cupom:', cupomErr);
        }

        if (!cupom) {
          console.warn('[signup-subscribe] Cupom não encontrado no DB:', cupomId);
          return NextResponse.json({ error: 'Cupom não encontrado.' }, { status: 404 });
        }
        if (!cupom.ativo) {
          return NextResponse.json({ error: 'Cupom inativo.' }, { status: 400 });
        }
        if (cupom.valido_a_partir && cupom.valido_a_partir > now) {
          return NextResponse.json({ error: 'Cupom ainda não é válido.' }, { status: 400 });
        }
        if (cupom.valido_ate && cupom.valido_ate < now) {
          return NextResponse.json({ error: 'Cupom expirou.' }, { status: 400 });
        }
        if (cupom.usos_maximos !== null && cupom.usos_atuais >= cupom.usos_maximos) {
          return NextResponse.json({ error: 'Cupom esgotado.' }, { status: 400 });
        }
        if (Array.isArray(cupom.planos_ids) && cupom.planos_ids.length > 0 && !cupom.planos_ids.includes(planoId)) {
          return NextResponse.json({ error: 'Cupom não válido para este plano.' }, { status: 400 });
        }

        const precoOriginal = Number(plano.preco);
        if (cupom.tipo_desconto === 'percentual') {
          valorDescontado = Math.round(precoOriginal * Number(cupom.valor_desconto) / 100 * 100) / 100;
        } else {
          valorDescontado = Math.min(Number(cupom.valor_desconto), precoOriginal);
        }
        valorFinal = Math.max(0, precoOriginal - valorDescontado);
        cupomValidado = cupom as Record<string, unknown>;
        console.log('[signup-subscribe] Cupom válido:', cupom.codigo, '| tipo:', cupom.tipo_desconto, '| desconto:', valorDescontado, '| final:', valorFinal);
      } else {
        console.log('[signup-subscribe] Nenhum cupom informado — usando preço original:', valorFinal);
      }

      // 7. Criar assinatura no Mercado Pago (com desconto se houver)
      console.log('[signup-subscribe] Chamando createMpSubscription | customAmount:', cupomValidado ? valorFinal : 'undefined (preço original)', '| plano MP:', plano.mercadopago_plan_id);
      let mpResult: { init_point: string; subscription_id: string };
      try {
        mpResult = await createMpSubscription({
          planoId: planoId,
          userEmail: emailTrimmed,
          planoNome: plano.nome,
          planoPreco: Number(plano.preco),
          planoPeriodoMeses: plano.periodo_meses,
          customAmount: cupomValidado ? valorFinal : undefined,
          mercadopagoPlanId: plano.mercadopago_plan_id,
        });
        console.log('[signup-subscribe] MP OK - init_point:', mpResult.init_point?.substring(0, 150), '| sub_id:', mpResult.subscription_id || 'vazio (webhook preenche)');
      } catch (mpErr: unknown) {
        console.error('[signup-subscribe] Falha ao criar assinatura no MP:', mpErr);
        throw mpErr;
      }

      // 8. Registrar assinatura local como pending
      let assinaturaId: string | null = null;
      const subInsert: Record<string, unknown> = {
        user_id: userId,
        plano_id: planoId,
        status: 'pending',
        data_inicio: null,
        data_fim: null,
      };
      if (mpResult.subscription_id) {
        subInsert.mercadopago_subscription_id = mpResult.subscription_id;
      }

      const { data: insertedSub, error: insertSubErr } = await adminClient.from('assinaturas').insert(subInsert).select('id').single();

      if (insertedSub) {
        assinaturaId = insertedSub.id;
      }

      if (insertSubErr) {
        console.error('[signup-subscribe] Erro ao registrar assinatura local:', insertSubErr);
      }

      // 9. Registrar uso do cupom e incrementar (ATÔMICO via RPC)
      if (cupomValidado) {
        const { data: incResult, error: incErr } = await adminClient.rpc('incrementar_uso_cupom', {
          p_cupom_id: cupomValidado.id,
        });

        if (incErr || !incResult) {
          console.error('[signup-subscribe] Falha ao incrementar cupom:', incErr);
        } else if (incResult === false) {
          console.warn('[signup-subscribe] Cupom esgotado (race condition):', cupomValidado.id);
        }

        await adminClient.from('cupom_usos').insert({
          cupom_id: cupomValidado.id,
          user_id: userId,
          assinatura_id: assinaturaId,
          plano_id: planoId,
          valor_original: Number(plano.preco),
          valor_descontado: valorDescontado,
          valor_final: valorFinal,
        });
        console.log('[signup-subscribe] Uso do cupom registrado | assinatura_id:', assinaturaId);
      }

      // 10. Retornar URL de checkout + credenciais para login client-side
      console.log('[signup-subscribe] SUCESSO - redirecionando para checkout | cupom:', !!cupomValidado, '| valor:', valorFinal);
      return NextResponse.json({
        checkoutUrl: mpResult.init_point,
        email: emailTrimmed,
        needsLogin: true,
        message: 'Conta criada com sucesso! Redirecionando para o pagamento...',
      });

    } catch (innerErr: unknown) {
      // Se algo falhar após a criação do usuário, tentar limpar
      const errMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
      const errStack = innerErr instanceof Error ? innerErr.stack : '';
      console.error('[signup-subscribe] Erro pós-criação de usuário, tentando cleanup:', errMsg, errStack);

      // Best-effort cleanup: não bloqueia o retorno de erro
      try {
        await adminClient.auth.admin.deleteUser(userId);
      } catch {
        // Ignore cleanup errors
      }

      // Retornar erro mais descritivo baseado no tipo de falha
      let userMessage = 'Erro ao processar assinatura. Tente novamente.';
      let statusCode = 500;

      if (errMsg.includes('Mercado Pago API')) {
        if (errMsg.includes('401') || errMsg.includes('unauthorized') || errMsg.includes('invalid_token')) {
          userMessage = 'Erro na integração com o pagamento. Contate o administrador.';
          statusCode = 503;
        } else if (errMsg.includes('404') || errMsg.includes('not_found')) {
          userMessage = 'Plano de assinatura não encontrado no Mercado Pago. Contate o administrador.';
          statusCode = 503;
        } else if (errMsg.includes('400') || errMsg.includes('bad_request') || errMsg.includes('invalid')) {
          userMessage = 'Dados do plano incompatíveis com o Mercado Pago. Contate o administrador.';
          statusCode = 503;
        } else {
          userMessage = 'Erro ao conectar com o Mercado Pago. Tente novamente em alguns minutos.';
          statusCode = 502;
        }
      }

      return NextResponse.json(
        { error: userMessage },
        { status: statusCode }
      );
    }
  } catch (err) {
    console.error('[POST /api/signup-subscribe] Erro:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
