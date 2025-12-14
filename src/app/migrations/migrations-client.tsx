"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type MigrationStatus =
  | {
      error: string;
    }
  | {
      migrationsFolder: string;
      availableCount: number;
      lastAppliedMillis: number | null;
      lastAppliedAt: string | null;
      pendingCount: number;
      pendingTags: string[];
    };

async function fetchStatus(token: string): Promise<MigrationStatus> {
  const response = await fetch("/api/migrations", {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  return response.json();
}

async function applyMigrations(token: string): Promise<MigrationStatus> {
  const response = await fetch("/api/migrations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  return response.json();
}

export function MigrationsClient() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const normalized = useMemo(() => token.trim(), [token]);
  const canQuery = normalized.length > 0 && !isLoading && !isApplying;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Migrations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Informe o token (env: <code>MIGRATIONS_TOKEN</code>) para verificar e aplicar migrations.
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="MIGRATIONS_TOKEN"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button
              disabled={!canQuery}
              onClick={async () => {
                setIsLoading(true);
                try {
                  setStatus(await fetchStatus(normalized));
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              Verificar
            </Button>
          </div>
        </div>

        {status && "error" in status && (
          <div className="text-sm text-destructive">{status.error}</div>
        )}

        {status && !("error" in status) && (
          <div className="space-y-3 text-sm">
            <div>
              <div>
                <span className="font-medium">Última aplicada:</span>{" "}
                {status.lastAppliedAt ?? "Nenhuma"}
              </div>
              <div>
                <span className="font-medium">Pendentes:</span> {status.pendingCount}
              </div>
            </div>

            {status.pendingCount > 0 && (
              <div className="space-y-2">
                <div className="font-medium">Lista</div>
                <ul className="list-disc pl-5">
                  {status.pendingTags.map((tag) => (
                    <li key={tag}>
                      <code>{tag}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              disabled={!canQuery || status.pendingCount === 0}
              onClick={async () => {
                setIsApplying(true);
                try {
                  setStatus(await applyMigrations(normalized));
                } finally {
                  setIsApplying(false);
                }
              }}
            >
              Aplicar migrations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

