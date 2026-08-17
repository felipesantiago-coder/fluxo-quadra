/**
 * coordinator-access.ts
 *
 * Verifica se um coordenador tem acesso a um empreendimento específico
 * usando a tabela coordenador_empreendimentos.
 *
 * Toda lógica centralizada aqui para evitar duplicação.
 */

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Retorna os IDs dos empreendimentos atribuídos a um coordenador.
 * Retorna null se a tabela não existir (migration ainda não executada).
 */
export async function getCoordenadorEmpreendimentos(userId: string): Promise<string[] | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('coordenador_empreendimentos')
    .select('empreendimento_id')
    .eq('coordenador_id', userId);

  // Se a tabela não existir, error.code será '42P01'
  if (error) {
    const code = (error as unknown as Record<string, unknown>)?.code;
    if (code === '42P01') {
      return null; // tabela não existe = sem restrição
    }
    return [];
  }

  if (!data) return [];
  return data.map((r: { empreendimento_id: string }) => r.empreendimento_id);
}

/**
 * Verifica se um coordenador tem acesso a um empreendimento específico.
 * Retorna true se:
 *   - A tabela não existe (migration não executada) → sem restrição
 *   - O coordenador tem o empreendimento atribuído
 */
export async function coordenadorHasAccess(
  userId: string,
  empreendimentoId: string
): Promise<boolean> {
  const assigned = await getCoordenadorEmpreendimentos(userId);
  if (assigned === null) return true; // tabela não existe = sem restrição
  return assigned.includes(empreendimentoId);
}
