import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
 * Fluxo Abordagem B: Cria conta + assinatura pendente em uma única operação.
 * Retorna a URL de checkout do Mercado Pago.
 *
 * Body: { nome, email, senha, planoId }
 *
 * SEGURANCA:
 *  - Valida todos os campos de entrada
 *  - Cria user no Supabase Auth
 *  - Cria perfil com subscription_status = 'pending'
 *  - Cria assinatura pendente no banco
 *  - Cria preapproval no Mercado Pago
 *  - Se qualquer etapa falhar, tenta limpar (best-effort)
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
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    if (!plano.mercadopago_plan_id) {
      return NextResponse.json(
        { error: 'Plano ainda não disponível para compra. Aguarde a configuração.' },
        { status: 503 }
      );
    }

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

    try {
      // 4. Criar perfil do usuário
      const { error: profileErr } = await adminClient.from('profiles').upsert({
        id: userId,
        display_name: nomeTrimmed,
        role: 'user',
        subscription_status: 'pending',
      });

      if (profileErr) {
        console.error('[signup-subscribe] Erro ao criar perfil:', profileErr);
        // Continuar — o trigger do Supabase pode ter criado o perfil
      }

      // 5. Verificar se já existe assinatura ativa para este user (edge case)
      const { data: existingSub } = await adminClient
        .from('assinaturas')
        .select('id')
        .eq('user_id', userId)
        .in('status', ['active', 'pending'])
        .maybeSingle();

      if (existingSub) {
        // Usuário já tem assinatura — não deve acontecer em fluxo normal
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
      }

      // 7. Criar assinatura no Mercado Pago (com desconto se houver)
      const mpResult = await createMpSubscription({
        planoId: plano.mercadopago_plan_id,
        userEmail: emailTrimmed,
        planoNome: plano.nome,
        customAmount: cupomValidado ? valorFinal : undefined,
      });

      // 8. Registrar assinatura local como pending
      const { error: insertSubErr } = await adminClient.from('assinaturas').insert({
        user_id: userId,
        plano_id: planoId,
        mercadopago_subscription_id: mpResult.subscription_id,
        status: 'pending',
        data_inicio: null,
        data_fim: null,
      });

      if (insertSubErr) {
        console.error('[signup-subscribe] Erro ao registrar assinatura:', insertSubErr);
        // A assinatura foi criada no MP mas não no banco local
        // O webhook ainda vai tentar processar e falhar ao encontrar o registro
        // Tentar criar novamente
        const { error: retryErr } = await adminClient.from('assinaturas').insert({
          user_id: userId,
          plano_id: planoId,
          mercadopago_subscription_id: mpResult.subscription_id,
          status: 'pending',
        });
        if (retryErr) {
          console.error('[signup-subscribe] Retry de assinatura também falhou:', retryErr);
        }
      }

      // 9. Registrar uso do cupom e incrementar (ATÔMICO via RPC)
      if (cupomValidado) {
        // FIX SEC-001: Usar RPC atômico para evitar TOCTOU race condition
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
          plano_id: planoId,
          valor_original: Number(plano.preco),
          valor_descontado: valorDescontado,
          valor_final: valorFinal,
        });
      }

      // 10. Login automático do usuário (criar sessão)
      //    Precisamos usar o client anon para autenticar
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
        },
      });

      const { error: loginErr } = await anonClient.auth.signInWithPassword({
        email: emailTrimmed,
        password: senha,
      });

      if (loginErr) {
        console.warn('[signup-subscribe] Login automático falhou (usuário pode logar manualmente):', loginErr);
        // Não é erro fatal — o usuário pode fazer login depois
      }

      // 11. Retornar URL de checkout + dados para login
      const responseHeaders = new Headers();

      // Se login automático funcionou, propagar cookies de sessão
      if (!loginErr) {
        const session = anonClient.auth.getSession();
        // Os cookies foram setados no anonClient, mas não no response
        // O usuário será redirecionado para o MP e voltará precisando logar novamente
        // Vamos usar um approach diferente: redirecionar para a página de aguardar
      }

      return NextResponse.json({
        checkoutUrl: mpResult.init_point,
        message: 'Conta criada com sucesso! Complete o pagamento para ativar o acesso.',
      });

    } catch (innerErr) {
      // Se algo falhar após a criação do usuário, tentar limpar
      console.error('[signup-subscribe] Erro pós-criação de usuário, tentando cleanup:', innerErr);

      // Best-effort cleanup: não bloqueia o retorno de erro
      try {
        await adminClient.auth.admin.deleteUser(userId);
      } catch {
        // Ignore cleanup errors
      }

      return NextResponse.json(
        { error: 'Erro ao processar assinatura. Tente novamente.' },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('[POST /api/signup-subscribe] Erro:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
