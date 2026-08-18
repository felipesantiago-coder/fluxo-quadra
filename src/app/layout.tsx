import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import SubscriptionRefresher from "@/components/SubscriptionRefresher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

export const metadata: Metadata = {
  ...(siteUrl && { metadataBase: new URL(siteUrl) }),
  title: "Quadra Desk",
  description:
    "Quadra Desk: gestão de empreendimentos imobiliários. Explore todas as unidades disponíveis por empreendimento, andar, área e valor.",
  keywords: [
    "quadra desk",
    "empreendimentos imobiliários",
    "espelho de vendas",
    "imóveis",
    "empreendimento",
    "unidades",
    "Quattre",
    "Villa Bianco",
  ],
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "Quadra Desk",
    description: "Gestão inteligente de empreendimentos imobiliários.",
    type: "website",
    images: [
      {
        url: "/og-preview.png",
        width: 1200,
        height: 630,
        alt: "Quadra Desk",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quadra Desk",
    description: "Gestão inteligente de empreendimentos imobiliários.",
    images: ["/og-preview.png"],
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
        <SubscriptionRefresher />
      </body>
    </html>
  );
}
