import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quattre Istambul — Espelho de Vendas",
  description:
    "Espelho de vendas interativo do empreendimento Quattre Istambul. Explore todas as unidades disponíveis por andar, área e valor.",
  keywords: [
    "Quattre",
    "Istambul",
    "espelho de vendas",
    "imóveis",
    "empreendimento",
    "unidades",
  ],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Quattre Istambul — Espelho de Vendas",
    description: "Explore todas as unidades disponíveis do empreendimento Quattre Istambul.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
