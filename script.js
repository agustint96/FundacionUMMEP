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

/* =======================================================
   Scroll reveal
   =======================================================
   Detecta automáticamente los bloques de contenido de cada
   página (cualquier "container--N", secciones de programa/
   proyecto/recursos, tarjetas del equipo, columnas del
   footer, etc.) y los anima al entrar en el viewport con un
   IntersectionObserver. No hace falta tocar el HTML de cada
   página: alcanza con que las clases sigan el patrón que ya
   usa el sitio.
   ======================================================= */
function iniciarScrollReveal() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const CONTENEDORES = [
    '[class*="ontainer--"]', // container--N / Container--N (todas las páginas)
    ".programa-section",
    ".proyecto-section",
    ".ra-video-section",
    ".ra-podcast-section",
    ".equipo-grupo",
    ".footer-col",
  ].join(", ");

  // Contenedores que NO se deben tocar (hero rotativo de index, nav,
  // footer grande que ya tiene su propio formulario, etc.)
  const EXCLUIR = ["#inicio", ".hero-phase", ".site-nav", ".container--6"];

  // Dentro de cada contenedor, sólo se anima texto y botones/links —
  // nunca el contenedor en sí (así su fondo de color queda siempre
  // visible, sin parpadear ni desaparecer).
  const TEXTO_Y_BOTONES = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "li",
    "blockquote",
    "label",
    "a.btn",
    "a.banner-btn",
    "button",
    ".btn",
  ].join(", ");

  // Evitar animar elementos que ya están dentro de otro elemento
  // animado (ej: un <a> dentro de un <li>), para no duplicar el efecto.
  function elementosAnimables(contenedor) {
    const encontrados = Array.from(
      contenedor.querySelectorAll(TEXTO_Y_BOTONES),
    );
    return encontrados.filter(
      (el) => !encontrados.some((otro) => otro !== el && otro.contains(el)),
    );
  }

  const contenedores = new Set();
  document.querySelectorAll(CONTENEDORES).forEach((el) => {
    if (EXCLUIR.some((sel) => el.matches(sel) || el.closest(sel))) return;
    contenedores.add(el);
  });

  if (!contenedores.size) return;

  const observer = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        const contenedor = entrada.target;
        const hijos = elementosAnimables(contenedor);
        hijos.forEach((el, i) => {
          el.classList.add("reveal");
          if (i > 0) {
            const delay = Math.min(i * 0.08, 0.48);
            el.style.transitionDelay = `${delay}s`;
          }
          // Forzar reflow antes de agregar is-visible para que la
          // transición se dispare igual aunque el elemento se haya
          // agregado y revelado en el mismo frame.
          requestAnimationFrame(() => el.classList.add("is-visible"));
        });
        observer.unobserve(contenedor);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  contenedores.forEach((el) => observer.observe(el));
}

/* =======================================================
   Parallax de las olas del hero (index.html)
   =======================================================
   Las tres capas de olas (.hero-wave--far / --back / --front)
   se mueven en dos ejes:
     · Vertical (scroll): a distinta velocidad según la capa;
       la más lejana se mueve poco, la trasera un poco más.
       La delantera (blanca/crema) casi no se mueve para que
       siga sirviendo de "piso" estable donde se apoya el logo.
     · Horizontal (mouse): al mover el mouse dentro del hero,
       las capas se corren hacia los costados según qué tan
       lejos esté el cursor del centro — la más cercana
       (front) se mueve más que la lejana (far). Cada capa
       tiene ancho de sobra en CSS (.hero-wave) para que este
       movimiento nunca deje ver el borde.
   Solo corre en index.html (donde existe #inicio con las
   olas), el eje X solo con mouse real (no en touch), y todo
   se desactiva si el usuario prefiere menos animaciones.
   ======================================================= */
function iniciarParallaxOlas() {
  const hero = document.getElementById("inicio");
  if (!hero) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const capas = [
    {
      el: hero.querySelector(".hero-wave--far"),
      velocidadY: 0.12,
      velocidadX: 10,
    },
    {
      el: hero.querySelector(".hero-wave--back"),
      velocidadY: 0.22,
      velocidadX: 20,
    },
    {
      el: hero.querySelector(".hero-wave--front"),
      velocidadY: 0.03,
      velocidadX: 32,
    },
  ].filter((capa) => capa.el);

  if (!capas.length) return;

  let progresoScroll = 0; // 0→1, cuánto salió el hero de pantalla
  let ratioMouseX = 0; // -1→1, posición del cursor respecto al centro
  let renderPendiente = false;

  function render() {
    renderPendiente = false;
    const alturaHero = hero.offsetHeight || window.innerHeight;

    capas.forEach(({ el, velocidadY, velocidadX }) => {
      const y = progresoScroll * alturaHero * velocidadY;
      const x = ratioMouseX * velocidadX;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  }

  function pedirRender() {
    if (renderPendiente) return;
    renderPendiente = true;
    requestAnimationFrame(render);
  }

  function onScroll() {
    const alturaHero = hero.offsetHeight || window.innerHeight;
    progresoScroll = Math.min(Math.max(window.scrollY / alturaHero, 0), 1);
    pedirRender();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // ── movimiento horizontal con el mouse (solo dispositivos con puntero fino) ──
  const tieneMouse = window.matchMedia("(pointer: fine)").matches;

  if (tieneMouse) {
    function onMouseMove(e) {
      const rect = hero.getBoundingClientRect();
      const centroX = rect.left + rect.width / 2;
      // normalizado entre -1 (borde izquierdo) y 1 (borde derecho)
      ratioMouseX = Math.min(
        Math.max((e.clientX - centroX) / (rect.width / 2), -1),
        1,
      );
      pedirRender();
    }

    function onMouseLeave() {
      ratioMouseX = 0;
      pedirRender();
    }

    hero.addEventListener("mousemove", onMouseMove);
    hero.addEventListener("mouseleave", onMouseLeave);
  }

  onScroll();
}

/* =======================================================
   Envío del formulario de contacto.
   No hay backend conectado todavía: por ahora sólo evita el
   reload de la página y muestra una confirmación simple.
   Cuando tengan un endpoint, reemplazar el contenido de este
   listener por el fetch/POST correspondiente.
   ======================================================= */
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

  // ── Dropdown "Radio La Chispa" (botón flechita, solo mobile/tablet) ──
  links.querySelectorAll(".site-nav__item--dropdown").forEach((item) => {
    const toggle = item.querySelector(".site-nav__dropdown-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const abierto = item.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(abierto));
    });
  });

  // ── Marcar link activo según nombre de archivo ──
  const archivo = location.pathname.split("/").pop() || "index.html";
  const mapa = {
    "index.html": "principal",
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

  const esIndex = archivo === "index.html" || archivo === "Principal.html";

  // ── Páginas que NO son index: el nav arranca ocupando su lugar
  //    real en el flujo del documento, por encima del primer
  //    contenedor (header/banner). Recién al bajar un 80% de la
  //    altura de ese primer contenedor, el nav se "pinea" (se vuelve
  //    fixed) y a partir de ahí te sigue siempre arriba.
  // ──
  if (!esIndex) {
    nav.classList.remove("site-nav--hidden");
    nav.classList.add("site-nav--in-flow");

    const primerContenedor = nav.nextElementSibling;
    let pineado = false;

    const getUmbral80 = () => {
      if (primerContenedor) {
        // offsetTop del contenedor relativo al documento (el nav está
        // en flujo normal, así que esto ya contempla su propia altura).
        return primerContenedor.offsetTop + primerContenedor.offsetHeight * 0.8;
      }
      return window.innerHeight * 0.8;
    };

    const onScrollSimple = () => {
      const actual = window.scrollY;
      const umbral = getUmbral80();

      if (!pineado && actual >= umbral) {
        pineado = true;
        nav.classList.remove("site-nav--in-flow");
        nav.classList.add("site-nav--pinned");
      } else if (pineado && actual < umbral) {
        pineado = false;
        nav.classList.remove("site-nav--pinned");
        nav.classList.add("site-nav--in-flow");
      }

      nav.classList.toggle("is-scrolled", actual > 10);
    };

    window.addEventListener("scroll", onScrollSimple, { passive: true });
    onScrollSimple();

    return; // no aplicamos la lógica de esconder/mostrar de index.html
  }

  // ── El nav de index.html siempre arranca oculto.
  //
  //    Hay dos formas de que aparezca:
  //    1. Hover sobre la zona invisible del tope (sin delay).
  //    2. Al scrollear hacia abajo y cruzar el 90 % del container--1,
  //       el nav aparece por 1 segundo y luego se vuelve a ocultar
  //       (a menos que el mouse esté sobre la zona hover o el propio nav).
  // ──

  const FLASH_MS = 2000;

  let flashTimeoutId = null;
  let ultimoScrollY = window.scrollY;
  let hero90Cruzado = false;

  // hoverZone se declara PRIMERO para que ocultarNav pueda referenciarlo
  const hoverZone = document.createElement("div");
  hoverZone.className = "site-nav__hover-zone";
  document.body.appendChild(hoverZone);

  const mostrarNav = () => nav.classList.remove("site-nav--hidden");

  const menuAbierto = () => links.classList.contains("is-open");

  const ocultarNav = () => {
    if (hoverZone.matches(":hover") || nav.matches(":hover")) return;
    if (menuAbierto()) return; // no ocultar mientras el menú esté desplegado
    nav.classList.remove("is-expanded");
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

  const EXPANDED_THRESHOLD = 40; // px desde el tope para considerar "arriba del todo"

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

  // ── Overscroll hacia arriba: mostrar nav expandido ──
  // En desktop usamos wheel; en mobile usamos touchmove.
  // Solo se activa cuando ya estamos en scrollY === 0.

  let overScrollTimer = null;

  const mostrarExpandido = () => {
    if (window.scrollY > EXPANDED_THRESHOLD) return;
    cancelarFlash();
    nav.classList.remove("site-nav--hidden");
    clearTimeout(overScrollTimer);
    overScrollTimer = setTimeout(() => {
      ocultarNav();
    }, 2200);
  };

  // Wheel: delta negativo = scroll hacia arriba
  window.addEventListener(
    "wheel",
    (e) => {
      if (e.deltaY < -5 && window.scrollY < EXPANDED_THRESHOLD) {
        mostrarExpandido();
      }
    },
    { passive: true },
  );

  // Touch: dedo arrastrando hacia abajo = scroll hacia arriba
  let touchStartY = 0;
  window.addEventListener(
    "touchstart",
    (e) => {
      touchStartY = e.touches[0].clientY;
    },
    { passive: true },
  );
  window.addEventListener(
    "touchmove",
    (e) => {
      const delta = e.touches[0].clientY - touchStartY;
      if (delta > 30 && window.scrollY < EXPANDED_THRESHOLD) {
        mostrarExpandido();
      }
    },
    { passive: true },
  );

  // Al cerrar el menú mobile (burger), re-evaluar si el nav debe ocultarse
  burger.addEventListener("click", () => {
    if (!links.classList.contains("is-open")) {
      cancelarFlash();
      flashTimeoutId = setTimeout(ocultarNav, 300);
    }
  });

  const reocultarSiCorresponde = () => {
    if (!hoverZone.matches(":hover") && !nav.matches(":hover")) {
      cancelarFlash();
      flashTimeoutId = setTimeout(ocultarNav, FLASH_MS);
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
  iniciarParallaxOlas();
  iniciarFormularioContacto();
  iniciarNav();
  iniciarScrollReveal();
});
