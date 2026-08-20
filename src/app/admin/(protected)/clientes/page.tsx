import { getClientesResumen, getFidelizacionClientes } from "@/lib/actions/admin-clientes";
import { ClientesClient } from "@/components/admin/ClientesClient";

export const revalidate = 0;

export default async function ClientesPage() {
  const [clientes, fidelizacion] = await Promise.all([getClientesResumen(), getFidelizacionClientes()]);
  return <ClientesClient clientesIniciales={clientes} fidelizacionInicial={fidelizacion} />;
}
