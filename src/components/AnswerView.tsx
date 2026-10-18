import { useState } from "react";
import { AlertTriangle, Ban, Check, ChevronDown, Copy, Database, FileSearch, HelpCircle, SearchX, XCircle } from "lucide-react";
import type { Response, Table } from "@/lib/engine";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function DataTable({ t, max = 8 }: { t: Table; max?: number }) {
  const [all, setAll] = useState(false);
  const rows = all ? t.rows : t.rows.slice(0, max);
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              {t.columns.map((c, i) => (
                <th key={c} className={cn("px-3 py-2 font-medium", t.numeric[i] ? "text-right" : "text-left")}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-t border-border even:bg-surface">
                {r.map((v, i) => (
                  <td key={i} className={cn("px-3 py-2", t.numeric[i] ? "text-right tabular-nums" : "")}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{t.rows.length} result rows</span>
        {t.rows.length > max && (
          <button onClick={() => setAll(!all)} className="font-medium text-primary hover:underline">{all ? "Show fewer" : "View all rows"}</button>
        )}
      </div>
    </div>
  );
}

function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 100);
  return (
    <div className="space-y-2 py-2">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-sm">
          <span className="truncate text-muted-foreground">{d.label}</span>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="text-right tabular-nums">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
);

function Notice({ icon: Icon, tone, title, children }: { icon: typeof Ban; tone: "warning" | "destructive" | "muted"; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-surface p-4">
      <Icon className={cn("mt-0.5 size-5 shrink-0", tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-muted-foreground")} />
      <div className="text-sm">
        <p className="font-medium">{title}</p>
        <div className="mt-1 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export function AnswerView({ response, showQuery, onToggleQuery }: { response: Response; showQuery: boolean; onToggleQuery: () => void }) {
  const { ask, showQuery: globalShow } = useStore();
  const [evOpen, setEvOpen] = useState(true);
  const [recOpen, setRecOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (response.kind === "ambiguous")
    return (
      <Notice icon={HelpCircle} tone="muted" title={response.message}>
        <div className="mt-2 flex flex-wrap gap-2">
          {response.options.map((o) => (
            <button key={o} onClick={() => ask(o)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary">{o}</button>
          ))}
        </div>
      </Notice>
    );
  if (response.kind === "unsupported") return <Notice icon={Ban} tone="muted" title="This question can't be answered from the available data">{response.message}</Notice>;
  if (response.kind === "empty")
    return (
      <Notice icon={SearchX} tone="muted" title={response.message}>
        <p>These conditions produced no results:</p>
        <ul className="mt-1 list-disc pl-5">{response.conditions.map((c) => <li key={c} className="font-mono text-xs">{c}</li>)}</ul>
      </Notice>
    );
  if (response.kind === "missing")
    return (
      <Notice icon={AlertTriangle} tone="warning" title="Required data is missing">
        <p>{response.message}</p>
        <ul className="mt-1 list-disc pl-5">{response.missing.map((c) => <li key={c}>{c}</li>)}</ul>
      </Notice>
    );
  if (response.kind === "error") return <Notice icon={XCircle} tone="destructive" title="Something went wrong">{response.message}</Notice>;

  const r = response;
  const ev = r.evidence;
  const queryVisible = globalShow || showQuery;
  return (
    <div className="divide-y divide-border">
      <section className="pb-5">
        <h3 className="mb-2 text-sm font-semibold">Answer</h3>
        <div className="space-y-2 text-[15px] leading-relaxed">{r.answer.map((p) => <p key={p}>{p}</p>)}</div>
        {r.incomplete && <p className="mt-2 flex items-center gap-1.5 text-xs text-warning"><AlertTriangle className="size-3.5" /> Evidence is incomplete for some groups.</p>}
        {r.chart && <div className="mt-3 max-w-md"><Bars data={r.chart} /></div>}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span><b className="font-medium text-foreground">{r.summary.records}</b> records analyzed</span>
          <span>Filters: <span className="text-foreground">{r.summary.filters}</span></span>
          <span>Period: <span className="text-foreground">{r.summary.period}</span></span>
        </div>
      </section>

      <section className="py-5">
        <button onClick={() => setEvOpen(!evOpen)} className="flex w-full items-center justify-between text-left">
          <span className="flex items-center gap-2 text-sm font-semibold"><FileSearch className="size-4 text-primary" /> Evidence</span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", evOpen && "rotate-180")} />
        </button>
        {evOpen && (
          <div className="mt-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label>Source</Label><p className="font-mono text-xs">{ev.source}</p><p className="mt-0.5 text-xs text-warning">Illustrative sample data</p></div>
              <div><Label>Relevant columns</Label><p className="font-mono text-xs">{ev.columns.join(", ")}</p></div>
              <div><Label>Reporting period</Label><p className="text-sm">{ev.period}</p></div>
            </div>
            <div><Label>Supporting results</Label><DataTable t={ev.table} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Applied filters</Label>
                <ul className="space-y-0.5 font-mono text-xs">{ev.filters.map((f) => <li key={f}>{f}</li>)}</ul>
                <p className="mt-2 text-xs text-muted-foreground">Assumptions:</p>
                <ul className="list-disc pl-4 text-xs text-muted-foreground">{ev.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
              </div>
              <div><Label>Calculation summary</Label><p className="text-sm text-muted-foreground">{ev.calculation}</p></div>
            </div>
            <div>
              <Label>Data limitations</Label>
              <ul className="space-y-1 text-sm">{ev.limitations.map((l) => <li key={l} className="flex gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />{l}</li>)}</ul>
            </div>
            <div>
              <Label>Source references</Label>
              <ul className="space-y-0.5 text-xs text-muted-foreground">{ev.references.map((l) => <li key={l} className="flex gap-2"><Database className="size-3.5" />{l}</li>)}</ul>
              {ev.supporting.length > 0 && (
                <button onClick={() => setRecOpen(!recOpen)} className="mt-2 text-xs font-medium text-primary hover:underline">{recOpen ? "Hide supporting records" : "View supporting records"}</button>
              )}
              {recOpen && (
                <div className="mt-2">
                  <DataTable
                    max={6}
                    t={{ columns: ["Record", "Student ref (fictional)", "Class", "Subject", "Term", "Score"], numeric: [false, false, false, false, false, true], rows: ev.supporting.map((s) => [s.record_id, s.student_ref, s.class, s.subject, s.term, s.score ?? "—"]) }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="pt-4">
        <button onClick={onToggleQuery} className="flex w-full items-center justify-between text-left" aria-expanded={queryVisible}>
          <span>
            <span className="text-sm font-semibold">Query & Calculation</span>
            <span className="ml-2 text-xs text-muted-foreground">Inspect how this answer was obtained.</span>
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", queryVisible && "rotate-180")} />
        </button>
        {queryVisible && (
          <div className="mt-3 space-y-3">
            <p className="inline-flex rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">{r.query.method}</p>
            <ol className="list-decimal space-y-0.5 pl-5 text-sm text-muted-foreground">{r.query.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg border border-border bg-code p-4 font-mono text-xs leading-relaxed">{r.query.code}</pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(r.query.code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="absolute right-2 top-2 flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
