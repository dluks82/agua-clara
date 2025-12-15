"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function HelpHint({
  content,
  label = "Ajuda",
}: {
  content: React.ReactNode;
  label?: string;
}) {
  return (
    <span className="inline-flex">
      <span className="hidden md:inline-flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={label}
              className="inline-flex items-center justify-center rounded-sm text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <HelpCircle className="h-4 w-4 cursor-help" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">{content}</div>
          </TooltipContent>
        </Tooltip>
      </span>

      <span className="md:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={label}
              className="inline-flex items-center justify-center rounded-sm text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm">
            {content}
          </PopoverContent>
        </Popover>
      </span>
    </span>
  );
}

