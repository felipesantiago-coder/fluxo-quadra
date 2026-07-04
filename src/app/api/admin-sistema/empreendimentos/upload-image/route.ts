import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import path from "path";

export const dynamic = "force-dynamic";

async function requireAdminSistema() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { supabase, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin_sistema")
    return { supabase, error: NextResponse.json({ error: "Acesso restrito" }, { status: 403 }) };
  return { supabase, error: null };
}

const VALID_MIME_TYPES = ["image/webp", "image/jpeg", "image/png"];
const VALID_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png"];

function getExtFromMime(mime: string): string {
  switch (mime) {
    case "image/png": return ".png";
    case "image/jpeg": return ".jpg";
    default: return ".webp";
  }
}

const BUCKET_NAME = "empreendimentos";

export async function POST(request: NextRequest) {
  try {
    const { supabase, error } = await requireAdminSistema();
    if (error) return error;

    const formData = await request.formData();
    const empreendimentoId = formData.get("empreendimentoId") as string;
    const file = formData.get("file") as File | null;

    if (!empreendimentoId || !file) {
      return NextResponse.json(
        { error: "Campos 'empreendimentoId' e 'file' são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar formato
    const ext = path.extname(file.name).toLowerCase();
    if (!VALID_MIME_TYPES.includes(file.type) || !VALID_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Formato inválido (${file.type}). Use JPG, PNG ou WebP.` },
        { status: 400 }
      );
    }

    // Limitar tamanho a 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Imagem muito grande. Máximo 10MB." }, { status: 400 });
    }

    // Determinar nome do arquivo
    const saveExt = getExtFromMime(file.type);
    const fileName = `${empreendimentoId}${saveExt}`;

    // Upload para o Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      const msg = uploadErr.message || "";

      // Se o bucket não existe, tentar criar via insert na tabela
      if (msg.includes("bucket") || msg.includes("Bucket") || msg.includes("not found")) {
        try {
          const { error: bucketErr } = await supabase
            .from("storage.buckets")
            .insert({
              id: BUCKET_NAME,
              name: BUCKET_NAME,
              public: true,
              file_size_limit: MAX_SIZE,
            });

          // Se criou o bucket, tentar o upload novamente
          if (!bucketErr || bucketErr.code === "23505") {
            const retry = await supabase.storage
              .from(BUCKET_NAME)
              .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true,
              });
            if (!retry.error) {
              const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
              const imagemUrl = urlData.publicUrl;
              await supabase
                .from("empreendimentos")
                .update({ imagem_url: imagemUrl })
                .eq("id", empreendimentoId);
              return NextResponse.json({ imagem_url: imagemUrl });
            }
          }
        } catch {
          // Falha silenciosa, cai no erro abaixo
        }
      }

      console.error("Erro no upload:", msg);
      return NextResponse.json(
        { error: `Erro ao fazer upload. Verifique se o bucket "${BUCKET_NAME}" existe no Supabase Storage.` },
        { status: 500 }
      );
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    const imagemUrl = urlData.publicUrl;

    // Atualizar URL no banco
    const { err } = await supabase
      .from("empreendimentos")
      .update({ imagem_url: imagemUrl })
      .eq("id", empreendimentoId);

    if (err) {
      console.error("Erro ao atualizar imagem no banco:", err.message);
      return NextResponse.json({ error: "Erro ao salvar referência da imagem" }, { status: 500 });
    }

    return NextResponse.json({ imagem_url: imagemUrl });
  } catch (err) {
    console.error("Erro no upload de imagem:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}