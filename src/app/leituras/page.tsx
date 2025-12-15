import { requireTenant } from "@/lib/tenancy";
import LeiturasClient from "./leituras-client";

export default async function LeiturasPage() {
  const { role } = await requireTenant("viewer");
  const canWrite = role !== "viewer";
  return <LeiturasClient canWrite={canWrite} />;
}

