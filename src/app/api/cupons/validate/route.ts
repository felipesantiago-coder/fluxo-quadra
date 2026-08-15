import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * GET /api/cupons/validate?codigo=XXX&planoId=YYY
 * Valida um cupom de desconto para um plano específico.
 * Retorna dados do cupom e valores calculados se válido.
 *
 * Não incrementa usos_atuais — isso é feito no momento da criação da assinatura.
 *
 * SEC-007 FIX: Rate limiting — 10 validações por IP por minuto.
 */
export async function GET(request: NextRequest) {
  // SEC-007 FIX: Rate limiting para evitar enumeração de cupons
  const ip = getClientIp(request);
  const rl = rateLimit(`cupom_validate:${ip}`, { maxRequests: 10, windowSeconds: 60 });

  if (!rl.success) {
    return NextResponse.json(
      { valid: false, error: 'Muitas tentativas. Aguarde um momento.' },
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
    const { searchParams } = request.nextUrl;
    const codigo = searchParams.get('codigo')?.trim();
    const planoId = searchParams.get('planoId')?.trim();

    if (!codigo || !planoId) {
      return NextResponse.json(
        { valid: false, error: 'Código do cupom e ID do plano são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Buscar cupom pelo código (case-insensitive via index)
    const { data: cupom, error: cupomErr } = await supabase
      .from('cupons')
      .select('*')
      .ilike('codigo', codigo)
      .maybeSingle();

    if (cupomErr || !cupom) {
      return NextResponse.json({ valid: false, error: 'Cupom não encontrado.' });
    }

    // Verificações de validade
    if (!cupom.ativo) {
      return NextResponse.json({ valid: false, error: 'Este cupom não está mais ativo.' });
    }

    if (cupom.valido_a_partir && cupom.valido_a_partir > now) {
      return NextResponse.json({ valid: false, error: 'Este cupom ainda não é válido.' });
    }

    if (cupom.valido_ate && cupom.valido_ate < now) {
      return NextResponse.json({ valid: false, error: 'Este cupom expirou.' });
    }

    if (cupom.usos_maximos !== null && cupom.usos_atuais >= cupom.usos_maximos) {
      return NextResponse.json({ valid: false, error: 'Este cupom já atingiu o limite de usos.' });
    }

    // Verificar se o cupom vale para este plano
    if (cupom.planos_ids && Array.isArray(cupom.planos_ids) && cupom.planos_ids.length > 0) {
      if (!(cupom.planos_ids as string[]).includes(planoId)) {
        return NextResponse.json({ valid: false, error: 'Este cupom não é válido para o plano selecionado.' });
      }
    }

    // Buscar preço do plano
    const { data: plano } = await supabase
      .from('planos')
      .select('id, nome, preco')
      .eq('id', planoId)
      .maybeSingle();

    if (!plano) {
      return NextResponse.json({ valid: false, error: 'Plano não encontrado.' });
    }

    // Calcular desconto
    const precoOriginal = Number(plano.preco);
    let valorDescontado: number;
    let valorFinal: number;

    if (cupom.tipo_desconto === 'percentual') {
      valorDescontado = Math.round(precoOriginal * Number(cupom.valor_desconto) / 100 * 100) / 100;
      valorFinal = Math.max(0, precoOriginal - valorDescontado);
    } else {
      valorDescontado = Math.min(Number(cupom.valor_desconto), precoOriginal);
      valorFinal = Math.max(0, precoOriginal - valorDescontado);
    }

    return NextResponse.json({
      valid: true,
      cupom: {
        id: cupom.id,
        codigo: cupom.codigo,
        tipo_desconto: cupom.tipo_desconto,
        valor_desconto: Number(cupom.valor_desconto),
        usos_restantes: cupom.usos_maximos !== null ? cupom.usos_maximos - cupom.usos_atuais : null,
      },
      plano: {
        id: plano.id,
        nome: plano.nome,
      },
      calculo: {
        valor_original: precoOriginal,
        valor_descontado: valorDescontado,
        valor_final: valorFinal,
      },
    });
  } catch (err) {
    console.error('[GET /api/cupons/validate] Erro:', err);
    return NextResponse.json({ valid: false, error: 'Erro interno.' }, { status: 500 });
  }
}
