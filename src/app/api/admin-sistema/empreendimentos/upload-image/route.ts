import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

async function requireAdminSistema() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "admin_sistema") {
    return { supabase, error: NextResponse.json({ error: "Acesso restrito" }, { status: 403 }) };
  }
  return { supabase, error: null };
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, error } = await requireAdminSistema();
    if (error) return error;

    const formData = await request.formData();
    const empreendimentoId = formData.get("empreendimentoId") as string;
    const file = formData.get("file") as File | null;

    if (!empreendimentoId || !file) {
      return NextResponse.json({ error: "Campos 'empreendimentoId' e 'file' são obrigatórios" }, { status: 400 });
    }

    // Validar formato webp
    const validTypes = ["image/webp"];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".webp")) {
      return NextResponse.json({ error: "A imagem deve estar em formato WebP (.webp)" }, { status: 400 });
    }

    // Garantir diretório existe
    const uploadDir = path.join(process.cwd(), "public", "empreendimentos");
    await mkdir(uploadDir, { recursive: true });

    // Salvar arquivo
    const filePath = path.join(uploadDir, `${empreendimentoId}.webp`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Atualizar URL no banco
    const imagemUrl = `/empreendimentos/${empreendimentoId}.webp`;
    const { err } = await supabase
      .from("empreendimentos")
      .update({ imagem_url: imagemUrl })
      .eq("id", empreendimentoId);

    if (err) {
      console.error("Erro ao atualizar imagem:", err.message);
      return NextResponse.json({ error: "Erro ao atualizar imagem no banco" }, { status: 500 });
    }

    return NextResponse.json({ imagem_url: imagemUrl });
  } catch (err) {
    console.error("Erro no upload de imagem:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
