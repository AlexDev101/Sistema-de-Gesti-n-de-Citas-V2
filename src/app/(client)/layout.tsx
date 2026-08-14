import { HalosMovil } from "@/components/ui/Halos";
import { BottomTabs } from "@/components/client/BottomTabs";

export default function ClienteLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      <HalosMovil />
      <div className="relative z-[1] flex min-h-dvh flex-1 flex-col">
        <div className="flex-1">{children}</div>
        <BottomTabs />
      </div>
    </div>
  );
}
