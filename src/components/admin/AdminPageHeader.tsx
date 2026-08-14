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
      className="mb-5 -mx-6 -mt-6 flex items-center gap-3.5 border-b px-6 py-4"
      style={{ borderColor: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}
    >
      <h4 className="m-0">{title}</h4>
      {subtitle && (
        <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
          {subtitle}
        </span>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
