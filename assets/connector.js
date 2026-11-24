/* Saves answers to the team decisions sheet and reads everyone's answers back. */
(function(){
  const API = "https://script.google.com/macros/s/AKfycbzNW0MTsKr-BH3GMqN83fxTv2XKXQfmNKF5VHk_4upee_nmKRln-z7bVAnxjlcxFW9grg/exec";
  const store = { get(k){ try{return localStorage.getItem(k)||"";}catch(e){return "";} }, set(k,v){ try{localStorage.setItem(k,v);}catch(e){} } };
  let rows = [], listeners = [];
  const C = {
    name(){ return store.get("nbr_name"); }, code(){ return store.get("nbr_code"); },
    setWho(n,c){ store.set("nbr_name",n.trim()); store.set("nbr_code",c.trim()); },
    ready(){ return !!(C.name() && C.code()); },
    onChange(fn){ listeners.push(fn); },
    rows(){ return rows; },
    async load(){
      if(!C.code()) { rows=[]; listeners.forEach(f=>f(rows)); return {ok:false,error:"code"}; }
      try{
        const r = await fetch(API+"?code="+encodeURIComponent(C.code()), {credentials:"omit"});
        const j = await r.json();
        if(j.ok){ rows=j.rows||[]; listeners.forEach(f=>f(rows)); }
        return j;
      }catch(e){ return {ok:false,error:"network"}; }
    },
    async submit(o){
      const body = JSON.stringify(Object.assign({code:C.code(), name:C.name()}, o));
      try{
        const r = await fetch(API, {method:"POST", credentials:"omit", headers:{"Content-Type":"text/plain;charset=utf-8"}, body});
        const j = await r.json();
        if(j.ok){ rows.push({at:new Date().toISOString(), name:C.name(), report:o.report, id:o.id, item:o.item, decision:o.decision, note:o.note||""}); listeners.forEach(f=>f(rows)); }
        return j;
      }catch(e){ return {ok:false,error:"network"}; }
    },
    /* latest answer per person per item, for one report */
    latest(report){
      const m = {};
      rows.filter(r=>!report||r.report===report).forEach(r=>{ const k=r.id+"||"+r.name.toLowerCase(); if(!m[k]||r.at>=m[k].at) m[k]=r; });
      return Object.values(m);
    }
  };
  window.NBRC = C;
})();
