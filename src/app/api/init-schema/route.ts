import { NextResponse } from "next/server";
import { requireAdminSistema } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Endpoint temporário para verificar se a tabela profiles existe.
// FIX SEC-006: Agora requer admin_sistema (antes aceitava qualquer autenticado)
export async function POST() {
  try {
    const isAllowed = await requireAdminSistema();
    if (!isAllowed) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const supabase = await createClient();

    // Tentar consultar a tabela profiles para verificar se existe
    const { error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (!checkError) {
      return NextResponse.json({
        message: "Tabela profiles já existe. Nenhuma ação necessária.",
        alreadyExists: true,
      });
    }

    return NextResponse.json({
      message: "Tabela profiles não encontrada. Execute o SQL abaixo no Supabase SQL Editor.",
      alreadyExists: false,
      instructions: "Acesse o Supabase Dashboard > SQL Editor > New Query, cole o conteúdo do arquivo supabase/schema-admin.sql e clique em Run.",
      file: "supabase/schema-admin.sql",
    });
  } catch (err) {
    console.error("Erro no init-schema:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
