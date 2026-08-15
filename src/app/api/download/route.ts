import { readFile, stat } from "fs/promises";
import { join, resolve } from "path";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// S3-P2-004 FIX: Require authentication for download
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // S3-P2-004 FIX: Prevent path traversal
    const safeDir = resolve(join(process.cwd(), "download"));
    const filePath = resolve(join(safeDir, "projeto.zip"));
    if (!filePath.startsWith(safeDir)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const buffer = await readFile(filePath);
    const fileStat = await stat(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=projeto.zip",
        "Content-Length": fileStat.size.toString(),
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}
