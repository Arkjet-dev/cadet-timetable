const $=s=>document.querySelector(s);const today=new Date();today.setHours(0,0,0,0);
const items=SESSIONS.map(([d,t,k])=>({date:new Date(d+"T00:00:00"),iso:d,t,k}));
const fmt=d=>d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
const next=items.find(i=>i.date>=today&&i.k!=="closed");
let dressSel=new Set(),hidePast=false;
const days=d=>Math.round((d-today)/864e5);
function rel(d){const n=days(d);return n===0?"Today":n===1?"Tomorrow":n>0?`In ${n} days`:`${-n} days ago`}
function desc(i){return i.k==="closed"?"The unit is closed (stand down).":"Session times aren't listed — check with staff."}
function ymd(i){return i.iso}
function slug(t){return t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"activity"}
function fileName(i){return `2447-${ymd(i)}-${slug(i.t)}.png`}

function wrapLines(ctx,text,max,maxLines){
  const words=text.split(/\s+/);const lines=[];let line="";
  for(const w of words){
    const trial=line?line+" "+w:w;
    if(ctx.measureText(trial).width<=max){line=trial;continue}
    if(line)lines.push(line);
    line=w;
    if(lines.length===maxLines-1){
      // last line: fit remaining
      let rest=[w].concat(words.slice(words.indexOf(w)+1)).join(" ");
      while(rest.length>1&&ctx.measureText(rest).width>max)rest=rest.slice(0,-1);
      lines.push(rest);
      return lines;
    }
  }
  if(line)lines.push(line);
  return lines.slice(0,maxLines);
}
function paintCard(i){
  const W=420,H=248,S=2;
  const c=document.createElement("canvas");
  c.width=W*S;c.height=H*S;
  const ctx=c.getContext("2d");
  ctx.scale(S,S);
  const dressColour=getComputedStyle(document.documentElement).getPropertyValue("--"+i.k).trim()||"#3aa8e0";
  // Phone notification card
  ctx.fillStyle="#0b1524";
  roundRect(ctx,0,0,W,H,28);ctx.fill();
  ctx.fillStyle="#18273f";
  roundRect(ctx,12,12,W-24,H-24,20);ctx.fill();
  // Accent bar
  ctx.fillStyle=dressColour;
  ctx.fillRect(12,12,6,H-24);
  // Header
  ctx.fillStyle="#9fb3d1";
  ctx.font="600 13px system-ui,sans-serif";
  ctx.fillText("2447 Calder Valley Sqn",28,42);
  // Title (wrap up to 2 lines so long names aren't clipped)
  ctx.fillStyle="#eef3fa";
  ctx.font="700 22px system-ui,sans-serif";
  const titles=wrapLines(ctx,i.t,W-56,2);
  let y=74;
  titles.forEach(line=>{ctx.fillText(line,28,y);y+=26});
  // Date · relative
  ctx.fillStyle="#ffd54f";
  ctx.font="600 14px system-ui,sans-serif";
  ctx.fillText(`${fmt(i.date)} · ${rel(i.date)}`,28,y+8);
  y+=36;
  // Dress
  ctx.beginPath();ctx.arc(36,y,6,0,Math.PI*2);ctx.fillStyle=dressColour;ctx.fill();
  ctx.fillStyle="#eef3fa";
  ctx.font="500 14px system-ui,sans-serif";
  ctx.fillText(`Dress: ${DRESS[i.k]}`,50,y+4);
  y+=28;
  // Description — wrap fully, no ellipsis clipping
  ctx.fillStyle="#b7c6dc";
  ctx.font="400 13px system-ui,sans-serif";
  const dlines=wrapLines(ctx,desc(i),W-56,2);
  dlines.forEach(line=>{ctx.fillText(line,28,y);y+=18});
  // Footer hint
  ctx.fillStyle="#6f829e";
  ctx.font="400 11px system-ui,sans-serif";
  ctx.fillText("From the 2447 training programme",28,H-22);
  return c;
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function canvasToBlob(c){
  return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("PNG failed")),"image/png"));
}
async function downloadPng(i,btn){
  const label=btn&&btn.textContent;
  if(btn){btn.disabled=true;btn.textContent="Preparing…"}
  try{
    const c=paintCard(i);
    const blob=await canvasToBlob(c);
    const name=fileName(i);
    const file=new File([blob],name,{type:"image/png"});
    const canShare=typeof navigator.share==="function"&&typeof navigator.canShare==="function"&&navigator.canShare({files:[file]});
    if(canShare){
      try{await navigator.share({files:[file],title:i.t,text:`${i.t} · ${fmt(i.date)}`});return}
      catch(e){if(e&&e.name==="AbortError")return}
    }
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=name;
    // iOS Safari often ignores download; open in new tab as fallback
    const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
    if(isiOS){
      window.open(url,"_blank");
    }else{
      document.body.appendChild(a);a.click();a.remove();
    }
    setTimeout(()=>URL.revokeObjectURL(url),30e3);
  }catch(err){
    console.error(err);
    alert("Couldn't make the image. Try again.");
  }finally{
    if(btn){btn.disabled=false;btn.textContent=label}
  }
}

function nextHtml(){
  if(!next)return `<h2>No upcoming sessions</h2><div>The programme ends 31 December 2026.</div>`;
  return `<h2>${days(next.date)===0?"Tonight":"Next session"}</h2>
<div class="t" style="font-size:1.3rem">${next.t}</div>
<div>${fmt(next.date)} · ${rel(next.date)}</div>
<div><span class="dot" style="background:var(--${next.k})"></span>Dress: ${DRESS[next.k]}</div>
<button type="button" class="dl" id="dlNext">Download as image</button>`;
}
$("#next").innerHTML=nextHtml();
const dlNext=$("#dlNext");
if(dlNext)dlNext.onclick=e=>{e.stopPropagation();downloadPng(next,dlNext)};

$("#dress").innerHTML=Object.entries(DRESS).map(([k,v])=>`<button class="chip" data-k="${k}" aria-pressed="false"><span class="dot" style="background:var(--${k})"></span>${v}</button>`).join("");
$("#dress").onclick=e=>{const b=e.target.closest("button");if(!b)return;const k=b.dataset.k;dressSel.has(k)?dressSel.delete(k):dressSel.add(k);b.setAttribute("aria-pressed",dressSel.has(k));render()};
$("#hidePast").onclick=e=>{hidePast=!hidePast;e.target.setAttribute("aria-pressed",hidePast);render()};
$("#q").oninput=render;$("#month").onchange=render;
function render(){const q=$("#q").value.toLowerCase(),m=$("#month").value;let html="",cur="";
items.forEach((i,idx)=>{if(q&&!i.t.toLowerCase().includes(q))return;if(dressSel.size&&!dressSel.has(i.k))return;
if(m&&i.date.getMonth()+1!=m)return;const past=i.date<today;if(hidePast&&past)return;
const mon=i.date.toLocaleDateString("en-GB",{month:"long"});if(mon!==cur){cur=mon;html+=`<h3 class="month">${mon}</h3>`}
const isT=days(i.date)===0,isN=i===next;
html+=`<div class="s ${past?"past":""} ${isT?"today":""} ${isN?"isnext":""}" tabindex="0" data-i="${idx}"><div class="bar" style="background:var(--${i.k})"></div><div class="body">
<div class="d">${fmt(i.date)}${isT?'<span class="badge">TODAY</span>':isN?'<span class="badge">NEXT</span>':""}</div><div class="t">${i.t}</div>
<div class="more">Date: ${fmt(i.date)} (${rel(i.date)})<br>Dress: ${DRESS[i.k]}${i.k==="closed"?"<br>The unit is closed (stand down).":""}<br>
<button type="button" class="dl dl-sm" data-dl="${idx}">Download as image</button></div></div></div>`});
$("#list").innerHTML=html||"<p>No sessions match.</p>";
document.querySelectorAll(".s").forEach(s=>{
  s.onclick=e=>{if(e.target.closest(".dl"))return;s.classList.toggle("open")};
  s.onkeydown=e=>{if(e.key==="Enter")s.classList.toggle("open")};
});
document.querySelectorAll("[data-dl]").forEach(b=>{
  b.onclick=e=>{e.stopPropagation();const i=items[+b.dataset.dl];downloadPng(i,b)};
});
}
render();
