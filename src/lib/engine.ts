// DataMind analysis engine — runs real calculations over a FICTIONAL local sample dataset.
// No Snowflake or Gemma connection exists yet; the engine never claims otherwise.

export type Rec = {
  record_id: string;
  student_ref: string;
  class: string;
  subject: string;
  term: string;
  score: number | null;
  attendance_pct: number;
};

export const SOURCE_TABLE = "sample_student_scores";
export const COLUMNS = ["record_id", "student_ref", "class", "subject", "term", "score", "attendance_pct"];
export const CLASSES = ["9A", "9B", "10A", "10B"];
export const SUBJECTS = ["Mathematics", "Science", "English", "History"];
export const TERMS = ["Term 1", "Term 2", "Term 3"];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function build(): Rec[] {
  const r = rng(42);
  const base: Record<string, number> = { Mathematics: 61, Science: 67, English: 72, History: 69 };
  const classAdj: Record<string, number> = { "9A": 2, "9B": -3, "10A": 4, "10B": -1 };
  const out: Rec[] = [];
  let n = 1;
  CLASSES.forEach((c, ci) => {
    for (let s = 1; s <= 10; s++) {
      const ref = `STU-${ci + 1}${String(s).padStart(2, "0")}`;
      const ability = (r() - 0.5) * 24;
      const att = Math.round(72 + r() * 26);
      SUBJECTS.forEach((sub) => {
        TERMS.forEach((t, ti) => {
          let score: number | null = Math.round(
            Math.min(100, Math.max(18, base[sub]! + classAdj[c]! + ability + ti * 2.5 + (att - 85) * 0.4 + (r() - 0.5) * 14)),
          );
          if (sub === "History" && t === "Term 3") score = null; // not yet recorded
          else if (r() < 0.03) score = null;
          out.push({ record_id: `R${String(n++).padStart(4, "0")}`, student_ref: ref, class: c, subject: sub, term: t, score, attendance_pct: att });
        });
      });
    }
  });
  return out;
}

export const DATA: Rec[] = build();

export type Table = { columns: string[]; numeric: boolean[]; rows: (string | number)[][] };

export type Response =
  | {
      kind: "answer";
      answer: string[];
      summary: { records: number; filters: string; period: string };
      chart?: { label: string; value: number }[] | undefined;
      evidence: {
        source: string;
        columns: string[];
        period: string;
        table: Table;
        filters: string[];
        assumptions: string[];
        calculation: string;
        limitations: string[];
        references: string[];
        supporting: Rec[];
      };
      query: { method: string; steps: string[]; code: string };
      incomplete?: boolean;
    }
  | { kind: "ambiguous"; message: string; options: string[] }
  | { kind: "unsupported"; message: string }
  | { kind: "empty"; message: string; conditions: string[] }
  | { kind: "missing"; message: string; missing: string[] }
  | { kind: "error"; message: string };

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const r1 = (x: number) => Math.round(x * 10) / 10;

function detect(q: string) {
  const s = q.toLowerCase();
  const cls = CLASSES.filter((c) => s.includes(c.toLowerCase()));
  if (!cls.length) {
    if (/\bclass\s*10\b|grade\s*10/.test(s)) cls.push("10A", "10B");
    else if (/\bclass\s*9\b|grade\s*9/.test(s)) cls.push("9A", "9B");
  }
  const subMap: [RegExp, string][] = [
    [/math/, "Mathematics"],
    [/science/, "Science"],
    [/english/, "English"],
    [/history/, "History"],
  ];
  const subs = subMap.filter(([re]) => re.test(s)).map(([, v]) => v);
  const terms = TERMS.filter((t) => s.includes(t.toLowerCase()) || s.includes(t.toLowerCase().replace("term ", "t")));
  const t4 = /term\s*4|t4\b/.test(s);
  return { s, cls, subs, terms, t4 };
}

function groupAvg(rows: Rec[], key: keyof Rec) {
  const m = new Map<string, { scores: number[]; total: number }>();
  rows.forEach((r) => {
    const k = String(r[key]);
    const g = m.get(k) ?? { scores: [], total: 0 };
    g.total++;
    if (r.score !== null) g.scores.push(r.score);
    m.set(k, g);
  });
  return [...m.entries()].map(([k, g]) => ({ key: k, avg: r1(mean(g.scores)), n: g.scores.length, excluded: g.total - g.scores.length }));
}

export function analyze(question: string): Response {
  const q = question.trim();
  if (!q) return { kind: "error", message: "Please enter a question." };
  const { s, cls, subs, terms, t4 } = detect(q);

  if (/(address|phone|income|religion|caste|parent|salary|email|predict|future|fee)/.test(s))
    return {
      kind: "unsupported",
      message:
        "The available data contains class, subject, term, score and attendance only. It cannot answer questions about personal details, finances, or predictions, so DataMind will not guess.",
    };

  if (t4)
    return {
      kind: "empty",
      message: "No matching records were found for this question.",
      conditions: ["term = 'Term 4' — the dataset only contains Term 1 to Term 3."],
    };

  const wordCount = s.split(/\s+/).length;
  if (/^(compare|how are (they|students) doing|performance|results|show me)\??$/.test(s) || (wordCount <= 2 && !subs.length && !cls.length))
    return {
      kind: "ambiguous",
      message: "Could you clarify what you'd like to compare?",
      options: ["Compare subject averages", "Compare class performance", "How has performance changed over time?"],
    };

  // Filter
  let rows = DATA;
  const filters: string[] = [];
  if (cls.length) {
    rows = rows.filter((r) => cls.includes(r.class));
    filters.push(`class IN (${cls.join(", ")})`);
  }
  if (subs.length) {
    rows = rows.filter((r) => subs.includes(r.subject));
    filters.push(`subject IN (${subs.join(", ")})`);
  }
  if (terms.length) {
    rows = rows.filter((r) => terms.includes(r.term));
    filters.push(`term IN (${terms.join(", ")})`);
  }
  if (!rows.length)
    return { kind: "empty", message: "No matching records were found for this question.", conditions: filters };

  const scored = rows.filter((r) => r.score !== null);
  if (!scored.length)
    return {
      kind: "missing",
      message: "Scores for the requested selection have not been recorded, so no average can be calculated.",
      missing: [`score is empty for all ${rows.length} matching records (${filters.join("; ")})`],
    };

  // Pick intent
  let groupKey: keyof Rec = "subject";
  let intent = "subject";
  if (/attendance/.test(s)) intent = "attendance";
  else if (/support|struggl|help|below|at risk|additional/.test(s)) intent = "support";
  else if (/time|change|trend|over|improv(ed|ing)|progress/.test(s) && !/need improvement/.test(s)) {
    intent = "term";
    groupKey = "term";
  } else if (/class/.test(s) && /compare|between|across|each|best|which class/.test(s)) {
    intent = "class";
    groupKey = "class";
  } else if (subs.length === 1 && !/subject/.test(s)) {
    intent = cls.length ? "class" : "term";
    groupKey = cls.length > 1 || !cls.length ? (cls.length ? "class" : "term") : "term";
  }

  const excludedTotal = rows.length - scored.length;
  const limitations: string[] = [];
  if (excludedTotal)
    limitations.push(`${excludedTotal} of ${rows.length} matching records have no score and were excluded from averages.`);
  if (rows.some((r) => r.subject === "History" && r.term === "Term 3"))
    limitations.push("History Term 3 scores have not been recorded yet.");
  limitations.push("All records are fictional sample data for demonstration.");

  const period = terms.length ? terms.join(", ") : "Term 1 – Term 3";
  const assumptions = ["Average = arithmetic mean of recorded scores (0–100).", "Records without a score are excluded, not treated as zero."];
  if (!terms.length) assumptions.push("No term specified — all available terms included.");

  const sampleRefs = scored.slice(0, 3).map((r) => r.record_id);
  const refs = [`${SOURCE_TABLE} (local, fictional)`, `${scored.length} scored records, e.g. ${sampleRefs.join(", ")} …`];

  if (intent === "attendance") {
    const bands = [
      { name: "Below 80%", test: (a: number) => a < 80 },
      { name: "80–89%", test: (a: number) => a >= 80 && a < 90 },
      { name: "90% and above", test: (a: number) => a >= 90 },
    ];
    const res = bands.map((b) => {
      const xs = scored.filter((r) => b.test(r.attendance_pct));
      return { key: b.name, avg: r1(mean(xs.map((x) => x.score!))), n: xs.length, students: new Set(xs.map((x) => x.student_ref)).size };
    });
    const valid = res.filter((x) => x.n);
    const hi = valid[valid.length - 1]!;
    const lo = valid[0]!;
    return {
      kind: "answer",
      answer: [
        `In the records analyzed, students in the ${hi.key} attendance band averaged ${hi.avg}, compared with ${lo.avg} in the ${lo.key} band.`,
        "This shows an association between attendance and scores in this sample; it does not show that attendance causes the difference.",
      ],
      summary: { records: scored.length, filters: filters.join("; ") || "None", period },
      chart: valid.map((x) => ({ label: x.key, value: x.avg })),
      evidence: {
        source: SOURCE_TABLE,
        columns: ["attendance_pct", "score"],
        period,
        table: { columns: ["Attendance band", "Average score", "Students", "Records analyzed"], numeric: [false, true, true, true], rows: res.map((x) => [x.key, isNaN(x.avg) ? "—" : x.avg, x.students, x.n]) },
        filters: filters.length ? filters : ["None"],
        assumptions: [...assumptions, "Attendance bands: <80, 80–89, ≥90."],
        calculation: "Each scored record was placed into an attendance band using the student's attendance percentage, then the mean score was computed per band.",
        limitations,
        references: refs,
        supporting: scored,
      },
      query: {
        method: "Programmatic calculation (TypeScript, in-browser) — not SQL",
        steps: [`Filter: ${filters.join(" AND ") || "none"}`, "Exclude records where score is empty", "Assign band from attendance_pct", "Compute mean(score) and count per band"],
        code: `rows = ${SOURCE_TABLE}${filters.length ? `.filter(${filters.join(" && ")})` : ""}\n  .filter(score != null)\nband = attendance_pct < 80 ? "Below 80%" : attendance_pct < 90 ? "80–89%" : "90% and above"\nresult = groupBy(rows, band).map(g => ({ avg: mean(g.score), n: g.length }))`,
      },
    };
  }

  if (intent === "support") {
    const byStudent = new Map<string, { cls: string; scores: number[] }>();
    scored.forEach((r) => {
      const g = byStudent.get(r.student_ref) ?? { cls: r.class, scores: [] };
      g.scores.push(r.score!);
      byStudent.set(r.student_ref, g);
    });
    const perClass = new Map<string, { total: number; below: number }>();
    byStudent.forEach((g) => {
      const p = perClass.get(g.cls) ?? { total: 0, below: 0 };
      p.total++;
      if (mean(g.scores) < 55) p.below++;
      perClass.set(g.cls, p);
    });
    const res = [...perClass.entries()].sort();
    const totalBelow = res.reduce((a, [, p]) => a + p.below, 0);
    return {
      kind: "answer",
      answer: [
        `${totalBelow} of ${byStudent.size} students in this selection have an average score below 55 and may benefit from additional support.`,
        "Results are shown per class rather than per student to protect privacy. A low average reflects recorded scores only, not a student's potential.",
      ],
      summary: { records: scored.length, filters: filters.join("; ") || "None", period },
      evidence: {
        source: SOURCE_TABLE,
        columns: ["student_ref", "class", "score"],
        period,
        table: { columns: ["Class", "Students", "Average below 55", "Share"], numeric: [false, true, true, true], rows: res.map(([c, p]) => [c, p.total, p.below, `${Math.round((p.below / p.total) * 100)}%`]) },
        filters: filters.length ? filters : ["None"],
        assumptions: [...assumptions, "Support threshold: student's overall average below 55 (configurable)."],
        calculation: "Each student's mean score across matching subjects and terms was computed, then students under the threshold were counted per class.",
        limitations,
        references: refs,
        supporting: [],
      },
      query: {
        method: "Programmatic calculation (TypeScript, in-browser) — not SQL",
        steps: [`Filter: ${filters.join(" AND ") || "none"}`, "Exclude empty scores", "mean(score) per student_ref", "Count students with mean < 55, grouped by class"],
        code: `perStudent = groupBy(rows.filter(score != null), student_ref).map(mean(score))\nresult = groupBy(perStudent, class).map(g => ({ total: g.length, below: g.filter(avg < 55).length }))`,
      },
    };
  }

  const groups = groupAvg(rows, groupKey).sort((a, b) =>
    groupKey === "term" ? a.key.localeCompare(b.key) : groupKey === "class" ? a.key.localeCompare(b.key) : a.avg - b.avg,
  );
  const valid = groups.filter((g) => !isNaN(g.avg));
  const label = groupKey === "term" ? "Term" : groupKey === "class" ? "Class" : "Subject";
  let answer: string[];
  const sorted = [...valid].sort((a, b) => a.avg - b.avg);
  const low = sorted[0]!;
  const high = sorted[sorted.length - 1]!;
  const scope = [cls.length ? `class ${cls.join(" & ")}` : "", subs.length ? subs.join(" & ") : ""].filter(Boolean).join(", ");
  if (groupKey === "term") {
    const first = valid[0]!;
    const last = valid[valid.length - 1]!;
    const diff = r1(last.avg - first.avg);
    answer = [
      `${scope ? `For ${scope}, the` : "The"} average score moved from ${first.avg} in ${first.key} to ${last.avg} in ${last.key} — a change of ${diff > 0 ? "+" : ""}${diff} points.`,
    ];
  } else if (groupKey === "class") {
    answer = [`${scope ? `For ${scope}, ` : ""}${high.key} has the highest average (${high.avg}) and ${low.key} the lowest (${low.avg}) among the classes compared.`];
  } else {
    answer = [
      `Based on the records analyzed, ${low.key} has the lowest average score (${low.avg})${valid.length > 1 ? ` and ${high.key} the highest (${high.avg})` : ""}${scope ? ` for ${scope}` : ""}.`,
    ];
    if (/improv|need/.test(s) && valid.length > 1) answer.push(`${low.key} is the clearest candidate for additional focus, being ${r1(high.avg - low.avg)} points below the top subject.`);
  }
  const incomplete = valid.length < groups.length;
  if (incomplete) answer.push(`Some groups have no recorded scores, so they could not be compared.`);

  const groupCol = groupKey as string;
  return {
    kind: "answer",
    incomplete,
    answer,
    summary: { records: scored.length, filters: filters.join("; ") || "None", period },
    chart: valid.length > 2 ? valid.map((g) => ({ label: g.key, value: g.avg })) : undefined,
    evidence: {
      source: SOURCE_TABLE,
      columns: [groupCol, "score"],
      period,
      table: {
        columns: [label, "Average score", "Records analyzed", "Excluded (no score)"],
        numeric: [false, true, true, true],
        rows: groups.map((g) => [g.key, isNaN(g.avg) ? "—" : g.avg, g.n, g.excluded]),
      },
      filters: filters.length ? filters : ["None"],
      assumptions,
      calculation: `Recorded scores were grouped by ${groupCol}, and the mean of each group was calculated. ${groupKey === "term" ? "Change = last term average − first term average." : "Groups were then ranked by average."}`,
      limitations,
      references: refs,
      supporting: scored,
    },
    query: {
      method: "Programmatic calculation (TypeScript, in-browser) — not SQL",
      steps: [`Source: ${SOURCE_TABLE} (${DATA.length} records)`, `Filter: ${filters.join(" AND ") || "none"}`, "Exclude records where score is empty", `Group by ${groupCol}`, "Compute mean(score) and count per group"],
      code: `rows = ${SOURCE_TABLE}${filters.length ? `\n  .filter(${filters.join(" && ")})` : ""}\n  .filter(r => r.score != null)\nresult = groupBy(rows, "${groupCol}")\n  .map(g => ({ ${groupCol}: g.key, avg: round(mean(g.score), 1), n: g.length }))`,
    },
  };
}
