import { requireTenant } from "@/lib/tenancy";
import ConfiguracoesClient from "./configuracoes-client";

export default async function ConfiguracoesPage() {
  await requireTenant("admin");
  return <ConfiguracoesClient />;
}

