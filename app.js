const $=s=>document.querySelector(s);const today=new Date();today.setHours(0,0,0,0);
const items=SESSIONS.map(([d,t,k])=>({date:new Date(d+"T00:00:00"),iso:d,t,k}));
const fmt=d=>d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
const next=items.find(i=>i.date>=today&&i.k!=="closed");
let dressSel=new Set(),hidePast=false;
const SESSION_TIME="7:00–9:00 pm";
const SESSION_TIME_SHORT="7–9 pm";
const NAVY="#001F45";
const RAF_RED="#C8102E";
const days=d=>Math.round((d-today)/864e5);
function rel(d){const n=days(d);return n===0?"Today":n===1?"Tomorrow":n>0?`In ${n} days`:`${-n} days ago`}
function timeLine(i){return i.k==="closed"?"Closed (stand down)":SESSION_TIME}
function ymd(i){return i.iso}
function slug(t){return t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"activity"}
function fileName(i){return `2447-${ymd(i)}-${slug(i.t)}.png`}

const logoImg=new Image();
logoImg.decoding="async";
const logoReady=new Promise((resolve,reject)=>{
  logoImg.onload=()=>resolve(logoImg);
  logoImg.onerror=()=>reject(new Error("Logo failed to load"));
  logoImg.src="assets/2447-logo.png";
});

function wrapLines(ctx,text,max,maxLines){
  const words=text.split(/\s+/);const lines=[];let line="";
  for(let wi=0;wi<words.length;wi++){
    const w=words[wi];
    const trial=line?line+" "+w:w;
    if(ctx.measureText(trial).width<=max){line=trial;continue}
    if(line)lines.push(line);
    line=w;
    if(lines.length===maxLines-1){
      let rest=words.slice(wi).join(" ");
      while(rest.length>1&&ctx.measureText(rest).width>max)rest=rest.slice(0,-1);
      lines.push(rest);
      return lines;
    }
  }
  if(line)lines.push(line);
  return lines.slice(0,maxLines);
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function paintCard(i,logo){
  const W=420,H=280,S=2;
  const c=document.createElement("canvas");
  c.width=W*S;c.height=H*S;
  const ctx=c.getContext("2d");
  ctx.scale(S,S);
  const dressColour=getComputedStyle(document.documentElement).getPropertyValue("--"+i.k).trim()||"#3aa8e0";

  // Soft shadow plate
  ctx.fillStyle="rgba(0,0,0,0.08)";
  roundRect(ctx,10,12,W-16,H-16,22);ctx.fill();

  // White card
  ctx.fillStyle="#ffffff";
  roundRect(ctx,8,8,W-16,H-20,20);ctx.fill();
  ctx.strokeStyle="#D7DEE8";
  ctx.lineWidth=1.5;
  roundRect(ctx,8,8,W-16,H-20,20);ctx.stroke();

  // Navy accent bar (readable on white; yellow would disappear)
  ctx.fillStyle=NAVY;
  ctx.fillRect(8,8,7,H-20);

  // Logo along the top
  let y=22;
  if(logo&&logo.complete&&logo.naturalWidth){
    const maxW=W-56,maxH=46;
    const scale=Math.min(maxW/logo.naturalWidth,maxH/logo.naturalHeight);
    const lw=logo.naturalWidth*scale,lh=logo.naturalHeight*scale;
    ctx.drawImage(logo,28,y,lw,lh);
    y+=lh+14;
  }else{
    ctx.fillStyle=NAVY;
    ctx.font="700 13px system-ui,sans-serif";
    ctx.fillText("2447 Calder Valley Sqn",28,y+14);
    y+=28;
  }

  // Squadron label under logo
  ctx.fillStyle="#5B6B7F";
  ctx.font="600 12px system-ui,sans-serif";
  ctx.fillText("2447 Calder Valley Sqn",28,y);
  y+=22;

  // Title
  ctx.fillStyle="#0F1B2D";
  ctx.font="700 22px system-ui,sans-serif";
  const titles=wrapLines(ctx,i.t,W-56,2);
  titles.forEach(line=>{ctx.fillText(line,28,y);y+=26});

  // Date · relative · time
  ctx.fillStyle=RAF_RED;
  ctx.font="600 14px system-ui,sans-serif";
  const when=i.k==="closed"
    ?`${fmt(i.date)} · ${rel(i.date)} · Closed`
    :`${fmt(i.date)} · ${rel(i.date)} · ${SESSION_TIME_SHORT}`;
  const whenLines=wrapLines(ctx,when,W-56,2);
  whenLines.forEach(line=>{ctx.fillText(line,28,y+4);y+=20});
  y+=10;

  // Dress
  ctx.beginPath();ctx.arc(36,y,6,0,Math.PI*2);ctx.fillStyle=dressColour;ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,0.15)";ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle="#0F1B2D";
  ctx.font="500 14px system-ui,sans-serif";
  ctx.fillText(`Dress: ${DRESS[i.k]}`,50,y+4);
  y+=26;

  // Time / closed note
  ctx.fillStyle="#3A4A5F";
  ctx.font="400 13px system-ui,sans-serif";
  ctx.fillText(i.k==="closed"?"The unit is closed (stand down).":`Parade: ${SESSION_TIME}`,28,y);

  // Footer
  ctx.fillStyle="#8A97A8";
  ctx.font="400 11px system-ui,sans-serif";
  ctx.fillText("From the 2447 training programme",28,H-28);
  return c;
}
function canvasToBlob(c){
  return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("PNG failed")),"image/png"));
}
async function downloadPng(i,btn){
  const label=btn&&btn.textContent;
  if(btn){btn.disabled=true;btn.textContent="Preparing…"}
  try{
    let logo=null;
    try{logo=await logoReady}catch(_){/* fall back to text header */}
    const c=paintCard(i,logo);
    const blob=await canvasToBlob(c);
    const name=fileName(i);
    const file=new File([blob],name,{type:"image/png"});
    const canShare=typeof navigator.share==="function"&&typeof navigator.canShare==="function"&&navigator.canShare({files:[file]});
    if(canShare){
      try{await navigator.share({files:[file],title:i.t,text:`${i.t} · ${fmt(i.date)} · ${SESSION_TIME_SHORT}`});return}
      catch(e){if(e&&e.name==="AbortError")return}
    }
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=name;
    const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
    if(isiOS){window.open(url,"_blank")}
    else{document.body.appendChild(a);a.click();a.remove()}
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
<div>${fmt(next.date)} · ${rel(next.date)} · ${SESSION_TIME_SHORT}</div>
<div class="time">${SESSION_TIME}</div>
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
const timeBit=i.k==="closed"?"":` · ${SESSION_TIME_SHORT}`;
html+=`<div class="s ${past?"past":""} ${isT?"today":""} ${isN?"isnext":""}" tabindex="0" data-i="${idx}"><div class="bar" style="background:var(--${i.k})"></div><div class="body">
<div class="d">${fmt(i.date)}${timeBit}${isT?'<span class="badge">TODAY</span>':isN?'<span class="badge">NEXT</span>':""}</div><div class="t">${i.t}</div>
<div class="more">Date: ${fmt(i.date)} (${rel(i.date)})<br>${i.k==="closed"?"The unit is closed (stand down).":`Time: ${SESSION_TIME}`}<br>Dress: ${DRESS[i.k]}<br>
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
