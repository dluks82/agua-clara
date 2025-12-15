import { requireTenant } from "@/lib/tenancy";
import { getBillingCycleDay } from "@/app/actions";
import LeiturasClient from "./leituras-client";

export default async function LeiturasPage() {
  const { role } = await requireTenant("viewer");
  const canWrite = role !== "viewer";
  const billingCycleDay = await getBillingCycleDay();
  return <LeiturasClient canWrite={canWrite} billingCycleDay={billingCycleDay} />;
}
