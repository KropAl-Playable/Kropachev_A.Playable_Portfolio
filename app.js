/* I18N + описание на RU/EN */
const USER_LANG = (navigator.language || navigator.userLanguage || "ru").toLowerCase();
const IS_RU = USER_LANG.startsWith("ru");
const I18N = {
  ru:{title:"Playable Ads Портфолио — Kropachev Aleksey",heroTitle:"Playable Ads портфолио",tagline:"Специалист в области разработки Playable Ads с опытом в дизайне и программировании. Эксперт в создании интерактивных рекламных материалов, включая 2D/3D-анимацию и UI/UX-дизайн, с упором на результативность. Обладаю навыками управления проектами, формирования эффективных процессов разработки и внедрения нестандартных решений. Постоянно совершенствуюсь, изучаю новые технологии и подходы, чтобы повышать качество проектов и добиваться ощутимых результатов",contactCta:"Связаться",genre:"Тег",forProject:"Проект",order:"Порядок",newer:"Новее",older:"Старее",search:"Поиск",searchPlaceholder:"Поиск по названию/тегам",reset:"Сброс",masonry:"Masonry-вид",play:"Play",store:"Страница в магазине",contactsTitle:"Контакты",contactsText:"Открыт к контрактам и проектам.",toggleOrientation:"Ориентация",allGenres:"Все теги",allProjects:"Все проекты",projectsCount:n=>`${n} проектов`},
  en:{title:"Playable Ads Portfolio — Kropachev Aleksey",heroTitle:"Playable Ads Portfolio",tagline:"A specialist in the field of Playable Ads development with experience in design and programming. An expert in creating interactive advertising materials, including 2D/3D animation and UI/UX design, with an emphasis on effectiveness. I have the skills of project management, formation of effective processes for the development and implementation of non-standard solutions. I am constantly improving, exploring new technologies and approaches in order to improve the quality of projects and achieve tangible results.",contactCta:"Contact",genre:"Tag",forProject:"Client/Project",order:"Order",newer:"Newer",older:"Older",search:"Search",searchPlaceholder:"Search by title/tags",reset:"Reset",masonry:"Masonry view",play:"Play",store:"Store page",contactsTitle:"Contacts",contactsText:"Open for contracts and projects.",toggleOrientation:"Orientation",allGenres:"All tags",allProjects:"All projects",projectsCount:n=>`${n} projects`}
};
const T = IS_RU ? I18N.ru : I18N.en;
try{ document.documentElement.setAttribute("lang", IS_RU ? "ru":"en"); }catch{}

function applyI18N(){
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k=el.getAttribute("data-i18n"), v=T[k]; if(typeof v==="function")return; if(v) el.textContent=v;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{
    const k=el.getAttribute("data-i18n-placeholder"); if(T[k]) el.setAttribute("placeholder", T[k]);
  });
  document.title=T.title;
}
applyI18N();

function getDescription(p){ return IS_RU ? (p.description || p.description_en || "") : (p.description_en || p.description || ""); }

/* device detect */
function isHandheld(){
  const d=navigator.userAgentData; if(d&&Array.isArray(d.brands)) return d.mobile===true;
  const ua=navigator.userAgent; return /Android|iPhone|iPad|iPod|Mobile|Windows Phone|Tablet|Kindle|Silk/i.test(ua);
}

/* elements/state */
let ALL=[]; let state={genre:"all",forProject:"all",order:"newest",search:"",masonry:false,activeProject:null,orientation:"portrait"};
const el={
  gallery:document.getElementById("gallery"), projectCount:document.getElementById("projectCount"),
  genre:document.getElementById("genre"), forProject:document.getElementById("forProject"), order:document.getElementById("order"),
  search:document.getElementById("search"), reset:document.getElementById("reset"), masonryToggle:document.getElementById("masonryToggle"),
  themeToggle:document.getElementById("themeToggle"),
  lightbox:document.getElementById("lightbox"), lightboxClose:document.getElementById("lightboxClose"),
  phoneFrame:document.getElementById("phoneFrame"), orientationToggle:document.getElementById("orientationToggle"),
  playableFrame:document.getElementById("playableFrame"), projectDesc:document.getElementById("projectDesc"), projectTech:document.getElementById("projectTech"),
  storeLink:document.getElementById("storeLink")
};
const Analytics={ onPlayableOpen(p){console.log("[analytics] playable_open",p.id)}, onPlayableClose(p){console.log("[analytics] playable_close",p?.id??null)}, onCTAClick(t,p){console.log("[analytics] cta",t,p?.id??null)} };

document.getElementById("year").textContent=new Date().getFullYear();
boot();

async function boot(){
  try{
    const res=await fetch("projects.json",{cache:"no-store"}); if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const json=await res.json(); ALL=json.projects||[];
    buildFilters(ALL); bindControls(); render();
  }catch(e){
    console.error("Не удалось загрузить projects.json",e);
    const box=document.createElement("div"); box.role="alert"; box.style.cssText="margin:16px;padding:12px;border:1px solid #f00;border-radius:8px";
    box.textContent=IS_RU?"Ошибка загрузки projects.json. Проверьте путь/JSON и откройте через http://":"Failed to load projects.json. Check path/JSON and open via http://";
    document.body.prepend(box);
  }
}

function buildFilters(list){
  [...new Set(list.flatMap(p=>p.genres))].sort().forEach(g=>{ const o=document.createElement("option"); o.value=g; o.textContent=g; el.genre.appendChild(o); });
  [...new Set(list.map(p=>p.forProject))].sort().forEach(pr=>{ const o=document.createElement("option"); o.value=pr; o.textContent=pr; el.forProject.appendChild(o); });
}

function bindControls(){
  el.genre.addEventListener("change",e=>{state.genre=e.target.value; render();});
  el.forProject.addEventListener("change",e=>{state.forProject=e.target.value; render();});
  el.order.addEventListener("change",e=>{state.order=e.target.value; render();});
  el.search.addEventListener("input",e=>{state.search=e.target.value.toLowerCase().trim(); rafRender();});
  el.reset.addEventListener("click",()=>{state.genre="all";state.forProject="all";state.order="newest";state.search=""; el.genre.value="all";el.forProject.value="all";el.order.value="newest";el.search.value=""; render();});
  el.masonryToggle.addEventListener("change",(e)=>{state.masonry=e.target.checked; el.gallery.classList.toggle("masonry",state.masonry);});
  el.themeToggle.addEventListener("click",()=>{ const dark=document.documentElement.classList.toggle("dark-forced"); el.themeToggle.setAttribute("aria-pressed",String(dark)); document.documentElement.style.colorScheme=dark?"dark":"light"; });

  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeLightbox(); if(e.key==="/"&&document.activeElement===document.body){ e.preventDefault(); el.search.focus(); }});
  el.orientationToggle.addEventListener("click",toggleOrientation);
}

let rafId=null; function rafRender(){ cancelAnimationFrame(rafId); rafId=requestAnimationFrame(render); }

function render(){
  const filtered=ALL
    .filter(p=>state.genre==="all"||p.genres.includes(state.genre))
    .filter(p=>state.forProject==="all"||p.forProject===state.forProject)
    .filter(p=>!state.search||(p.title.toLowerCase().includes(state.search)||p.tags.join(" ").toLowerCase().includes(state.search)));
  const sorted=filtered.sort((a,b)=> (state.order==="newest"? (new Date(b.date)-new Date(a.date)) : (new Date(a.date)-new Date(b.date))));
  el.projectCount.textContent=T.projectsCount(sorted.length);

  el.gallery.innerHTML=""; const frag=document.createDocumentFragment();
  sorted.forEach(p=>frag.appendChild(createCard(p)));
  el.gallery.appendChild(frag); setupIntersection();
}

function createCard(p){
  const article=document.createElement("article"); article.className="card"; article.setAttribute("role","article"); article.setAttribute("aria-labelledby",`${p.id}-title`);

  const media=document.createElement("div"); media.className="card__media";
  const picture=document.createElement("picture"); picture.innerHTML=`
    <img src="${p.cover.fallback}" alt="${p.title} — cover" loading="lazy" decoding="async">`;
  media.appendChild(picture);

  const body=document.createElement("div"); body.className="card__body";
  const h3=document.createElement("h3"); h3.className="card__title"; h3.id=`${p.id}-title`; h3.textContent=p.title;
  const tags=document.createElement("div"); tags.className="card__tags";
  p.genres.forEach(t=>{ const s=document.createElement("span"); s.className="tag"; s.textContent=t; tags.appendChild(s); });
  const meta=document.createElement("div"); meta.className="card__tags"; const pr=document.createElement("span"); pr.className="tag"; pr.textContent=p.forProject; meta.appendChild(pr);
  const desc=document.createElement("p"); desc.className="card__desc"; desc.textContent=getDescription(p);

  const actions=document.createElement("div"); actions.className="card__actions";
  const playBtn=document.createElement("button"); playBtn.className="btn primary"; playBtn.type="button"; playBtn.textContent=T.play; playBtn.addEventListener("click",(e)=>{e.stopPropagation(); onPlay(p);});
  const store=document.createElement("a"); store.className="btn"; store.href=p.linkStore; store.target="_blank"; store.rel="noopener"; store.textContent=T.store; store.addEventListener("click",(e)=>{e.stopPropagation(); Analytics.onCTAClick("store",p);});
  actions.append(playBtn,store);

  body.append(h3,tags,meta,desc,actions);
  article.append(media,body);

  // клик по карточке/превью
  article.addEventListener("click",()=>onPlay(p));
  media.addEventListener("click",(e)=>{e.stopPropagation(); onPlay(p);});
  return article;
}

function onPlay(project){
  const handheld=isHandheld(); const url=project.linkDemo||project.playable?.src||"#";
  if(handheld){ window.open(url,"_blank","noopener"); Analytics.onCTAClick("play_newtab",project); }
  else { openLightbox(project,url); }
}

/* IO */
let io; function setupIntersection(){ if(io) io.disconnect(); io=new IntersectionObserver((entries)=>{ entries.forEach(en=>{ if(en.isIntersecting) io.unobserve(en.target); }); },{rootMargin:"200px"}); document.querySelectorAll(".card").forEach(c=>io.observe(c)); }

/* Lightbox */
let prevFocus=null;
function openLightbox(project,url){
  state.activeProject=project; prevFocus=document.activeElement;
  el.lightbox.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
  document.getElementById("lightbox-title").textContent=project.title;
  el.projectDesc.textContent=getDescription(project);
  el.projectTech.innerHTML=project.tags.map(t=>`<li class="tag">${t}</li>`).join("");
  el.storeLink.href=project.linkStore;
  state.orientation="portrait"; el.phoneFrame.classList.remove("landscape");
  el.playableFrame.src=url; trapFocus(el.lightbox); el.lightbox.querySelector(".lightbox__dialog").focus(); Analytics.onPlayableOpen(project);
}
function closeLightbox(){
  if(el.lightbox.getAttribute("aria-hidden")==="true") return;
  el.lightbox.setAttribute("aria-hidden","true"); document.body.style.overflow="";
  el.playableFrame.src="about:blank"; Analytics.onPlayableClose(state.activeProject); state.activeProject=null; if(prevFocus) prevFocus.focus();
}
document.getElementById("lightboxClose").addEventListener("click",closeLightbox);
el.lightbox.addEventListener("click",(e)=>{ if(e.target.hasAttribute("data-close")) closeLightbox(); });
document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeLightbox(); });

function toggleOrientation(){ state.orientation = state.orientation==="portrait" ? "landscape" : "portrait"; el.phoneFrame.classList.toggle("landscape", state.orientation==="landscape"); }

function trapFocus(c){
  const sel='a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),iframe,video,audio,[tabindex]:not([tabindex="-1"])';
  const nodes=c.querySelectorAll(sel); const first=nodes[0], last=nodes[nodes.length-1];
  c.onkeydown=(e)=>{ if(e.key!=="Tab") return; if(e.shiftKey&&document.activeElement===first){ last.focus(); e.preventDefault(); } else if(!e.shiftKey&&document.activeElement===last){ first.focus(); e.preventDefault(); } };
}
