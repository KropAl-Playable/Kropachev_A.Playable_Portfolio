/* ======= ДАННЫЕ (можно вынести в JSON) ======= */
const PROJECTS = [
  {
    id: "match3-forest",
    title: "Forest Match-3",
    tags: ["Match-3","Casual"],
    cover: { avif: "assets/match3.avif", webp: "assets/match3.webp", fallback: "assets/match3.jpg" },
    description: "Быстрая головоломка с подсказками и подсветкой ходов.",
    tech: ["Canvas","WebGL","GSAP"],
    popularity: 87,
    date: "2025-03-10",
    linkDemo: "https://cdn.example.com/demos/match3/index.html",
    linkStore: "https://store.example.com/app/match3",
    playable: { type: "iframe", src: "https://cdn.example.com/demos/match3/index.html" }
  },
  {
    id: "rpg-raid",
    title: "Raid Mini-RPG",
    tags: ["RPG","Mid-core"],
    cover: { avif: "assets/rpg.avif", webp: "assets/rpg.webp", fallback: "assets/rpg.jpg" },
    description: "Лайт-боёвка, авто-скиллы, метры прогресса.",
    tech: ["Canvas","Audio","FSM"],
    popularity: 92,
    date: "2024-12-01",
    linkDemo: "https://cdn.example.com/demos/rpg/index.html",
    linkStore: "https://store.example.com/app/rpg",
    playable: { type: "video", src: "assets/rpg-preview.webm", poster: "assets/rpg-poster.jpg" }
  },
  {
    id: "hyper-swipe",
    title: "Swipe Rush",
    tags: ["Hyper-casual"],
    cover: { avif: "assets/hyper.avif", webp: "assets/hyper.webp", fallback: "assets/hyper.jpg" },
    description: "Свайпы по чекпоинтам, мгновенный геймплей.",
    tech: ["WebGL","ECS"],
    popularity: 74,
    date: "2025-05-22",
    linkDemo: "https://cdn.example.com/demos/hyper/index.html",
    linkStore: "https://store.example.com/app/hyper",
    playable: { type: "inline-canvas", script: null } // пример inline
  }
];

/* ======= УТИЛИТЫ / АНАЛИТИКА ======= */
const Analytics = {
  onPlayableOpen (project){ console.log("[analytics] playable_open", project.id); /* интеграция сюда */ },
  onPlayableClose(project){ console.log("[analytics] playable_close", project?.id ?? null); },
  onCTAClick(type, project){ console.log("[analytics] cta", type, project?.id ?? null); }
};

/* ======= СОСТОЯНИЕ ======= */
let state = {
  tag: "all",
  search: "",
  sort: "newest",
  masonry: false,
  projects: PROJECTS,
  activeProject: null
};

/* ======= ЭЛЕМЕНТЫ ======= */
const el = {
  gallery: document.getElementById("gallery"),
  tagContainer: document.getElementById("tagContainer"),
  projectCount: document.getElementById("projectCount"),
  sort: document.getElementById("sort"),
  search: document.getElementById("search"),
  reset: document.getElementById("reset"),
  masonryToggle: document.getElementById("masonryToggle"),
  themeToggle: document.getElementById("themeToggle"),
  lightbox: document.getElementById("lightbox"),
  lightboxClose: document.getElementById("lightboxClose"),
  playableFrame: document.getElementById("playableFrame"),
  playableCanvas: document.getElementById("playableCanvas"),
  playableVideo: document.getElementById("playableVideo"),
  projectDesc: document.getElementById("projectDesc"),
  projectTech: document.getElementById("projectTech"),
  demoLink: document.getElementById("demoLink"),
  storeLink: document.getElementById("storeLink")
};

/* ======= ИНИЦ ======= */
document.getElementById("year").textContent = new Date().getFullYear();
initTags();
bindControls();
render();

/* ======= ТЕГИ ======= */
function initTags() {
  const tags = Array.from(new Set(PROJECTS.flatMap(p => p.tags))).sort();
  tags.forEach(tag => {
    const b = document.createElement("button");
    b.className = "chip";
    b.type = "button";
    b.textContent = tag;
    b.dataset.tag = tag;
    b.addEventListener("click", () => selectTag(tag, b));
    el.tagContainer.appendChild(b);
  });
}
function selectTag(tag, btn) {
  state.tag = tag;
  document.querySelectorAll(".chip").forEach(ch => ch.classList.toggle("is-active", ch === btn || ch.dataset.tag === "all" && tag === "all"));
  render();
}

/* ======= КОНТРОЛЫ ======= */
function bindControls() {
  document.querySelector('.chip[data-tag="all"]').addEventListener("click", () => { state.tag="all"; render(); });
  el.sort.addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  el.search.addEventListener("input", (e) => { state.search = e.target.value.toLowerCase().trim(); rafRender(); });
  el.reset.addEventListener("click", () => {
    state = { ...state, tag:"all", search:"", sort:"newest" };
    el.search.value=""; el.sort.value="newest";
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
    document.querySelector('.chip[data-tag="all"]').classList.add("is-active");
    render();
  });
  el.masonryToggle.addEventListener("change", (e) => {
    state.masonry = e.target.checked;
    el.gallery.classList.toggle("masonry", state.masonry);
  });
  el.themeToggle.addEventListener("click", () => {
    const dark = document.documentElement.classList.toggle("dark-forced");
    el.themeToggle.setAttribute("aria-pressed", String(dark));
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  });
}

/* ======= РЕНДЕР ======= */
let rafId = null;
function rafRender(){ cancelAnimationFrame(rafId); rafId = requestAnimationFrame(render); }

function render() {
  const filtered = state.projects
    .filter(p => state.tag === "all" || p.tags.includes(state.tag))
    .filter(p => !state.search || (p.title.toLowerCase().includes(state.search) || p.tags.join(" ").toLowerCase().includes(state.search)));

  const sorted = filtered.sort((a,b) => {
    if (state.sort === "title") return a.title.localeCompare(b.title);
    if (state.sort === "popular") return b.popularity - a.popularity;
    return new Date(b.date) - new Date(a.date);
  });

  el.projectCount.textContent = `${sorted.length} проектов`;

  // очистка и виртуальная вставка
  el.gallery.innerHTML = "";
  const frag = document.createDocumentFragment();
  sorted.forEach(p => frag.appendChild(createCard(p)));
  el.gallery.appendChild(frag);

  // lazy-подгрузка невидимых
  setupIntersection();
}

function createCard(p) {
  const article = document.createElement("article");
  article.className = "card";
  article.setAttribute("role","article");
  article.setAttribute("aria-labelledby", `${p.id}-title`);

  // media with placeholders CLS-safe
  const media = document.createElement("div");
  media.className = "card__media";
  const picture = document.createElement("picture");
  const srcAvif = document.createElement("source"); srcAvif.type="image/avif"; srcAvif.srcset = p.cover.avif;
  const srcWebp = document.createElement("source"); srcWebp.type="image/webp"; srcWebp.srcset = p.cover.webp;
  const img = document.createElement("img");
  img.src = p.cover.fallback;
  img.alt = `${p.title} — обложка`;
  img.loading = "lazy";
  img.decoding = "async";
  picture.append(srcAvif, srcWebp, img);
  media.appendChild(picture);

  // body
  const body = document.createElement("div"); body.className = "card__body";
  const h3 = document.createElement("h3"); h3.className = "card__title"; h3.id = `${p.id}-title`; h3.textContent = p.title;
  const tags = document.createElement("div"); tags.className="card__tags";
  p.tags.forEach(t => { const s=document.createElement("span"); s.className="tag"; s.textContent=t; tags.appendChild(s); });
  const desc = document.createElement("p"); desc.className="card__desc"; desc.textContent = p.description;

  const actions = document.createElement("div"); actions.className="card__actions";
  const playBtn = document.createElement("button");
  playBtn.className = "btn primary"; playBtn.type="button"; playBtn.textContent="Play";
  playBtn.addEventListener("click", () => openLightbox(p));

  const demo = document.createElement("a");
  demo.className="btn"; demo.href=p.linkDemo; demo.target="_blank"; demo.rel="noopener"; demo.textContent="Demo";
  demo.addEventListener("click", () => Analytics.onCTAClick("demo", p));

  const store = document.createElement("a");
  store.className="btn"; store.href=p.linkStore; store.target="_blank"; store.rel="noopener"; store.textContent="Store";
  store.addEventListener("click", () => Analytics.onCTAClick("store", p));

  actions.append(playBtn, demo, store);
  body.append(h3, tags, desc, actions);
  article.append(media, body);
  return article;
}

/* ======= LAZY ======= */
let io;
function setupIntersection() {
  if (io) { io.disconnect(); }
  io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // здесь можно догружать что-то тяжёлое
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: "200px" });
  document.querySelectorAll(".card").forEach(c => io.observe(c));
}

/* ======= MODAL / LIGHTBOX (фокус-трап) ======= */
let prevFocus = null;
function openLightbox(project) {
  state.activeProject = project;
  prevFocus = document.activeElement;

  el.lightbox.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
  // fill content
  document.getElementById("lightbox-title").textContent = project.title;
  el.projectDesc.textContent = project.description;
  el.projectTech.innerHTML = project.tech.map(t => `<li class="tag">${t}</li>`).join("");
  el.demoLink.href = project.linkDemo;
  el.storeLink.href = project.linkStore;

  // reset media
  [el.playableFrame, el.playableCanvas, el.playableVideo].forEach(n => { n.hidden = true; });

  if (project.playable.type === "iframe") {
    el.playableFrame.hidden = false;
    el.playableFrame.src = project.playable.src;
  } else if (project.playable.type === "inline-canvas") {
    el.playableCanvas.hidden = false;
    startInlinePlayable(el.playableCanvas);
  } else if (project.playable.type === "video") {
    el.playableVideo.hidden = false;
    el.playableVideo.poster = project.playable.poster || "";
    el.playableVideo.src = project.playable.src;
  }

  // focus trap
  trapFocus(el.lightbox);
  el.lightbox.querySelector(".lightbox__dialog").focus();
  Analytics.onPlayableOpen(project);
}
function closeLightbox() {
  if (el.lightbox.getAttribute("aria-hidden")==="true") return;
  el.lightbox.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
  // stop media
  el.playableFrame.src = "about:blank";
  el.playableVideo.pause();
  el.playableVideo.removeAttribute("src");
  el.playableVideo.load();
  stopInlinePlayable();

  Analytics.onPlayableClose(state.activeProject);
  state.activeProject = null;
  if (prevFocus) prevFocus.focus();
}
el.lightbox.addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) closeLightbox(); });
el.lightboxClose.addEventListener("click", closeLightbox);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

/* ======= ФОКУС-ТРАП ======= */
let focusHandler = null;
function trapFocus(container) {
  const selectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, video, audio, [tabindex]:not([tabindex="-1"])';
  const nodes = container.querySelectorAll(selectors);
  const first = nodes[0], last = nodes[nodes.length-1];
  focusHandler && container.removeEventListener("keydown", focusHandler);
  focusHandler = (e) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  };
  container.addEventListener("keydown", focusHandler);
}

/* ======= INLINE PLAYABLE (микро-демо) ======= */
let rafPlay = null, t0 = 0, ctx = null;
function startInlinePlayable(canvas) {
  ctx = canvas.getContext("2d");
  t0 = performance.now();
  const render = (t) => {
    const dt = (t - t0)/1000;
    t0 = t;
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,h);
    // простая анимация: шарик
    const r = 20, x = (w/2) + Math.sin(t/500)* (w/3), y = (h/2) + Math.cos(t/800)* (h/3);
    ctx.fillStyle = "#2563eb"; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    rafPlay = requestAnimationFrame(render);
  };
  rafPlay = requestAnimationFrame(render);
}
function stopInlinePlayable() { if (rafPlay) cancelAnimationFrame(rafPlay); }

/* ======= A11Y: клавиатурные шорткаты ======= */
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement === document.body) { e.preventDefault(); el.search.focus(); }
});

/* ======= Делегирование на аналитику CTA ======= */
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-analytics]");
  if (a) Analytics.onCTAClick(a.dataset.analytics, state.activeProject);
});
