import { getServiciosActivos } from "@/lib/data/servicios";
import { WizardReserva } from "@/components/client/WizardReserva";

export const revalidate = 0;

export default async function ReservarPage({ searchParams }: PageProps<"/reservar">) {
  const servicios = await getServiciosActivos();
  const sp = await searchParams;
  const raw = sp.servicios;
  const ids = (typeof raw === "string" ? raw : raw?.[0])?.split(",").filter(Boolean) ?? [];
  return <WizardReserva servicios={servicios} initialSeleccion={ids} />;
}
