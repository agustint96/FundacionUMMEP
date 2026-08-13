/* =======================================================
   Fundación UMMEP — script.js
   ======================================================= */

/**
 * Hero de tres fases:
 *
 *  FASE 1 — grid de 3 columnas. Las imágenes CAEN desde arriba, una a una.
 *  FASE 2 — grupo de 4 columnas. Caen una a una, con stagger más corto.
 *  FASE 3 — 4 fotos "solo": una cubre toda la pantalla a la vez, cae 1 × 1.
 *
 * Cada foto tarda 1 segundo en caer a su lugar (ver DROP_MS / CSS).
 *
 * Tiempos configurables:
 *   STAGGER_MS  → demora entre columnas al empezar a caer
 *   PHASE1_MS   → cuánto dura la fase 1 tras caer la última columna
 *   PHASE2_MS   → cuánto dura la fase 2
 *   SOLO_MS     → cuánto dura cada foto individual en fase 3
 */
function iniciarRotacionHero() {
  const phase1 = document.getElementById("hero-phase-1");
  const phase2 = document.getElementById("hero-phase-2");
  const phase3 = document.getElementById("hero-phase-3");
  if (!phase1 || !phase2 || !phase3) return;

  const STAGGER_MS = 220;
  const PHASE1_MS = 1800;
  const PHASE2_MS = 1400;
  const SOLO_MS = 2000;

  // ── utilidades ─────────────────────────────────────────────────────────

  function esperar(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // La animación de "aparece en blanco y negro y se va coloreando" (ver
  // CSS: @keyframes heroPhotoReveal) corre por tiempo apenas se agrega
  // la clase "is-visible" — no espera a que la foto esté realmente
  // pintada en pantalla. Como son fotos pesadas y algunas tienen
  // loading="lazy", si agregáramos la clase por reloj (setTimeout) nomás,
  // podía pasar que para cuando la imagen recién terminaba de bajar/
  // decodificar, la animación ya había terminado "de fondo" — y la foto
  // aparecía directamente a color, sin blanco y negro visible. Por eso
  // esta función espera a que la imagen esté lista (decode() o el
  // evento "load") antes de agregar la clase, así el efecto siempre
  // arranca justo cuando la foto se empieza a ver.
  function revelarImagen(img) {
    if (!img) return Promise.resolve();
    const activar = () => img.classList.add("is-visible");

    if (img.complete && img.naturalWidth > 0) {
      activar();
      return Promise.resolve();
    }
    if (typeof img.decode === "function") {
      return img
        .decode()
        .catch(() => {})
        .then(activar);
    }
    return new Promise((resolve) => {
      const onReady = () => {
        activar();
        resolve();
      };
      img.addEventListener("load", onReady, { once: true });
      img.addEventListener("error", onReady, { once: true });
    });
  }

  // La fase que se activa ahora pasa a estar "arriba" (z-index 2) y el
  // resto vuelve a "abajo" (z-index 1). Son solo 2 valores fijos —nunca
  // un contador que crezca— para que las fotos jamás puedan terminar
  // por encima de las waves (que usan z-index bien más alto, ver CSS).
  function activarFase(phase) {
    [phase1, phase2, phase3].forEach((p) => {
      p.classList.remove("is-active");
      p.style.zIndex = 1;
    });
    phase.classList.add("is-active");
    phase.style.zIndex = 2;
  }

  function ocultarColumnas(phase) {
    phase
      .querySelectorAll("img")
      .forEach((img) => img.classList.remove("is-visible"));
    phase.querySelectorAll(".hero-col").forEach((col) => {
      col.style.zIndex = "";
    });
  }

  function revelarColumnas(phase, stagger) {
    const cols = Array.from(phase.querySelectorAll(".hero-col"));
    return new Promise((resolve) => {
      cols.forEach((col, i) => {
        setTimeout(() => {
          const img = col.querySelector("img");
          revelarImagen(img);
          if (i === cols.length - 1) resolve();
        }, i * stagger);
      });
    });
  }

  // FASE 3: cada foto CAE desde arriba, una por vez, y queda tapando a
  // la anterior (que se queda quieta, abajo). z-index local que solo
  // sube dentro de esta reproducción, para que el orden de apilamiento
  // siempre respete el orden de entrada.
  function reproducirSolo(phase) {
    const cols = Array.from(phase.querySelectorAll(".hero-col"));
    let zLocal = 1;
    let idx = 0;
    return new Promise((resolve) => {
      function siguiente() {
        if (idx >= cols.length) {
          resolve();
          return;
        }
        const col = cols[idx];
        col.style.zIndex = ++zLocal;
        const img = col.querySelector("img");
        revelarImagen(img);
        idx++;
        if (idx < cols.length) setTimeout(siguiente, SOLO_MS);
        else setTimeout(resolve, SOLO_MS);
      }
      siguiente();
    });
  }

  // ── bucle principal ────────────────────────────────────────────────────
  //
  // Por cada fase: 1) se resetea (mientras está tapada por la fase de
  // arriba, así el reset nunca se ve), 2) pasa a ser la de arriba
  // (z-index), 3) recién ahí se revelan sus fotos una por una. Como
  // queda arriba de la fase anterior —que sigue ahí, sin tocarse—, lo
  // que se ve mientras cada foto entra es siempre la otra foto, nunca
  // un color de fondo.

  async function bucle() {
    while (true) {
      // FASE 1 — grid de 3, entran una a una
      ocultarColumnas(phase1);
      activarFase(phase1);
      await revelarColumnas(phase1, STAGGER_MS);
      await esperar(PHASE1_MS);

      // FASE 2 — grupo de 4
      ocultarColumnas(phase2);
      activarFase(phase2);
      await revelarColumnas(phase2, STAGGER_MS * 0.55);
      await esperar(PHASE2_MS);

      // FASE 3 — 4 fotos individuales, pantalla completa de a una
      ocultarColumnas(phase3);
      activarFase(phase3);
      await esperar(80);
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
  return;

  const CONTENEDORES = [
    '[class*="ontainer--"]', // container--N / Container--N (todas las páginas)
    ".programa-section",
    ".proyecto-section",
    ".ra-video-section",
    ".ra-podcast-section",
    ".equipo-grupo",
    ".footer-col",
    // Contacto.html
    ".contacto-main",
    // Radio_la_chispa.html
    ".chispa-about",
    ".chispa-live",
    ".chispa-programs",
    // Novedad.html
    ".novedad-article",
    ".sidebar-block",
    ".sidebar-donate",
  ].join(", ");

  // Contenedores que NO se deben tocar (hero rotativo de index, nav,
  // footer grande que ya tiene su propio formulario, etc.)
  const EXCLUIR = ["#inicio", ".hero-phase", ".site-nav", ".container--6"];

  // Dentro de cada contenedor, se animan los bloques de contenido de
  // forma sutil: texto, botones, imágenes y media. El contenedor en sí
  // no se mueve para que el fondo siga visible y el efecto se sienta más
  // elegante que agresivo.
  const ELEMENTOS_REVEAL = [
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
    "img",
    "picture",
    "figure",
    "figcaption",
    "iframe",
    "video",
    "audio",
    ".ra-video-card",
    ".ra-podcast-card",
    ".card",
    ".news-card",
    ".equipo-card",
    ".media",
  ].join(", ");

  // Evitar animar elementos que ya están dentro de otro elemento
  // animado (ej: un <a> dentro de un <li>), para no duplicar el efecto.
  function elementosAnimables(contenedor) {
    const encontrados = Array.from(
      contenedor.querySelectorAll(ELEMENTOS_REVEAL),
    );
    return encontrados.filter(
      (el) => !encontrados.some((otro) => otro !== el && otro.contains(el)),
    );
  }

  function aplicarRevealAElemento(el, index = 0) {
    if (!el || el.classList.contains("reveal")) return;

    // Títulos entran desde abajo; el resto alterna izquierda/derecha
    // para que el efecto "desde el costado" se note bien.
    const esTitulo = /^H[1-6]$/.test(el.tagName);
    const direccion = esTitulo
      ? "reveal--up"
      : index % 2 === 0
        ? "reveal--left"
        : "reveal--right";

    // Paso 1: aplicar el estado OCULTO sin transición (snap instantáneo),
    // para forzar que el navegador lo pinte antes de animar. Si no se hace
    // esto, a veces el navegador funde el estado oculto y el visible en el
    // mismo frame y el elemento "aparece" sin deslizarse.
    el.style.transition = "none";
    el.classList.add("reveal", direccion);
    void el.offsetWidth; // fuerza el reflow/pintado del estado oculto

    // Paso 2: reactivar la transición y, en el siguiente frame, agregar
    // is-visible para que la animación se vea de verdad.
    const delay = Math.min(index * 0.08, 0.32);
    requestAnimationFrame(() => {
      el.style.transition = "";
      el.style.transitionDelay = `${delay}s`;
      requestAnimationFrame(() => el.classList.add("is-visible"));
    });
  }

  function procesarContenedor(contenedor) {
    if (!contenedor) return;
    const hijos = elementosAnimables(contenedor);
    if (hijos.length) {
      hijos.forEach((el, i) => aplicarRevealAElemento(el, i));
      return;
    }
    aplicarRevealAElemento(contenedor, 0);
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
        procesarContenedor(contenedor);
        observer.unobserve(contenedor);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  const reactivarObserver = () => {
    document.querySelectorAll(CONTENEDORES).forEach((el) => {
      if (EXCLUIR.some((sel) => el.matches(sel) || el.closest(sel))) return;
      if (!el.classList.contains("reveal")) {
        observer.observe(el);
      }
    });
  };

  contenedores.forEach((el) => observer.observe(el));
  window.addEventListener("load", () => {
    setTimeout(reactivarObserver, 300);
    setTimeout(reactivarObserver, 900);
  });

  const mutacion = new MutationObserver(() => {
    requestAnimationFrame(reactivarObserver);
  });
  mutacion.observe(document.body, { childList: true, subtree: true });
}

/* =======================================================
   "Efecto billetera" del hero (index.html)
   =======================================================
   La ola azul y la roja quedan FIJAS (sin parallax de mouse
   ni de scroll) en la posición y rotación que ya define
   styles.css (.hero-wave-card--far / --back). El único
   movimiento es al pasar el mouse por encima de cada una:
     · Hover en la azul: la roja se corre para abajo y se
       esconde un poco más, dejando ver más azul — pero la
       azul sigue SIEMPRE por detrás de la roja (nunca cambia
       el orden de apilamiento).
     · Hover en la roja: solo se acomoda un poco hacia arriba,
       pero nunca pasa por delante de la blanca.
   Se desactiva si el usuario prefiere menos animaciones.
   ======================================================= */
function iniciarHoverOlas() {
  const navy = document.getElementById("hero-wave-navy");
  const red = document.getElementById("hero-wave-red");
  if (!navy || !red) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const BASE_NAVY = "rotate(-3deg) translateX(-14px)";
  const BASE_RED = "rotate(2.5deg) translateX(10px)";

  navy.addEventListener("mouseenter", () => {
    navy.style.transform = `${BASE_NAVY} translateY(-6px)`;
    red.style.transform = `${BASE_RED} translateY(28px)`;
  });
  navy.addEventListener("mouseleave", () => {
    navy.style.transform = `${BASE_NAVY} translateY(0)`;
    red.style.transform = `${BASE_RED} translateY(0)`;
  });

  red.addEventListener("mouseenter", () => {
    red.style.transform = `${BASE_RED} translateY(-6px)`;
  });
  red.addEventListener("mouseleave", () => {
    red.style.transform = `${BASE_RED} translateY(0)`;
  });
}

/* =======================================================
   Envío del formulario de contacto.
   No hay backend conectado todavía: por ahora sólo evita el
   reload de la página y muestra una confirmación simple.
   Cuando tengan un endpoint, reemplazar el contenido de este
   listener por el fetch/POST correspondiente.
   ======================================================= */
function iniciarParallaxRecursosAudiovisuales() {
  const zona = document.querySelector(".ra-filmstrip-zone");
  const capa = document.querySelector(".ra-filmstrip-layer--moving");
  if (!zona || !capa) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let rafId = null;
  let offsetPersistente = 0;
  // Valor que realmente se aplica a la tira. Nunca salta directo al
  // valor objetivo: lo persigue de a poco cada frame (suavizado/lerp),
  // así un salto brusco de scroll (p.ej. el rebote elástico del
  // overscroll arriba de todo) se ve como un deslizamiento suave y no
  // como un tirón.
  let offsetActual = 0;
  const maxOffset = 220;
  const suavizado = 0.12; // 0-1: más chico = más suave (y más lento)

  function calcularObjetivo() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    // Dejamos un rango un poco más amplio que 0-1 (antes era -0.3 a 1.3)
    // para que el movimiento en el overscroll se siga notando —si no,
    // casi no se ve nada al estar arriba/abajo del todo—, pero más
    // acotado que el original para no exagerarlo. Como el valor final
    // se aplica con suavizado (más abajo), aunque este objetivo salte
    // de golpe durante el rebote, lo que se ve en pantalla es siempre
    // un deslizamiento parejo, nunca un tirón.
    const progreso = Math.min(Math.max(scrollTop / maxScroll, -0.15), 1.15);
    const base = (progreso - 0.5) * maxOffset * 2;
    return base + offsetPersistente;
  }

  function actualizar() {
    const objetivo = calcularObjetivo();
    offsetActual += (objetivo - offsetActual) * suavizado;
    offsetPersistente *= 0.92;

    zona.style.setProperty("--ra-film-offset", `${offsetActual}px`);
    capa.style.transform = `translate3d(0, ${offsetActual}px, 0)`;

    // Seguimos animando mientras falte "alcanzar" al objetivo o quede
    // envión del wheel, aunque no haya nuevos eventos de scroll (si no,
    // el suavizado se cortaría a mitad de camino).
    const faltaLlegar = Math.abs(objetivo - offsetActual) > 0.05;
    const quedaEnvion = Math.abs(offsetPersistente) > 0.05;
    if (faltaLlegar || quedaEnvion) {
      rafId = requestAnimationFrame(actualizar);
    } else {
      rafId = null;
    }
  }

  function pedirActualizacion() {
    if (rafId) return;
    rafId = requestAnimationFrame(actualizar);
  }

  window.addEventListener("scroll", pedirActualizacion, { passive: true });
  window.addEventListener(
    "wheel",
    (evento) => {
      offsetPersistente += evento.deltaY * 0.08;
      offsetPersistente = Math.max(
        -maxOffset,
        Math.min(maxOffset, offsetPersistente),
      );
      pedirActualizacion();
    },
    { passive: true },
  );
  window.addEventListener("resize", pedirActualizacion);
  pedirActualizacion();
}

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

  // En mobile no existe la hoverZone (no hay mouse), así que el nav
  // necesita otra forma de aparecer al scrollear hacia arriba en
  // cualquier punto de la página, no solo en el overscroll del tope.
  const esMobileNav = () => window.matchMedia("(max-width: 1320px)").matches;

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
    } else if (!bajando && pasoDel90 && esMobileNav()) {
      // Mobile: al scrollear hacia arriba, el nav aparece brevemente
      // y se vuelve a ocultar (equivalente móvil de la hoverZone).
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

/* =========================================================================
   CUADRÍCULA HERO MOBILE — pausar animación cuando no se ve
   ---------------------------------------------------------------------
   La cuadrícula de 36 fotos anima filter:grayscale de forma infinita.
   Eso tiene un costo de CPU/batería constante mientras esté animando,
   así que la pausamos en dos casos:
     1. Cuando el usuario scrollea y la cuadrícula sale de pantalla
        (IntersectionObserver).
     2. Cuando la pestaña pasa a segundo plano (Page Visibility API).
   Vuelve a animarse sola apenas la cuadrícula reaparece en pantalla o
   la pestaña vuelve a estar activa.
   ========================================================================= */
function iniciarPausaHeroGrid() {
  const grid = document.getElementById("hero-mobile-grid");
  if (!grid) return;

  let enPantalla = true;

  function actualizarEstado() {
    const debePausar = !enPantalla || document.hidden;
    grid.classList.toggle("is-paused", debePausar);
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          enPantalla = entry.isIntersecting;
          actualizarEstado();
        });
      },
      { threshold: 0 },
    );
    observer.observe(grid);
  }

  document.addEventListener("visibilitychange", actualizarEstado);
}

/* =========================================================================
   FOOTER — mini cuadrícula de fotitos (efecto decorativo)
   ---------------------------------------------------------------------
   El footer tiene 3 columnas (Redes / Contacto / Formulario) pero la
   fila mide lo que mide la columna del formulario, que es la más alta.
   Eso deja un espacio en blanco abajo del logo (columna 1) y abajo del
   texto de contacto (columna 2, justo a la izquierda del botón Enviar).
   En mobile el formulario se oculta y esas columnas quedan angostas,
   así que sobra espacio a la derecha en vez de abajo.

   Esta función arma esa mini cuadrícula "a mano" con JS (usando las
   mismas fotos del hero mobile) y la inserta en esas dos columnas. Al
   no tocar el HTML de cada página, aparece sola en el footer de TODAS
   las páginas del sitio con solo este archivo. El posicionamiento
   (abajo en desktop, a la derecha en mobile) se resuelve en CSS.

   La animación (iniciarCicloMosaicos, más abajo) va revelando las
   fotitos de a una, en orden random, hasta cubrir toda la cuadrícula;
   ahí se queda un instante y las esconde todas juntas para volver a
   arrancar con otro orden random.
   ========================================================================= */
function iniciarFooterMosaico() {
  const FOTOS = [
    "imagenes/thumbs/Izq.webp",
    "imagenes/thumbs/Medio.webp",
    "imagenes/thumbs/Der.webp",
    "imagenes/thumbs/Izq_1.webp",
    "imagenes/thumbs/Izq_2.webp",
    "imagenes/thumbs/Der_2.webp",
    "imagenes/thumbs/Der_1_.webp",
    "imagenes/thumbs/DSC00774.webp",
    "imagenes/thumbs/IMG_20251024_095757.webp",
    "imagenes/thumbs/IMG_2179.webp",
    "imagenes/thumbs/IMG_2414.webp",
  ];

  function construirMosaico(offset, cantidad) {
    const mosaico = document.createElement("div");
    mosaico.className = "footer-photo-mosaic";
    mosaico.setAttribute("aria-hidden", "true");

    for (let i = 0; i < cantidad; i++) {
      // Arrancamos en un índice distinto por columna (offset) para que
      // las dos cuadrículas del footer no muestren siempre las mismas
      // fotos en el mismo orden.
      const foto = FOTOS[(offset + i) % FOTOS.length];
      const celda = document.createElement("div");
      celda.className = "footer-photo-mosaic__cell";

      const img = document.createElement("img");
      img.src = foto;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";

      celda.appendChild(img);
      mosaico.appendChild(celda);
    }
    return mosaico;
  }

  const mosaicos = [];
  const columnaRedes = document.querySelector(".footer-col--social");
  const columnaContacto = document.querySelector(".footer-col--contact");

  if (columnaRedes && !columnaRedes.querySelector(".footer-photo-mosaic")) {
    mosaicos.push(columnaRedes.appendChild(construirMosaico(0, 10)));
  }
  if (
    columnaContacto &&
    !columnaContacto.querySelector(".footer-photo-mosaic")
  ) {
    mosaicos.push(columnaContacto.appendChild(construirMosaico(5, 10)));
  }

  if (mosaicos.length) iniciarCicloMosaicos(mosaicos);
}

/* Maneja el "ciclo de vida" de cada mini cuadrícula: revela las
   fotitos de a una (orden random, tiempos random entre una y otra
   para que se vea desprolijo) hasta cubrir todo, espera un instante
   con todo cubierto, y las apaga todas juntas para volver a arrancar.

   También frena el ciclo (sin gastar CPU/batería) cuando el footer no
   está en pantalla (scroll) o la pestaña pasa a segundo plano — mismo
   criterio que iniciarPausaHeroGrid() — y respeta
   prefers-reduced-motion dejando las fotitos quietas (ver CSS). */
function iniciarCicloMosaicos(mosaicos) {
  const prefiereMenosMovimiento =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefiereMenosMovimiento) return;

  const enPantalla = new Map();
  mosaicos.forEach((m) => enPantalla.set(m, true));

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          enPantalla.set(entry.target, entry.isIntersecting);
        });
      },
      { threshold: 0 },
    );
    mosaicos.forEach((m) => observer.observe(m));
  }

  function estaActivo(mosaico) {
    return enPantalla.get(mosaico) && !document.hidden;
  }

  function ordenRandom(celdas) {
    const copia = celdas.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  function cicloMosaico(mosaico) {
    const celdas = Array.from(
      mosaico.querySelectorAll(".footer-photo-mosaic__cell"),
    );

    function paso() {
      // Si el footer no se ve o la pestaña está en segundo plano,
      // reintenta más tarde en vez de seguir animando de fondo.
      if (!estaActivo(mosaico)) {
        setTimeout(paso, 800);
        return;
      }

      // 1) Revelar de a una, en orden random y con tiempos entre
      //    140–360ms entre cada una, hasta cubrir toda la cuadrícula.
      const orden = ordenRandom(celdas);
      let acumulado = 0;
      orden.forEach((celda) => {
        acumulado += 140 + Math.random() * 220;
        setTimeout(() => celda.classList.add("is-visible"), acumulado);
      });

      // 2) Quedarse un instante con todo cubierto.
      const tiempoOcultar = acumulado + 1400;
      setTimeout(() => {
        celdas.forEach((c) => c.classList.remove("is-visible"));
      }, tiempoOcultar);

      // 3) Pausa breve con todo apagado, y arranca de nuevo (otro
      //    orden random).
      setTimeout(paso, tiempoOcultar + 650);
    }

    paso();
  }

  mosaicos.forEach(cicloMosaico);
}

document.addEventListener("DOMContentLoaded", () => {
  iniciarRotacionHero();
  iniciarHoverOlas();
  iniciarParallaxRecursosAudiovisuales();
  iniciarFormularioContacto();
  iniciarNav();
  iniciarScrollReveal();
  iniciarPausaHeroGrid();
  iniciarFooterMosaico();
});
