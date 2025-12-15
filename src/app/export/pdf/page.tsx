import { requireTenant } from "@/lib/tenancy";
import { getDashboardData } from "@/lib/data";
import { getBillingCycleDay } from "@/app/actions";
import { resolveDashboardPeriod } from "@/lib/data";
import { db } from "@/db";
import { readings, tenants } from "@/db/schema";
import { and, desc, eq, gt, lt, asc } from "drizzle-orm";
import { PrintButton } from "./print-button";
import { PrintCharts } from "./print-charts";

export const dynamic = "force-dynamic";

export default async function ExportPdfPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { tenantId } = await requireTenant("viewer");
  const billingCycleDay = await getBillingCycleDay();
  const sp = await searchParams;

  const period = resolveDashboardPeriod({
    searchFrom: sp.from,
    searchTo: sp.to,
    billingCycleDay,
  });

  const tenant = await (async () => {
    try {
      return await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    } catch {
      return null;
    }
  })();

  const dashboard = await getDashboardData(tenantId, period);
  const realReadings = dashboard.readings.filter((r) => r.id !== -1).sort((a, b) => a.ts.getTime() - b.ts.getTime());
  const virtualReadings = dashboard.readings.filter((r) => r.id === -1).sort((a, b) => a.ts.getTime() - b.ts.getTime());

  const [beforeFrom, afterFrom, beforeTo, afterTo] = await Promise.all([
    db
      .select({ ts: readings.ts })
      .from(readings)
      .where(and(eq(readings.tenant_id, tenantId), lt(readings.ts, period.from)))
      .orderBy(desc(readings.ts))
      .limit(1),
    db
      .select({ ts: readings.ts })
      .from(readings)
      .where(and(eq(readings.tenant_id, tenantId), gt(readings.ts, period.from)))
      .orderBy(asc(readings.ts))
      .limit(1),
    db
      .select({ ts: readings.ts })
      .from(readings)
      .where(and(eq(readings.tenant_id, tenantId), lt(readings.ts, period.to)))
      .orderBy(desc(readings.ts))
      .limit(1),
    db
      .select({ ts: readings.ts })
      .from(readings)
      .where(and(eq(readings.tenant_id, tenantId), gt(readings.ts, period.to)))
      .orderBy(asc(readings.ts))
      .limit(1),
  ]);

  return (
    <div className="report mx-auto p-6 print:p-0">
      <div className="flex items-start justify-between gap-6 print:gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatório – Água Clara</h1>
          {tenant?.name ? <div className="mt-1 text-sm font-medium">Organização: {tenant.name}</div> : null}
          <div className="mt-1 text-sm text-muted-foreground">
            Período: {formatPtBrDateTime(period.from)} → {formatPtBrDateTime(period.to)}
          </div>
          <div className="text-sm text-muted-foreground">Gerado em: {formatPtBrDateTime(new Date())}</div>
        </div>
        <div className="hidden print:block text-right text-xs text-muted-foreground">
          KPIs e intervalos incluem pró-rata quando não há leitura exatamente no início/fim do período.
        </div>
        <div className="flex gap-2 print:hidden">
          <PrintButton />
        </div>
      </div>

      <Section title="KPIs" className="avoid-break">
        <Grid>
          <Kpi label="Produção total" value={`${dashboard.kpis.producao_total_m3.toFixed(3)} m³`} />
          <Kpi label="Horas totais" value={`${dashboard.kpis.horas_total_h.toFixed(3)} h`} />
          <Kpi label="Q média (m³/h)" value={fmtOrNA(dashboard.kpis.q_avg_m3h, 3)} />
          <Kpi label="Q média (L/min)" value={fmtOrNA(dashboard.kpis.q_avg_lmin, 1)} />
          <Kpi label="COV (%)" value={fmtOrNA(dashboard.kpis.cov_q_pct, 1)} />
          <Kpi label="Utilização (%)" value={fmtOrNA(dashboard.kpis.utilization_rate_pct, 1)} />
        </Grid>
      </Section>

      <Section title="Leituras (reais)">
        <Table
          head={["Data/Hora", "Hidrômetro (m³)", "Horímetro (h)", "Tipo Hid.", "Tipo Hor.", "Observações"]}
          rows={realReadings.map((r) => [
            formatPtBrDateTime(r.ts),
            Number.parseFloat(String(r.hydrometer_m3)).toFixed(3),
            Number.parseFloat(String(r.horimeter_h)).toFixed(3),
            r.hydrometer_status,
            r.horimeter_status,
            r.notes ?? "",
          ])}
        />
      </Section>

      {virtualReadings.length > 0 ? (
        <Section title="Leituras virtuais (pró-rata)">
          <div className="mb-3 text-sm text-muted-foreground">
            Usadas apenas para fechar o período quando não há leitura exatamente no início/fim.
          </div>
          <Table
            head={["Data/Hora", "Hidrômetro (m³)", "Horímetro (h)", "Motivo", "Base (antes)", "Base (depois)"]}
            rows={virtualReadings.map((r) => {
              const isStart = r.ts.getTime() === period.from.getTime();
              const isEnd = r.ts.getTime() === period.to.getTime();
              const motivo = isStart ? "Início do período" : isEnd ? "Fim do período" : "Pró-rata";
              const baseBefore = isStart ? beforeFrom[0]?.ts : isEnd ? beforeTo[0]?.ts : undefined;
              const baseAfter = isStart ? afterFrom[0]?.ts : isEnd ? afterTo[0]?.ts : undefined;
              return [
                formatPtBrDateTime(r.ts),
                Number.parseFloat(String(r.hydrometer_m3)).toFixed(3),
                Number.parseFloat(String(r.horimeter_h)).toFixed(3),
                motivo,
                baseBefore ? formatPtBrDateTime(baseBefore) : "",
                baseAfter ? formatPtBrDateTime(baseAfter) : "",
              ];
            })}
          />
        </Section>
      ) : null}

      <Section title="Intervalos e cálculos">
        <Table
          head={["Início", "Fim", "ΔV (m³)", "ΔH (h)", "Q (m³/h)", "Q (L/min)", "Confiança"]}
          rows={dashboard.intervals.map((i) => [
            formatPtBrDateTime(new Date(i.start)),
            formatPtBrDateTime(new Date(i.end)),
            i.delta_v.toFixed(3),
            i.delta_h.toFixed(3),
            i.q_m3h ? i.q_m3h.toFixed(3) : "N/A",
            i.l_min ? i.l_min.toFixed(1) : "N/A",
            i.confidence,
          ])}
        />
      </Section>

      <Section title="Gráficos" className="avoid-break">
        <div className="text-sm text-muted-foreground print:hidden">
          Dica: aguarde os gráficos carregarem antes de imprimir/salvar em PDF.
        </div>
        <PrintCharts
          className="mt-3"
          intervals={dashboard.intervals}
          periodFrom={period.from.toISOString()}
          periodTo={period.to.toISOString()}
        />
      </Section>

      <style>{`
        .report { max-width: 56rem; }

        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        @media print {
          html, body { background: white !important; }
          .report { max-width: 210mm; }
          section { break-inside: auto; }
          .avoid-break { break-inside: avoid; }
          table { page-break-inside: auto; table-layout: fixed; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; break-after: auto; }
          th, td { padding: 4px 6px !important; }
        }

        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mt-8 ${className ?? ""}`}>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border print:overflow-visible">
      <table className="w-full border-collapse text-sm print:table-fixed print:text-[11px]">
        <thead className="bg-muted/40">
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-3 py-2 text-left font-medium print:whitespace-normal print:break-words"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t">
              {row.map((cell, i) => (
                <td key={i} className="whitespace-nowrap px-3 py-2 print:whitespace-normal print:break-words">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtOrNA(value: number | null, digits: number) {
  if (value === null || Number.isNaN(value)) return "N/A";
  return value.toFixed(digits);
}

function formatPtBrDateTime(date: Date) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
