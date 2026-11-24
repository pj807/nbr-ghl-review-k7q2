(function(){
const ITEMS = window.NBR_ITEMS || [], C = window.NBRC, REPORT = "Cleanup";
const VL = {"KEEP":"Keep","CHECK":"Check","SHUT DOWN":"Shut down"}, VC = {"KEEP":"KEEP","CHECK":"CHECK","SHUT DOWN":"SHUT"};
const DEC = [["Keep","keep"],["Shut down","shut"],["Not sure","unsure"]];
const GROUPS = ["Active and in use","Active but not in use","Not active"];
const TYPES = {funnel:"Funnel",website:"Website",workflow:"Automation",product:"Product",form:"Form",survey:"Survey",calendar:"Calendar"};
const $ = s => document.querySelector(s);
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const st = {g:"", v:"", t:"", q:"", mine:false, open:new Set(), view:"list"};
const GSLUG = {"in-use":"Active and in use","not-in-use":"Active but not in use","not-active":"Not active"};
const decClass = d => d==="Keep"?"d-keep":d==="Shut down"?"d-shut":"d-unsure";

/* who bar */
function renderWho(msg){
  const w=$("#who");
  if(C.ready()){ w.innerHTML=`<div class="who-bar">Answering as <b>${esc(C.name())}</b><button class="btn ghost" type="button" id="chg">Change</button>${msg?`<span class="err">${esc(msg)}</span>`:""}</div>`; $("#chg").onclick=()=>{C.setWho("",""); renderWho(); render();}; return; }
  w.innerHTML=`<form class="who-bar" id="whof"><span>To answer, enter your name and the team code:</span><input id="wn" placeholder="Your name" aria-label="Your name" autocomplete="name"><input id="wc" placeholder="Team code" aria-label="Team code"><button type="submit">Start</button><span class="err" id="werr">${esc(msg||"")}</span></form>`;
  $("#whof").onsubmit=async e=>{e.preventDefault(); const n=$("#wn").value.trim(), c=$("#wc").value.trim();
    if(!n){$("#werr").textContent="Enter your name first.";return;} if(!c){$("#werr").textContent="Enter the team code.";return;}
    C.setWho(n,c); const r=await C.load(); if(!r.ok){ C.setWho(n,""); renderWho(r.error==="code"?"That team code didn't work.":"Couldn't reach the sheet. Try again."); return; } renderWho(); render(); };
}

/* answers */
const latestFor = id => C.latest(REPORT).filter(r=>r.id===id);
const myLatest = id => latestFor(id).find(r=>r.name.toLowerCase()===C.name().toLowerCase());
function status(id){ const v=latestFor(id).filter(r=>r.decision!=="Not sure"); if(!latestFor(id).length) return "none"; if(!v.length) return "unsure"; return v.every(r=>r.decision===v[0].decision)?"agreed":"disputed"; }

function renderStats(){
  const by=g=>ITEMS.filter(i=>i.g===g).length;
  const vc=v=>ITEMS.filter(i=>i.v===v).length;
  const ag=ITEMS.filter(i=>status(i.id)==="agreed").length, dis=ITEMS.filter(i=>status(i.id)==="disputed").length;
  $("#stats").innerHTML=`<div class="stat k"><div class="n">${by(GROUPS[0])}</div><div class="l">Active and in use</div></div><div class="stat c"><div class="n">${by(GROUPS[1])}</div><div class="l">Active but not in use</div></div><div class="stat s"><div class="n">${by(GROUPS[2])}</div><div class="l">Not active</div></div><div class="stat"><div class="n">${ag}<span style="font-size:15px;color:var(--muted)"> agreed · ${dis} disputed</span></div><div class="l">Keep ${vc("KEEP")} · Check ${vc("CHECK")} · Shut down ${vc("SHUT DOWN")}</div></div>`;
  $("#subcount").textContent=C.rows().length?`(${C.latest().length})`:"";
}
function chipRow(el, opts, key){
  el.innerHTML=""; opts.forEach(([val,lab])=>{ const b=document.createElement("button"); b.type="button"; b.textContent=lab; b.setAttribute("aria-pressed",String(st[key]===val)); b.onclick=()=>{st[key]=val; renderFilters(); renderList();}; el.append(b); });
}
function renderFilters(){
  chipRow($("#gfilters"), [["","All groups"]].concat(GROUPS.map(g=>[g,`${g} (${ITEMS.filter(i=>i.g===g).length})`])), "g");
  chipRow($("#vfilters"), [["","Any verdict"],["KEEP","Keep"],["CHECK","Check"],["SHUT DOWN","Shut down"]], "v");
}
function visible(i){
  if(st.g && i.g!==st.g) return false; if(st.v && i.v!==st.v) return false; if(st.t && i.t!==st.t) return false;
  if(st.q){ const q=st.q.toLowerCase(); if(!(i.n+" "+i.a).toLowerCase().includes(q)) return false; }
  if(st.mine && C.ready() && myLatest(i.id)) return false;
  return true;
}
function swim(flow,id){
  const lanes=["customer","ghl","team"], ln={customer:"Customer",ghl:"GHL auto",team:"Team"};
  const n=flow.steps.length, col=150, left=84, W=Math.max(680,left+n*col+10), LH=74, bw=130, bh=50;
  const short=s=>s.length>20?s.slice(0,19)+"…":s;
  const pos=flow.steps.map((s,i)=>({x:left+i*col+(col-bw)/2,y:6+Math.max(0,lanes.indexOf(s.l))*(LH+6)+(LH-bh)/2,s}));
  let o=`<svg viewBox="0 0 ${W} ${6+3*(LH+6)}" style="min-width:${Math.min(W,1400)}px" role="img" aria-label="Flowchart in three lanes: customer, GHL automatic and team."><defs><marker id="m-${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" stroke-width="1.5"/></marker></defs>`;
  lanes.forEach((l,i)=>{const y=6+i*(LH+6); o+=`<rect x="0" y="${y}" width="${W}" height="${LH}" rx="8" fill="var(--soft)"/><text x="10" y="${y+LH/2+4}" font-size="12" font-weight="600" fill="var(--muted)">${ln[l]}</text>`;});
  pos.forEach((p,i)=>{ if(!i) return; const a=pos[i-1],x1=a.x+bw,y1=a.y+bh/2,x2=p.x,y2=p.y+bh/2,mx=x1+(x2-x1)/2;
    o+= y1===y2?`<line x1="${x1}" y1="${y1}" x2="${x2-2}" y2="${y2}" stroke="var(--muted)" color="var(--muted)" stroke-width="1.3" marker-end="url(#m-${id})"/>`:`<path d="M${x1} ${y1} L${mx} ${y1} L${mx} ${y2} L${x2-2} ${y2}" fill="none" stroke="var(--muted)" color="var(--muted)" stroke-width="1.3" marker-end="url(#m-${id})"/>`; });
  pos.forEach((p,i)=>{ const c=p.s.l==="customer"?["--green-bg","--green"]:p.s.l==="team"?["--amber-bg","--amber"]:["--blue-bg","--blue"];
    o+=`<g><title>${esc(p.s.x)}: ${esc(p.s.d)}</title><rect x="${p.x}" y="${p.y}" width="${bw}" height="${bh}" rx="8" fill="var(${c[0]})" stroke="var(${c[1]})" stroke-width="1.2"/><text x="${p.x+bw/2}" y="${p.y+21}" text-anchor="middle" font-size="12.5" font-weight="600" fill="var(${c[1]})">${esc(short(p.s.x))}</text><text x="${p.x+bw/2}" y="${p.y+38}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(i===0?"Start":(p.s.w||"next"))}</text></g>`; });
  return o+"</svg>";
}
function detail(i){
  let h=`<p class="gnames">Status in GHL: ${esc(i.s)}${i.ppl?` · People in it now: ${esc(i.ppl)}`:""}</p>`;
  if(i.flow){ const f=i.flow;
    if(f.purpose) h+=`<p>${esc(f.purpose)}</p>`; if(f.when) h+=`<p class="note">${esc(f.when)}</p>`;
    h+=`<div class="svgwrap">${swim(f,i.id)}</div><p class="legend">Green: customer · Blue: GHL automatic · Amber: team by hand. Hover a box for the full step. Scroll sideways if it's wide.</p>`;
    if(f.plain && f.plain.length) h+=`<div><p class="note" style="margin-bottom:6px">Step by step</p><ol style="margin:0;padding-left:20px;display:grid;gap:4px;font-size:14px">${f.plain.map(p=>`<li>${esc(p)}</li>`).join("")}</ol></div>`;
    if(f.wait) h+=`<p class="note">Longest wait: ${esc(f.wait)}</p>`;
  }
  if(i.emails && i.emails.length){
    h+=`<div><p class="note" style="margin-bottom:8px">Messages in this automation (${i.emails.length}): click a preview to see the full email</p><div class="egrid">${i.emails.map((e,n)=>`<div class="ecard">${e.shot&&!(window.NBR_PUBLIC&&e.sens)?`<a href="${esc(e.shot)}" target="_blank" rel="noopener" class="ethumb"><img loading="lazy" src="${esc(e.shot)}" alt="Preview of the email: ${esc(e.subj)}"></a>`:`<div class="ethumb enone">${e.shot?"Preview hidden: it shows a coupon code or contact details. Read the text below.":e.ch==="email"?"No preview captured":"Text message"}</div>`}${e.mob&&!(window.NBR_PUBLIC&&e.sens)?"":""}<div class="ebody"><p class="etitle">${n+1}. ${esc(e.subj||"(no subject)")}</p><p class="gnames">${esc(e.ch==="email"?"Email":"Text")}${e.from?" · from "+esc(e.from):""}${e.score?" · design score "+esc(e.score)+"/10":""}</p>${e.mob&&!(window.NBR_PUBLIC&&e.sens)?`<p><a href="${esc(e.mob)}" target="_blank" rel="noopener">Phone view</a></p>`:""}${e.body?`<details><summary>Read the text</summary><div class="etext">${esc(e.body)}</div></details>`:""}</div></div>`).join("")}</div></div>`;
  }
  return h;
}

// Hover / tap summaries for the Keep, Check, Shut down and Problem labels
const TIPHEAD={"KEEP":"Keep: still needed","CHECK":"Check: needs a yes/no answer","SHUT DOWN":"Shut down: safe to switch off"};
function tipFor(i,k){
  if(k==="p") return `<b>Problem</b><span>${esc(i.prob)}</span>${i.fix?`<span class="tl">What to do</span><span>${esc(i.fix)}</span>`:""}`;
  let h=`<b>${esc(TIPHEAD[i.v]||i.v)}</b>${i.why?`<span>${esc(i.why)}</span>`:""}`;
  if(i.q) h+=`<span class="tl">Question${i.who?" for "+esc(i.who):""}</span><span>${esc(i.q)}</span>`;
  else if(i.do) h+=`<span class="tl">Suggested</span><span>${esc(i.do)}</span>`;
  if(i.note) h+=`<span class="tl">Note</span><span>${esc(i.note)}</span>`;
  return h;
}
const TIP=document.createElement("div"); TIP.className="ftip"; TIP.setAttribute("role","tooltip"); TIP.hidden=true; document.body.appendChild(TIP);
let tipEl=null;
function showTip(el){ const i=ITEMS.find(x=>x.id===el.dataset.tip); if(!i) return; tipEl=el;
  TIP.innerHTML=tipFor(i,el.dataset.k); TIP.hidden=false;
  const r=el.getBoundingClientRect(), w=Math.min(320, innerWidth-16); TIP.style.width=w+"px";
  const x=Math.min(Math.max(8, r.left+r.width/2-w/2), innerWidth-w-8);
  let y=r.bottom+8; const h=TIP.offsetHeight; if(y+h>innerHeight-8) y=Math.max(8, r.top-h-8);
  TIP.style.left=x+"px"; TIP.style.top=y+"px"; }
function hideTip(){ TIP.hidden=true; tipEl=null; }
const tipOf=e=>e.target&&e.target.closest?e.target.closest("[data-tip]"):null;
let touchy=false, wasOpen=false;
document.addEventListener("pointerdown",e=>{touchy=e.pointerType!=="mouse"; const t=tipOf(e); wasOpen=!!t&&tipEl===t&&!TIP.hidden;},true);
document.addEventListener("mouseover",e=>{if(touchy) return; const t=tipOf(e); if(t) showTip(t);});
document.addEventListener("mouseout",e=>{if(touchy) return; const t=tipOf(e); if(t&&!(e.relatedTarget&&t.contains(e.relatedTarget))) hideTip();});
document.addEventListener("focusin",e=>{if(touchy) return; const t=tipOf(e); if(t) showTip(t);});
document.addEventListener("focusout",e=>{if(!touchy&&tipOf(e)) hideTip();});
document.addEventListener("click",e=>{const t=tipOf(e); if(t){ if(touchy&&wasOpen) hideTip(); else showTip(t);} else hideTip();});
document.addEventListener("keydown",e=>{if(e.key==="Escape") hideTip();});
addEventListener("scroll",()=>{if(!touchy) hideTip();},{passive:true}); addEventListener("resize",hideTip);

function card(i){
  const s=status(i.id), my=C.ready()?myLatest(i.id):null;
  const el=document.createElement("article"); el.className="card"+(s==="disputed"?" flag-disputed":""); el.id="item-"+i.id;
  const others=latestFor(i.id).filter(r=>!C.ready()||r.name.toLowerCase()!==C.name().toLowerCase());
  el.innerHTML=`<div class="head"><div><div class="title">${esc(i.n)}</div><div class="gnames">${esc(TYPES[i.t]||i.t)} · ${esc(i.a)} · ${esc(i.g)}</div></div>
    <div class="tags"><span class="chip v-${VC[i.v]||"CHECK"} hastip" tabindex="0" data-tip="${esc(i.id)}" data-k="v">${esc(VL[i.v]||i.v)}</span>${i.emails&&i.emails.length?`<span class="chip v-AUTO">${i.emails.length} message${i.emails.length>1?"s":""}</span>`:""}${i.prob?`<span class="chip v-PROB hastip" tabindex="0" data-tip="${esc(i.id)}" data-k="p">Problem</span>`:""}${s==="disputed"?'<span class="chip v-CHECK">People disagree</span>':""}${s==="agreed"?'<span class="chip v-AUTO">Agreed</span>':""}</div>
    ${i.why?`<p class="reason">${esc(i.why)}</p>`:""}
    <p class="meta">Last 60 days: ${esc(i.act||"not shown")}${i.last&&i.last!=="not shown"?` · Last activity: ${esc(i.last)}`:""}${i.do?` · Suggested: ${esc(i.do)}`:""}</p>
    ${i.prob?`<p class="meta" style="color:var(--red)"><b>Problem:</b> ${esc(i.prob)}${i.fix?` <b>What to do:</b> ${esc(i.fix)}`:""}</p>`:""}${i.note?`<p class="meta"><b>Note:</b> ${esc(i.note)}</p>`:""}
    ${i.q?`<p class="reason"><b>Question${i.who?" for "+esc(i.who):""}:</b> ${esc(i.q)}</p>`:""}
    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;grid-column:1/-1"><button class="toggle" type="button">${i.flow?"Show how it works":"Show details"}</button>${i.ghl?`<a class="toggle" href="${esc(i.ghl)}" target="_blank" rel="noopener">Open in GHL ↗</a>`:""}</div></div>
    <div class="detail" hidden></div>
    <div class="decide"><div class="btns"><span class="lab">Your call:</span>${DEC.map(([l,c])=>`<button type="button" class="opt" data-c="${c}" data-l="${l}" aria-pressed="${my&&my.decision===l}">${l}</button>`).join("")}</div>
    <div class="savebar"><textarea class="notebox" placeholder="Add a note (optional)" aria-label="Note for ${esc(i.n)}">${esc(my?my.note:"")}</textarea></div>
    <div class="savebar"><button class="btn ghost savenote" type="button">Save note</button><span class="saved"></span></div>
    ${others.length?`<div class="others">${others.map(r=>`<div class="o"><b>${esc(r.name)}</b>: <span class="${decClass(r.decision)}">${esc(r.decision)}</span>${r.note?" · “"+esc(r.note)+"”":""}</div>`).join("")}</div>`:""}</div>`;
  const det=el.querySelector(".detail"), tg=el.querySelector(".toggle");
  const open=()=>{ if(!det.innerHTML) det.innerHTML=detail(i); det.hidden=false; tg.textContent="Hide details"; st.open.add(i.id); };
  if(st.open.has(i.id)) open();
  tg.onclick=()=>{ if(det.hidden) open(); else { det.hidden=true; tg.textContent=i.flow?"Show how it works":"Show details"; st.open.delete(i.id);} };
  const saved=el.querySelector(".saved"), ta=el.querySelector(".notebox");
  const send=async(decision)=>{
    if(!C.ready()){ renderWho("Enter your name and the team code first."); $("#who").scrollIntoView({behavior:"smooth"}); return; }
    saved.textContent="Saving…";
    const r=await C.submit({report:REPORT,id:i.id,item:i.n,decision,note:ta.value.trim()});
    if(r.ok){ saved.textContent="Saved"; setTimeout(()=>render(),400); }
    else saved.textContent = r.error==="code" ? "The team code didn't work. Click Change at the top." : "Couldn't save. Check your connection and try again.";
  };
  el.querySelectorAll(".opt").forEach(b=>b.onclick=()=>send(b.dataset.l));
  el.querySelector(".savenote").onclick=()=>{ const d=(myLatest(i.id)||{}).decision; if(!d){ saved.textContent="Pick Keep, Shut down or Not sure first."; return; } send(d); };
  return el;
}
function renderList(){
  const box=$("#list"), y=scrollY; box.innerHTML="";
  hideTip();
  const list=ITEMS.filter(visible);
  document.querySelectorAll("#viewsw button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===st.view)));
  $("#count").textContent=`Showing ${list.length} of ${ITEMS.length}`;
  if(!list.length){ box.innerHTML='<p class="note">Nothing matches these filters.</p>'; return; }
  if(st.view==="list"){
    GROUPS.forEach(g=>{ const part=list.filter(i=>i.g===g); if(!part.length) return;
      const h=document.createElement("div"); h.className="grouphead"; h.innerHTML=`<h3>${esc(g)}</h3><span class="note">${part.length} items</span>`; box.append(h);
      const w=document.createElement("div"); w.className="tablewrap";
      w.innerHTML=`<table class="subtable"><thead><tr><th>Name</th><th>Type</th><th>Area</th><th>Last 60 days</th><th>Verdict</th><th>Answers</th></tr></thead><tbody>${part.map(i=>{const a=latestFor(i.id), s=status(i.id);return `<tr><td><a href="#item-${esc(i.id)}" data-open="${esc(i.id)}">${esc(i.n)}</a>${i.ghl?` <a href="${esc(i.ghl)}" target="_blank" rel="noopener" class="note" title="Open in GHL">↗</a>`:""}</td><td>${esc(TYPES[i.t]||i.t)}</td><td>${esc(i.a)}</td><td class="note">${esc((i.act||"").slice(0,70))}</td><td><span class="chip v-${VC[i.v]||"CHECK"} hastip" tabindex="0" data-tip="${esc(i.id)}" data-k="v">${esc(VL[i.v]||i.v)}</span>${i.prob?` <span class="chip v-PROB hastip" tabindex="0" data-tip="${esc(i.id)}" data-k="p">Problem</span>`:""}</td><td class="note">${a.length?`${a.length}${s==="disputed"?" · disagree":s==="agreed"?" · agreed":""}`:"–"}</td></tr>`}).join("")}</tbody></table>`;
      box.append(w); });
    box.querySelectorAll("[data-open]").forEach(a=>a.onclick=e=>{e.preventDefault(); st.view="cards"; jumpTo(a.dataset.open);});
    scrollTo(0,y); return;
  }
  GROUPS.forEach(g=>{ const part=list.filter(i=>i.g===g); if(!part.length) return;
    const h=document.createElement("div"); h.className="grouphead"; h.innerHTML=`<h3>${esc(g)}</h3><span class="note">${part.length} items</span>`; box.append(h);
    part.forEach(i=>box.append(card(i))); });
  scrollTo(0,y);
}
/* submissions tab */
function renderSubs(){
  const all=C.rows(), lat=$("#hist").checked?all.slice():C.latest();
  const people=[...new Set(all.map(r=>r.name))].sort(), decs=[...new Set(all.map(r=>r.decision))].sort();
  const sp=$("#sperson"), sd=$("#sdec"), pv=sp.value, dv=sd.value;
  sp.innerHTML='<option value="">Everyone</option>'+people.map(p=>`<option>${esc(p)}</option>`).join(""); sp.value=pv;
  sd.innerHTML='<option value="">Any answer</option>'+decs.map(p=>`<option>${esc(p)}</option>`).join(""); sd.value=dv;
  const rep=$("#sreport").value, q=$("#sq").value.toLowerCase();
  const rows=lat.filter(r=>(!rep||r.report===rep)&&(!sp.value||r.name===sp.value)&&(!sd.value||r.decision===sd.value)&&(!q||(r.item+" "+r.note).toLowerCase().includes(q))).sort((a,b)=>b.at.localeCompare(a.at));
  const cl=C.latest(REPORT), items=new Set(cl.map(r=>r.id));
  const ag=[...items].filter(id=>status(id)==="agreed").length, dis=[...items].filter(id=>status(id)==="disputed").length;
  $("#substats").innerHTML=`<div class="stat"><div class="n">${people.length}</div><div class="l">people have answered</div></div><div class="stat k"><div class="n">${ag}</div><div class="l">cleanup items agreed</div></div><div class="stat c"><div class="n">${dis}</div><div class="l">cleanup items where people disagree</div></div><div class="stat s"><div class="n">${ITEMS.length-items.size}</div><div class="l">cleanup items with no answer yet</div></div>`;
  $("#subrows").innerHTML=rows.length?rows.map(r=>`<tr><td style="white-space:nowrap">${esc(new Date(r.at).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}))}</td><td>${esc(r.name)}</td><td>${esc(r.report)}</td><td>${r.report===REPORT?`<a href="#item-${esc(r.id)}" data-jump="${esc(r.id)}">${esc(r.item)}</a>`:esc(r.item)}</td><td class="${decClass(r.decision)}">${esc(r.decision)}</td><td>${esc(r.note)}</td></tr>`).join(""):`<tr><td colspan="6" class="note">${C.ready()?"No answers yet.":"Enter your name and the team code at the top to see answers."}</td></tr>`;
  $("#subrows").querySelectorAll("[data-jump]").forEach(a=>a.onclick=e=>{e.preventDefault(); showTab("review"); st.g=""; st.v=""; st.t=""; st.q=""; st.mine=false; $("#q").value=""; $("#tfilter").value=""; $("#mine").checked=false; renderFilters(); renderList(); const el=document.getElementById("item-"+a.dataset.jump); if(el) el.scrollIntoView({behavior:"smooth",block:"start"});});
}
function jumpTo(id){ const it=ITEMS.find(x=>x.id===id); if(!it) return; st.view="cards"; st.g=""; st.v=""; st.t=""; st.q=""; st.mine=false; $("#q").value=""; $("#tfilter").value=""; $("#mine").checked=false; st.open.add(id); renderFilters(); renderList(); const el=document.getElementById("item-"+id); if(el) setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"start"}),60); }
function showTab(t){ const r=t!=="submissions"; $("#view-review").hidden=!r; $("#view-subs").hidden=r; $("#tab-review").setAttribute("aria-selected",String(r)); $("#tab-subs").setAttribute("aria-selected",String(!r)); if(!r && location.hash!=="#submissions") history.replaceState(null,"","#submissions"); if(r && location.hash==="#submissions") history.replaceState(null,"",location.pathname); if(!r) renderSubs(); }
function render(){ renderStats(); renderList(); if(!$("#view-subs").hidden) renderSubs(); }

$("#tab-review").onclick=()=>showTab("review"); $("#tab-subs").onclick=()=>showTab("submissions");
$("#tfilter").innerHTML='<option value="">All types</option>'+Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v} (${ITEMS.filter(i=>i.t===k).length})</option>`).join("");
$("#tfilter").onchange=e=>{st.t=e.target.value; renderList();};
let qt; $("#q").oninput=e=>{clearTimeout(qt); qt=setTimeout(()=>{st.q=e.target.value.trim(); renderList();},200);};
$("#mine").onchange=e=>{st.mine=e.target.checked; renderList();};
document.querySelectorAll("#viewsw button").forEach(b=>b.onclick=()=>{st.view=b.dataset.v; renderList();});
["#sreport","#sperson","#sdec","#hist"].forEach(s=>$(s).onchange=renderSubs); $("#sq").oninput=renderSubs;
$("#refresh").onclick=async()=>{ $("#loaded").textContent="Loading…"; const r=await C.load(); $("#loaded").textContent=r.ok?"Updated "+new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}):"Couldn't load answers."; render(); };
renderWho(); renderFilters(); render(); showTab(location.hash==="#submissions"?"submissions":"review");
function applyShow(h){ const m=h.match(/^#show-(in-use|not-in-use|not-active|all)(?:-(funnel|website|workflow|product|form|survey|calendar))?$/); if(!m) return false; showTab("review"); st.view="list"; st.g=m[1]==="all"?"":GSLUG[m[1]]; st.t=m[2]||""; st.v=""; st.q=""; st.mine=false; $("#q").value=""; $("#tfilter").value=st.t; $("#mine").checked=false; renderFilters(); renderList(); $("#view-review").scrollIntoView({behavior:"smooth"}); return true; }
if(location.hash.startsWith("#item-")) jumpTo(location.hash.slice(6)); else applyShow(location.hash);
document.querySelectorAll('a[href="cleanup.html#submissions"]').forEach(a=>a.addEventListener("click",e=>{ if(location.pathname.endsWith("cleanup.html")){ e.preventDefault(); showTab("submissions"); scrollTo(0,0);} }));
addEventListener("hashchange",()=>{ if(location.hash==="#submissions") showTab("submissions"); else if(applyShow(location.hash)){} else if(location.hash.startsWith("#item-")){ showTab("review"); jumpTo(location.hash.slice(6)); } });
if(C.ready()) C.load().then(r=>{ if(r.ok){ $("#loaded").textContent="Updated "+new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}); render(); } else if(r.error==="code"){ C.setWho(C.name(),""); renderWho("That team code didn't work."); } });
setInterval(()=>{ if(C.ready() && !document.hidden && !(document.activeElement&&document.activeElement.classList.contains("notebox"))) C.load().then(r=>{ if(r.ok) render(); }); }, 60000);
})();
