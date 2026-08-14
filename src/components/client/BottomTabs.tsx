"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, PlusCircle, ListDashes } from "@phosphor-icons/react/ssr";

const TABS = [
  { href: "/", label: "Inicio", Icon: House },
  { href: "/reservar", label: "Reservar", Icon: PlusCircle },
  { href: "/cuenta", label: "Mi cuenta", Icon: ListDashes },
] as const;

export function BottomTabs() {
  const pathname = usePathname();
  // El asistente de reserva ocupa toda la pantalla con su propio pie de
  // acción — dos barras fijas al fondo compiten por espacio, así que la
  // navegación inferior se retira mientras dura el paso a paso.
  if (pathname.startsWith("/reservar")) return null;

  return (
    <div
      className="sticky bottom-0 z-20 mt-auto flex gap-2 border-t px-5 pt-2 pb-7 backdrop-blur-md"
      style={{
        background: "color-mix(in srgb, var(--color-bg) 92%, transparent)",
        borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)",
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] tracking-wide"
            style={{ color: active ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 55%, transparent)" }}
          >
            <Icon size={19} weight={active ? "fill" : "regular"} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
