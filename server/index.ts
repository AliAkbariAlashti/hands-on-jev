import "dotenv/config";
import express from "express";
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";
import type { ChoiceCriteria, EntryType, ScoreCriteria } from "@typesafe-ai/sdk";

const app = express();
app.use(express.json());

const client = new TypeSafeClient();

interface RunBody {
  state: string;
  type: "choice" | "noul" | "score";
  instructions: string;
  criteria: unknown;
}

interface RunRecord {
  type: "choice" | "noul" | "score";
  confidence: number;
  ms: number;
  at: number;
}

const MAX_RECORDS = 500;
const runLog: RunRecord[] = [];

function recordRun(type: RunRecord["type"], confidence: number, ms: number) {
  runLog.push({ type, confidence, ms, at: Date.now() });
  if (runLog.length > MAX_RECORDS) runLog.shift();
}

function confidenceOf(type: RunRecord["type"], answer: { confidence?: number; noul?: number }): number {
  return type === "noul" ? Math.max(answer.noul!, 1 - answer.noul!) : answer.confidence!;
}

function parseState(raw: string): EntryType {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as EntryType;
  } catch {
    return trimmed;
  }
}

app.post("/api/run", async (req, res) => {
  const body = req.body as Partial<RunBody>;
  const { type, instructions } = body;
  const stateRaw = body.state;

  if (typeof stateRaw !== "string" || !stateRaw.trim()) {
    res.status(400).json({ error: "State is required." });
    return;
  }
  if (typeof instructions !== "string" || !instructions.trim()) {
    res.status(400).json({ error: "Instructions are required." });
    return;
  }
  if (type !== "choice" && type !== "noul" && type !== "score") {
    res.status(400).json({ error: "Type must be one of choice, noul, score." });
    return;
  }

  const state = parseState(stateRaw);

  try {
    let question;
    if (type === "choice") {
      const criteria = body.criteria as ChoiceCriteria;
      if (!criteria || typeof criteria !== "object" || Object.keys(criteria).length < 2) {
        res.status(400).json({ error: "Choice needs at least two options in criteria." });
        return;
      }
      question = choice(instructions, criteria);
    } else if (type === "noul") {
      const criteria = body.criteria as { true?: EntryType; false?: EntryType } | undefined;
      question = noul(instructions, criteria);
    } else {
      const criteria = body.criteria as ScoreCriteria;
      if (!Array.isArray(criteria) || criteria.length < 2) {
        res.status(400).json({ error: "Score needs at least two levels in criteria." });
        return;
      }
      question = score(instructions, criteria);
    }

    const startedAt = Date.now();
    const response = await client.systemOne({
      state,
      questions: { answer: question },
    });
    const ms = Date.now() - startedAt;

    recordRun(type, confidenceOf(type, response.answers.answer), ms);

    res.json({
      answer: response.answers.answer,
      model: response.model,
      usage: response.usage,
      ms,
    });
  } catch (err) {
    console.error("Jev request failed:", err);
    const message = err instanceof Error ? err.message : "Jev couldn't be reached.";
    res.status(502).json({ error: message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasKey: Boolean(process.env.TYPESAFE_API_KEY) });
});

const CONFIDENCE_BUCKETS = [
  { label: "50-60%", min: 0.5, max: 0.6 },
  { label: "60-70%", min: 0.6, max: 0.7 },
  { label: "70-80%", min: 0.7, max: 0.8 },
  { label: "80-90%", min: 0.8, max: 0.9 },
  { label: "90-100%", min: 0.9, max: 1.001 },
];

app.get("/api/stats", (_req, res) => {
  const total = runLog.length;

  const byType: Record<RunRecord["type"], number> = { choice: 0, noul: 0, score: 0 };
  const confidenceBuckets = CONFIDENCE_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  const msByType: Record<RunRecord["type"], number[]> = { choice: [], noul: [], score: [] };

  for (const r of runLog) {
    byType[r.type]++;
    msByType[r.type].push(r.ms);
    const bucketIndex = CONFIDENCE_BUCKETS.findIndex((b) => r.confidence >= b.min && r.confidence < b.max);
    if (bucketIndex >= 0) confidenceBuckets[bucketIndex].count++;
  }

  const avgMsByType = (Object.keys(msByType) as RunRecord["type"][]).map((type) => {
    const values = msByType[type];
    const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    return { type, avgMs: avg, count: values.length };
  });

  res.json({
    total,
    byType,
    confidenceBuckets,
    avgMsByType,
  });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`jev playground server listening on http://localhost:${port}`);
});
