import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { BarChart3, ClipboardList, ShieldCheck, Wrench } from "lucide-react";

import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInGoogleButton } from "@/components/sign-in-google-button";

export default async function HomePage() {
  const session = await auth();
  const isAuthed = Boolean(session?.user?.id);
  const tenantId = (await cookies()).get("ac_tenant")?.value ?? null;

  if (isAuthed) {
    redirect(tenantId ? "/dashboard" : "/select-tenant");
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10">
      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Monitoramento simples e confiável da operação de água
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">
            Registre leituras, acompanhe produção/horas/vazão e mantenha o histórico de ocorrências e configurações.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <SignInGoogleButton className="w-full sm:w-auto" size="lg" label="Entrar" callbackUrl="/select-tenant" />
          <a
            href="#como-funciona"
            className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-6 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground sm:h-10"
          >
            Como funciona
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Leituras e eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cadastre leituras com validações, registre ocorrências (trocas, manutenção, calibração) e filtre por período.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              KPIs e alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Produção total, horas de operação, vazão média e alertas de queda/oscilação com referência configurável.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Acesso por perfis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Defina quem pode apenas visualizar e quem pode cadastrar/editar informações, com segurança e rastreabilidade.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Ajuste parâmetros do sistema e mantenha o padrão do acompanhamento ao longo do tempo.
          </CardContent>
        </Card>
      </section>

      <section id="como-funciona" className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold">Como funciona</h3>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
          <div>1) Entre com sua conta Google.</div>
          <div>2) Escolha o local que você vai acompanhar.</div>
          <div>3) Registre as leituras e acompanhe os resultados no dashboard.</div>
        </div>
      </section>
    </div>
  );
}
