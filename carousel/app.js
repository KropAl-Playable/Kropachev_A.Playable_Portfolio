/* Данные переиспользуем */
const PROJECTS = window.top?.PROJECTS || [
  // дублируем/минимум 3 штуки
  { id:"match3-forest", title:"Forest Match-3", tags:["Match-3","Casual"], cover:{avif:"../assets/match3.avif", webp:"../assets/match3.webp", fallback:"../assets/match3.jpg"}, description:"Головоломка с подсказками.", tech:["Canvas","WebGL","GSAP"], popularity:87, date:"2025-03-10", linkDemo:"https://cdn.example.com/demos/match3/index.html", linkStore:"https://store.example.com/app/match3", playable:{ type:"iframe", src:"https://cdn.example.com/demos/match3/index.html" } },
  { id:"rpg-raid", title:"Raid Mini-RPG", tags:["RPG","Mid-core"], cover:{avif:"../assets/rpg.avif", webp:"../assets/rpg.webp", fallback:"../assets/rpg.jpg"}, description:"Лайт-боёвка.", tech:["Canvas","Audio","FSM"], popularity:92, date:"2024-12-01", linkDemo:"https://cdn.example.com/demos/rpg/index.html", linkStore:"https://store.example.com/app/rpg", playable:{ type:"video", src:"../assets/rpg-preview.webm", poster:"../assets/rpg-poster.jpg" } },
  { id:"hyper-swipe", title:"Swipe Rush", tags:["Hyper-casual"], cover:{avif:"../assets/hyper.avif", webp:"../assets/hyper.webp", fallback:"../assets/hyper.jpg"}, description:"Свайпы и чекпоинты.", tech:["WebGL","ECS"], popularity:74, date:"2025-05-22", linkDemo:"https://cdn.example.com/demos/hyper/index.html", linkStore:"https://store.example.com/app/hyper", playable:{ type:"inline-canvas", script:null } }
];

const el = {
  track: document.getElementById("track"),
  viewport: document.getElementById("viewport"),
  dots: document.getElementById("dots"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  tagContainer: document.getElementById("tagContainer"),
  sort: document.getElementById("sort"),
  search: document.getElementById("search"),
  reset: document.getElementById("reset"),
  themeToggle: document.getElementById("themeToggle"),

  lightbox: document.getElementById("lightbox"),
  lightboxClose: document.getElementById("lightboxClose"),
  playableFrame: document.getElementById("playableFrame"),
  playableCanvas: document.getElementById("playableCanvas"),
  playableVideo: document.getElementById("playableVideo"),
  projectDesc: document.getElementById("projectDesc"),
  projectTech: document.getElementById("projectTech"),
  demoLink: document.getElementById("demoLink"),
  storeLink: document.getElementById("storeLink"),
};
document.getElementById("year").textContent = new Date().getFullYear();

const Analytics = {
  onPlayableOpen (project){ console.log("[analytics] playable_open", project.id); },
  onPlayableClose(project){ console.log("[analytics] playable_close", project?.id ?? null); },
  onCTAClick(type, project){ console.log("[analytics] cta", type, project?.id ?? null); }
};

let state = { tag:"all", search:"", sort:"newest", index:0, filtered: PROJECTS, dragging:false, startX:0, scrollX:0, active: null };

initTags(); bindControls(); render();

function initTags(){
  const tags = Array.from(new Set(PROJECTS.flatMap(p=>p.tags))).sort();
  tags.forEach(tag=>{
    const b = document.createElement("button");
    b.className="chip"; b.type="button"; b.textContent=tag; b.dataset.tag=tag;
    b.addEventListener("click", ()=> selectTag(tag, b));
    el.tagContainer.appendChild(b);
  });
}
function selectTag(tag, btn){
  state.tag=tag; document.querySelectorAll(".chip").forEach(ch=> ch.classList.toggle("is-active", ch===btn || (ch.dataset.tag==="all" && tag==="all")));
  render();
}

function bindControls(){
  document.querySelector('.chip[data-tag="all"]').addEventListener("click",()=>{state.tag="all"; render();});
  el.sort.addEventListener("change",(e)=>{state.sort=e.target.value; render();});
  el.search.addEventListener("input",(e)=>{state.search=e.target.value.toLowerCase().trim(); render();});
  el.reset.addEventListener("click",()=>{ state={...state, tag:"all", search:"", sort:"newest", index:0}; el.search.value=""; el.sort.value="newest"; document.querySelectorAll(".chip").forEach(c=>c.classList.remove("is-active")); document.querySelector('.chip[data-tag="all"]').classList.add("is-active"); render(); });
  // theme
  el.themeToggle.addEventListener("click", () => {
    const dark = document.documentElement.classList.toggle("dark-forced");
    el.themeToggle.setAttribute("aria-pressed", String(dark));
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  });

  // nav
  el.prev.addEventListener("click", ()=> snapTo(state.index-1));
  el.next.addEventListener("click", ()=> snapTo(state.index+1));
  el.viewport.addEventListener("keydown", (e)=>{
    if (e.key === "ArrowLeft") snapTo(state.index-1);
    if (e.key === "ArrowRight") snapTo(state.index+1);
  });

  // drag/touch
  const vp = el.viewport;
  vp.addEventListener("pointerdown", onDown, {passive:true});
  vp.addEventListener("pointermove", onMove, {passive:false});
  vp.addEventListener("pointerup", onUp, {passive:true});
  vp.addEventListener("pointercancel", onUp, {passive:true});
  vp.addEventListener("pointerleave", onUp, {passive:true});
}
function onDown(e){
  state.dragging=true; state.startX=e.clientX; state.scrollX = el.viewport.scrollLeft; el.viewport.setPointerCapture(e.pointerId);
}
function onMove(e){
  if (!state.dragging) return;
  const dx = e.clientX - state.startX;
  el.viewport.scrollLeft = state.scrollX - dx;
  // предотвращаем вертикальный скролл, если горизонтальный доминирует
  if (Math.abs(dx) > 6) e.preventDefault();
}
function onUp(e){
  if (!state.dragging) return;
  state.dragging=false;
  const slideW = el.track.querySelector(".slide")?.getBoundingClientRect().width || 1;
  const targetIndex = Math.round(el.viewport.scrollLeft / (slideW + 12)); // 12 — gap
  snapTo(targetIndex);
}

function render(){
  const filtered = PROJECTS
    .filter(p=> state.tag==="all" || p.tags.includes(state.tag))
    .filter(p=> !state.search || (p.title.toLowerCase().includes(state.search) || p.tags.join(" ").toLowerCase().includes(state.search)));

  const sorted = filtered.sort((a,b)=>{
    if (state.sort==="title") return a.title.localeCompare(b.title);
    if (state.sort==="popular") return b.popularity - a.popularity;
    return new Date(b.date) - new Date(a.date);
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
  const s1 = document.createElement("source"); s1.type="image/avif"; s1.srcset = p.cover.avif;
  const s2 = document.createElement("source"); s2.type="image/webp"; s2.srcset = p.cover.webp;
  const img = document.createElement("img"); img.src=p.cover.fallback; img.alt = `${p.title} — обложка`; img.loading="lazy"; img.decoding="async";
  picture.append(s1,s2,img);
  media.appendChild(picture);

  const body = document.createElement("div"); body.className="slide__body";
  const h3 = document.createElement("h3"); h3.className="slide__title"; h3.textContent=p.title;
  const tags = document.createElement("div"); tags.className="slide__tags";
  p.tags.forEach(t=>{ const s=document.createElement("span"); s.className="tag"; s.textContent=t; tags.appendChild(s); });
  const desc = document.createElement("p"); desc.className="slide__desc"; desc.textContent=p.description;

  const row = document.createElement("div"); row.style.display="flex"; row.style.gap="8px"; row.style.flexWrap="wrap";
  const playBtn = document.createElement("button"); playBtn.className="btn primary"; playBtn.textContent="Play"; playBtn.addEventListener("click",()=> openLightbox(p));
  const demo = document.createElement("a"); demo.className="btn"; demo.href=p.linkDemo; demo.target="_blank"; demo.rel="noopener"; demo.textContent="Demo"; demo.addEventListener("click",()=> Analytics.onCTAClick("demo", p));
  const store = document.createElement("a"); store.className="btn"; store.href=p.linkStore; store.target="_blank"; store.rel="noopener"; store.textContent="Store"; store.addEventListener("click",()=> Analytics.onCTAClick("store", p));
  row.append(playBtn, demo, store);

  body.append(h3,tags,desc,row);
  li.append(media, body);
  return li;
}

function buildDots(n){
  el.dots.innerHTML = "";
  for (let i=0;i<n;i++){
    const b = document.createElement("button"); b.className="dot"; b.setAttribute("role","tab"); b.setAttribute("aria-selected", i===0 ? "true" : "false");
    b.addEventListener("click", ()=> snapTo(i));
    el.dots.appendChild(b);
  }
}

function snapTo(i){
  const count = state.filtered.length;
  state.index = Math.max(0, Math.min(i, count-1));
  const slide = el.track.querySelectorAll(".slide")[state.index];
  if (!slide) return;
  const slideRect = slide.getBoundingClientRect();
  const vpRect = el.viewport.getBoundingClientRect();
  const delta = slide.offsetLeft - el.viewport.scrollLeft; // left within track
  // smooth scroll via rAF
  smoothScrollTo(el.viewport, delta, 200);

  // update dots
  const dots = el.dots.querySelectorAll(".dot");
  dots.forEach((d,idx)=>{ d.classList.toggle("is-active", idx===state.index); d.setAttribute("aria-selected", idx===state.index ? "true":"false"); });
}

function smoothScrollTo(container, deltaLeft, duration=200){
  const start = container.scrollLeft;
  const end = deltaLeft + start;
  const t0 = performance.now();
  (function tick(t){
    const p = Math.min(1, (t - t0) / duration);
    const ease = p<.5 ? 2*p*p : -1+(4-2*p)*p; // easeInOutQuad
    container.scrollLeft = start + (end - start) * ease;
    if (p<1) requestAnimationFrame(tick);
  })(t0);
}

/* Lightbox — тот же код, адаптированный */
let prevFocus=null, activeProject=null, rafPlay=null, t00=0, ctx=null;
function openLightbox(project){
  activeProject = project; prevFocus=document.activeElement;
  el.lightbox.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
  document.getElementById("lightbox-title").textContent = project.title;
  el.projectDesc.textContent = project.description;
  el.projectTech.innerHTML = project.tech.map(t=>`<li class="tag">${t}</li>`).join("");
  el.demoLink.href = project.linkDemo; el.storeLink.href = project.linkStore;
  [el.playableFrame, el.playableCanvas, el.playableVideo].forEach(n=> n.hidden=true);

  if (project.playable.type==="iframe"){ el.playableFrame.hidden=false; el.playableFrame.src=project.playable.src; }
  else if (project.playable.type==="inline-canvas"){ el.playableCanvas.hidden=false; startInlinePlayable(el.playableCanvas); }
  else { el.playableVideo.hidden=false; el.playableVideo.poster=project.playable.poster||""; el.playableVideo.src=project.playable.src; }

  trapFocus(el.lightbox); el.lightbox.querySelector(".lightbox__dialog").focus();
  Analytics.onPlayableOpen(project);
}
function closeLightbox(){
  if (el.lightbox.getAttribute("aria-hidden")==="true") return;
  el.lightbox.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
  el.playableFrame.src="about:blank";
  el.playableVideo.pause(); el.playableVideo.removeAttribute("src"); el.playableVideo.load();
  stopInlinePlayable();
  Analytics.onPlayableClose(activeProject);
  activeProject=null;
  if (prevFocus) prevFocus.focus();
}
document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
el.lightbox.addEventListener("click",(e)=>{ if (e.target.hasAttribute("data-close")) closeLightbox(); });
document.addEventListener("keydown",(e)=>{ if (e.key==="Escape") closeLightbox(); });

function trapFocus(container){
  const sels = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, video, audio, [tabindex]:not([tabindex="-1"])';
  const nodes = container.querySelectorAll(sels); const first=nodes[0], last=nodes[nodes.length-1];
  container.onkeydown = (e)=>{
    if (e.key!=="Tab") return;
    if (e.shiftKey && document.activeElement===first){ last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement===last){ first.focus(); e.preventDefault(); }
  };
}
function startInlinePlayable(canvas){
  ctx = canvas.getContext("2d"); t00 = performance.now();
  const loop = (t)=>{
    const w=canvas.width, h=canvas.height;
    ctx.fillStyle="#000"; ctx.fillRect(0,0,w,h);
    const r=20, x=(w/2)+Math.sin(t/500)*(w/3), y=(h/2)+Math.cos(t/800)*(h/3);
    ctx.fillStyle="#2563eb"; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    rafPlay=requestAnimationFrame(loop);
  }; rafPlay=requestAnimationFrame(loop);
}
function stopInlinePlayable(){ if (rafPlay) cancelAnimationFrame(rafPlay); }

/* Keyboard shortcut */
document.addEventListener("keydown",(e)=>{ if (e.key==="/"){ e.preventDefault(); el.search.focus(); }});
