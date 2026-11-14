// Trim bands: the band laid at each end of a wrap to hold the wrap thread down.
// Built like the guide designer's underwrap: one trim color fills the whole trim band (T.mm wide),
// the design sits in the middle of it (a center band, then bands added on both sides: plain, saw blades, fades),
// and end threads can go on the outer edges. Both ends of the wrap get the same trim band.
// T = {on, mm, c, bands:[center, side1, ...], ends:[{c,t}...]}
(function(){
  const css=`.tbwrap .stripe select{font-size:13px;padding:4px 6px;border:1px solid var(--line);border-radius:5px;background:var(--panel,var(--bg));color:var(--fg);width:auto}
.tbwrap .sawtag,.tbwrap .slab{font:600 10px var(--body,inherit);text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.tbwrap .tbsub{font-size:12px;color:var(--muted);margin:10px 0 4px}
.tbwrap .tbrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}
.tbwrap .tblab{font-size:13px;color:var(--muted)}
.tbwrap .tbn{font-family:var(--mono,monospace);font-weight:700}`;
  let styled=false;
  const style=()=>{ if(styled) return; styled=true; const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s); };
  const BLUE='#1f4fbf';
  const SAW=[['mid','Mirrored'],['ends','Mirrored, flipped'],['tip','Same way'],['butt','Same way, flipped']];
  const W=b=>b.saw?1:b.fade?2*b.t:b.t;   // width in thread lines (a fade turn lays two threads side by side)
  // a thread's width compared to the size picked (metallic threads have their own size in some brands, threads.js)
  const TF=c=>window.WL_TF?WL_TF(c):1;
  // one band's width in mm, and one of its thread lines; a fade's two threads are its neighbors' colors
  const BW=(b,tw,prev,next)=>{ const f=b.fade?(TF(prev)+TF(next))/2:TF(b.c); return [W(b)*tw*f, tw*f]; };
  const has=T=>!!(T&&T.on!==false);
  // thread counts, half of the trim band from its middle out: the design, the trim color around it, the end threads
  function counts(T,tw){
    const b=T.bands||[], e=T.ends||[], base=T.c||BLUE, dHalf=b.length?W(b[0])/2+b.slice(1).reduce((a,x)=>a+W(x),0):0, ends=e.reduce((a,x)=>a+W(x),0);
    // the same counts in mm, each band at its own thread's width
    const dHalfMM=b.length?BW(b[0],tw)[0]/2+b.slice(1).reduce((a,x,j)=>a+BW(x,tw,b[j].c||base,(b[j+2]&&b[j+2].c)||base)[0],0):0;
    const endsMM=e.reduce((a,x,j)=>a+BW(x,tw,(e[j-1]&&e[j-1].c)||base,(e[j+1]&&e[j+1].c)||base)[0],0), ftw=tw*TF(base);
    const fill=Math.max(0,Math.round(((T.mm||20)/2-dHalfMM-endsMM)/ftw));
    return {dHalf,fill,ends,half:dHalf+fill+ends,dHalfMM,endsMM,fillMM:fill*ftw,halfMM:dHalfMM+fill*ftw+endsMM};
  }
  const width=(T,tw)=>has(T)?2*counts(T,tw).halfMM:0;
  const sawCol=(b,k,around,teeth)=>{ const f=((around*teeth+k)%1+1)%1; return f>=0.5?(b.c2||'#1a1a1a'):b.c; };
  // the thread at distance d (mm) out from the wrap's end. zs: +1 if the rod runs on to bigger z here, -1 if not.
  // around: 0..1 around the rod. Returns [hex, frac across the thread] or null outside the trim band.
  function at(T,d,tw,around,zs,fallback,Dmm){
    if(!has(T)) return null;
    const n=counts(T,tw), h=n.halfMM; if(d<0||d>2*h) return null;
    const off=d-h, a=Math.abs(off), z=off*zs, teeth=Math.max(10,Math.round(Math.PI*(Dmm||10)/(5*tw))), base=T.c||BLUE;
    let x=a;
    if(T.bands.length){ const c=T.bands[0], [cW,ctw]=BW(c,tw), cw=cW/2;
      if(a<=cw){ const fr=((a+cw)/ctw)%1;
        if(c.saw) return [sawCol(c,(c.saw==='ends'?-1:1)*1.1*a/ctw,around,teeth),fr];   // the center: a V from its middle
        return [c.c,fr]; }
      x=a-cw;
      for(let j=1;j<T.bands.length;j++){ const b=T.bands[j], [w,btw]=BW(b,tw,T.bands[j-1].c||base,(T.bands[j+1]&&T.bands[j+1].c)||base);
        if(x<w){ const fr=(x/btw)%1;
          if(b.fade){ const inC=T.bands[j-1].c||base, nb=T.bands[j+1], outC=(nb&&nb.c)||base;
            return [Math.floor(x/btw)%2?outC:inC,fr]; }
          if(b.saw){ const out=a/btw, toTip=(z>0?x:w-x)/btw;
            const k=b.saw==='mid'?0.5*out:b.saw==='ends'?-0.5*out:b.saw==='tip'?0.5*toTip:-0.5*toTip;
            return [sawCol(b,k,around,teeth),fr]; }
          return [b.c,fr]; }
        x-=w; } }
    const fw=n.fillMM, ftw=tw*TF(base); if(x<fw) return [base,(x/ftw)%1];
    // the end design: built from the outer edge inward
    let e=h-a;
    for(let j=0;j<T.ends.length;j++){ const b=T.ends[j], [w,etw]=BW(b,tw,(T.ends[j-1]&&T.ends[j-1].c)||base,(T.ends[j+1]&&T.ends[j+1].c)||base);
      if(e<w){ const fr=(e/etw)%1;
        if(b.fade){ const outC=(T.ends[j-1]&&T.ends[j-1].c)||base, inC=(T.ends[j+1]&&T.ends[j+1].c)||base; return [Math.floor(e/etw)%2?inC:outC,fr]; }
        if(b.saw){ const out=e/etw, toTip=(z>0?w-e:e)/etw;
          const k=b.saw==='mid'?0.5*out:b.saw==='ends'?-0.5*out:b.saw==='tip'?0.5*toTip:-0.5*toTip;
          return [sawCol(b,k,around,teeth),fr]; }
        return [b.c,fr]; }
      e-=w; }
    return [base,0.5];
  }
  // the designer
  function ui(host,T,changed,twFn){
    style(); host.classList.add('tbwrap');
    const tw=()=>(twFn&&twFn())||0.2;
    const turns=(id,b,lab)=>`<select id="${id}" aria-label="${lab}">${Array.from({length:19},(_,k)=>k+2).map(n=>`<option value="${n}"${n===b.t?' selected':''}>${n} turns</option>`).join('')}</select>`;
    const sawOpts=(i,key)=>key==='b'&&i===0?SAW.slice(0,2):SAW;   // the center can only mirror
    const mode=host._tbmode||'center';
    const chip=(b,i,key)=>`<span class="stripe" data-i="${i}"><span class="grip" title="Drag to move" aria-hidden="true">\u22ee\u22ee</span>`
      +(key==='b'&&i===0?`<small class="slab">center</small>`:'')
      +(b.fade?`<small class="slab">fade</small>${turns('tb'+key+'f'+i,b,'Fade turns')}`
        :`<input type="color" id="tb${key}c${i}" value="${b.c}" aria-label="${key==='e'?'End thread':'Band'} ${i+1} color">`
         +(b.saw?`<span class="sawtag">saw</span><input type="color" id="tb${key}s${i}" value="${b.c2||'#1a1a1a'}" aria-label="Saw blade second thread color" title="Second thread, twisted with the first"><select id="tb${key}d${i}" aria-label="Saw blade slant">${sawOpts(i,key).map(([v,n])=>`<option value="${v}"${v===b.saw?' selected':''}>${n}</option>`).join('')}</select>`
           :`<input type="number" id="tb${key}t${i}" min="1" step="1" value="${b.t}" aria-label="Threads"><small class="slab">${key==='b'?(i===0?'threads':'threads, each side'):'threads, each edge'}</small>`))
      +`<button type="button" data-x="${key}${i}" aria-label="Remove">\u00d7</button></span>`;
    host.innerHTML=!has(T)?`<div class="stripes"><button type="button" class="addbtn" data-k="on">+ Add trim bands</button></div>`
      :`<div class="tbrow"><span class="tblab">Width at each end</span>
          <span class="stripe" style="padding:2px"><button type="button" data-mm="-1" aria-label="Narrower">\u2212</button><input type="number" id="tbmm" min="2" max="80" step="0.5" value="${T.mm||20}" aria-label="Trim band width in mm" style="width:5.5em;text-align:center"><small class="slab">mm</small><button type="button" data-mm="1" aria-label="Wider">+</button></span>
          <span class="tblab">Trim color</span><input type="color" id="tbbase" value="${T.c||BLUE}" aria-label="Trim band color">
          <button type="button" class="addbtn" data-k="off" style="margin-left:auto">No trim bands</button></div>
        <div class="tbrow"><span id="tbsum" class="tblab"></span></div>
        <div class="tbrow" style="margin-top:10px"><div class="seg" id="tbmode" role="group" aria-label="Design the center or the ends">
            <button type="button" data-m="center" aria-pressed="${mode==='center'}">Center threads</button><button type="button" data-m="ends" aria-pressed="${mode==='ends'}">End bands</button></div>
          <button type="button" class="addbtn" data-k="thread">+ Add thread</button><button type="button" class="addbtn" data-k="saw">+ Add saw blade</button><button type="button" class="addbtn" data-k="fade"${mode==='center'&&!T.bands.length?' disabled title="Add a center thread first"':''}>+ Add fade</button></div>
        <div class="tbsub">${mode==='center'?'Center <small>(from the middle of the trim band out; each one after the center goes on both sides)</small>':'End bands <small>(from the outer edges of the trim band in)</small>'}</div>
        ${mode==='center'?`<div class="stripes" data-list="b">${T.bands.map((b,i)=>chip(b,i,'b')).join('')||'<span class="tblab">No center design yet.</span>'}</div>`
          :`<div class="stripes" data-list="e">${T.ends.map((b,i)=>chip(b,i,'e')).join('')||'<span class="tblab">No end bands yet.</span>'}</div>`}`;
    const sum=()=>{ const el=host.querySelector('#tbsum'); if(!el) return; const t=tw(), n=counts(T,t);
      el.innerHTML=`Each trim band: <span class="tbn">${2*n.half}</span> threads = <b>${(2*n.halfMM).toFixed(1)} mm</b>`
        +` \u00b7 trim color <span class="tbn">${n.fill}</span> each side`+(n.dHalf?` \u00b7 center design <span class="tbn">${2*n.dHalf}</span>`:'')+(n.ends?` \u00b7 end bands <span class="tbn">${n.ends}</span> each edge`:'')
        +(n.fill===0&&(2*n.dHalfMM+2*n.endsMM)>(T.mm||20)+t/2?' (the design is wider than the width you set)':''); };
    const ch=()=>{ sum(); changed(); };
    const redo=()=>{ ui(host,T,changed,twFn); changed(); }, g=id=>host.querySelector('#'+id);
    sum(); host._tbsum=sum;
    const mmIn=g('tbmm'); if(mmIn){ const setMM=v=>{ T.mm=Math.min(80,Math.max(2,Math.round(v*2)/2)); mmIn.value=T.mm; ch(); };
      mmIn.addEventListener('change',e=>setMM(parseFloat(e.target.value)||20));
      host.querySelectorAll('[data-mm]').forEach(x=>x.onclick=()=>setMM((T.mm||20)+ +x.dataset.mm)); }
    const bc=g('tbbase'); if(bc) bc.addEventListener('input',e=>{ T.c=e.target.value; ch(); });
    (mode==='center'?[['b',T.bands||[]]]:[['e',T.ends||[]]]).forEach(([key,arr])=>arr.forEach((b,i)=>{   // only the list on screen
      if(b.fade){ g('tb'+key+'f'+i).onchange=e=>{ b.t=+e.target.value; ch(); }; return; }
      g('tb'+key+'c'+i).addEventListener('input',e=>{ b.c=e.target.value; ch(); });
      if(b.saw){ b.t=1; g('tb'+key+'s'+i).addEventListener('input',e=>{ b.c2=e.target.value; ch(); }); g('tb'+key+'d'+i).onchange=e=>{ b.saw=e.target.value; ch(); }; return; }
      g('tb'+key+'t'+i).addEventListener('input',e=>{ b.t=Math.max(1,parseInt(e.target.value)||1); ch(); }); }));
    const tidy=()=>{ while(T.bands[0]&&T.bands[0].fade) T.bands.shift(); if(T.bands[0]&&T.bands[0].saw&&!/^(mid|ends)$/.test(T.bands[0].saw)) T.bands[0].saw='mid'; };
    host.querySelectorAll('[data-x]').forEach(x=>x.onclick=()=>{ const k=x.dataset.x[0], i=+x.dataset.x.slice(1);
      (k==='b'?T.bands:T.ends).splice(i,1); tidy(); redo(); });
    host.querySelectorAll('#tbmode [data-m]').forEach(x=>x.onclick=()=>{ host._tbmode=x.dataset.m; ui(host,T,changed,twFn); });
    host.querySelectorAll('[data-k]').forEach(x=>x.onclick=()=>{ const k=x.dataset.k, arr=mode==='center'?T.bands:T.ends;
      if(k==='on'){ T.on=true; T.mm=T.mm||20; T.c=T.c||BLUE; }
      else if(k==='off') T.on=false;
      else { // right after a fade, a new band starts in the color the fade was already blending into, so the fade stays visible
      const last=arr[arr.length-1], after=last&&last.fade, c0=after?(T.c||BLUE):null;
      if(k==='thread') arr.push(mode==='center'?{c:c0||'#f0ede5',t:T.bands.length?2:4}:{c:c0||'#1a1a1a',t:3});
      else if(k==='saw') arr.push({c:c0||'#f0ede5',t:1,saw:'mid',c2:'#1a1a1a'});
      else if(k==='fade'){ if(mode==='center'&&!T.bands.length) return; arr.push({c:'',t:3,fade:true}); } }
      redo(); });
    // drag a chip by its grip to move it within its own list
    host.querySelectorAll('.stripes[data-list]').forEach(list=>{ const arr=list.dataset.list==='b'?T.bands:T.ends;
      list.querySelectorAll('.grip').forEach(gr=>gr.addEventListener('pointerdown',e=>{
        const chip=gr.closest('.stripe'); if(!chip) return; e.preventDefault(); chip.classList.add('dragging');
        const move=ev=>{ const t=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.stripe[data-i]');
          if(!t||t===chip||t.parentElement!==list) return; const r=t.getBoundingClientRect();
          list.insertBefore(chip,(ev.clientX>r.left+r.width/2||ev.clientY>r.bottom)?t.nextSibling:t); };
        const up=()=>{ removeEventListener('pointermove',move); removeEventListener('pointerup',up); removeEventListener('pointercancel',up); chip.classList.remove('dragging');
          const order=[...list.querySelectorAll('.stripe[data-i]')].map(x=>+x.dataset.i);
          if(order.some((v,k)=>v!==k)){ const copy=order.map(k=>arr[k]); arr.length=0; copy.forEach(x=>arr.push(x));
            if(arr===T.bands&&T.bands[0].fade){ const f=T.bands.shift(); T.bands.splice(1,0,f); } tidy(); redo(); } };
        addEventListener('pointermove',move); addEventListener('pointerup',up); addEventListener('pointercancel',up); })); });
  }
  // keep the summary right when the thread size changes
  const refresh=host=>{ if(host&&host._tbsum) host._tbsum(); };
  // how-to lines: the trim color, then the design from the middle out, then the end threads
  function steps(T,dot,fallback,tw){
    if(!has(T)) return [];
    const t=tw||0.2, n=counts(T,t), base=T.c||BLUE, out=[];
    out.push(`Each trim band is <b>${(2*n.halfMM).toFixed(1)} mm</b> wide, <b>${2*n.half} threads</b> in all.`);
    if(T.bands.length){ const c=T.bands[0];
      out.push(c.saw?`Center: twist ${dot(c.c)} and ${dot(c.c2||'#1a1a1a')} together and wrap one turn, so the twist makes a V from the middle.`
        :`Center: ${dot(c.c)} ${c.t} thread${c.t>1?'s':''} in the middle of the trim band.`);
      T.bands.slice(1).forEach((b,i)=>{ const j=i+1;
        out.push(b.fade?`Fade on each side: wrap ${dot(T.bands[j-1].c||base)} and ${dot((T.bands[j+1]&&T.bands[j+1].c)||base)} together, side by side, for ${b.t} turns (${2*b.t} threads).`
          :b.saw?`Saw blade on each side: twist ${dot(b.c)} and ${dot(b.c2||'#1a1a1a')} together and wrap one turn, ${b.saw==='mid'||b.saw==='ends'?'twisted opposite ways on the two sides so they mirror':'twisted the same way on both sides'}.`
          :`${dot(b.c)} ${b.t} thread${b.t>1?'s':''} on each side.`); }); }
    if(n.fill) out.push(`Trim color: ${dot(base)} ${n.fill} thread${n.fill>1?'s':''} on each side${T.bands.length?' of the design':''}.`);
    T.ends.forEach((e,j)=>out.push(e.fade?`End fade: wrap ${dot((T.ends[j-1]&&T.ends[j-1].c)||base)} and ${dot((T.ends[j+1]&&T.ends[j+1].c)||base)} together, side by side, for ${e.t} turns (${2*e.t} threads), on each edge.`
      :e.saw?`End saw blade: twist ${dot(e.c)} and ${dot(e.c2||'#1a1a1a')} together and wrap one turn on each edge.`
      :`End band: ${dot(e.c)} ${e.t} thread${e.t>1?'s':''} on each outer edge${j?', inside the last one':''}.`));
    return out;
  }
  // clean a saved trim band
  const cb=(b,center)=>b.fade?{c:'',t:Math.min(20,Math.max(2,+b.t||3)),fade:true}
    :b.saw?{c:String(b.c||'#f0ede5'),t:1,saw:SAW.some(s=>s[0]===b.saw)&&(!center||/^(mid|ends)$/.test(b.saw))?b.saw:'mid',c2:String(b.c2||'#1a1a1a')}:{c:String(b.c||'#f0ede5'),t:Math.max(1,+b.t||1)};
  function clean(o){ if(!o||typeof o!=='object'||Array.isArray(o)) return {on:false,mm:20,c:BLUE,bands:[],ends:[]};
    const bands=(Array.isArray(o.bands)?o.bands:[]).filter(b=>b&&typeof b==='object'); while(bands[0]&&bands[0].fade) bands.shift();
    return { on:o.on!==false, mm:Math.min(80,Math.max(2,+o.mm||20)), c:/^#[0-9a-f]{6}$/i.test(o.c||'')?o.c:BLUE, bands:bands.map((b,i)=>cb(b,i===0)),
      ends:(Array.isArray(o.ends)?o.ends:[]).filter(b=>b&&typeof b==='object').map(b=>cb(b,false)) }; }
  window.WLTrim={has,width,at,ui,steps,clean,refresh,counts,blank:()=>({on:true,mm:20,c:BLUE,bands:[],ends:[]})};   // new designs start with a plain blue trim band
})();
