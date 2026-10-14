const $=s=>document.querySelector(s);const today=new Date();today.setHours(0,0,0,0);
const items=SESSIONS.map(([d,t,k])=>({date:new Date(d+"T00:00:00"),t,k}));
const fmt=d=>d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
const next=items.find(i=>i.date>=today&&i.k!=="closed");
let dressSel=new Set(),hidePast=false;
const days=d=>Math.round((d-today)/864e5);
function rel(d){const n=days(d);return n===0?"Today":n===1?"Tomorrow":n>0?`In ${n} days`:`${-n} days ago`}
$("#next").innerHTML=next?`<h2>${days(next.date)===0?"Tonight":"Next session"}</h2><div class="t" style="font-size:1.3rem">${next.t}</div>
<div>${fmt(next.date)} · ${rel(next.date)}</div><div><span class="dot" style="background:var(--${next.k})"></span>Dress: ${DRESS[next.k]}</div>`:`<h2>No upcoming sessions</h2><div>The programme ends 31 December 2026.</div>`;
$("#dress").innerHTML=Object.entries(DRESS).map(([k,v])=>`<button class="chip" data-k="${k}" aria-pressed="false"><span class="dot" style="background:var(--${k})"></span>${v}</button>`).join("");
$("#dress").onclick=e=>{const b=e.target.closest("button");if(!b)return;const k=b.dataset.k;dressSel.has(k)?dressSel.delete(k):dressSel.add(k);b.setAttribute("aria-pressed",dressSel.has(k));render()};
$("#hidePast").onclick=e=>{hidePast=!hidePast;e.target.setAttribute("aria-pressed",hidePast);render()};
$("#q").oninput=render;$("#month").onchange=render;
function render(){const q=$("#q").value.toLowerCase(),m=$("#month").value;let html="",cur="";
items.forEach(i=>{if(q&&!i.t.toLowerCase().includes(q))return;if(dressSel.size&&!dressSel.has(i.k))return;
if(m&&i.date.getMonth()+1!=m)return;const past=i.date<today;if(hidePast&&past)return;
const mon=i.date.toLocaleDateString("en-GB",{month:"long"});if(mon!==cur){cur=mon;html+=`<h3 class="month">${mon}</h3>`}
const isT=days(i.date)===0,isN=i===next;
html+=`<div class="s ${past?"past":""} ${isT?"today":""} ${isN?"isnext":""}" tabindex="0"><div class="bar" style="background:var(--${i.k})"></div><div class="body">
<div class="d">${fmt(i.date)}${isT?'<span class="badge">TODAY</span>':isN?'<span class="badge">NEXT</span>':""}</div><div class="t">${i.t}</div>
<div class="more">Date: ${fmt(i.date)} (${rel(i.date)})<br>Dress: ${DRESS[i.k]}${i.k==="closed"?"<br>The unit is closed (stand down).":""}</div></div></div>`});
$("#list").innerHTML=html||"<p>No sessions match.</p>";
document.querySelectorAll(".s").forEach(s=>{s.onclick=()=>s.classList.toggle("open");s.onkeydown=e=>{if(e.key==="Enter")s.classList.toggle("open")}})}
render();
