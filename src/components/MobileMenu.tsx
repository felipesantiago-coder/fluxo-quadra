"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, LogOut, ArrowLeft, Pencil, Radio } from "lucide-react";

interface MobileMenuItem {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "danger" | "warning";
  active?: boolean;
  badge?: string;
}

interface MobileMenuProps {
  items: MobileMenuItem[];
  children?: React.ReactNode;
}

function MobileMenu({ items, children }: MobileMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <button
            className="flex sm:hidden items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-72 !bg-[#0D1B2A] !border-l !border-white/10 !p-0 [&>[data-slot=dialog-close]]:!text-gray-400 [&>[data-slot=dialog-close]]:hover:!text-white"
      >
        <SheetHeader className="px-5 pt-6 pb-3 border-b border-white/10">
          <SheetTitle className="!text-white text-left text-base font-bold tracking-tight">
            ImobSync
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col py-2">
          {items.map((item, idx) => {
            const isDanger = item.variant === "danger";
            const isWarning = item.variant === "warning";

            const inner = (
              <div
                className={`flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors ${
                  isDanger
                    ? "text-red-400 hover:bg-red-500/15"
                    : isWarning
                      ? item.active
                        ? "text-amber-300 bg-amber-500/15"
                        : "text-amber-400 hover:bg-amber-500/10"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
                {...(item.onClick && !item.href ? { onClick: item.onClick } : {})}
              >
                {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                    {item.badge}
                  </span>
                )}
                {item.active && (
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </div>
            );

            if (item.href) {
              return (
                <a key={idx} href={item.href}>
                  {inner}
                </a>
              );
            }

            return <React.Fragment key={idx}>{inner}</React.Fragment>;
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export default MobileMenu;
