/* ===== I18N ===== */
const USER_LANG = (navigator.language || navigator.userLanguage || "ru").toLowerCase();
const IS_RU = USER_LANG.startsWith("ru");
const I18N = {
  ru: {
    title: "Playable Ads Портфолио — Aleksey",
    heroTitle: "Playable Ads — Carousel",
    genre: "Жанр",
    forProject: "Проект",
    order: "Порядок",
    newer: "Новее",
    older: "Старее",
    searchPlaceholder: "Поиск по названию/тегам",
    reset: "Сброс",
    play: "Play",
    store: "Страница в магазине",
    toggleOrientation: "Ориентация",
    allGenres: "Все жанры",
    allProjects: "Все проекты"
  },
  en: {
    title: "Playable Ads Portfolio — Aleksey",
    heroTitle: "Playable Ads — Carousel",
    genre: "Genre",
    forProject: "Client/Project",
    order: "Order",
    newer: "Newer",
    older: "Older",
    searchPlaceholder: "Search by title/tags",
    reset: "Reset",
    play: "Play",
    store: "Store page",
    toggleOrientation: "Orientation",
    allGenres: "All genres",
    allProjects: "All projects"
  }
};
const T = IS_RU ? I18N.ru : I18N.en;
try { document.documentElement.setAttribute("lang", IS_RU ? "ru" : "en"); } catch {}
function applyI18N(){
  document.title = T.title;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    const val = T[key];
    if (typeof val === "string") el.textContent = val;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{
    const key = el.getAttribute("data-i18n-placeholder");
    if (T[key]) el.setAttribute("placeholder", T[key]);
  });
}
function getDescription(p){
  return IS_RU ? (p.description || p.description_en || "") : (p.description_en || p.description || "");
}

/* Device */
function isHandheld(){
  const uaData = navigator.userAgentData;
  if (uaData && Array.isArray(uaData.brands)) return uaData.mobile === true;
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
  const isTablet = /iPad|Tablet|Nexus 7|Nexus 10|SM-T|Kindle|Silk/i.test(ua);
  return isMobile || isTablet;
}

const PATH_JSON = "../projects.json";

const el = {
  track: document.getElementById("track"),
  viewport: document.getElementById("viewport"),
  dots: document.getElementById("dots"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  genre: document.getElementById("genre"),
  forProject: document.getElementById("forProject"),
  order: document.getElementById("order"),
  search: document.getElementById("search"),
  reset: document.getElementById("reset"),
  themeToggle: document.getElementById("themeToggle"),

  lightbox: document.getElementById("lightbox"),
  lightboxClose: document.getElementById("lightboxClose"),
  phoneFrame: document.getElementById("phoneFrame"),
  orientationToggle: document.getElementById("orientationToggle"),
  playableFrame: document.getElementById("playableFrame"),
  projectDesc: document.getElementById("projectDesc"),
  projectTech: document.getElementById("projectTech"),
  storeLink: document.getElementById("storeLink"),
};
document.getElementById("year").textContent = new Date().getFullYear();

const Analytics = {
  onPlayableOpen (project){ console.log("[analytics] playable_open", project.id); },
  onPlayableClose(project){ console.log("[analytics] playable_close", project?.id ?? null); },
  onCTAClick(type, project){ console.log("[analytics] cta", type, project?.id ?? null); }
};

let ALL = [];
let state = { genre:"all", forProject:"all", order:"newest", search:"", index:0, filtered:[], dragging:false, startX:0, scrollX:0, active:null, orientation:"portrait" };

applyI18N();
boot();
async function boot(){
  try{
    const res = await fetch(PATH_JSON, { cache:"no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    ALL = json.projects || [];
    buildFilters(ALL);
    bindControls();
    render();
  }catch(e){
    console.error("Failed to load projects.json", e);
    const box = document.createElement("div");
    box.role = "alert";
    box.style.cssText = "margin:16px;padding:12px;border:1px solid #f00;border-radius:8px";
    box.textContent = IS_RU
      ? "Ошибка загрузки projects.json. Открой через http:// и проверь JSON."
      : "Failed to load projects.json. Open via http:// and check JSON.";
    document.body.prepend(box);
  }
}

function buildFilters(list){
  const genres = Array.from(new Set(list.flatMap(p=>p.genres))).sort();
  for (const g of genres){ const o=document.createElement("option"); o.value=g; o.textContent=g; el.genre.appendChild(o); }
  const products = Array.from(new Set(list.map(p=>p.forProject))).sort();
  for (const pr of products){ const o=document.createElement("option"); o.value=pr; o.textContent=pr; el.forProject.appendChild(o); }
}

function bindControls(){
  el.genre.addEventListener("change", (e)=>{ state.genre=e.target.value; render(); });
  el.forProject.addEventListener("change", (e)=>{ state.forProject=e.target.value; render(); });
  el.order.addEventListener("change", (e)=>{ state.order=e.target.value; render(); });
  el.search.addEventListener("input", (e)=>{ state.search=e.target.value.toLowerCase().trim(); render(); });
  el.reset.addEventListener("click", ()=>{ state={...state, genre:"all", forProject:"all", order:"newest", search:"", index:0}; el.genre.value="all"; el.forProject.value="all"; el.order.value="newest"; el.search.value=""; render(); });
  el.themeToggle.addEventListener("click", () => {
    const dark = document.documentElement.classList.toggle("dark-forced");
    el.themeToggle.setAttribute("aria-pressed", String(dark));
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  });

  el.prev.addEventListener("click", ()=> snapTo(state.index-1));
  el.next.addEventListener("click", ()=> snapTo(state.index+1));
  el.viewport.addEventListener("keydown", (e)=>{ if (e.key==="ArrowLeft") snapTo(state.index-1); if (e.key==="ArrowRight") snapTo(state.index+1); });

  // drag/touch
  const vp=el.viewport;
  vp.addEventListener("pointerdown", onDown, {passive:true});
  vp.addEventListener("pointermove", onMove, {passive:false});
  vp.addEventListener("pointerup", onUp, {passive:true});
  vp.addEventListener("pointercancel", onUp, {passive:true});
  vp.addEventListener("pointerleave", onUp, {passive:true});

  document.addEventListener("keydown",(e)=>{ if (e.key==="Escape") closeLightbox(); });
  document.addEventListener("keydown",(e)=>{ if (e.key==="/"){ e.preventDefault(); el.search.focus(); }});
  el.orientationToggle.addEventListener("click", toggleOrientation);
}

function render(){
  const filtered = ALL
    .filter(p => state.genre==="all" || p.genres.includes(state.genre))
    .filter(p => state.forProject==="all" || p.forProject === state.forProject)
    .filter(p => !state.search || (p.title.toLowerCase().includes(state.search) || p.tags.join(" ").toLowerCase().includes(state.search)));

  const sorted = filtered.sort((a,b) => {
    const da = new Date(a.date), db = new Date(b.date);
    return state.order === "newest" ? (db - da) : (da - db);
  });

  state.filtered = sorted;
  el.track.innerHTML = "";
  const frag = document.createDocumentFragment();
  sorted.forEach(p => frag.appendChild(createSlide(p)));
  el.track.appendChild(frag);
  buildDots(sorted.length);
  requestAnimationFrame(()=> snapTo(0));
}

function createSlide(p){
  const li = document.createElement("li"); li.className="slide"; li.role="listitem"; li.setAttribute("aria-label", p.title);
  const media = document.createElement("div"); media.className="slide__media";
  const picture = document.createElement("picture");
  picture.innerHTML = `
    <source type="image/avif" srcset="${p.cover.avif}">
    <source type="image/webp" srcset="${p.cover.webp}">
    <img src="${p.cover.fallback}" alt="${p.title} — cover" loading="lazy" decoding="async">
  `;
  media.appendChild(picture);

  const body = document.createElement("div"); body.className="slide__body";
  const h3 = document.createElement("h3"); h3.className="slide__title"; h3.textContent=p.title;
  const tags = document.createElement("div"); tags.className="slide__tags";
  p.genres.forEach(t=>{ const s=document.createElement("span"); s.className="tag"; s.textContent=t; tags.appendChild(s); });
  const meta = document.createElement("div"); meta.className="slide__tags";
  const pr = document.createElement("span"); pr.className="tag"; pr.textContent=p.forProject; meta.appendChild(pr);
  const desc = document.createElement("p"); desc.className="slide__desc"; desc.textContent=getDescription(p);

  const row = document.createElement("div"); row.style.display="flex"; row.style.gap="8px"; row.style.flexWrap="wrap";
  const playBtn = document.createElement("button"); playBtn.className="btn primary"; playBtn.textContent=T.play; playBtn.addEventListener("click",()=> onPlay(p));
  const store = document.createElement("a"); store.className="btn"; store.href=p.linkStore; store.target="_blank"; store.rel="noopener"; store.textContent=T.store; store.addEventListener("click",()=> Analytics.onCTAClick("store", p));
  row.append(playBtn, store);

  body.append(h3,tags,meta,desc,row);
  li.append(media, body);
  return li;
}

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

function buildDots(n){
  el.dots.innerHTML = "";
  for (let i=0;i<n;i++){
    const b = document.createElement("button"); b.className="dot"; b.setAttribute("role","tab"); b.setAttribute("aria-selected", i===0 ? "true" : "false");
    b.addEventListener("click", ()=> snapTo(i));
    el.dots.appendChild(b);
  }
}

function onDown(e){ state.dragging=true; state.startX=e.clientX; state.scrollX = el.viewport.scrollLeft; el.viewport.setPointerCapture(e.pointerId); }
function onMove(e){ if (!state.dragging) return; const dx = e.clientX - state.startX; el.viewport.scrollLeft = state.scrollX - dx; if (Math.abs(dx)>6) e.preventDefault(); }
function onUp(){ if (!state.dragging) return; state.dragging=false; const slideW = el.track.querySelector(".slide")?.getBoundingClientRect().width || 1; const targetIndex = Math.round(el.viewport.scrollLeft / (slideW + 12)); snapTo(targetIndex); }

function snapTo(i){
  const count = state.filtered.length;
  state.index = Math.max(0, Math.min(i, count-1));
  const slide = el.track.querySelectorAll(".slide")[state.index];
  if (!slide) return;
  const delta = slide.offsetLeft - el.viewport.scrollLeft;
  smoothScrollTo(el.viewport, delta, 200);
  const dots = el.dots.querySelectorAll(".dot");
  dots.forEach((d,idx)=>{ d.classList.toggle("is-active", idx===state.index); d.setAttribute("aria-selected", idx===state.index ? "true":"false"); });
}

function smoothScrollTo(container, deltaLeft, duration=200){
  const start = container.scrollLeft; const end = deltaLeft + start; const t0 = performance.now();
  (function tick(t){ const p = Math.min(1, (t - t0) / duration); const ease = p<.5 ? 2*p*p : -1+(4-2*p)*p; container.scrollLeft = start + (end - start) * ease; if (p<1) requestAnimationFrame(tick); })(t0);
}

/* Lightbox + orientation */
let prevFocus=null, activeProject=null;
function openLightbox(project, url){
  activeProject = project; prevFocus=document.activeElement;
  el.lightbox.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
  document.getElementById("lightbox-title").textContent = project.title;
  el.projectDesc.textContent = getDescription(project);
  el.projectTech.innerHTML = project.tags.map(t=>`<li class="tag">${t}</li>`).join("");
  el.storeLink.href = project.linkStore;

  state.orientation = "portrait";
  el.phoneFrame.classList.remove("landscape");
  el.playableFrame.src = url;

  trapFocus(el.lightbox); el.lightbox.querySelector(".lightbox__dialog").focus();
  Analytics.onPlayableOpen(project);
}
function closeLightbox(){
  if (el.lightbox.getAttribute("aria-hidden")==="true") return;
  el.lightbox.setAttribute("aria-hidden","true"); document.body.style.overflow="";
  el.playableFrame.src="about:blank";
  Analytics.onPlayableClose(activeProject);
  activeProject=null;
  if (prevFocus) prevFocus.focus();
}
document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
el.lightbox.addEventListener("click",(e)=>{ if (e.target.hasAttribute("data-close")) closeLightbox(); });

function toggleOrientation(){
  state.orientation = state.orientation === "portrait" ? "landscape" : "portrait";
  el.phoneFrame.classList.toggle("landscape", state.orientation === "landscape");
}

function trapFocus(container){
  const sels='a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),iframe,video,audio,[tabindex]:not([tabindex="-1"])';
  const nodes=container.querySelectorAll(sels); const first=nodes[0], last=nodes[nodes.length-1];
  container.onkeydown=(e)=>{ if (e.key!=="Tab") return; if (e.shiftKey && document.activeElement===first){ last.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement===last){ first.focus(); e.preventDefault(); } };
}
