"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { format, addMonths, subMonths, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PeriodNavigatorProps {
  billingCycleDay: number;
  currentFrom: Date;
  currentTo: Date;
  className?: string;
}

export function PeriodNavigator({
  billingCycleDay,
  currentFrom,
  currentTo,
  className,
}: PeriodNavigatorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleNavigate = (direction: "prev" | "next") => {
    let newTo: Date;
    
    // Logic: 
    // If we are navigating cycles, we shift the 'currentTo' by 1 month.
    // The 'currentTo' is always the Closing Day of a cycle.
    
    if (direction === "prev") {
      newTo = subMonths(currentTo, 1);
    } else {
      newTo = addMonths(currentTo, 1);
    }

    // Calculate new From based on new To
    // From is (NewTo - 1 month) + 1 day
    const newFrom = addMonths(newTo, -1);
    newFrom.setDate(newFrom.getDate() + 1);

    const params = new URLSearchParams(searchParams)
    params.set("from", startOfDay(newFrom).toISOString())
    params.set("to", endOfDay(newTo).toISOString())
    
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className={cn("flex w-full items-center gap-1 rounded-md border bg-background p-1 sm:w-auto sm:gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleNavigate("prev")}
        title="Ciclo Anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div
        className="flex min-w-0 flex-1 items-center justify-center gap-2 px-1 text-sm font-medium sm:flex-none sm:px-2"
        title={`Ciclo de faturamento (início dia ${billingCycleDay})`}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="min-w-0 truncate">
          <span className="sm:hidden">
            {format(currentFrom, "dd/MM", { locale: ptBR })} - {format(currentTo, "dd/MM", { locale: ptBR })}
          </span>
          <span className="hidden sm:inline">
            {format(currentFrom, "dd/MM/yyyy", { locale: ptBR })} - {format(currentTo, "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleNavigate("next")}
        title="Próximo Ciclo"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
