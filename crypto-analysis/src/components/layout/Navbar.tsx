"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Building2,
  Clock,
  Crosshair,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/market", label: "实时行情", icon: TrendingUp },
  { href: "/analysis", label: "技术指标", icon: BarChart3 },
  { href: "/exchanges", label: "交易所对比", icon: Building2 },
  { href: "/events", label: "事件预警", icon: Clock },
  { href: "/scenarios", label: "情景模拟", icon: Crosshair },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border px-4 md:px-8">
      <div className="flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2">
          <h1 className="text-lg font-bold bg-gradient-to-r from-btc to-eth bg-clip-text text-transparent">
            CryptoAnalysis
          </h1>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  isActive
                    ? "bg-accent text-black"
                    : "text-muted hover:text-foreground hover:bg-card"
                )}
              >
                <item.icon size={14} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
