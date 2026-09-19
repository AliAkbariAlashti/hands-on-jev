import type { Example, PrimitiveType } from "./examples";

export function renderPanel(config: Example): string {
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

export function wirePanel(config: Example) {
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

  const state = panelEl.querySelector<HTMLTextAreaElement>(`#${config.id}-state`)!.value;
  const instructions = panelEl.querySelector<HTMLTextAreaElement>(`#${config.id}-instructions`)!.value;

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
    const trueDesc = panelEl.querySelector<HTMLTextAreaElement>(`#${config.id}-true`)!.value.trim();
    const falseDesc = panelEl.querySelector<HTMLTextAreaElement>(`#${config.id}-false`)!.value.trim();
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
    document.dispatchEvent(new CustomEvent("jev:run-complete"));
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

export function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
