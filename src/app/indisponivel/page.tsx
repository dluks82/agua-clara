"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function IndisponivelPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Serviço indisponível</h1>
        <p className="text-sm text-muted-foreground">
          Não foi possível acessar o banco de dados agora. Verifique sua conexão/variáveis de ambiente e tente
          novamente.
        </p>
      </div>
      <Button
        onClick={() => {
          location.reload();
        }}
      >
        Tentar novamente
      </Button>
    </div>
  );
}
