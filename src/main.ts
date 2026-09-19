import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  ${renderHero()}
  ${renderDocsSection()}
  ${renderPlaygroundSection()}
  ${renderFooter()}
`;

function renderHero(): string {
  return `
    <header class="hero">
      <div class="meta">JEV · SYSTEM ONE<br />STATE + QUESTIONS<br />TYPED OUTPUT</div>
      <div class="tag">hands-on-jev</div>
      <h1>Learn Jev by<br />running it.</h1>
      <p>
        Jev is TypeSafe's "System One" model: instead of writing back text, it answers
        narrow questions about your <code>state</code> with a typed, probability-scored
        judgment. Read how it works below, then run the three question types yourself
        against the live API.
      </p>
    </header>
  `;
}

function renderDocsSection(): string {
  return `
    <section id="docs">
      <h2>01 · What Jev actually returns</h2>
      <div class="prose">
        <p>
          A normal LLM call gets you back text — a reply, some code, an explanation —
          that your application then has to parse. Jev skips that step. You send it
          <code>state</code> (the text or structured facts to evaluate) and one or more
          <code>questions</code>, and it returns a typed answer: a selected option, a
          yes/no probability, or a position on a scale. No prose, no parsing.
        </p>
        <p>
          Every question has an <code>instructions</code> field (the judgment you want,
          in plain language) and a <code>criteria</code> field (how the possible answers
          are defined). The question's key in the request is just an identifier for your
          code — it's never sent to the model, so the full meaning has to live in
          <code>instructions</code> and <code>criteria</code>.
        </p>
        <p>
          Full reference: <a href="https://docs.typesafe.ai/concepts/system-one.md" target="_blank" rel="noopener">System One</a>
          · <a href="https://docs.typesafe.ai/concepts/state.md" target="_blank" rel="noopener">state</a>
          · <a href="https://docs.typesafe.ai/primitives.md" target="_blank" rel="noopener">primitives</a>
        </p>
      </div>

      <div class="primitive-grid">
        <div class="cell">
          <div class="name">Choice</div>
          <p>Picks one option out of a fixed set you define. Returns the winning label plus a probability for every option. Use it for routing and classification.</p>
        </div>
        <div class="cell">
          <div class="name">Noul</div>
          <p>Answers one yes/no condition as a single probability, <code>noul</code>, from 0 to 1. No separate confidence — the number is the answer. Use one Noul per label when several could apply at once.</p>
        </div>
        <div class="cell">
          <div class="name">Score</div>
          <p>Places the state on an ordered scale you describe level by level. Returns a probability-weighted score, a confidence, and the full distribution across levels.</p>
        </div>
      </div>
    </section>
  `;
}

function renderPlaygroundSection(): string {
  return `
    <section id="playground">
      <h2>02 · Try it</h2>
      <div class="prose">
        <p>Edit the state and the question for any panel below, then run it. These hit the real Jev API through this repo's server — nothing is mocked.</p>
      </div>
      <div id="panels"></div>
    </section>
  `;
}

function renderFooter(): string {
  return `
    <footer class="site">
      <span>built with the <a href="https://docs.typesafe.ai" target="_blank" rel="noopener">TypeSafe</a> Jev model</span>
      <span><a href="https://github.com" target="_blank" rel="noopener">source on GitHub</a></span>
    </footer>
  `;
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

type PrimitiveType = "choice" | "noul" | "score";

interface ChoicePanelConfig {
  type: "choice";
  id: string;
  state: string;
  instructions: string;
  options: { label: string; description: string }[];
}

interface NoulPanelConfig {
  type: "noul";
  id: string;
  state: string;
  instructions: string;
  trueDesc: string;
  falseDesc: string;
}

interface ScorePanelConfig {
  type: "score";
  id: string;
  state: string;
  instructions: string;
  levels: string[];
}

type PanelConfig = ChoicePanelConfig | NoulPanelConfig | ScorePanelConfig;

const PANELS: PanelConfig[] = [
  {
    type: "choice",
    id: "choice-1",
    state: "Help! My payments have been failing for three days and support hasn't replied.",
    instructions: "Which team should handle this ticket?",
    options: [
      { label: "billing", description: "Payments, invoicing, refunds" },
      { label: "technical", description: "Bugs, outages, integrations" },
      { label: "sales", description: "Pricing, upgrades, new accounts" },
    ],
  },
  {
    type: "noul",
    id: "noul-1",
    state: "I've asked three times already. Can I please talk to a real person?",
    instructions: "Is the customer asking to be escalated to a human agent?",
    trueDesc: "Explicitly requests a human agent or live person",
    falseDesc: "No mention of needing a human",
  },
  {
    type: "score",
    id: "score-1",
    state: "Exporting to Safari crashes the app. There's no workaround and it affects every user on that browser.",
    instructions: "How severe is this bug report?",
    levels: [
      "Cosmetic — minor visual issue, no functional impact",
      "Workaround exists — annoying but users can get around it",
      "No workaround — blocks a feature, affects a subset of users",
      "Critical — blocks core functionality for all users",
    ],
  },
];

const panelsEl = document.querySelector<HTMLDivElement>("#panels")!;
panelsEl.innerHTML = PANELS.map((p) => renderPanelShell(p)).join("");

PANELS.forEach((config) => wirePanel(config));

function renderPanelShell(config: PanelConfig): string {
  return `
    <div class="panel" data-panel="${config.id}">
      <div class="panel-head">
        <span class="title">${config.id.split("-")[0]}</span>
        <span class="type-badge">type: ${config.type}</span>
      </div>
      <div class="panel-body">
        <div class="field">
          <label for="${config.id}-state">state</label>
          <textarea id="${config.id}-state" rows="2">${escapeHtml(config.state)}</textarea>
          <div class="hint">Plain text, or JSON for structured state.</div>
        </div>
        <div class="field">
          <label for="${config.id}-instructions">instructions</label>
          <textarea id="${config.id}-instructions" rows="2">${escapeHtml(config.instructions)}</textarea>
        </div>
        ${renderCriteriaFields(config)}
        <div class="actions">
          <button class="run" data-run="${config.id}">Run against Jev</button>
        </div>
        <div class="error-slot" data-error="${config.id}"></div>
        <div class="result" data-result="${config.id}"></div>
      </div>
    </div>
  `;
}

function renderCriteriaFields(config: PanelConfig): string {
  if (config.type === "choice") {
    return `
      <div class="field">
        <label>criteria — options</label>
        <div class="criteria-rows" data-criteria-rows="${config.id}">
          ${config.options.map((opt, i) => renderChoiceRow(config.id, i, opt.label, opt.description)).join("")}
        </div>
        <button class="add-row" data-add-option="${config.id}">+ add option</button>
      </div>
    `;
  }
  if (config.type === "noul") {
    return `
      <div class="field">
        <label for="${config.id}-true">criteria.true (optional)</label>
        <textarea id="${config.id}-true" rows="1">${escapeHtml(config.trueDesc)}</textarea>
      </div>
      <div class="field">
        <label for="${config.id}-false">criteria.false (optional)</label>
        <textarea id="${config.id}-false" rows="1">${escapeHtml(config.falseDesc)}</textarea>
      </div>
    `;
  }
  return `
    <div class="field">
      <label>criteria — ordered levels, low to high</label>
      <div class="score-levels" data-score-levels="${config.id}">
        ${config.levels.map((lvl, i) => renderScoreLevel(config.id, i, lvl)).join("")}
      </div>
      <button class="add-row" data-add-level="${config.id}">+ add level</button>
    </div>
  `;
}

function renderChoiceRow(panelId: string, index: number, label: string, description: string): string {
  return `
    <div class="criteria-row" data-row-index="${index}">
      <input type="text" placeholder="label" value="${escapeHtml(label)}" data-opt-label />
      <textarea rows="1" placeholder="description" data-opt-desc>${escapeHtml(description)}</textarea>
      <button class="remove" data-remove-option="${panelId}" data-index="${index}">&times;</button>
    </div>
  `;
}

function renderScoreLevel(panelId: string, index: number, text: string): string {
  return `
    <div class="score-level" data-row-index="${index}">
      <div class="level-num">${index}</div>
      <textarea rows="1" placeholder="what does this level mean?" data-level-text>${escapeHtml(text)}</textarea>
      <button class="remove" data-remove-level="${panelId}" data-index="${index}">&times;</button>
    </div>
  `;
}

function wirePanel(config: PanelConfig) {
  const panelEl = document.querySelector<HTMLDivElement>(`[data-panel="${config.id}"]`)!;
  const runBtn = panelEl.querySelector<HTMLButtonElement>(`[data-run="${config.id}"]`)!;

  if (config.type === "choice") {
    wireAddRemove(panelEl, config.id, "add-option", "remove-option", "criteria-rows", (idx) =>
      renderChoiceRow(config.id, idx, "", ""),
    );
  } else if (config.type === "score") {
    wireAddRemove(panelEl, config.id, "add-level", "remove-level", "score-levels", (idx) =>
      renderScoreLevel(config.id, idx, ""),
    );
  }

  runBtn.addEventListener("click", () => runPanel(config, panelEl, runBtn));
}

function wireAddRemove(
  panelEl: HTMLDivElement,
  panelId: string,
  addAttr: string,
  removeAttr: string,
  containerAttr: string,
  renderRow: (index: number) => string,
) {
  const addBtn = panelEl.querySelector<HTMLButtonElement>(`[data-${addAttr}="${panelId}"]`);
  const container = panelEl.querySelector<HTMLDivElement>(`[data-${containerAttr}="${panelId}"]`)!;

  addBtn?.addEventListener("click", () => {
    const index = container.children.length;
    container.insertAdjacentHTML("beforeend", renderRow(index));
    bindRemoveButtons();
  });

  function bindRemoveButtons() {
    container.querySelectorAll<HTMLButtonElement>(`[data-${removeAttr}="${panelId}"]`).forEach((btn) => {
      btn.onclick = () => {
        if (container.children.length <= 2) return;
        btn.closest(".criteria-row, .score-level")?.remove();
      };
    });
  }

  bindRemoveButtons();
}

async function runPanel(config: PanelConfig, panelEl: HTMLDivElement, runBtn: HTMLButtonElement) {
  const errorSlot = panelEl.querySelector<HTMLDivElement>(`[data-error="${config.id}"]`)!;
  const resultEl = panelEl.querySelector<HTMLDivElement>(`[data-result="${config.id}"]`)!;
  errorSlot.innerHTML = "";
  resultEl.classList.remove("visible");

  const state = (panelEl.querySelector<HTMLTextAreaElement>(`#${config.id}-state`)!).value;
  const instructions = (panelEl.querySelector<HTMLTextAreaElement>(`#${config.id}-instructions`)!).value;

  let criteria: unknown;
  if (config.type === "choice") {
    const rows = Array.from(panelEl.querySelectorAll<HTMLDivElement>(`[data-criteria-rows="${config.id}"] .criteria-row`));
    const entries: Record<string, string> = {};
    for (const row of rows) {
      const label = row.querySelector<HTMLInputElement>("[data-opt-label]")!.value.trim();
      const desc = row.querySelector<HTMLTextAreaElement>("[data-opt-desc]")!.value.trim();
      if (label) entries[label] = desc;
    }
    if (Object.keys(entries).length < 2) {
      errorSlot.innerHTML = `<div class="error-banner">Add at least two labeled options.</div>`;
      return;
    }
    criteria = entries;
  } else if (config.type === "noul") {
    const trueDesc = (panelEl.querySelector<HTMLTextAreaElement>(`#${config.id}-true`)!).value.trim();
    const falseDesc = (panelEl.querySelector<HTMLTextAreaElement>(`#${config.id}-false`)!).value.trim();
    criteria = trueDesc || falseDesc ? { true: trueDesc || undefined, false: falseDesc || undefined } : undefined;
  } else {
    const rows = Array.from(panelEl.querySelectorAll<HTMLDivElement>(`[data-score-levels="${config.id}"] .score-level`));
    const levels = rows
      .map((row) => row.querySelector<HTMLTextAreaElement>("[data-level-text]")!.value.trim())
      .filter((v) => v.length > 0);
    if (levels.length < 2) {
      errorSlot.innerHTML = `<div class="error-banner">Add at least two levels.</div>`;
      return;
    }
    criteria = levels;
  }

  runBtn.disabled = true;
  runBtn.classList.add("thinking");
  runBtn.textContent = "Running…";

  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, type: config.type, instructions, criteria }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);

    renderResult(config.type, resultEl, body);
  } catch (err) {
    errorSlot.innerHTML = `<div class="error-banner">${escapeHtml(err instanceof Error ? err.message : "Something went wrong.")}</div>`;
  } finally {
    runBtn.disabled = false;
    runBtn.classList.remove("thinking");
    runBtn.textContent = "Run against Jev";
  }
}

function renderResult(type: PrimitiveType, resultEl: HTMLDivElement, body: { answer: any; model: string }) {
  const { answer, model } = body;

  if (type === "choice") {
    const probs = answer.probabilities as Record<string, number>;
    const rows = Object.entries(probs)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([label, prob]) => `
        <div class="row">
          <span class="label">${escapeHtml(label)}</span>
          <div class="bar-track"><div class="bar-fill ${label === answer.choice ? "selected" : ""}" style="width:${Math.round(prob * 100)}%"></div></div>
          <span class="pct">${Math.round(prob * 100)}%</span>
        </div>
      `,
      )
      .join("");
    resultEl.innerHTML = `
      ${rows}
      <div class="verdict"><strong>choice: ${escapeHtml(answer.choice)}</strong> · confidence ${Math.round(answer.confidence * 100)}% · ${escapeHtml(model)}</div>
    `;
  } else if (type === "noul") {
    const pct = Math.round(answer.noul * 100);
    resultEl.innerHTML = `
      <div class="row">
        <span class="label">yes</span>
        <div class="bar-track"><div class="bar-fill selected" style="width:${pct}%"></div></div>
        <span class="pct">${pct}%</span>
      </div>
      <div class="verdict"><strong>noul: ${answer.noul.toFixed(3)}</strong> · ${escapeHtml(model)}</div>
    `;
  } else {
    const probs = answer.probabilities as Record<string, number>;
    const legend = answer.legend as Record<string, string>;
    const rows = Object.entries(probs)
      .map(
        ([level, prob]) => `
        <div class="row">
          <span class="label" title="${escapeHtml(legend[level] ?? "")}">${level} — ${escapeHtml((legend[level] ?? "").slice(0, 22))}${(legend[level] ?? "").length > 22 ? "…" : ""}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round(prob * 100)}%"></div></div>
          <span class="pct">${Math.round(prob * 100)}%</span>
        </div>
      `,
      )
      .join("");
    resultEl.innerHTML = `
      ${rows}
      <div class="verdict"><strong>score: ${answer.score.toFixed(2)}</strong> · confidence ${Math.round(answer.confidence * 100)}% · ${escapeHtml(model)}</div>
    `;
  }

  resultEl.classList.add("visible");
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
