import { getClientesResumen } from "@/lib/actions/admin-clientes";
import { ClientesClient } from "@/components/admin/ClientesClient";

export const revalidate = 0;

export default async function ClientesPage() {
  const clientes = await getClientesResumen();
  return <ClientesClient clientesIniciales={clientes} />;
}
