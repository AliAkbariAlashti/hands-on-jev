export function renderNav(active: "home" | "projects"): string {
  return `
    <nav class="sitenav">
      <a href="/" class="brand">hands-on-jev</a>
      <div class="links">
        <a href="/" class="${active === "home" ? "active" : ""}">playground</a>
        <a href="/projects/" class="${active === "projects" ? "active" : ""}">projects</a>
      </div>
    </nav>
  `;
}
