import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { AppShell, Logo } from "@/components/AppShell";
import { AnswerView } from "@/components/AnswerView";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DataMind — Ask about student performance" },
      { name: "description", content: "Ask questions about student performance in everyday language and get answers backed by inspectable evidence." },
      { property: "og:title", content: "DataMind — Ask about student performance" },
      { property: "og:description", content: "Clear answers, inspectable evidence and optional query details for teachers and administrators." },
    ],
  }),
  component: Home,
});

const SUGGESTIONS = ["Which subjects need improvement?", "Compare class performance", "How has performance changed over time?"];

function Composer() {
  const { ask, pending, showQuery, setShowQuery } = useStore();
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim() || pending) return;
    ask(text);
    setText("");
  };
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      <div className="rounded-2xl border border-input bg-card shadow-soft transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-ring/20">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="Ask anything about student performance..."
          className="block w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
            <Switch checked={showQuery} onCheckedChange={setShowQuery} aria-label="Show Query" />
            Show Query
          </label>
          <button
            onClick={submit}
            disabled={!text.trim() || pending}
            aria-label="Send"
            className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Data-grounded insights. Transparent results.</p>
    </div>
  );
}

function Home() {
  const { chats, activeId, ask, pending, toggleMsgQuery } = useStore();
  const chat = chats.find((c) => c.id === activeId);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [chat?.messages.length, pending]);

  return (
    <AppShell>
      <div className="flex min-h-full flex-col">
        {!chat ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <Logo size={44} />
            <h1 className="mt-6 max-w-xl text-3xl font-semibold tracking-tight">What would you like to know about your students?</h1>
            <p className="mt-3 max-w-lg text-muted-foreground">
              Explore student performance, understand trends, and discover insights by asking questions in everyday language.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:border-primary hover:bg-accent hover:text-accent-foreground">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8">
            {chat.messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[15px] text-secondary-foreground">{m.text}</div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <div className="shrink-0 pt-0.5"><Logo size={26} /></div>
                  <div className="min-w-0 flex-1">
                    <AnswerView response={m.response} showQuery={m.showQuery} onToggleQuery={() => toggleMsgQuery(chat.id, m.id)} />
                  </div>
                </div>
              ),
            )}
            {pending && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Logo size={26} />
                <Loader2 className="size-4 animate-spin" /> Analyzing sample records…
              </div>
            )}
            <div ref={end} />
          </div>
        )}
        <div className="sticky bottom-0 bg-background pt-2">
          <Composer />
        </div>
      </div>
    </AppShell>
  );
}
