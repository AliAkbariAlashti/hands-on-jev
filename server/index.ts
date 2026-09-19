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

    const response = await client.systemOne({
      state,
      questions: { answer: question },
    });

    res.json({
      answer: response.answers.answer,
      model: response.model,
      usage: response.usage,
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

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`jev playground server listening on http://localhost:${port}`);
});
