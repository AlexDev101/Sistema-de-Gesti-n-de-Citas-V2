"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarBlank,
  Sun,
  Scissors,
  ClockCountdown,
  ChartBar,
  Users,
  GearSix,
  Images,
} from "@phosphor-icons/react/ssr";

const ITEMS = [
  { href: "/admin/agenda", label: "Agenda", Icon: CalendarBlank },
  { href: "/admin/hoy", label: "Hoy", Icon: Sun },
  { href: "/admin/servicios", label: "Servicios", Icon: Scissors },
  { href: "/admin/galeria", label: "Galería", Icon: Images },
  { href: "/admin/horario", label: "Horario", Icon: ClockCountdown },
  { href: "/admin/metricas", label: "Métricas", Icon: ChartBar },
  { href: "/admin/clientes", label: "Clientes", Icon: Users },
  { href: "/admin/ajustes", label: "Ajustes", Icon: GearSix },
] as const;

export function AdminNav({ nombreBarbero, nombreNegocio }: { nombreBarbero: string; nombreNegocio?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Panel"
      className="flex w-full flex-none flex-row gap-[3px] overflow-x-auto border-b p-2 md:w-[212px] md:flex-col md:overflow-visible md:border-r md:border-b-0 md:p-3"
      style={{ borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}
    >
      <span
        className="hidden px-2.5 pb-2.5 text-[10px] tracking-[0.12em] uppercase md:block"
        style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}
      >
        {nombreNegocio || "Panel"}
      </span>
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex flex-none items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] whitespace-nowrap md:gap-2.5"
            style={{
              background: active ? "color-mix(in srgb, var(--color-accent) 14%, transparent)" : "transparent",
              color: active ? "var(--color-accent-300)" : "var(--color-text)",
            }}
          >
            <Icon size={16} weight={active ? "fill" : "regular"} />
            {label}
          </Link>
        );
      })}
      <div
        className="mt-auto hidden items-center gap-2.5 p-2.5 text-xs md:flex"
        style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}
      >
        <span
          className="grid h-[26px] w-[26px] place-items-center rounded-full text-[10px]"
          style={{ background: "var(--color-accent-800)", color: "var(--color-accent-100)" }}
        >
          {nombreBarbero.slice(0, 2).toUpperCase()}
        </span>
        {nombreBarbero} · admin
      </div>
    </nav>
  );
}
