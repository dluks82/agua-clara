"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Link2, Copy, Ban } from "lucide-react";

type LinkRow = {
  id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  status: "active" | "expired" | "revoked";
};

export function PublicDashboardLinks() {
  const [items, setItems] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/public-dashboard-links");
      if (!res.ok) throw new Error("Erro ao carregar links públicos");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erro inesperado" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setCreating(true);
    setMessage(null);
    setNewUrl(null);
    try {
      const res = await fetch("/api/public-dashboard-links/create", { method: "POST" });
      if (!res.ok) throw new Error("Erro ao gerar link");
      const data = await res.json();
      setNewUrl(data.url ?? null);
      setMessage({ type: "success", text: "Link gerado. Copie e compartilhe com os moradores." });
      await load();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erro inesperado" });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch("/api/public-dashboard-links/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Erro ao revogar link");
      setMessage({ type: "success", text: "Link revogado." });
      await load();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erro inesperado" });
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage({ type: "success", text: "Link copiado." });
    } catch {
      setMessage({ type: "error", text: "Não foi possível copiar automaticamente." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Dashboard pública (link para moradores)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Gera um link somente-leitura da dashboard do ciclo atual. O link expira automaticamente em 30 dias e pode ser
          revogado a qualquer momento. Alertas ficam ocultos.
        </div>

        {message ? (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button onClick={create} disabled={creating} className="w-full sm:w-auto">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
            {creating ? "Gerando..." : "Gerar link"}
          </Button>
          {newUrl ? (
            <div className="flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs">
              <span className="min-w-0 flex-1 truncate">{newUrl}</span>
              <Button variant="outline" size="sm" onClick={() => void copy(newUrl)}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border">
          <div className="px-4 py-3 text-sm font-medium">Links</div>
          <div className="border-t">
            {loading ? (
              <div className="px-4 py-4 text-sm text-muted-foreground">Carregando…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-4 text-sm text-muted-foreground">Nenhum link criado ainda.</div>
            ) : (
              <div className="divide-y">
                {items
                  .slice()
                  .reverse()
                  .map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm">
                        <div className="font-medium">
                          Status:{" "}
                          <span
                            className={
                              item.status === "active"
                                ? "text-emerald-600"
                                : item.status === "expired"
                                  ? "text-muted-foreground"
                                  : "text-destructive"
                            }
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Expira em: {new Date(item.expires_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={item.status !== "active"}
                          onClick={() => void revoke(item.id)}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Revogar
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

