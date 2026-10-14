import { AgendaClient } from "@/components/admin/AgendaClient";
import { getBarbero, getCierres, getHorario } from "@/lib/data/negocio";
import { sumarDias } from "@/lib/agenda-grid";
import { hoyMadridISO } from "@/lib/wizard-helpers";

export const revalidate = 0;

export default async function AgendaPage() {
  // Cierres de los últimos 3 meses en adelante: la agenda también se consulta hacia atrás.
  const [barbero, horario, cierres] = await Promise.all([
    getBarbero(),
    getHorario(),
    getCierres(sumarDias(hoyMadridISO(), -92)),
  ]);
  return <AgendaClient nombreBarbero={barbero?.nombre ?? ""} horario={horario} cierres={cierres} />;
}
