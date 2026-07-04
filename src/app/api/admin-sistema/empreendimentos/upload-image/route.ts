import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";

export const dynamic = "force-dynamic";

async function requireAdminSistema() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin_sistema") {
    return { supabase, error: NextResponse.json({ error: "Acesso restrito" }, { status: 403 }) };
  }
  return { supabase, error: null };
}

const VALID_MIME_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/png",
];

const VALID_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png"];

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

    // Validar formato
    const ext = path.extname(file.name).toLowerCase();
    if (!VALID_MIME_TYPES.includes(file.type) || !VALID_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Formato inválido. Use JPG, PNG ou WebP." },
        { status: 400 }
      );
    }

    // Limitar tamanho a 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Imagem muito grande. Máximo 10MB." }, { status: 400 });
    }

    // Garantir diretório existe
    const uploadDir = path.join(process.cwd(), "public", "empreendimentos");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, `${empreendimentoId}.webp`);

    // Converter para WebP usando sharp (otimiza tamanho e mantém consistência)
    const buffer = Buffer.from(await file.arrayBuffer());
    const webpBuffer = await sharp(buffer)
      .resize(1200, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    await writeFile(filePath, webpBuffer);

    // Atualizar URL no banco
    const imagemUrl = `/empreendimentos/${empreendimentoId}.webp`;
    const { err } = await supabase
      .from("empreendimentos")
      .update({ imagem_url: imagemUrl })
      .eq("id", empreendimentoId);

    if (err) {
      console.error("Erro ao atualizar imagem:", err.message);
      // Limpar arquivo salvo
      try { await unlink(filePath); } catch { /* ignore */ }
      return NextResponse.json({ error: "Erro ao atualizar imagem no banco" }, { status: 500 });
    }

    return NextResponse.json({ imagem_url: imagemUrl });
  } catch (err) {
    console.error("Erro no upload de imagem:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}