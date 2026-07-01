/* =========================================================================
   YOUTUBE PLAYLISTS — script compartido
   ---------------------------------------------------------------------
   Trae automáticamente los videos más recientes de playlists de YouTube
   usando la YouTube Data API v3. Cuando se sube/agrega un video nuevo a
   una playlist en YouTube, se actualiza solo acá — no hace falta tocar
   el HTML nunca más.

   Este MISMO archivo se usa en varias páginas del sitio (Recursos
   audiovisuales y Radio La Chispa por ahora). Cada página solo tiene en
   su HTML los contenedores (.ra-video-grid, .chispa-programs__grid,
   etc.) que correspondan; el script ignora los feeds cuyo contenedor no
   encuentra en la página actual.

   CÓMO CONFIGURAR:
   1. Pegá tu API Key de YouTube Data API v3 en YT_API_KEY (abajo).
   2. Para agregar/editar un feed, sumá un objeto a la lista FEEDS con:
      - playlistId: el ID de la playlist (de youtube.com/playlist?list=ESTE_ID)
      - gridSelector: selector CSS del contenedor donde van las tarjetas
      - count: cuántos videos mostrar
   3. Listo. El script hace el resto al cargar cada página.
   ========================================================================= */

(function () {
  // ── 1. CONFIGURACIÓN ──────────────────────────────────────────────────
  const YT_API_KEY = "AIzaSyBFO0XGTWpj_7hggewJLOb1zy9XBsEKlAI";

  const FEEDS = [
    // Página: Recursos_audiovisuales.html
    {
      name: "entrevistas",
      playlistId: "PLEKqH2_ubRhBIm27Ya3lepGQPxhwHLDsT",
      gridSelector: "#entrevistas .ra-video-grid",
      count: 3,
    },
    {
      name: "documentales",
      playlistId: "FL5xMGifowJfsLhGYOday_8A",
      gridSelector: "#documentales .ra-video-grid",
      count: 3,
    },
    {
      name: "charlas",
      // TODO: cuando tengas la playlist definitiva de "Charlas", reemplazá
      // el ID de acá abajo (por ahora apunta a la misma que Documentales).
      playlistId: "FL5xMGifowJfsLhGYOday_8A",
      gridSelector: "#charlas .ra-video-grid",
      count: 3,
    },
    // Página: Radio_la_chispa.html
    {
      name: "radio-la-chispa",
      playlistId: "PLD2BlnPNqR9CXyyUHyTDFxe50ZQjNeC0t",
      gridSelector: ".chispa-programs__grid",
      count: 3,
    },
  ];

  // ── 2. HELPERS ─────────────────────────────────────────────────────────
  function formatDuration(iso8601) {
    // Convierte "PT4M13S" -> "04:13", "PT1H2M3S" -> "1:02:03"
    const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "";
    const h = parseInt(match[1] || "0", 10);
    const m = parseInt(match[2] || "0", 10);
    const s = parseInt(match[3] || "0", 10);
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function formatViews(viewCount) {
    const n = parseInt(viewCount || "0", 10);
    return `${n.toLocaleString("es-AR")} visualizaciones`;
  }

  function formatRelativeDate(dateStr) {
    const published = new Date(dateStr);
    const now = new Date();
    const diffMs = now - published;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Publicado hoy";
    if (diffDays === 1) return "Publicado hace 1 día";
    if (diffDays < 7) return `Publicado hace ${diffDays} días`;
    if (diffDays < 14) return "Publicado hace 1 semana";
    if (diffDays < 30) return `Publicado hace ${Math.floor(diffDays / 7)} semanas`;
    if (diffDays < 60) return "Publicado hace 1 mes";
    if (diffDays < 365) return `Publicado hace ${Math.floor(diffDays / 30)} meses`;
    const years = Math.floor(diffDays / 365);
    return years === 1 ? "Publicado hace 1 año" : `Publicado hace ${years} años`;
  }

  function bestThumbnail(thumbnails) {
    return (
      thumbnails?.maxres?.url ||
      thumbnails?.standard?.url ||
      thumbnails?.high?.url ||
      thumbnails?.medium?.url ||
      thumbnails?.default?.url ||
      "img/placeholder-video.svg"
    );
  }

  // ── 3. LLAMADAS A LA API ──────────────────────────────────────────────
  async function fetchPlaylistItems(playlistId) {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems` +
      `?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}` +
      `&key=${YT_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error al consultar playlist ${playlistId}: ${res.status}`);
    }
    const data = await res.json();
    return data.items || [];
  }

  async function fetchVideoDetails(videoIds) {
    if (!videoIds.length) return {};
    const url =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=contentDetails,statistics&id=${videoIds.join(",")}` +
      `&key=${YT_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error al consultar detalles de videos: ${res.status}`);
    }
    const data = await res.json();
    const map = {};
    (data.items || []).forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }

  async function getLatestVideos(playlistId, count) {
    const items = await fetchPlaylistItems(playlistId);

    // Descartamos videos eliminados/privados (no tienen videoId válido)
    const validItems = items.filter(
      (it) => it.contentDetails && it.contentDetails.videoId
    );

    // Ordenamos por fecha real de publicación del video (más nuevo primero)
    validItems.sort((a, b) => {
      const dateA = new Date(a.contentDetails.videoPublishedAt || a.snippet.publishedAt);
      const dateB = new Date(b.contentDetails.videoPublishedAt || b.snippet.publishedAt);
      return dateB - dateA;
    });

    const latest = validItems.slice(0, count);
    const videoIds = latest.map((it) => it.contentDetails.videoId);
    const details = await fetchVideoDetails(videoIds);

    return latest.map((it) => {
      const videoId = it.contentDetails.videoId;
      const detail = details[videoId];
      return {
        id: videoId,
        title: it.snippet.title,
        thumbnail: bestThumbnail(it.snippet.thumbnails),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        duration: detail ? formatDuration(detail.contentDetails.duration) : "",
        viewsText: detail ? formatViews(detail.statistics.viewCount) : "",
        dateText: formatRelativeDate(
          it.contentDetails.videoPublishedAt || it.snippet.publishedAt
        ),
      };
    });
  }

  // ── 4. RENDERIZADO ────────────────────────────────────────────────────
  function buildCard(video) {
    const article = document.createElement("article");
    article.className = "ra-video-card";

    article.innerHTML = `
      <a href="${video.url}" class="ra-video-card__thumb" target="_blank" rel="noopener">
        <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}" loading="lazy" />
        ${video.duration ? `<span class="ra-video-card__duration">${video.duration}</span>` : ""}
        <span class="ra-video-card__progress"></span>
      </a>
      <div class="ra-video-card__body">
        <p class="ra-video-card__title">${escapeHtml(video.title)}</p>
        <button class="ra-video-card__menu" aria-label="Más opciones">⋮</button>
      </div>
      <p class="ra-video-card__meta">${[video.viewsText, video.dateText].filter(Boolean).join(" • ")}</p>
    `;
    return article;
  }

  // Tarjeta "esqueleto": cuadrado azul con "Cargando video..." y los
  // puntos animándose. Se muestra mientras se espera la respuesta de la
  // API, y se queda así (en vez de mostrar contenido roto o desactualizado)
  // si la API llegara a fallar.
  function buildLoadingCard() {
    const article = document.createElement("article");
    article.className = "ra-video-card ra-video-card--loading";
    article.innerHTML = `
      <div class="ra-video-card__thumb ra-video-card__thumb--loading">
        <span class="ra-loading-label"
          >Cargando video<span class="ra-loading-dots"></span
        ></span>
      </div>
    `;
    return article;
  }

  function showLoadingCards(grid, count) {
    grid.innerHTML = "";
    for (let i = 0; i < count; i++) {
      grid.appendChild(buildLoadingCard());
    }
  }

  // Hace "parpadear" los puntos suspensivos de todas las tarjetas en
  // estado de carga que haya en la página, sin importar de qué feed son.
  (function startLoadingDotsAnimation() {
    let step = 0;
    setInterval(() => {
      step = (step + 1) % 4; // 0, 1, 2, 3 puntos
      document.querySelectorAll(".ra-loading-dots").forEach((el) => {
        el.textContent = ".".repeat(step);
      });
    }, 450);
  })();

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Arma el link a la playlist completa en YouTube a partir del playlistId
  // configurado en FEEDS.
  function playlistUrl(playlistId) {
    return `https://www.youtube.com/playlist?list=${playlistId}`;
  }

  // Inserta (una sola vez) el botón "Ver playlist completa" justo debajo
  // de la grilla. Es un link estático armado con el playlistId, así que
  // se agrega siempre, sin depender de que la llamada a la API funcione.
  function addPlaylistLink(grid, feed) {
    if (
      grid.nextElementSibling &&
      grid.nextElementSibling.classList.contains("ra-playlist-link-wrap")
    ) {
      return; // ya está agregado, no lo duplicamos
    }

    const wrap = document.createElement("div");
    wrap.className = "ra-playlist-link-wrap";

    const link = document.createElement("a");
    link.href = playlistUrl(feed.playlistId);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "ra-playlist-link";
    link.textContent = "Ver playlist completa";

    wrap.appendChild(link);
    grid.insertAdjacentElement("afterend", wrap);
  }

  async function renderFeed(feed) {
    // Si esta página no tiene el contenedor de este feed, no hacemos nada
    // (por ejemplo: el feed "radio-la-chispa" se ignora en
    // Recursos_audiovisuales.html, y viceversa).
    const grid = document.querySelector(feed.gridSelector);
    if (!grid) return;

    // Botón "Ver playlist completa" debajo de la grilla.
    addPlaylistLink(grid, feed);

    // Mostramos el estado de carga (cuadrados azules) de entrada, en vez
    // de dejar ver el contenido estático/de ejemplo que hubiera en el HTML.
    showLoadingCards(grid, feed.count);

    try {
      const videos = await getLatestVideos(feed.playlistId, feed.count);
      if (!videos.length) return; // sin resultados: se queda en "Cargando..."

      grid.innerHTML = "";
      videos.forEach((video) => grid.appendChild(buildCard(video)));
    } catch (err) {
      console.error(`No se pudieron cargar los videos de "${feed.name}":`, err);
      // Si falla (ej. cuota excedida, key sin permisos en este dominio),
      // dejamos los cuadrados azules de "Cargando video..." en vez de
      // mostrar algo roto o desactualizado.
    }
  }

  // ── 5. INICIO ──────────────────────────────────────────────────────────
  function init() {
    FEEDS.forEach(renderFeed);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
