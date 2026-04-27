"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Building2, ArrowRight, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const projects = [
  {
    name: "Quattre Istambul",
    subtitle: "Espelho de Vendas",
    description: "72 unidades • 6 andares • 4 tipologias",
    location: "São Paulo, SP",
    href: "/espelho",
    image: "/quattre-istambul-preview.png",
    gradient: "from-gray-900 to-gray-800",
    badgeColor: "bg-white/15 text-white border-white/20",
  },
  {
    name: "Villa Bianco",
    subtitle: "Espelho de Vendas",
    description: "123 unidades • 4 blocos • 8 tipologias",
    location: "Campinas, SP",
    href: "/villa-bianco",
    image: "/villa-bianco-preview.png",
    gradient: "from-gray-900 to-gray-800",
    badgeColor: "bg-white/15 text-white border-white/20",
  },
];

export default function ProjetosClient() {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

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
                  Quattre
                </h1>
                <p className="text-[11px] text-gray-400 font-medium">Empreendimentos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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

          {/* Project cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project, index) => (
              <motion.div
                key={project.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 * index }}
              >
                <a
                  href={project.href}
                  className="group block bg-white rounded-2xl shadow-md hover:shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Preview image */}
                  <div className="relative h-48 sm:h-56 overflow-hidden bg-gray-100">
                    <Image
                      src={project.image}
                      alt={`Preview ${project.name}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      priority
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                    {/* Project badge on image */}
                    <div className="absolute bottom-3 left-3">
                      <span className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm border ${project.badgeColor}`}>
                        {project.subtitle}
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
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Building2 className="w-4 h-4" />
            <span className="font-semibold text-gray-600">Quattre</span>
            <span>•</span>
            <span>Empreendimentos</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
