import "../src/style.css";
import "./projects.css";
import mermaid from "mermaid";
import { renderNav } from "../src/nav";
import { renderPanel, wirePanel, escapeHtml } from "../src/panel";
import { PROJECTS, type ProjectSpec } from "./data";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    background: "#ffffff",
    primaryColor: "#ffffff",
    primaryTextColor: "#111111",
    primaryBorderColor: "#1a1a1a",
    lineColor: "#1a1a1a",
    secondaryColor: "#f5f5f5",
    tertiaryColor: "#fafafa",
    fontFamily: "IBM Plex Mono, SFMono-Regular, Consolas, monospace",
    fontSize: "13px",
    clusterBkg: "#fafafa",
    clusterBorder: "#1a1a1a",
    edgeLabelBackground: "#ffffff",
  },
  flowchart: {
    curve: "linear",
    padding: 16,
  },
  securityLevel: "strict",
});

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  ${renderNav("projects")}
  <div class="page-shell">
    ${renderHero()}
    ${PROJECTS.map((p) => renderProjectShell(p)).join("")}
  </div>
  ${renderFooter()}
`;

function renderHero(): string {
  return `
    <header class="hero">
      <div class="meta">ARCHITECTURE<br />CONCEPTS<br />NOT SHIPPED</div>
      <div class="tag">projects</div>
      <h1>Systems I'd build<br />with Jev.</h1>
      <p>
        Three architecture concepts, not finished products — designs for where a "System One" model
        earns its place in a real pipeline, and where it explicitly doesn't (code still owns the
        workflow, thresholds, and everything downstream of a judgment). Each one has runnable examples
        using its actual questions, live against the API.
      </p>
    </header>
  `;
}

function renderProjectShell(p: ProjectSpec): string {
  return `
    <section class="project" id="${p.id}">
      <div class="project-head">
        <span class="status-badge">${p.status}</span>
        <h2>${escapeHtml(p.title)}</h2>
        <p class="one-liner">${escapeHtml(p.oneLiner)}</p>
      </div>

      <div class="project-block">
        <h3>Problem</h3>
        <p>${escapeHtml(p.problem)}</p>
      </div>

      <div class="project-block">
        <h3>Approach</h3>
        <p>${escapeHtml(p.approach)}</p>
      </div>

      <div class="project-block">
        <h3>Architecture</h3>
        <div class="diagram" data-diagram-id="${p.id}"></div>
      </div>

      <div class="project-block">
        <h3>Where Jev fits</h3>
        <table class="jev-role-table">
          <thead>
            <tr><th>Question</th><th>Primitive</th><th>Used for</th></tr>
          </thead>
          <tbody>
            ${p.jevRole
              .map(
                (r) => `
              <tr>
                <td>${escapeHtml(r.question)}</td>
                <td><span class="type-pill">${r.primitive}</span></td>
                <td>${escapeHtml(r.purpose)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="project-block">
        <h3>Design notes</h3>
        <ul class="notes-list">
          ${p.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}
        </ul>
      </div>

      <div class="project-block">
        <h3>Try it</h3>
        <p class="examples-intro">These run the questions above against the live Jev API with this project's example state. Edit anything and re-run.</p>
        <div class="example-panels">
          ${p.examples.map((ex) => renderPanel(ex)).join("")}
        </div>
      </div>
    </section>
  `;
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

async function renderDiagrams() {
  for (const p of PROJECTS) {
    const el = document.querySelector<HTMLDivElement>(`[data-diagram-id="${p.id}"]`);
    if (!el) continue;
    try {
      const { svg } = await mermaid.render(`mermaid-${p.id}`, p.diagram);
      el.innerHTML = svg;
    } catch (err) {
      console.error(`Failed to render diagram for ${p.id}:`, err);
      el.innerHTML = `<div class="error-banner">Diagram failed to render.</div>`;
    }
  }
}

function wireExamplePanels() {
  for (const p of PROJECTS) {
    for (const ex of p.examples) {
      wirePanel(ex);
    }
  }
}

renderDiagrams();
wireExamplePanels();
