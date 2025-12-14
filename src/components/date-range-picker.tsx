"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DateRangePicker({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize state from URL params or default to last 30 days
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    
    if (from && to) {
      return {
        from: new Date(from),
        to: new Date(to),
      }
    }
    
    return {
      from: addDays(new Date(), -30),
      to: new Date(),
    }
  })

  // Update URL when date changes
  const onSelect = (newDate: DateRange | undefined) => {
    setDate(newDate)
    
    if (newDate?.from) {
      const params = new URLSearchParams(searchParams)
      params.set("from", newDate.from.toISOString())
      
      if (newDate.to) {
        params.set("to", newDate.to.toISOString())
      } else {
        params.delete("to")
      }
      
      router.replace(`${pathname}?${params.toString()}`)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd 'de' MMM, yyyy", { locale: ptBR })} -{" "}
                  {format(date.to, "dd 'de' MMM, yyyy", { locale: ptBR })}
                </>
              ) : (
                format(date.from, "dd 'de' MMM, yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onSelect}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
