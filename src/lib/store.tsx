import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { analyze, type Response } from "./engine";

export type Msg = { id: string; role: "user"; text: string } | { id: string; role: "assistant"; question: string; response: Response; showQuery: boolean };
export type Chat = { id: string; title: string; createdAt: number; messages: Msg[] };
type Theme = "light" | "dark";

const uid = () => Math.random().toString(36).slice(2, 10);
const DAY = 86400000;

function seed(): Chat[] {
  const now = Date.now();
  const mk = (title: string, q: string, ago: number): Chat => ({
    id: uid(),
    title,
    createdAt: now - ago,
    messages: [
      { id: uid(), role: "user", text: q },
      { id: uid(), role: "assistant", question: q, response: analyze(q), showQuery: false },
    ],
  });
  return [
    mk("Class 10 Mathematics Performance", "How has Class 10 Mathematics performance changed over time?", 1000 * 60 * 30),
    mk("Compare Subject Averages", "Which subject has the lowest average score?", 1000 * 60 * 90),
    mk("Attendance and Exam Results", "How does attendance relate to exam results?", DAY * 2),
    mk("Changes in Student Performance", "How has performance changed over time?", DAY * 4),
    mk("Students Requiring Additional Support", "How many students need additional support in each class?", DAY * 12),
  ];
}

type Ctx = {
  chats: Chat[];
  activeId: string | null;
  theme: Theme;
  showQuery: boolean;
  pending: boolean;
  setTheme: (t: Theme) => void;
  setShowQuery: (b: boolean) => void;
  newChat: () => void;
  select: (id: string) => void;
  rename: (id: string, title: string) => void;
  remove: (id: string) => void;
  ask: (q: string) => void;
  toggleMsgQuery: (chatId: string, msgId: string) => void;
};

const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [theme, setThemeS] = useState<Theme>("light");
  const [showQuery, setShowQueryS] = useState(false);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dm-chats");
      setChats(saved ? JSON.parse(saved) : seed());
      const t = localStorage.getItem("dm-theme");
      if (t === "dark" || t === "light") setThemeS(t);
      setShowQueryS(localStorage.getItem("dm-showquery") === "1");
    } catch {
      setChats(seed());
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("dm-chats", JSON.stringify(chats));
  }, [chats, ready]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (ready) localStorage.setItem("dm-theme", theme);
  }, [theme, ready]);

  const setShowQuery = (b: boolean) => {
    setShowQueryS(b);
    localStorage.setItem("dm-showquery", b ? "1" : "0");
  };

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || pending) return;
    let id = activeId;
    const userMsg: Msg = { id: uid(), role: "user", text };
    if (!id || !chats.find((c) => c.id === id)) {
      id = uid();
      const title = text.length > 42 ? text.slice(0, 40) + "…" : text;
      setChats((cs) => [{ id: id!, title, createdAt: Date.now(), messages: [userMsg] }, ...cs]);
      setActiveId(id);
    } else {
      setChats((cs) => cs.map((c) => (c.id === id ? { ...c, messages: [...c.messages, userMsg] } : c)));
    }
    setPending(true);
    const chatId = id;
    setTimeout(() => {
      let response: Response;
      try {
        response = analyze(text);
      } catch {
        response = { kind: "error", message: "Something went wrong while analyzing this question. Please try again." };
      }
      setChats((cs) =>
        cs.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, { id: uid(), role: "assistant", question: text, response, showQuery }] } : c)),
      );
      setPending(false);
    }, 900);
  };

  return (
    <C.Provider
      value={{
        chats,
        activeId,
        theme,
        showQuery,
        pending,
        setTheme: setThemeS,
        setShowQuery,
        newChat: () => setActiveId(null),
        select: setActiveId,
        rename: (id, title) => setChats((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c))),
        remove: (id) => {
          setChats((cs) => cs.filter((c) => c.id !== id));
          if (activeId === id) setActiveId(null);
        },
        ask,
        toggleMsgQuery: (chatId, msgId) =>
          setChats((cs) =>
            cs.map((c) =>
              c.id === chatId ? { ...c, messages: c.messages.map((m) => (m.id === msgId && m.role === "assistant" ? { ...m, showQuery: !m.showQuery } : m)) } : c,
            ),
          ),
      }}
    >
      {children}
    </C.Provider>
  );
}

export function useStore() {
  const c = useContext(C);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
