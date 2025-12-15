"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExportButtonProps {
  from?: string;
  to?: string;
  mode?: "csv" | "pdf";
}

export function ExportButton({ from, to, mode = "csv" }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const searchParams = useSearchParams();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const params = new URLSearchParams();
      const effectiveFrom = from ?? searchParams.get("from") ?? undefined;
      const effectiveTo = to ?? searchParams.get("to") ?? undefined;
      if (effectiveFrom) params.append("from", effectiveFrom);
      if (effectiveTo) params.append("to", effectiveTo);
      
      if (mode === "pdf") {
        window.open(`/export/pdf?${params.toString()}`, "_blank", "noopener,noreferrer");
        return;
      }

      const response = await fetch(`/api/export?${params.toString()}`);
      if (!response.ok) throw new Error("Erro ao exportar dados");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agua-clara-export-${new Date().toISOString().slice(0, 16).replace("T", "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      alert("Erro ao exportar dados. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Exportando..." : mode === "pdf" ? "Exportar PDF" : "Exportar CSV"}
    </Button>
  );
}
