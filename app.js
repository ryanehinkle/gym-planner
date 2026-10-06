const STORAGE_KEY="formGymPlannerV2";

const defaultPlan={
  tuesday:{day:"Tuesday",type:"gym",title:"Full Body A",duration:"~60 min",exercises:[
    {name:"Chest Press Machine",sets:3,min:8,max:10,weight:50,rest:120,group:"upper"},
    {name:"Leg Press",sets:3,min:10,max:10,weight:120,rest:120,group:"lower"},
    {name:"Lat Pulldown",sets:3,min:8,max:10,weight:70,rest:90,group:"upper"},
    {name:"Seated Leg Curl",sets:3,min:10,max:12,weight:50,rest:90,group:"lower"},
    {name:"Seated Row Machine",sets:3,min:10,max:10,weight:60,rest:90,group:"upper"},
    {name:"Shoulder Press Machine",sets:2,min:8,max:10,weight:30,rest:90,group:"upper"},
    {name:"Ab Crunch Machine",sets:3,min:12,max:15,weight:40,rest:60,group:"core"},
    {name:"Plank",sets:2,min:30,max:60,weight:0,rest:60,group:"core",unit:"sec"}
  ]},
  wednesday:{day:"Wednesday",type:"run",title:"Easy Run",duration:"20–25 min",run:{minutes:22,distance:2,effort:5,note:"Easy conversational pace"}},
  friday:{day:"Friday",type:"gym",title:"Full Body B",duration:"~60 min",exercises:[
    {name:"Incline Chest Press Machine",sets:3,min:8,max:10,weight:45,rest:120,group:"upper"},
    {name:"Leg Press",sets:3,min:8,max:10,weight:130,rest:120,group:"lower"},
    {name:"Assisted Pull-Up Machine",sets:3,min:6,max:10,weight:70,rest:120,group:"upper",assistance:true},
    {name:"Leg Extension",sets:3,min:10,max:12,weight:50,rest:90,group:"lower"},
    {name:"Reverse Pec Deck",sets:2,min:12,max:15,weight:30,rest:75,group:"upper"},
    {name:"Biceps Curl Machine",sets:2,min:10,max:12,weight:25,rest:60,group:"upper"},
    {name:"Single-Arm Cable Triceps Extension",sets:3,min:10,max:15,weight:10,rest:60,group:"upper"},
    {name:"Rope Triceps Pushdown",sets:2,min:10,max:12,weight:25,rest:60,group:"upper"},
    {name:"Ab Crunch Machine",sets:3,min:12,max:15,weight:40,rest:60,group:"core"}
  ]},
  sunday:{day:"Sunday",type:"run",title:"Quality Run",duration:"30–35 min",run:{minutes:32,distance:2.8,effort:7,note:"10 min easy • 10–15 min comfortably hard • easy cooldown"}}
};

const goals={
  "Chest Press Machine":75,
  "Leg Press":180,
  "Lat Pulldown":100,
  "Seated Leg Curl":75,
  "Seated Row Machine":90,
  "Shoulder Press Machine":50,
  "Ab Crunch Machine":65,
  "Incline Chest Press Machine":70,
  "Assisted Pull-Up Machine":40,
  "Leg Extension":80,
  "Reverse Pec Deck":50,
  "Biceps Curl Machine":40,
  "Single-Arm Cable Triceps Extension":20,
  "Rope Triceps Pushdown":45,
  "Easy Run":35,
  "Quality Run":45
};

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const clone=x=>JSON.parse(JSON.stringify(x));

function initialState(){
  return {plan:clone(defaultPlan),logs:[],createdAt:new Date().toISOString()};
}

function normalizeState(raw){
  const d=initialState();
  if(!raw||typeof raw!=="object")return d;
  const oldPlan=raw.plan||{};
  const tue=oldPlan.tuesday||oldPlan.monday||{};
  const plan={
    tuesday:{...d.plan.tuesday,...tue,day:"Tuesday",type:"gym"},
    wednesday:{...d.plan.wednesday,...(oldPlan.wednesday||{}),day:"Wednesday",type:"run"},
    friday:{...d.plan.friday,...(oldPlan.friday||{}),day:"Friday",type:"gym"},
    sunday:{...d.plan.sunday,...(oldPlan.sunday||{}),day:"Sunday",type:"run",title:"Quality Run",duration:"30–35 min"}
  };
  ["tuesday","friday"].forEach(k=>{
    const saved=Array.isArray(plan[k].exercises)?plan[k].exercises:[];
    plan[k].exercises=d.plan[k].exercises.map(def=>{
      const p=saved.find(e=>e&&e.name===def.name);
      return p?{...def,...p}:{...def};
    });
  });
  plan.wednesday.run={...d.plan.wednesday.run,...(oldPlan.wednesday?.run||{}),note:"Easy conversational pace"};
  plan.sunday.run={...d.plan.sunday.run,...(oldPlan.sunday?.run||{}),effort:7,note:"10 min easy • 10–15 min comfortably hard • easy cooldown"};
  const logs=Array.isArray(raw.logs)?raw.logs.map(l=>l?.dayKey==="monday"?{...l,dayKey:"tuesday"}:l):[];
  return {...d,...raw,plan,logs};
}

function loadState(){
  try{
    const current=localStorage.getItem(STORAGE_KEY);
    if(current)return normalizeState(JSON.parse(current));
    const legacy=localStorage.getItem("formGymPlannerV1");
    if(legacy){
      const migrated=normalizeState(JSON.parse(legacy));
      localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated));
      return migrated;
    }
  }catch{}
  return initialState();
}
let state=loadState();
let weekOffset=0;
let goalTab="strength";
let activeSession=null;
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}

function mondayOf(date=new Date()){
  const d=new Date(date);d.setHours(0,0,0,0);
  const day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));return d;
}
function weekRange(offset=0){const start=mondayOf();start.setDate(start.getDate()+offset*7);const end=new Date(start);end.setDate(start.getDate()+6);return{start,end}}
function dayDate(key,offset=0){const map={tuesday:1,wednesday:2,friday:4,sunday:6};const d=weekRange(offset).start;const x=new Date(d);x.setDate(d.getDate()+map[key]);return x}
function iso(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString().slice(0,10)}
function fmt(d){return d.toLocaleDateString(undefined,{month:"short",day:"numeric"})}
function logFor(key,offset=0){const date=iso(dayDate(key,offset));return state.logs.find(l=>l.dayKey===key&&l.date===date)}
function thisWeekCount(){return Object.keys(defaultPlan).filter(k=>logFor(k,0)).length}
function totalMiles(){return state.logs.filter(l=>l.type==="run").reduce((a,l)=>a+(+l.distance||0),0)}
function nextSession(){
  const order=["tuesday","wednesday","friday","sunday"],now=new Date();
  for(const key of order){const d=dayDate(key);d.setHours(23,59,59);if(now<=d&&!logFor(key))return{key,date:dayDate(key),...state.plan[key]}}
  return{key:"tuesday",date:dayDate("tuesday",1),...state.plan.tuesday,nextWeek:true};
}
function latestExercise(name){
  const logs=[...state.logs].filter(l=>l.type==="gym").sort((a,b)=>b.date.localeCompare(a.date));
  for(const log of logs){
    const ex=(log.exercises||[]).find(e=>e.name===name);
    if(ex){
      if(Array.isArray(ex.setsDone)){
        const done=ex.setsDone.filter(s=>s.done);
        if(done.length)return{name,weight:done.reduce((a,s)=>a+(+s.weight||0),0)/done.length,reps:done.reduce((a,s)=>a+(+s.reps||0),0)/done.length};
      }
      if(ex.weight!=null)return{name,weight:+ex.weight||0,reps:+ex.reps||0};
    }
  }
  for(const p of Object.values(state.plan)){const e=(p.exercises||[]).find(e=>e.name===name);if(e)return{name,weight:e.weight,reps:e.min}}
  return{name,weight:0,reps:0};
}
function exerciseDefault(name){
  for(const p of Object.values(defaultPlan)){const e=(p.exercises||[]).find(x=>x.name===name);if(e)return e}
  return null;
}
function exerciseProgress(name){
  const goal=goals[name],cur=latestExercise(name).weight,base=exerciseDefault(name)?.weight||0;
  if(goal==null)return 0;
  if(name==="Assisted Pull-Up Machine"){
    if(base===goal)return 100;
    return Math.max(0,Math.min(100,Math.round((base-cur)/(base-goal)*100)));
  }
  if(goal===base)return 100;
  return Math.max(0,Math.min(100,Math.round((cur-base)/(goal-base)*100)));
}
function overallGoalProgress(){
  const names=Object.keys(goals).filter(k=>!["Easy Run","Quality Run"].includes(k));
  return Math.round(names.reduce((a,n)=>a+exerciseProgress(n),0)/names.length);
}

function go(page){
  $$(".page").forEach(p=>p.classList.toggle("active",p.id===page));
  $$(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  if(page==="home")setTimeout(drawChart,50);
  window.scrollTo({top:0,behavior:"smooth"});
}
$$(".bottom-nav button").forEach(b=>b.onclick=()=>go(b.dataset.page));
$$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));

function renderHome(){
  const n=nextSession(),count=thisWeekCount();
  $("#todayLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
  $("#weekCount").textContent=count+"/4 complete";
  $("#nextDay").textContent=(n.nextWeek?"Next week • ":"")+n.day+" • "+fmt(n.date);
  $("#nextTitle").textContent=n.title;
  $("#nextDetail").textContent=n.type==="gym" ? n.exercises.length+" exercises • "+n.duration : n.run.note+" • "+n.duration;
  $("#startNext").onclick=()=>openSession(n.key,n.nextWeek?1:0);
  $("#statWeek").textContent=count+"/4";
  $("#statSessions").textContent=state.logs.length;
  $("#statMiles").textContent=totalMiles().toFixed(1);
  $("#statGoals").textContent=overallGoalProgress()+"%";
  $("#weekList").innerHTML=Object.keys(state.plan).map(k=>{
    const p=state.plan[k],done=!!logFor(k);
    return '<div class="week-row '+(done?"done":"")+'"><div class="week-day">'+p.day.slice(0,3).toUpperCase()+'</div><div><strong>'+p.title+'</strong><span>'+p.duration+'</span></div><div class="week-status">'+(done?"✓":"")+'</div></div>';
  }).join("");
  drawChart();
}

function renderPlan(){
  const {start,end}=weekRange(weekOffset);
  $("#weekLabel").textContent=weekOffset===0?"This week":weekOffset===1?"Next":weekOffset===-1?"Last":fmt(start)+"–"+fmt(end);
  $("#planList").innerHTML=Object.keys(state.plan).map(k=>{
    const p=state.plan[k],done=!!logFor(k,weekOffset),d=dayDate(k,weekOffset);
    let lines="";
    if(p.type==="gym"){
      lines=p.exercises.map(e=>'<div class="exercise-line"><strong>'+e.name+'</strong><span>'+e.sets+' × '+e.min+(e.max!==e.min?"–"+e.max:"")+(e.unit==="sec"?" sec":' • '+(e.assistance?e.weight+" lb assist":e.weight+" lb"))+'</span></div>').join("");
    }else{
      lines='<div class="exercise-line"><strong>'+p.run.note+'</strong><span>'+p.run.minutes+' min • effort '+p.run.effort+'/10</span></div>';
    }
    return '<article class="plan-card"><div class="plan-head"><div><span class="small">'+p.day+' • '+fmt(d)+'</span><h2>'+p.title+'</h2><p>'+p.duration+'</p></div><span class="pill">'+(done?"DONE":p.type==="gym"?"LIFT":"RUN")+'</span></div><div class="exercise-lines">'+lines+'</div><button class="primary" onclick="openSession(\''+k+'\','+weekOffset+')">'+(done?"View / edit":"Start")+'</button></article>';
  }).join("");
}
$("#prevWeek").onclick=()=>{weekOffset--;renderPlan()};
$("#nextWeek").onclick=()=>{weekOffset++;renderPlan()};

function nextRecommendation(e){
  const last=latestExercise(e.name);
  if(!state.logs.some(l=>(l.exercises||[]).some(x=>x.name===e.name)))return "Start here and establish your baseline";
  const inc=e.group==="lower"?10:5;
  if(e.assistance)return "Goal: reduce assistance toward "+goals[e.name]+" lb";
  return "Next planned load: "+e.weight+" lb";
}
function renderGoals(){
  const strengthNames=Object.keys(goals).filter(k=>!["Easy Run","Quality Run"].includes(k));
  if(goalTab==="strength"){
    $("#goalList").innerHTML=strengthNames.map(name=>{
      const cur=Math.round(latestExercise(name).weight),goal=goals[name],pc=exerciseProgress(name),e=exerciseDefault(name);
      const unit=e?.assistance?" lb assist":" lb";
      return '<article class="goal-card"><div class="goal-top"><strong>'+name+'</strong><span class="goal-values">'+cur+unit+' → '+goal+unit+'</span></div><div class="goal-bar"><span style="width:'+pc+'%"></span></div><div class="goal-foot">'+nextRecommendation(findPlanExercise(name))+'</div></article>';
    }).join("");
  }else{
    const easy=state.plan.wednesday.run.minutes,quality=state.plan.sunday.run.minutes;
    const rows=[["Easy Run",easy,goals["Easy Run"],"Comfortable continuous"],["Quality Run",quality,goals["Quality Run"],"Controlled tempo / progression"]];
    $("#goalList").innerHTML=rows.map(([name,cur,goal,note])=>{
      const base=name==="Easy Run"?22:32,pc=Math.max(0,Math.min(100,Math.round((cur-base)/(goal-base)*100)));
      return '<article class="goal-card"><div class="goal-top"><strong>'+name+'</strong><span class="goal-values">'+cur+' min → '+goal+' min</span></div><div class="goal-bar"><span style="width:'+pc+'%"></span></div><div class="goal-foot">'+note+'</div></article>';
    }).join("");
  }
}
function findPlanExercise(name){for(const p of Object.values(state.plan)){const e=(p.exercises||[]).find(x=>x.name===name);if(e)return e}return{name,weight:0,group:"upper"}}
$$("[data-goal-tab]").forEach(b=>b.onclick=()=>{$$("[data-goal-tab]").forEach(x=>x.classList.remove("active"));b.classList.add("active");goalTab=b.dataset.goalTab;renderGoals()});

function priorSets(existing,e){
  const old=existing?.exercises?.find(x=>x.name===e.name);
  if(old?.setsDone)return old.setsDone;
  if(old&&old.weight!=null)return Array.from({length:e.sets},()=>({weight:+old.weight||e.weight,reps:+old.reps||e.min,done:true}));
  return Array.from({length:e.sets},()=>({weight:e.weight,reps:e.min,done:false}));
}
function openSession(key,offset=0){
  const p=state.plan[key],date=dayDate(key,offset),existing=logFor(key,offset);
  activeSession={key,offset,p,date,existing};
  $("#sessionTitle").textContent=p.title;$("#sessionDate").textContent=p.day+" • "+fmt(date);
  if(p.type==="gym"){
    $("#sessionBody").innerHTML=p.exercises.map((e,i)=>{
      const sets=priorSets(existing,e);
      return '<article class="exercise-card" data-ex="'+i+'"><div class="exercise-title"><div><strong>'+e.name+'</strong><span>'+e.sets+' sets • '+e.min+(e.max!==e.min?"–"+e.max:"")+(e.unit==="sec"?" sec":" reps")+' • '+e.rest+'s rest</span></div><span class="exercise-count">0/'+e.sets+'</span></div><div class="set-list">'+sets.map((s,j)=>
        '<div class="set-row '+(s.done?"checked":"")+'" data-set="'+j+'"><div class="set-num">'+(j+1)+'</div>'+
        '<div class="field"><label>'+(e.unit==="sec"?"Weight":"Weight")+'</label><input inputmode="decimal" data-weight value="'+(e.unit==="sec"?"":s.weight)+'" '+(e.unit==="sec"?"disabled":"")+'></div>'+
        '<div class="field"><label>'+(e.unit==="sec"?"Seconds":"Reps")+'</label><input inputmode="numeric" data-reps value="'+s.reps+'"></div>'+
        '<button class="check-set '+(s.done?"checked":"")+'" type="button">✓</button></div>'
      ).join("")+'</div></article>';
    }).join("");
    $$(".check-set").forEach(btn=>btn.onclick=()=>{
      btn.classList.toggle("checked");btn.closest(".set-row").classList.toggle("checked");
      updateSessionProgress();
    });
  }else{
    const steps=existing?.steps||[
      {label:key==="sunday"?"Warm up • 10 min easy":"Run • easy conversational",done:false},
      ...(key==="sunday"?[{label:"Quality • 10–15 min comfortably hard",done:false},{label:"Cool down • easy",done:false}]:[])
    ];
    $("#sessionBody").innerHTML='<article class="run-card"><div class="run-plan">'+p.run.note+'</div><div class="run-fields"><div class="field"><label>Minutes</label><input id="runMinutes" inputmode="numeric" value="'+(existing?.minutes??p.run.minutes)+'"></div><div class="field"><label>Miles</label><input id="runMilesInput" inputmode="decimal" value="'+(existing?.distance??p.run.distance)+'"></div><div class="field"><label>Effort 1–10</label><input id="runEffort" inputmode="numeric" value="'+(existing?.effort??p.run.effort)+'"></div></div><div class="run-checks">'+steps.map((s,i)=>'<div class="run-step '+(s.done?"done":"")+'" data-runstep="'+i+'"><span>'+s.label+'</span><button type="button">'+(s.done?"✓":"✓")+'</button></div>').join("")+'</div></article>';
    $$(".run-step button").forEach(btn=>btn.onclick=()=>{btn.closest(".run-step").classList.toggle("done");updateSessionProgress()});
  }
  $("#session").classList.add("open");updateSessionProgress();
}
window.openSession=openSession;
function updateSessionProgress(){
  if(!activeSession)return;
  let done=0,total=0;
  if(activeSession.p.type==="gym"){
    const cards=$$(".exercise-card");
    cards.forEach(card=>{
      const buttons=[...card.querySelectorAll(".check-set")],d=buttons.filter(b=>b.classList.contains("checked")).length;
      done+=d;total+=buttons.length;
      card.querySelector(".exercise-count").textContent=d+"/"+buttons.length;
      card.classList.toggle("complete",d===buttons.length&&buttons.length>0);
    });
  }else{
    const steps=$$(".run-step");done=steps.filter(x=>x.classList.contains("done")).length;total=steps.length;
  }
  const pc=total?Math.round(done/total*100):0;
  $("#sessionPct").textContent=pc+"%";$("#sessionProgress").style.width=pc+"%";
  $("#finishSession").textContent=pc===100?"Finish session":"Save progress";
}
$("#closeSession").onclick=()=>$("#session").classList.remove("open");

function applyProgression(p,loggedExercises){
  p.exercises.forEach(e=>{
    if(e.unit==="sec")return;
    const le=loggedExercises.find(x=>x.name===e.name);if(!le)return;
    const allDone=le.setsDone.length===e.sets&&le.setsDone.every(s=>s.done);
    const allTop=le.setsDone.every(s=>(+s.reps||0)>=e.max);
    if(allDone&&allTop){
      const inc=e.group==="lower"?10:5;
      if(e.assistance)e.weight=Math.max(goals[e.name]||0,e.weight-inc);
      else e.weight=Math.min(goals[e.name]||Infinity,e.weight+inc);
    }
  });
}
$("#finishSession").onclick=()=>{
  if(!activeSession)return;
  const {key,p,date,existing}=activeSession;
  const log={id:existing?.id||Date.now(),date:iso(date),dayKey:key,type:p.type,title:p.title,completedAt:new Date().toISOString()};
  if(p.type==="gym"){
    log.exercises=p.exercises.map((e,i)=>{
      const card=document.querySelector('.exercise-card[data-ex="'+i+'"]');
      const setsDone=[...card.querySelectorAll(".set-row")].map(row=>({
        weight:+row.querySelector("[data-weight]")?.value||0,
        reps:+row.querySelector("[data-reps]").value||0,
        done:row.querySelector(".check-set").classList.contains("checked")
      }));
      return{name:e.name,targetMin:e.min,targetMax:e.max,setsDone};
    });
    applyProgression(p,log.exercises);
  }else{
    log.minutes=+$("#runMinutes").value||0;log.distance=+$("#runMilesInput").value||0;log.effort=+$("#runEffort").value||0;
    log.steps=$$(".run-step").map(s=>({label:s.querySelector("span").textContent,done:s.classList.contains("done")}));
    const allDone=log.steps.length&&log.steps.every(s=>s.done);
    if(allDone&&log.effort<=7){
      const target=key==="wednesday"?goals["Easy Run"]:goals["Quality Run"];
      p.run.minutes=Math.min(target,p.run.minutes+2);
    }
  }
  const idx=state.logs.findIndex(l=>l.date===log.date&&l.dayKey===key);
  if(idx>=0)state.logs[idx]=log;else state.logs.push(log);
  state.logs.sort((a,b)=>a.date.localeCompare(b.date));
  save();$("#session").classList.remove("open");activeSession=null;renderAll();toast("Saved");
};

function renderHistory(){
  const logs=[...state.logs].reverse();
  $("#historyList").innerHTML=logs.length?logs.map(l=>{
    const d=new Date(l.date+"T12:00:00");
    let meta="";
    if(l.type==="run")meta=(+l.distance||0).toFixed(2)+" mi<br>"+(+l.minutes||0)+" min";
    else{
      const sets=(l.exercises||[]).reduce((a,e)=>a+(e.setsDone?e.setsDone.filter(s=>s.done).length:(+e.sets||0)),0);
      meta=sets+" sets";
    }
    return '<article class="history-card"><div><strong>'+l.title+'</strong><span>'+d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})+'</span></div><div class="history-meta">'+meta+'</div></article>';
  }).join(""):'<div class="empty">No sessions yet.</div>';
}
$("#exportData").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="gym-planner-data.json";a.click();URL.revokeObjectURL(a.href);
};

function strengthScoreForLog(log){
  const vals=[];
  (log.exercises||[]).forEach(e=>{
    const def=exerciseDefault(e.name),goal=goals[e.name];if(!def||goal==null)return;
    let weight=0;
    if(e.setsDone?.length){const done=e.setsDone.filter(s=>s.done);if(done.length)weight=done.reduce((a,s)=>a+(+s.weight||0),0)/done.length}
    else weight=+e.weight||0;
    if(!weight&&e.name!=="Plank")return;
    let pc;
    if(def.assistance)pc=(def.weight-weight)/(def.weight-goal);
    else pc=(weight-def.weight)/(goal-def.weight);
    vals.push(Math.max(0,Math.min(1,pc)));
  });
  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length*100:null;
}
function drawChart(){
  const c=$("#progressChart");if(!c)return;const r=c.getBoundingClientRect();if(r.width<10)return;
  const dpr=window.devicePixelRatio||1;c.width=r.width*dpr;c.height=r.height*dpr;const ctx=c.getContext("2d");ctx.scale(dpr,dpr);
  const w=r.width,h=r.height,p={l:28,r:10,t:10,b:22};ctx.clearRect(0,0,w,h);
  ctx.font="8px Inter";ctx.fillStyle="#687181";ctx.strokeStyle="#232935";ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=p.t+(h-p.t-p.b)*i/4;ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(w-p.r,y);ctx.stroke();ctx.fillText((100-i*25)+"",4,y+3)}
  const target=[];for(let i=0;i<12;i++){target.push([p.l+(w-p.l-p.r)*i/11,p.t+(h-p.t-p.b)*(1-i/11)])}
  ctx.setLineDash([4,4]);ctx.strokeStyle="#44d39b";ctx.globalAlpha=.65;ctx.beginPath();target.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
  const gym=state.logs.filter(l=>l.type==="gym").map(l=>({date:l.date,v:strengthScoreForLog(l)})).filter(x=>x.v!=null).slice(-12);
  if(gym.length){
    const pts=gym.map((x,i)=>[p.l+(w-p.l-p.r)*(gym.length===1?.5:i/(gym.length-1)),p.t+(h-p.t-p.b)*(1-x.v/100)]);
    const grad=ctx.createLinearGradient(0,p.t,0,h-p.b);grad.addColorStop(0,"rgba(124,92,255,.32)");grad.addColorStop(1,"rgba(124,92,255,0)");
    ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.lineTo(pts.at(-1)[0],h-p.b);ctx.lineTo(pts[0][0],h-p.b);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.strokeStyle="#8d73ff";ctx.lineWidth=2.5;ctx.stroke();
  }
  ctx.fillStyle="#687181";["W1","W4","W8","W12"].forEach((x,i)=>ctx.fillText(x,p.l+(w-p.l-p.r)*i/3-5,h-5));
}
window.addEventListener("resize",()=>{clearTimeout(window.__r);window.__r=setTimeout(drawChart,80)});

function renderAll(){renderHome();renderPlan();renderGoals();renderHistory()}
renderAll();
