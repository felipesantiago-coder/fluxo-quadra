import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Endpoint temporário para criar a tabela profiles e popular perfis de usuários existentes
// Deve ser chamado UMA VEZ após o deploy: POST /api/init-schema
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Apenas usuários autenticados podem chamar (proteção básica)
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

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

    // Se a tabela não existe, retorna instruções SQL para o usuário executar
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
