/* ===== I18N (UI + descriptions) ===== */
const USER_LANG = (navigator.language || navigator.userLanguage || "ru").toLowerCase();
const IS_RU = USER_LANG.startsWith("ru");
const I18N = {
  ru: {
    title: "Playable Ads Портфолио — Aleksey",
    heroTitle: "Playable Ads портфолио",
    tagline: "Микро-игры с высокой конверсией. Чистый код. 60fps. Mobile-first.",
    contactCta: "Связаться",
    genre: "Жанр",
    forProject: "Проект",
    order: "Порядок",
    newer: "Новее",
    older: "Старее",
    search: "Поиск",
    searchPlaceholder: "Поиск по названию/тегам",
    reset: "Сброс",
    masonry: "Masonry-вид",
    play: "Play",
    store: "Страница в магазине",
    contactsTitle: "Контакты",
    contactsText: "Открыт к контрактам и коллаборациям.",
    toggleOrientation: "Ориентация",
    allGenres: "Все жанры",
    allProjects: "Все проекты",
    projectsCount: n => `${n} проектов`
  },
  en: {
    title: "Playable Ads Portfolio — Aleksey",
    heroTitle: "Playable Ads Portfolio",
    tagline: "High-converting mini-games. Clean code. 60fps. Mobile-first.",
    contactCta: "Contact",
    genre: "Genre",
    forProject: "Client/Project",
    order: "Order",
    newer: "Newer",
    older: "Older",
    search: "Search",
    searchPlaceholder: "Search by title/tags",
    reset: "Reset",
    masonry: "Masonry view",
    play: "Play",
    store: "Store page",
    contactsTitle: "Contacts",
    contactsText: "Open for contracts and collaborations.",
    toggleOrientation: "Orientation",
    allGenres: "All genres",
    allProjects: "All projects",
    projectsCount: n => `${n} projects`
  }
};
const T = IS_RU ? I18N.ru : I18N.en;
try { document.documentElement.setAttribute("lang", IS_RU ? "ru" : "en"); } catch {}

/* Fill UI labels with i18n */
function applyI18N(){
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    const val = T[key];
    if (typeof val === "function") return; // counts handled later
    if (typeof val === "string") el.textContent = val;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{
    const key = el.getAttribute("data-i18n-placeholder");
    if (T[key]) el.setAttribute("placeholder", T[key]);
  });
  document.title = T.title;
}

/* Choose localized description */
function getDescription(p){
  return IS_RU ? (p.description || p.description_en || "") : (p.description_en || p.description || "");
}

/* ===== Device detection ===== */
function isHandheld(){
  // Prefer Client Hints if available
  const uaData = navigator.userAgentData;
  if (uaData && Array.isArray(uaData.brands)) {
    const mobile = uaData.mobile === true;
    return mobile; // phones/tablets return true on Chromium
  }
  // UA fallback
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
  const isTablet = /iPad|Tablet|Nexus 7|Nexus 10|SM-T|Kindle|Silk/i.test(ua);
  return isMobile || isTablet;
}

/* ====== State & Elements ====== */
let ALL = [];
let state = {
  genre: "all",
  forProject: "all",
  order: "newest",
  search: "",
  masonry: false,
  activeProject: null,
  orientation: "portrait" // or "landscape"
};

const el = {
  gallery: document.getElementById("gallery"),
  projectCount: document.getElementById("projectCount"),
  genre: document.getElementById("genre"),
  forProject: document.getElementById("forProject"),
  order: document.getElementById("order"),
  search: document.getElementById("search"),
  reset: document.getElementById("reset"),
  masonryToggle: document.getElementById("masonryToggle"),
  themeToggle: document.getElementById("themeToggle"),

  lightbox: document.getElementById("lightbox"),
  lightboxClose: document.getElementById("lightboxClose"),
  phoneFrame: document.getElementById("phoneFrame"),
  orientationToggle: document.getElementById("orientationToggle"),
  playableFrame: document.getElementById("playableFrame"),
  projectDesc: document.getElementById("projectDesc"),
  projectTech: document.getElementById("projectTech"),
  storeLink: document.getElementById("storeLink")
};

const Analytics = {
  onPlayableOpen (project){ console.log("[analytics] playable_open", project.id); },
  onPlayableClose(project){ console.log("[analytics] playable_close", project?.id ?? null); },
  onCTAClick(type, project){ console.log("[analytics] cta", type, project?.id ?? null); }
};

document.getElementById("year").textContent = new Date().getFullYear();
applyI18N();
boot();

async function boot(){
  try{
    const res = await fetch("projects.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    ALL = json.projects || [];
    buildFilters(ALL);
    bindControls();
    render();
  }catch(e){
    console.error("Не удалось загрузить projects.json", e);
    const box = document.createElement("div");
    box.role = "alert";
    box.style.cssText = "margin:16px;padding:12px;border:1px solid #f00;border-radius:8px";
    box.textContent = IS_RU
      ? "Ошибка загрузки projects.json. Проверьте путь, JSON и что страница открыта через http://, а не file://"
      : "Failed to load projects.json. Check path, JSON validity, and open via http:// not file://";
    document.body.prepend(box);
  }
}

function buildFilters(list){
  // genres
  const genres = Array.from(new Set(list.flatMap(p => p.genres))).sort();
  for (const g of genres){
    const opt = document.createElement("option");
    opt.value = g; opt.textContent = g;
    el.genre.appendChild(opt);
  }
  // forProject
  const products = Array.from(new Set(list.map(p => p.forProject))).sort();
  for (const pr of products){
    const opt = document.createElement("option");
    opt.value = pr; opt.textContent = pr;
    el.forProject.appendChild(opt);
  }
}

function bindControls(){
  el.genre.addEventListener("change", e => { state.genre = e.target.value; render(); });
  el.forProject.addEventListener("change", e => { state.forProject = e.target.value; render(); });
  el.order.addEventListener("change", e => { state.order = e.target.value; render(); });
  el.search.addEventListener("input", e => { state.search = e.target.value.toLowerCase().trim(); rafRender(); });
  el.reset.addEventListener("click", () => {
    state.genre="all"; state.forProject="all"; state.order="newest"; state.search="";
    el.genre.value="all"; el.forProject.value="all"; el.order.value="newest"; el.search.value="";
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

  document.addEventListener("keydown", (e) => { if (e.key==="Escape") closeLightbox(); });
  document.addEventListener("keydown", (e) => { if (e.key==="/" && document.activeElement===document.body){ e.preventDefault(); el.search.focus(); }});

  el.orientationToggle.addEventListener("click", toggleOrientation);
}

let rafId=null;
function rafRender(){ cancelAnimationFrame(rafId); rafId = requestAnimationFrame(render); }

function render(){
  const filtered = ALL
    .filter(p => state.genre==="all" || p.genres.includes(state.genre))
    .filter(p => state.forProject==="all" || p.forProject === state.forProject)
    .filter(p => !state.search || (p.title.toLowerCase().includes(state.search) || p.tags.join(" ").toLowerCase().includes(state.search)));

  const sorted = filtered.sort((a,b) => {
    const da = new Date(a.date), db = new Date(b.date);
    return state.order === "newest" ? (db - da) : (da - db);
  });

  el.projectCount.textContent = T.projectsCount(sorted.length);

  el.gallery.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const p of sorted) frag.appendChild(createCard(p));
  el.gallery.appendChild(frag);

  setupIntersection();
}

/* Card */
function createCard(p){
  const article = document.createElement("article");
  article.className = "card";
  article.setAttribute("role","article");
  article.setAttribute("aria-labelledby", `${p.id}-title`);

  const media = document.createElement("div"); media.className="card__media";
  const picture = document.createElement("picture");
  picture.innerHTML = `
    <source type="image/avif" srcset="${p.cover.avif}">
    <source type="image/webp" srcset="${p.cover.webp}">
    <img src="${p.cover.fallback}" alt="${p.title} — cover" loading="lazy" decoding="async">
  `;
  media.appendChild(picture);

  const body = document.createElement("div"); body.className="card__body";
  const h3 = document.createElement("h3"); h3.className="card__title"; h3.id=`${p.id}-title`; h3.textContent=p.title;
  const tags = document.createElement("div"); tags.className="card__tags";
  p.genres.forEach(t => { const s=document.createElement("span"); s.className="tag"; s.textContent=t; tags.appendChild(s); });
  const meta = document.createElement("div"); meta.className="card__tags";
  const pr = document.createElement("span"); pr.className="tag"; pr.textContent = p.forProject; meta.appendChild(pr);

  const desc = document.createElement("p"); desc.className="card__desc"; desc.textContent=getDescription(p);

  const actions = document.createElement("div"); actions.className="card__actions";
  const playBtn = document.createElement("button"); playBtn.className="btn primary"; playBtn.type="button"; playBtn.textContent=T.play;
  playBtn.addEventListener("click",()=> onPlay(p));
  const store = document.createElement("a"); store.className="btn"; store.href=p.linkStore; store.target="_blank"; store.rel="noopener"; store.textContent=T.store;
  store.addEventListener("click",()=> Analytics.onCTAClick("store", p));

  actions.append(playBtn, store);
  body.append(h3, tags, meta, desc, actions);
  article.append(media, body);
  return article;
}

/* Play behavior */
function onPlay(project){
  const handheld = isHandheld();
  const targetUrl = project.linkDemo || project.playable?.src || "#";
  if (handheld){
    window.open(targetUrl, "_blank", "noopener");
    Analytics.onCTAClick("play_newtab", project);
  } else {
    openLightbox(project, targetUrl);
  }
}

/* Lazy IO */
let io;
function setupIntersection(){
  if (io) io.disconnect();
  io = new IntersectionObserver((entries)=> {
    entries.forEach(entry => { if (entry.isIntersecting) io.unobserve(entry.target); });
  }, { rootMargin: "200px" });
  document.querySelectorAll(".card").forEach(c => io.observe(c));
}

/* Lightbox + orientation */
let prevFocus=null;
function openLightbox(project, url){
  state.activeProject = project;
  prevFocus = document.activeElement;
  el.lightbox.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";

  document.getElementById("lightbox-title").textContent = project.title;
  el.projectDesc.textContent = getDescription(project);
  el.projectTech.innerHTML = project.tags.map(t => `<li class="tag">${t}</li>`).join("");
  el.storeLink.href = project.linkStore;

  // orientation default portrait
  state.orientation = "portrait";
  el.phoneFrame.classList.remove("landscape");
  // load iframe
  el.playableFrame.src = url;

  trapFocus(el.lightbox);
  el.lightbox.querySelector(".lightbox__dialog").focus();
  Analytics.onPlayableOpen(project);
}
function closeLightbox(){
  if (el.lightbox.getAttribute("aria-hidden")==="true") return;
  el.lightbox.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
  el.playableFrame.src="about:blank";
  Analytics.onPlayableClose(state.activeProject);
  state.activeProject = null;
  if (prevFocus) prevFocus.focus();
}
document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
el.lightbox.addEventListener("click", (e)=> { if (e.target.hasAttribute("data-close")) closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key==="Escape") closeLightbox(); });

function toggleOrientation(){
  state.orientation = state.orientation === "portrait" ? "landscape" : "portrait";
  el.phoneFrame.classList.toggle("landscape", state.orientation === "landscape");
}

function trapFocus(container){
  const sels = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, video, audio, [tabindex]:not([tabindex="-1"])';
  const nodes = container.querySelectorAll(sels);
  const first = nodes[0], last = nodes[nodes.length-1];
  container.onkeydown = (e)=>{
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement===first){ last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement===last){ first.focus(); e.preventDefault(); }
  };
}
