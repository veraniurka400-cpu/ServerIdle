```javascript
const $ = id => document.getElementById(id);

const pages = ["home", "cloud", "ai", "games", "account"];

function showPage(page) {
  pages.forEach(name => {
    $(name).classList.toggle("show", name === page);
  });

  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("page-title").textContent = {
    home: "Panel principal",
    cloud: "Script Cloud",
    ai: "AI Generator",
    games: "Mis experiencias",
    account: "Cuenta / Whitelist"
  }[page];

  if (page === "cloud") loadScripts();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await response.json().catch(() => ({
    error: "No se pudo conectar con el servidor."
  }));

  if (!response.ok) {
    throw new Error(data.error || "Error de conexión");
  }

  return data;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function refreshMe() {
  try {
    const data = await api("/api/me");

    if (data.user) {
      $("user-label").textContent = data.user.display_name;
      $("account-info").textContent =
        `Sesión: ${data.user.email || data.user.display_name} · Roblox: ${data.user.roblox_name || "Sin vincular"}`;

      $("stat-account").textContent = "Conectada";
    } else {
      $("user-label").textContent = "Invitado";
      $("account-info").textContent =
        "Inicia sesión para publicar scripts y generar códigos.";

      $("stat-account").textContent = "Invitado";
    }
  } catch {
    $("user-label").textContent = "Modo web";
    $("stat-account").textContent = "Sin servidor";
  }
}

async function loadScripts() {
  try {
    const query = encodeURIComponent($("search").value || "");
    const scripts = await api("/api/scripts?q=" + query);

    $("stat-scripts").textContent = scripts.length;

    $("script-list").innerHTML = scripts.map(script => `
      <article class="script-card">
        ${script.image_url
          ? `<img src="${esc(script.image_url)}" alt="">`
          : ""}
        <small>${esc(script.kind)} · ${esc(script.author_name)}</small>
        <h3>${esc(script.title)}</h3>
        <p>${esc(script.description)}</p>
        <button class="ghost" data-script="${esc(script.id)}">
          Ver código
        </button>
      </article>
    `).join("") || `
      <p class="muted">Todavía no hay publicaciones.</p>
    `;

    document.querySelectorAll("[data-script]").forEach(button => {
      button.addEventListener("click", () => {
        viewScript(button.dataset.script);
      });
    });

  } catch {
    $("script-list").innerHTML = `
      <p class="muted">
        Script Cloud estará disponible cuando conectemos el servidor.
      </p>
    `;
  }
}

async function viewScript(id) {
  try {
    const script = await api("/api/scripts/" + encodeURIComponent(id));

    const windowCode = window.open("", "_blank");

    if (!windowCode) {
      alert("Permite las ventanas emergentes para ver el código.");
      return;
    }

    const pre = windowCode.document.createElement("pre");
    pre.textContent = script.code;
    pre.style.cssText =
      "white-space:pre-wrap;background:#0b0d14;color:#eee;padding:20px;";

    windowCode.document.body.style.background = "#0b0d14";
    windowCode.document.body.appendChild(pre);
    windowCode.document.title = script.title;

  } catch (error) {
    alert(error.message);
  }
}

$("search").addEventListener("input", loadScripts);

$("new-script").addEventListener("click", () => {
  $("publish").classList.remove("hidden");
  $("publish").scrollIntoView({ behavior: "smooth" });
});

$("cancel-publish").addEventListener("click", () => {
  $("publish").classList.add("hidden");
});

$("publish-btn").addEventListener("click", async () => {
  try {
    await api("/api/scripts", {
      method: "POST",
      body: JSON.stringify({
        title: $("s-title").value,
        description: $("s-desc").value,
        kind: $("s-kind").value,
        code: $("s-code").value,
        image_url: $("s-image").value || null
      })
    });

    $("publish-msg").textContent = "¡Publicado correctamente!";
    $("publish").classList.add("hidden");
    loadScripts();

  } catch (error) {
    $("publish-msg").textContent =
      "No se pudo publicar. Inicia sesión y conecta el servidor.";
  }
});

$("generate").addEventListener("click", () => {
  const prompt = $("ai-prompt").value.trim();

  if (!prompt) {
    $("ai-output").textContent = "Primero escribe qué quieres crear.";
    return;
  }

  $("ai-output").textContent =
`Actúa como desarrollador experto de Roblox Luau.

Tipo: ${$("ai-kind").value}

Solicitud:
${prompt}

Entrega código completo, explica dónde colocarlo y comprueba que sea para una experiencia propia.`;
});

$("make-code").addEventListener("click", async () => {
  try {
    const data = await api("/api/link-code", {
      method: "POST",
      body: "{}"
    });

    $("link-code").textContent = data.code;
    $("link-status").textContent =
      "Código válido durante 5 minutos.";

  } catch {
    $("link-status").textContent =
      "Primero debemos conectar el servidor.";
  }
});

$("load-games").addEventListener("click", async () => {
  try {
    const games = await api("/api/roblox/experiences");

    $("games-output").textContent =
      JSON.stringify(games, null, 2);

  } catch {
    $("games-output").textContent =
      "Conecta el servidor y configura Roblox Open Cloud para consultar tus experiencias.";
  }
});

$("logout").addEventListener("click", async () => {
  try {
    await api("/auth/logout", {
      method: "POST",
      body: "{}"
    });

    refreshMe();

  } catch {
    $("account-info").textContent =
      "No hay una sesión activa en este momento.";
  }
});

refreshMe();
loadScripts();
```
