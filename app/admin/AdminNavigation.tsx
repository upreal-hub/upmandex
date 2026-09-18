"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href?: string;
  icon: string;
  label: string;
  comingSoon?: boolean;
};

const navigationItems: NavigationItem[] = [
  { href: "/admin", icon: "☁️", label: "Dashboard" },
  { href: "/admin/upmans", icon: "📦", label: "Upmans" },
  { href: "/admin/viewers", icon: "👥", label: "Viewers" },
  { icon: "✨", label: "Activity", comingSoon: true },
];

export default function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation">
      <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
        {navigationItems.map((item) => {
          const isActive =
            item.href === pathname ||
            (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
          const className = `
            flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition
            ${
              isActive
                ? "bg-sky-500 text-white shadow-md shadow-sky-200"
                : "text-sky-950 hover:bg-sky-100"
            }
            ${item.comingSoon ? "cursor-not-allowed opacity-55" : ""}
          `;

          if (item.comingSoon) {
            return (
              <div key={item.label} className={className} aria-disabled="true">
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-sky-700">
                  Coming Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={className}
              aria-current={isActive ? "page" : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
