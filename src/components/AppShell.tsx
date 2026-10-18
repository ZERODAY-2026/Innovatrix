import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Database,
  MoreHorizontal,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore, type Chat } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="grid place-items-center rounded-lg bg-primary text-primary-foreground" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M5 18V10M10 18V6M15 18v-5M20 18V8" />
      </svg>
    </div>
  );
}

export function ThemeSwitch() {
  const { theme, setTheme } = useStore();
  return (
    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      {(["light", "dark"] as const).map((t) => (
        <button
          key={t}
          role="radio"
          aria-checked={theme === t}
          onClick={() => setTheme(t)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            theme === t ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t === "light" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          {t === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}

function group(chats: Chat[]) {
  const now = Date.now();
  const startToday = new Date().setHours(0, 0, 0, 0);
  const g: Record<string, Chat[]> = { Today: [], "Previous 7 Days": [], Older: [] };
  chats.forEach((c) => {
    if (c.createdAt >= startToday) g["Today"]!.push(c);
    else if (now - c.createdAt < 7 * 86400000) g["Previous 7 Days"]!.push(c);
    else g["Older"]!.push(c);
  });
  return g;
}

function ChatItem({ chat, onPick }: { chat: Chat; onPick: () => void }) {
  const { activeId, rename, remove } = useStore();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(chat.title);
  const active = activeId === chat.id;
  return (
    <div className={cn("group flex items-center rounded-md text-sm", active ? "bg-sidebar-accent font-medium text-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60")}>
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            rename(chat.id, val.trim() || chat.title);
            setEditing(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="m-1 w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none"
        />
      ) : (
        <button onClick={onPick} className="flex-1 truncate px-2.5 py-2 text-left">
          {chat.title}
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Conversation options"
          className="mr-1 rounded p-1 text-muted-foreground opacity-0 hover:bg-background hover:text-foreground focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil className="size-4" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => remove(chat.id)} className="text-destructive focus:text-destructive">
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Sidebar({ onClose }: { onClose: () => void }) {
  const { chats, newChat, select } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const filtered = chats.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));
  const groups = group(filtered);
  const go = () => {
    nav({ to: "/" });
    if (window.innerWidth < 1024) onClose();
  };
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">DataMind</span>
        </div>
        <button aria-label="Collapse sidebar" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
          <PanelLeftClose className="size-4" />
        </button>
      </div>
      <div className="space-y-2 px-3 pt-2">
        <button
          onClick={() => {
            newChat();
            go();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 active:scale-[0.99]"
        >
          <Plus className="size-4" /> New Chat
        </button>
        <label className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
      </div>
      <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
        {chats.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Your conversations will appear here.</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No chats match “{q}”.</p>
        ) : (
          Object.entries(groups).map(([name, list]) =>
            list.length ? (
              <div key={name} className="mb-4">
                <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{name}</p>
                {list.map((c) => (
                  <ChatItem
                    key={c.id}
                    chat={c}
                    onPick={() => {
                      select(c.id);
                      go();
                    }}
                  />
                ))}
              </div>
            ) : null,
          )
        )}
      </nav>
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {open && <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setOpen(false)} />}
      <div className={cn("z-40 h-full transition-all max-lg:fixed max-lg:inset-y-0 max-lg:left-0", open ? "lg:w-[260px]" : "max-lg:-translate-x-full lg:w-0 lg:overflow-hidden")}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-1">
            {!open && (
              <button aria-label="Expand sidebar" onClick={() => setOpen(true)} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                <PanelLeftOpen className="size-4" />
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger aria-label="Application menu" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground">
                <MoreHorizontal className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60 p-1.5">
                <DropdownMenuItem asChild>
                  <Link to="/analysis"><BarChart3 className="size-4" /> Analysis</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/data-status"><Database className="size-4" /> Data & Import Status</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings"><Settings className="size-4" /> Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Appearance</DropdownMenuLabel>
                <div className="px-1 pb-1">
                  <ThemeSwitch />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/" className="ml-1 flex items-center gap-2 text-sm font-semibold tracking-tight">
              {!open && <Logo size={22} />} DataMind
            </Link>
          </div>
          <button aria-label="Profile" className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground hover:ring-2 hover:ring-ring">
            GS
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
