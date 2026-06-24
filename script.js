/* =======================================================
   Fundación UMMEP — script.js
   ======================================================= */

/**
 * Hero de tres fases:
 *
 *  FASE 1 — grid de 3 columnas. Las imágenes entran una a una con stagger.
 *  FASE 2 — grupo de 4 columnas. Las 4 entran con stagger corto (grupo).
 *  FASE 3 — 4 fotos "solo": una cubre toda la pantalla a la vez, 1 × 1.
 *
 * Tiempos configurables:
 *   STAGGER_MS  → demora entre columnas al aparecer
 *   PHASE1_MS   → cuánto dura la fase 1 tras mostrarse la última columna
 *   PHASE2_MS   → cuánto dura la fase 2
 *   SOLO_MS     → cuánto dura cada foto individual en fase 3
 */
function iniciarRotacionHero() {
  const phase1 = document.getElementById("hero-phase-1");
  const phase2 = document.getElementById("hero-phase-2");
  const phase3 = document.getElementById("hero-phase-3");
  if (!phase1 || !phase2 || !phase3) return;

  const STAGGER_MS = 300;
  const PHASE1_MS = 2500;
  const PHASE2_MS = 2000;
  const SOLO_MS = 2800;

  // ── utilidades ─────────────────────────────────────────────────────────

  function esperar(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function activarFase(phase) {
    [phase1, phase2, phase3].forEach((p) => p.classList.remove("is-active"));
    phase.classList.add("is-active");
  }

  function ocultarColumnas(phase) {
    phase
      .querySelectorAll("img")
      .forEach((img) => img.classList.remove("is-visible"));
    phase
      .querySelectorAll(".hero-col")
      .forEach((col) => col.classList.remove("is-solo-active"));
  }

  function revelarColumnas(phase, stagger) {
    const cols = Array.from(phase.querySelectorAll(".hero-col"));
    return new Promise((resolve) => {
      cols.forEach((col, i) => {
        setTimeout(() => {
          const img = col.querySelector("img");
          if (img) img.classList.add("is-visible");
          if (i === cols.length - 1) resolve();
        }, i * stagger);
      });
    });
  }

  function reproducirSolo(phase) {
    const cols = Array.from(phase.querySelectorAll(".hero-col"));
    let idx = 0;
    return new Promise((resolve) => {
      function siguiente() {
        cols.forEach((c) => c.classList.remove("is-solo-active"));
        if (idx >= cols.length) {
          resolve();
          return;
        }
        cols[idx].classList.add("is-solo-active");
        idx++;
        if (idx < cols.length) setTimeout(siguiente, SOLO_MS);
        else setTimeout(resolve, SOLO_MS);
      }
      siguiente();
    });
  }

  // ── bucle principal ────────────────────────────────────────────────────

  async function bucle() {
    while (true) {
      // FASE 1
      ocultarColumnas(phase1);
      activarFase(phase1);
      await esperar(200);
      await revelarColumnas(phase1, STAGGER_MS);
      await esperar(PHASE1_MS);

      // FASE 2
      ocultarColumnas(phase2);
      activarFase(phase2);
      await esperar(200);
      await revelarColumnas(phase2, STAGGER_MS * 0.55);
      await esperar(PHASE2_MS);

      // FASE 3
      ocultarColumnas(phase3);
      activarFase(phase3);
      await esperar(200);
      await reproducirSolo(phase3);
      await esperar(600);
    }
  }

  bucle();
}

/**
 * Envío del formulario de contacto.
 * No hay backend conectado todavía: por ahora sólo evita el
 * reload de la página y muestra una confirmación simple.
 * Cuando tengan un endpoint, reemplazar el contenido de este
 * listener por el fetch/POST correspondiente.
 */
function iniciarFormularioContacto() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    form.reset();

    let aviso = form.querySelector(".form-aviso");
    if (!aviso) {
      aviso = document.createElement("p");
      aviso.className = "form-aviso";
      aviso.style.color = "var(--color-navy)";
      aviso.style.fontWeight = "700";
      form.appendChild(aviso);
    }
    aviso.textContent = "¡Gracias! Te vamos a responder a la brevedad.";
  });
}

/* =======================================================
   Navegación principal
   ======================================================= */
function iniciarNav() {
  const burger = document.getElementById("nav-burger");
  const links = document.getElementById("nav-links");
  const nav = document.querySelector(".site-nav");
  if (!burger || !links || !nav) return;

  // ── Toggle menú mobile ──
  burger.addEventListener("click", () => {
    const abierto = links.classList.toggle("is-open");
    burger.classList.toggle("is-open", abierto);
    burger.setAttribute("aria-expanded", String(abierto));
  });

  // Cerrar al hacer click en cualquier link (mobile)
  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    });
  });

  // ── Marcar link activo según nombre de archivo ──
  const archivo = location.pathname.split("/").pop() || "Principal.html";
  const mapa = {
    "Principal.html": "principal",
    "Nuestro_Trabajo.html": "nuestro-trabajo",
    "Novedades.html": "novedades",
    "Programas_internacionales.html": "programas",
    "Proyectos_de_coooperacion_al_desarrollo.html": "proyectos",
    "Recursos_audiovisuales.html": "recursos",
    "Radio_la_chispa.html": "radio",
    "Contacto.html": "contacto",
  };
  const clave = mapa[archivo];
  if (clave) {
    const link = links.querySelector(`[data-nav="${clave}"]`);
    if (link) link.classList.add("is-active");
  }

  // ── El nav siempre arranca oculto.
  //
  //    Hay dos formas de que aparezca:
  //    1. Hover sobre la zona invisible del tope (sin delay).
  //    2. Al scrollear hacia abajo y cruzar el 90 % del container--1,
  //       el nav aparece por 1 segundo y luego se vuelve a ocultar
  //       (a menos que el mouse esté sobre la zona hover o el propio nav).
  // ──

  const FLASH_MS = 1000;

  let flashTimeoutId = null;
  let ultimoScrollY = window.scrollY;
  let hero90Cruzado = false;

  // hoverZone se declara PRIMERO para que ocultarNav pueda referenciarlo
  const hoverZone = document.createElement("div");
  hoverZone.className = "site-nav__hover-zone";
  document.body.appendChild(hoverZone);

  const mostrarNav = () => nav.classList.remove("site-nav--hidden");

  const ocultarNav = () => {
    if (hoverZone.matches(":hover") || nav.matches(":hover")) return;
    nav.classList.add("site-nav--hidden");
  };

  const cancelarFlash = () => {
    if (flashTimeoutId) {
      clearTimeout(flashTimeoutId);
      flashTimeoutId = null;
    }
  };

  const getUmbral90 = () => {
    const hero = document.getElementById("inicio");
    if (hero) return hero.offsetTop + hero.offsetHeight * 0.9;
    return window.innerHeight * 0.9;
  };

  const onScroll = () => {
    const actual = window.scrollY;
    nav.classList.toggle("is-scrolled", actual > 10);

    const umbral = getUmbral90();
    const bajando = actual > ultimoScrollY;
    const pasoDel90 = actual >= umbral;

    if (bajando && pasoDel90 && !hero90Cruzado) {
      hero90Cruzado = true;
      cancelarFlash();
      mostrarNav();
      flashTimeoutId = setTimeout(ocultarNav, FLASH_MS);
    } else if (!pasoDel90) {
      hero90Cruzado = false;
      cancelarFlash();
      ocultarNav();
    }

    ultimoScrollY = actual;
  };

  window.addEventListener("scroll", onScroll, { passive: true });

  // Estado inicial: siempre oculto
  nav.classList.add("site-nav--hidden");

  const reocultarSiCorresponde = () => {
    if (!hoverZone.matches(":hover") && !nav.matches(":hover")) {
      cancelarFlash();
      nav.classList.add("site-nav--hidden");
    }
  };

  hoverZone.addEventListener("mouseenter", () => {
    cancelarFlash();
    mostrarNav();
  });
  hoverZone.addEventListener("mouseleave", reocultarSiCorresponde);
  nav.addEventListener("mouseleave", reocultarSiCorresponde);
}

document.addEventListener("DOMContentLoaded", () => {
  iniciarRotacionHero();
  iniciarFormularioContacto();
  iniciarNav();
});
