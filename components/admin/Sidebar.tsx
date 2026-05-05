"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Settings2,
  Building2,
  Boxes,
  Wrench,
  Image as ImageIcon,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/site-settings", label: "Site Settings", icon: Settings2 },
  { href: "/admin/business-types", label: "Business Types", icon: Building2 },
  { href: "/admin/products", label: "Products", icon: Boxes },
  { href: "/admin/machines", label: "Machines", icon: Wrench },
  { href: "/admin/images", label: "Image Library", icon: ImageIcon },
];

export function Sidebar({ signOutAction }: { signOutAction: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-tpi-ink/10 bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-tpi-ink/10">
        <Link href="/admin" className="flex items-center gap-2.5">
          <img
            src="https://taylorproducts.net/wp-content/uploads/2022/04/Artboard-2@2x-300x83.png"
            alt="Taylor Products"
            className="h-8 w-auto"
          />
        </Link>
        <div className="mt-2 text-[11px] uppercase tracking-wider text-tpi-stone">
          Equipment Finder Admin
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-tpi-blue/10 text-tpi-blue font-medium"
                  : "text-tpi-stone hover:bg-tpi-ink/5 hover:text-tpi-ink"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={signOutAction} className="px-3 py-3 border-t border-tpi-ink/10">
        <button
          type="submit"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-tpi-stone hover:bg-tpi-ink/5 hover:text-tpi-ink transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </form>
    </aside>
  );
}
