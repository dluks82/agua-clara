"use client";

import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ReadingForm } from "@/components/reading-form";
import { ReadingsList } from "@/components/readings-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { DateRangeFilter } from "@/components/date-range-filter";

export default function LeiturasClient({ canWrite, billingCycleDay }: { canWrite: boolean; billingCycleDay: number }) {
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const setRange = (next: { from?: string; to?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.from) params.set("from", next.from);
    else params.delete("from");
    if (next.to) params.set("to", next.to);
    else params.delete("to");
    router.replace(`/leituras?${params.toString()}`);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Leituras</h1>
          <p className="text-muted-foreground">
            Gerencie as leituras do hidrômetro e horímetro
          </p>
        </div>
        
        {canWrite && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto" aria-label="Nova leitura">
                <Plus className="mr-2 h-4 w-4" />
                Nova leitura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Leitura</DialogTitle>
                <DialogDescription>Preencha os campos para cadastrar uma nova leitura.</DialogDescription>
              </DialogHeader>
              <ReadingForm onSuccess={handleFormSuccess} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <CardFilter>
        <DateRangeFilter billingCycleDay={billingCycleDay} value={{ from, to }} onChange={setRange} />
      </CardFilter>
      
      <ReadingsList refreshTrigger={refreshTrigger} canWrite={canWrite} from={from} to={to} />
    </div>
  );
}

function CardFilter({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border bg-card p-4">{children}</div>;
}
