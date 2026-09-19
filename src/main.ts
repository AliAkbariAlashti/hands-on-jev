import "./style.css";
import { EXAMPLES, GROUPS, type Example, type PrimitiveType } from "./examples";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  ${renderHero()}
  ${renderDocsSection()}
  ${renderGallerySection()}
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
        judgment. Read how it works below, then run ${EXAMPLES.length} real examples —
        or edit any of them — against the live API.
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
        ${GROUPS.map(
          (g) => `
          <div class="cell">
            <div class="name">${g.label}</div>
            <p>${g.blurb}</p>
          </div>
        `,
        ).join("")}
      </div>
    </section>
  `;
}

function renderGallerySection(): string {
  return `
    <section id="playground">
      <h2>02 · Run it</h2>
      <div class="prose">
        <p>${EXAMPLES.length} examples across the three primitives. Click any card to open it, edit the state or criteria, and run it against the live Jev API — nothing here is mocked.</p>
      </div>
      ${GROUPS.map((g) => renderGalleryGroup(g.type, g.label)).join("")}
    </section>
  `;
}

function renderGalleryGroup(type: PrimitiveType, label: string): string {
  const items = EXAMPLES.filter((e) => e.type === type);
  return `
    <div class="gallery-group">
      <h3 class="gallery-group-title">${label}</h3>
      <div class="gallery-grid" data-gallery-grid="${type}">
        ${items.map((ex) => renderGalleryCard(ex)).join("")}
      </div>
    </div>
  `;
}

function renderGalleryCard(ex: Example): string {
  return `
    <div class="gallery-item">
      <button class="gallery-card" data-card="${ex.id}">
        <span class="gc-usecase">${escapeHtml(ex.useCase)}</span>
        <span class="gc-title">${escapeHtml(ex.title)}</span>
        <span class="gc-expand" data-expand-indicator="${ex.id}">+</span>
      </button>
      <div class="panel-slot" data-slot="${ex.id}"></div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

const DEFAULT_OPEN = new Set(["choice-support-routing", "noul-human-escalation", "score-bug-severity"]);
const openPanels = new Set<string>();

document.querySelectorAll<HTMLButtonElement>("[data-card]").forEach((card) => {
  const id = card.dataset.card!;
  card.addEventListener("click", () => togglePanel(id));
});

for (const id of DEFAULT_OPEN) {
  openPanel(id);
}

function togglePanel(id: string) {
  if (openPanels.has(id)) {
    closePanel(id);
  } else {
    openPanel(id);
  }
}

function openPanel(id: string) {
  const example = EXAMPLES.find((e) => e.id === id);
  if (!example) return;
  const slot = document.querySelector<HTMLDivElement>(`[data-slot="${id}"]`);
  const indicator = document.querySelector<HTMLSpanElement>(`[data-expand-indicator="${id}"]`);
  const card = document.querySelector<HTMLButtonElement>(`[data-card="${id}"]`);
  if (!slot || openPanels.has(id)) return;

  slot.innerHTML = renderPanel(example);
  wirePanel(example);
  openPanels.add(id);
  if (indicator) indicator.textContent = "−";
  card?.classList.add("active");
}

function closePanel(id: string) {
  const slot = document.querySelector<HTMLDivElement>(`[data-slot="${id}"]`);
  const indicator = document.querySelector<HTMLSpanElement>(`[data-expand-indicator="${id}"]`);
  const card = document.querySelector<HTMLButtonElement>(`[data-card="${id}"]`);
  if (!slot) return;
  slot.innerHTML = "";
  openPanels.delete(id);
  if (indicator) indicator.textContent = "+";
  card?.classList.remove("active");
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
// Panel rendering (state/instructions/criteria editor + run + result)
// ---------------------------------------------------------------------------

function renderPanel(config: Example): string {
  return `
    <div class="panel" data-panel="${config.id}">
      <div class="panel-head">
        <span class="title">${escapeHtml(config.title)}</span>
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

function renderCriteriaFields(config: Example): string {
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

function wirePanel(config: Example) {
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

async function runPanel(config: Example, panelEl: HTMLDivElement, runBtn: HTMLButtonElement) {
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
