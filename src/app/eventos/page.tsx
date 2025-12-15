import { requireTenant } from "@/lib/tenancy";
import EventosClient from "./eventos-client";

export default async function EventosPage() {
  const { role } = await requireTenant("viewer");
  const canWrite = role !== "viewer";
  return <EventosClient canWrite={canWrite} />;
}

