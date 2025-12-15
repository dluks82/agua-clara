import { requireTenant } from "@/lib/tenancy";
import { getBillingCycleDay } from "@/app/actions";
import EventosClient from "./eventos-client";

export default async function EventosPage() {
  const { role } = await requireTenant("viewer");
  const canWrite = role !== "viewer";
  const billingCycleDay = await getBillingCycleDay();
  return <EventosClient canWrite={canWrite} billingCycleDay={billingCycleDay} />;
}
