interface StatsResponse {
  total: number;
  byType: { choice: number; noul: number; score: number };
  confidenceBuckets: { label: string; count: number }[];
  avgMsByType: { type: "choice" | "noul" | "score"; avgMs: number; count: number }[];
}

export function renderStatsSection(): string {
  return `
    <section id="stats">
      <h2>03 · What everyone's been running</h2>
      <div class="prose">
        <p>Live totals across every run made in this playground since the server last restarted — not just yours. This is what Jev's actual behavior looks like in aggregate: which primitive people reach for, how decisive its answers tend to be, and how fast each type responds.</p>
      </div>
      <div id="stats-content" class="stats-content">
        <div class="stats-loading">loading…</div>
      </div>
    </section>
  `;
}

export async function loadAndRenderStats() {
  const container = document.querySelector<HTMLDivElement>("#stats-content");
  if (!container) return;

  try {
    const res = await fetch("/api/stats");
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const data: StatsResponse = await res.json();
    container.innerHTML = renderStats(data);
  } catch (err) {
    container.innerHTML = `<div class="error-banner">Couldn't load stats: ${err instanceof Error ? err.message : "unknown error"}</div>`;
  }
}

function renderStats(data: StatsResponse): string {
  if (data.total === 0) {
    return `<div class="stats-empty">No runs yet — be the first. Run any panel above and these charts fill in.</div>`;
  }

  return `
    <div class="stats-grid">
      ${renderTypeChart(data)}
      ${renderConfidenceChart(data)}
      ${renderLatencyChart(data)}
    </div>
    <div class="stats-footnote">${data.total} run${data.total === 1 ? "" : "s"} recorded · resets when the demo server restarts</div>
  `;
}

function renderTypeChart(data: StatsResponse): string {
  const rows: { label: string; value: number }[] = [
    { label: "choice", value: data.byType.choice },
    { label: "noul", value: data.byType.noul },
    { label: "score", value: data.byType.score },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));

  return `
    <div class="stat-chart">
      <div class="stat-chart-title">Primitive mix</div>
      <div class="stat-chart-sub">which question type people run most</div>
      <div class="hbar-list">
        ${rows
          .map(
            (r) => `
          <div class="hbar-row">
            <span class="hbar-label">${r.label}</span>
            <div class="hbar-track"><div class="hbar-fill" style="width:${(r.value / max) * 100}%"></div></div>
            <span class="hbar-value">${r.value}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderConfidenceChart(data: StatsResponse): string {
  const max = Math.max(1, ...data.confidenceBuckets.map((b) => b.count));

  return `
    <div class="stat-chart">
      <div class="stat-chart-title">Confidence distribution</div>
      <div class="stat-chart-sub">how decisive Jev's answers have been</div>
      <div class="vbar-list">
        ${data.confidenceBuckets
          .map(
            (b) => `
          <div class="vbar-col">
            <span class="vbar-value">${b.count}</span>
            <div class="vbar-track"><div class="vbar-fill" style="height:${(b.count / max) * 100}%"></div></div>
            <span class="vbar-label">${b.label}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderLatencyChart(data: StatsResponse): string {
  const max = Math.max(1, ...data.avgMsByType.map((t) => t.avgMs));

  return `
    <div class="stat-chart">
      <div class="stat-chart-title">Avg response time</div>
      <div class="stat-chart-sub">milliseconds per primitive, this server</div>
      <div class="hbar-list">
        ${data.avgMsByType
          .map(
            (t) => `
          <div class="hbar-row">
            <span class="hbar-label">${t.type}</span>
            <div class="hbar-track"><div class="hbar-fill" style="width:${t.count ? (t.avgMs / max) * 100 : 0}%"></div></div>
            <span class="hbar-value">${t.count ? `${t.avgMs}ms` : "—"}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}
