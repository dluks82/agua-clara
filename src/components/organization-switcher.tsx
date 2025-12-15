"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Organization = {
  id: string;
  name: string;
  role?: string;
};

export function OrganizationSwitcher({
  activeOrganizationId,
  activeOrganizationName,
  organizations,
  selectOrganizationAction,
}: {
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  organizations: Organization[];
  selectOrganizationAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const label = activeOrganizationName ?? "Escolher organização";
  const hasOrganizations = organizations.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto px-1 py-0 text-xs text-muted-foreground hover:text-foreground",
            "cursor-pointer"
          )}
          aria-label="Trocar organização"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-1 size-3 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Organização</div>
        <div className="mt-1 space-y-1">
          {hasOrganizations ? (
            organizations.map((org) => {
              const isActive = org.id === activeOrganizationId;
              return (
                <form key={org.id} action={selectOrganizationAction}>
                  <input type="hidden" name="tenantId" value={org.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    onClick={() => setOpen(false)}
                    disabled={isActive}
                  >
                    <Check className={cn("size-4", isActive ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{org.name}</span>
                  </Button>
                </form>
              );
            })
          ) : (
            <div className="px-2 py-2 text-xs text-muted-foreground">Nenhuma organização encontrada.</div>
          )}
        </div>

        <div className="mt-2 border-t pt-2">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/select-tenant?force=1">
              <Plus className="size-4" />
              Trocar ou criar organização
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
