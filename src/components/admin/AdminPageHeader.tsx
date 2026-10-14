import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className="-mx-4 -mt-4 mb-5 flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b px-4 py-3.5 md:-mx-6 md:-mt-6 md:px-6 md:py-4"
      style={{ borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}
    >
      <h4 className="m-0">{title}</h4>
      {subtitle && (
        <span className="text-xs first-letter:uppercase" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
          {subtitle}
        </span>
      )}
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
