"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Building2, ArrowRight, LogOut, MapPin, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Region = string;

interface EmpreendimentoDB {
  id: string;
  nome: string;
  slug: string;
  regiao: string;
  imagem_url: string | null;
  descricao: string;
  ativo: boolean;
  unit_count: number;
}

// Projetos hardcoded existentes (Quattre, Villa Bianco, Moment)
const staticProjects = [
  {
    id: "quattre",
    name: "Quattre Istambul",
    subtitle: "Espelho de Vendas",
    description: "72 unidades • 6 andares • 4 tipologias",
    location: "Sobradinho, DF",
    region: "Sobradinho",
    href: "/espelho",
    image: "/quattre-istambul-preview.webp",
  },
  {
    id: "villa-bianco",
    name: "Villa Bianco",
    subtitle: "Espelho de Vendas",
    description: "123 unidades • 4 blocos • 8 tipologias",
    location: "Park Sul, DF",
    region: "Park Sul",
    href: "/villa-bianco",
    image: "/villa-bianco-preview.webp",
  },
  {
    id: "moment",
    name: "Moment",
    subtitle: "Espelho de Vendas",
    description: "72 unidades • 6 andares • 4 tipologias",
    location: "Noroeste, DF",
    region: "Noroeste",
    href: "/moment",
    image: "/moment-preview.webp",
  },
];

interface ProjetosClientProps {
  userRole: string;
}

export default function ProjetosClient({ userRole }: ProjetosClientProps) {
  const router = useRouter();
  const [filterRegion, setFilterRegion] = useState<Region | "all">("all");
  const [dynamicProjects, setDynamicProjects] = useState<EmpreendimentoDB[]>([]);

  // Buscar empreendimentos dinâmicos do banco
  useEffect(() => {
    async function fetchEmpreendimentos() {
      try {
        const res = await fetch("/api/admin-sistema/empreendimentos");
        if (res.ok) {
          const data = await res.json();
          // Filtrar apenas os que NÃO são os projetos hardcoded e que estão ativos
          const existingSlugs = ["quattre-istambul", "villa-bianco", "moment"];
          const filtered = (data.empreendimentos || [])
            .filter((e: EmpreendimentoDB) => !existingSlugs.includes(e.slug) && e.ativo);
          setDynamicProjects(filtered);
        }
      } catch {
        // Silently fail - mostrar apenas projetos estáticos
      }
    }
    fetchEmpreendimentos();
  }, []);

  // Combinar projetos estáticos com dinâmicos
  const allProjects = useMemo(() => {
    const dynamic = dynamicProjects.map((e) => ({
      id: e.id,
      name: e.nome,
      subtitle: "Espelho de Vendas",
      description: e.unit_count > 0 ? `${e.unit_count} unidades` : "Empreendimento",
      location: e.regiao,
      region: e.regiao,
      href: `/empreendimento/${e.id}`,
      image: e.imagem_url || null,
    }));

    return [...staticProjects, ...dynamic];
  }, [dynamicProjects]);

  const allRegions = useMemo(
    () => Array.from(new Set(allProjects.map((p) => p.region))),
    [allProjects]
  );

  const filteredProjects = useMemo(() => {
    if (filterRegion === "all") return allProjects;
    return allProjects.filter((p) => p.region === filterRegion);
  }, [allProjects, filterRegion]);

  const handleLogout = useCallback(async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  const isAdminSistema = userRole === "admin_sistema";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-lg">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  Espelho de <span className="text-gray-400 font-normal">Vendas</span>
                </h1>
                <p className="text-[11px] text-gray-400 font-medium">Empreendimentos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdminSistema && (
                <a
                  href="/admin-sistema"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-semibold transition-colors border border-amber-500/20"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Administração
                </a>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold transition-colors border border-red-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Title section */}
          <div className="text-center mb-8 sm:mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight"
            >
              Nossos Empreendimentos
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base text-gray-500 mt-2"
            >
              Selecione um empreendimento para acessar o espelho de vendas
            </motion.p>
          </div>

          {/* Region filter */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Região:</span>
              <button
                onClick={() => setFilterRegion("all")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                  filterRegion === "all"
                    ? "bg-gray-900 text-white border-gray-900 shadow-md"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Todas
              </button>
              {allRegions.map((region) => (
                <button
                  key={region}
                  onClick={() => setFilterRegion(region)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                    filterRegion === region
                      ? "bg-gray-900 text-white border-gray-900 shadow-md"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Results count */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 text-center">
              <span className="font-bold text-gray-600">{filteredProjects.length}</span> empreendimento{filteredProjects.length !== 1 ? "s" : ""} encontrado{filteredProjects.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Project cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.35, delay: 0.05 * index }}
                >
                  <a
                    href={project.href}
                    className="group block bg-white rounded-2xl shadow-md hover:shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Preview image */}
                    <div className="relative h-48 sm:h-56 overflow-hidden bg-gray-100">
                      {project.image ? (
                        <Image
                          src={project.image}
                          alt={`Preview ${project.name}`}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          priority={index < 2}
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                          <Building2 className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                      {/* Project badge on image */}
                      <div className="absolute bottom-3 left-3">
                        <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm bg-white/15 text-white border border-white/20">
                          {project.subtitle}
                        </span>
                      </div>
                      {/* Region badge on image */}
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-black/40 text-white backdrop-blur-sm">
                          <MapPin className="w-3 h-3" />
                          {project.region}
                        </span>
                      </div>
                    </div>

                    {/* Card content */}
                    <div className="p-5 sm:p-6">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight group-hover:text-gray-700 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1.5">{project.location}</p>
                      <p className="text-sm text-gray-400 mt-1">{project.description}</p>

                      {/* Access button */}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-500 group-hover:text-gray-900 transition-colors">
                          Acessar espelho
                        </span>
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-gray-900 transition-all duration-300">
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                        </span>
                      </div>
                    </div>
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty state */}
          {filteredProjects.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400">Nenhum empreendimento nessa região</h3>
              <p className="text-sm text-gray-300 mt-1">
                Tente selecionar outra região ou{" "}
                <button
                  onClick={() => setFilterRegion("all")}
                  className="text-gray-500 hover:text-gray-700 underline underline-offset-2"
                >
                  ver todos
                </button>
              </p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Building2 className="w-4 h-4" />
            <span className="font-semibold text-gray-600">Espelho de Vendas</span>
            <span>•</span>
            <span>Empreendimentos</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
