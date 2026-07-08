/* =========================================================================
   MODO EDICIÓN — script compartido (solo para testing / pruebas)
   ---------------------------------------------------------------------
   Agrega un botón flotante semi-transparente ("✎ Editar") abajo a la
   derecha. Al hacer clic, todo el texto visible de la página se vuelve
   editable (contenteditable). Podés:

     - "Guardar"          → guarda los cambios en este navegador
                             (localStorage), para seguir probando.
     - "Descargar HTML"   → baja el archivo .html completo ya con tus
                             cambios, para reemplazar el archivo real.

   IMPORTANTE: por seguridad del navegador, ninguna página web puede
   escribir directamente sobre el archivo .html en el servidor. Por eso
   el flujo de trabajo es: editás acá → "Descargar HTML" → subís ese
   archivo descargado a tu hosting (reemplazando al viejo).

   CÓMO USARLO:
   Agregá esta línea justo antes de </body> en cada página que quieras
   poder editar (después de script.js):

     <script src="edit-mode.js"></script>

   Sacala (o comentala) cuando el sitio esté definitivo, para que los
   visitantes normales no vean el botón de edición.
   ========================================================================= */

(function () {
  const STORAGE_PREFIX = "ummep_edit_";
  const pageKey = STORAGE_PREFIX + location.pathname;

  const EDITABLE_SELECTOR = [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "span", "li", "a", "button",
    "label", "td", "th", "blockquote",
    "figcaption", "strong", "em", "small",
  ].join(",");

  // ── 1. ESTILOS ──────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.id = "ummep-edit-style";
  style.textContent = `
    #ummep-edit-btn {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
      max-width: 90vw;
    }
    .ummep-edit-toggle,
    .ummep-edit-action {
      opacity: 0.32;
      background: rgba(20, 30, 50, 0.85);
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 0.6rem 1.1rem;
      font-family: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      transition: opacity 0.2s ease, background 0.2s ease, transform 0.15s ease;
      white-space: nowrap;
    }
    #ummep-edit-btn:hover .ummep-edit-toggle,
    #ummep-edit-btn:hover .ummep-edit-action {
      opacity: 1;
    }
    .ummep-edit-toggle:hover,
    .ummep-edit-action:hover {
      transform: translateY(-2px);
    }
    .ummep-edit-toggle.is-active {
      background: rgba(190, 30, 45, 0.9);
      opacity: 0.85;
    }
    body.ummep-editing [data-ummep-editable="true"] {
      outline: 1px dashed rgba(190, 30, 45, 0.45);
      outline-offset: 3px;
      cursor: text;
      transition: outline-color 0.15s ease, background 0.15s ease;
    }
    body.ummep-editing [data-ummep-editable="true"]:hover {
      outline: 1px dashed rgba(190, 30, 45, 0.9);
      background: rgba(190, 30, 45, 0.06);
    }
    body.ummep-editing [data-ummep-editable="true"]:focus {
      outline: 2px solid rgba(190, 30, 45, 1);
      background: rgba(190, 30, 45, 0.08);
    }
    .ummep-edit-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(190, 30, 45, 0.92);
      color: #fff;
      text-align: center;
      font-size: 0.78rem;
      padding: 0.4rem;
      z-index: 9998;
      font-family: inherit;
    }
    .ummep-edit-flash {
      position: fixed;
      bottom: 5.2rem;
      right: 1.5rem;
      z-index: 9999;
      background: rgba(20, 30, 50, 0.92);
      color: #fff;
      padding: 0.6rem 1rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-family: inherit;
      opacity: 0;
      transition: opacity 0.3s ease;
      max-width: 260px;
    }
  `;
  document.head.appendChild(style);

  // ── 2. BOTÓN PRINCIPAL ────────────────────────────────────────────────
  const wrap = document.createElement("div");
  wrap.id = "ummep-edit-btn";
  wrap.innerHTML = `<button type="button" class="ummep-edit-toggle">✎ Editar</button>`;
  document.body.appendChild(wrap);

  const toggleBtn = wrap.querySelector(".ummep-edit-toggle");
  let editing = false;
  let banner = null;

  function isLeafTextEl(el) {
    if (el.closest("#ummep-edit-btn, script, style")) return false;
    if (!el.textContent.trim()) return false;
    // Si el elemento tiene adentro otro elemento editable, lo salteamos
    // (queremos el nodo más chico posible, no el contenedor entero).
    if (el.querySelector(EDITABLE_SELECTOR)) return false;
    return true;
  }

  function markEditable() {
    document.querySelectorAll(EDITABLE_SELECTOR).forEach((el) => {
      if (isLeafTextEl(el)) {
        el.setAttribute("data-ummep-editable", "true");
        el.setAttribute("contenteditable", "true");
      }
    });
  }

  function unmarkEditable() {
    document.querySelectorAll('[data-ummep-editable="true"]').forEach((el) => {
      el.removeAttribute("contenteditable");
      el.removeAttribute("data-ummep-editable");
    });
  }

  function enterEdit() {
    editing = true;
    document.body.classList.add("ummep-editing");
    markEditable();
    toggleBtn.textContent = "Salir de edición";
    toggleBtn.classList.add("is-active");

    banner = document.createElement("div");
    banner.className = "ummep-edit-banner";
    banner.textContent =
      "Modo edición activo — hacé clic en cualquier texto para modificarlo";
    document.body.appendChild(banner);

    if (!wrap.querySelector(".ummep-save")) {
      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "ummep-edit-action ummep-save";
      saveBtn.textContent = "Guardar";
      saveBtn.addEventListener("click", saveEdits);
      wrap.appendChild(saveBtn);

      const downloadBtn = document.createElement("button");
      downloadBtn.type = "button";
      downloadBtn.className = "ummep-edit-action ummep-download";
      downloadBtn.textContent = "Descargar HTML";
      downloadBtn.addEventListener("click", downloadHtml);
      wrap.appendChild(downloadBtn);
    }
  }

  function exitEdit() {
    editing = false;
    document.body.classList.remove("ummep-editing");
    unmarkEditable();
    toggleBtn.textContent = "✎ Editar";
    toggleBtn.classList.remove("is-active");
    if (banner) {
      banner.remove();
      banner = null;
    }
    wrap.querySelectorAll(".ummep-save, .ummep-download").forEach((b) => b.remove());
  }

  // ── 3. GUARDADO / DESCARGA ────────────────────────────────────────────
  function getCleanHtml() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll("[data-ummep-editable]").forEach((el) => {
      el.removeAttribute("contenteditable");
      el.removeAttribute("data-ummep-editable");
    });
    clone
      .querySelectorAll("#ummep-edit-btn, .ummep-edit-banner, .ummep-edit-flash, #ummep-edit-style")
      .forEach((el) => el.remove());
    return "<!doctype html>\n" + clone.outerHTML;
  }

  function saveEdits() {
    try {
      localStorage.setItem(pageKey, getCleanHtml());
      flashMessage("Guardado en este navegador ✓ (solo para probar)");
    } catch (e) {
      console.error(e);
      flashMessage("No se pudo guardar en este navegador");
    }
  }

  function downloadHtml() {
    const html = getCleanHtml();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = location.pathname.split("/").pop() || "pagina.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flashMessage("Descargando .html con tus cambios…");
  }

  function flashMessage(msg) {
    let el = document.querySelector(".ummep-edit-flash");
    if (!el) {
      el = document.createElement("div");
      el.className = "ummep-edit-flash";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.style.opacity = "0";
    }, 2500);
  }

  toggleBtn.addEventListener("click", () => {
    if (editing) exitEdit();
    else enterEdit();
  });

  // ── 4. RESTAURAR VERSIÓN GUARDADA (si existe) ────────────────────────
  function init() {
    if (localStorage.getItem(pageKey)) {
      const restoreBtn = document.createElement("button");
      restoreBtn.type = "button";
      restoreBtn.className = "ummep-edit-action";
      restoreBtn.textContent = "↺ Ver mi versión guardada";
      restoreBtn.addEventListener("click", () => {
        if (
          confirm(
            "Esto reemplaza la página actual (en tu navegador) por tu última versión guardada. ¿Continuar?"
          )
        ) {
          document.open();
          document.write(localStorage.getItem(pageKey));
          document.close();
        }
      });
      wrap.appendChild(restoreBtn);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
