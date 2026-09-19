import "./style.css";
import { EXAMPLES, GROUPS, type Example, type PrimitiveType } from "./examples";
import { renderNav } from "./nav";
import { renderPanel, wirePanel, escapeHtml } from "./panel";
import { renderStatsSection, loadAndRenderStats } from "./stats";

const app = document.querySelector<HTMLDivElement>("#app")!;

const HERO_STATE_DEFAULT = "Hey, loved the last update! Any chance you could add dark mode next?";
const HERO_INSTRUCTIONS = "Does this message require a support reply, or is it just feedback?";

app.innerHTML = `
  ${renderNav("home")}
  <div class="page-shell">
    ${renderHero()}
    ${renderDocsSection()}
    ${renderGallerySection()}
    ${renderStatsSection()}
  </div>
  ${renderFooter()}
`;

loadAndRenderStats();
document.addEventListener("jev:run-complete", () => loadAndRenderStats());
wireHeroTry();

function renderHero(): string {
  return `
    <header class="hero">
      <div class="hero-grid">
        <div class="hero-left">
          <div class="tag">hands-on-jev</div>
          <h1>Learn Jev by<br />running it.</h1>
          <p>
            Jev is TypeSafe's "System One" model: instead of writing back text, it answers
            narrow questions about your <code>state</code> with a typed, probability-scored
            judgment. Read how it works below, then run ${EXAMPLES.length} real examples —
            or edit any of them — against the live API.
          </p>
        </div>
        <div class="hero-right">
          <div class="meta">JEV · SYSTEM ONE · TRY IT NOW</div>
          ${renderHeroTry()}
        </div>
      </div>
    </header>
  `;
}

function renderHeroTry(): string {
  return `
    <div class="hero-try">
      <div class="field">
        <label for="hero-try-state">state</label>
        <textarea id="hero-try-state" rows="3">${escapeHtml(HERO_STATE_DEFAULT)}</textarea>
      </div>
      <div class="hero-try-question">
        <span class="hero-try-q-label">noul</span>
        <span>${escapeHtml(HERO_INSTRUCTIONS)}</span>
      </div>
      <div class="actions">
        <button class="run" id="hero-try-run">Run against Jev</button>
      </div>
      <div class="error-slot" id="hero-try-error"></div>
      <div class="result" id="hero-try-result"></div>
    </div>
  `;
}

function wireHeroTry() {
  const stateEl = document.querySelector<HTMLTextAreaElement>("#hero-try-state")!;
  const runBtn = document.querySelector<HTMLButtonElement>("#hero-try-run")!;
  const errorSlot = document.querySelector<HTMLDivElement>("#hero-try-error")!;
  const resultEl = document.querySelector<HTMLDivElement>("#hero-try-result")!;

  runBtn.addEventListener("click", async () => {
    const state = stateEl.value.trim();
    errorSlot.innerHTML = "";
    resultEl.classList.remove("visible");
    if (!state) {
      errorSlot.innerHTML = `<div class="error-banner">Type something first.</div>`;
      return;
    }

    runBtn.disabled = true;
    runBtn.classList.add("thinking");
    runBtn.textContent = "Running…";

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          type: "noul",
          instructions: HERO_INSTRUCTIONS,
          criteria: { true: "Needs a human support reply", false: "Just feedback or a compliment" },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);

      const pct = Math.round(body.answer.noul * 100);
      resultEl.innerHTML = `
        <div class="row">
          <span class="label">needs reply</span>
          <div class="bar-track"><div class="bar-fill selected" style="width:${pct}%"></div></div>
          <span class="pct">${pct}%</span>
        </div>
        <div class="verdict"><strong>noul: ${body.answer.noul.toFixed(3)}</strong> · ${escapeHtml(body.model)}</div>
      `;
      resultEl.classList.add("visible");
      document.dispatchEvent(new CustomEvent("jev:run-complete"));
    } catch (err) {
      errorSlot.innerHTML = `<div class="error-banner">${escapeHtml(err instanceof Error ? err.message : "Something went wrong.")}</div>`;
    } finally {
      runBtn.disabled = false;
      runBtn.classList.remove("thinking");
      runBtn.textContent = "Run against Jev";
    }
  });
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
  openGalleryPanel(id);
}

function togglePanel(id: string) {
  if (openPanels.has(id)) {
    closeGalleryPanel(id);
  } else {
    openGalleryPanel(id);
  }
}

function openGalleryPanel(id: string) {
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

function closeGalleryPanel(id: string) {
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
      <div class="page-shell footer-inner">
        <span>built with the <a href="https://docs.typesafe.ai" target="_blank" rel="noopener">TypeSafe</a> Jev model</span>
        <span><a href="https://github.com" target="_blank" rel="noopener">source on GitHub</a></span>
      </div>
    </footer>
  `;
}
