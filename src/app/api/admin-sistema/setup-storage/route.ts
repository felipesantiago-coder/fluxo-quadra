import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

const BUCKET_NAME = "empreendimentos";

export async function POST() {
  try {
    const { supabase, error } = await requireAdminSistema();
    if (error) return error;

    // Verificar se o bucket já existe
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (exists) {
      return NextResponse.json({ message: `Bucket "${BUCKET_NAME}" já existe.`, created: false });
    }

    // Criar o bucket como público
    const { error: createErr } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });

    if (createErr) {
      // Se o erro for "already exists", é só porque outro admin criou
      if (createErr.message.includes("already exists")) {
        return NextResponse.json({ message: `Bucket "${BUCKET_NAME}" já existe.`, created: false });
      }
      console.error("Erro ao criar bucket:", createErr.message);
      return NextResponse.json(
        { error: `Erro ao criar bucket: ${createErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: `Bucket "${BUCKET_NAME}" criado com sucesso.`, created: true });
  } catch (err) {
    console.error("Erro no setup-storage:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}