const STORAGE_KEY="formGymPlannerV1";

const defaultPlan = {
  tuesday:{day:"Tuesday",type:"gym",title:"Full Body A",subtitle:"Strength + muscle • machine focused",duration:"~60 min",exercises:[
    {name:"Chest Press Machine",sets:3,min:8,max:10,weight:50,rest:120,group:"upper"},
    {name:"Leg Press",sets:3,min:10,max:10,weight:120,rest:120,group:"lower"},
    {name:"Lat Pulldown",sets:3,min:8,max:10,weight:70,rest:90,group:"upper"},
    {name:"Seated Leg Curl",sets:3,min:10,max:12,weight:50,rest:90,group:"lower"},
    {name:"Seated Row Machine",sets:3,min:10,max:10,weight:60,rest:90,group:"upper"},
    {name:"Shoulder Press Machine",sets:2,min:8,max:10,weight:30,rest:90,group:"upper"},
    {name:"Ab Crunch Machine",sets:3,min:12,max:15,weight:40,rest:60,group:"core"},
    {name:"Plank",sets:2,min:30,max:60,weight:0,rest:60,group:"core",unit:"sec"}
  ]},
  wednesday:{day:"Wednesday",type:"run",title:"Easy Run",subtitle:"Conversational aerobic work",duration:"20–25 min",run:{minutes:22,distance:2.0,effort:5,note:"Easy conversational pace"}},
  friday:{day:"Friday",type:"gym",title:"Full Body B",subtitle:"Strength + muscle • machine focused",duration:"~60 min",exercises:[
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
  sunday:{day:"Sunday",type:"run",title:"Quality Run",subtitle:"Controlled intensity • tempo / progression",duration:"30–35 min",run:{minutes:32,distance:2.8,effort:7,note:"10 min easy • 10–15 min comfortably hard • easy cooldown"}}
};

const goalDefaults = {
  "Chest Press Machine":90,"Leg Press":220,"Lat Pulldown":110,"Seated Leg Curl":90,"Seated Row Machine":100,
  "Shoulder Press Machine":60,"Ab Crunch Machine":80,"Incline Chest Press Machine":80,"Assisted Pull-Up Machine":30,
  "Leg Extension":100,"Reverse Pec Deck":60,"Biceps Curl Machine":45,"Single-Arm Cable Triceps Extension":25,"Rope Triceps Pushdown":50
};

function initialState(){
  return {
    profile:{name:"Ryan",weight:155,height:"5'11\"",goal:"fit"},
    settings:{upperIncrement:5,lowerIncrement:10,runIncrement:5,weekStart:1},
    plan:JSON.parse(JSON.stringify(defaultPlan)),
    goals:{...goalDefaults,runEasyMinutes:40,runLongMinutes:60},
    logs:[],
    createdAt:new Date().toISOString()
  };
}
let state=loadState();
let weekOffset=0, goalFilter="strength", historyFilter="all";

function loadState(){
  try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY));return x?mergeState(x):initialState()}catch{return initialState()}
}
function mergeState(x){
  const d=initialState();
  return {...d,...x,profile:{...d.profile,...x.profile},settings:{...d.settings,...x.settings},plan:x.plan||d.plan,goals:{...d.goals,...x.goals},logs:Array.isArray(x.logs)?x.logs:[]};
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function fmtDate(d){return d.toLocaleDateString(undefined,{month:"short",day:"numeric"})}
function isoDate(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString().slice(0,10)}
function mondayOf(date=new Date()){
  const d=new Date(date);d.setHours(0,0,0,0);const day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));return d;
}
function weekRange(offset=0){const start=mondayOf();start.setDate(start.getDate()+offset*7);const end=new Date(start);end.setDate(start.getDate()+6);return {start,end}}
function dayDate(dayKey,offset=0){const map={tuesday:1,wednesday:2,friday:4,sunday:6};const d=weekRange(offset).start;const x=new Date(d);x.setDate(d.getDate()+map[dayKey]);return x}
function logFor(dayKey,offset=0){const date=isoDate(dayDate(dayKey,offset));return state.logs.find(l=>l.date===date&&l.dayKey===dayKey)}
function completedThisWeek(){return Object.keys(defaultPlan).filter(k=>!!logFor(k,0)).length}
function sessionCountThisMonth(){const now=new Date();return state.logs.filter(l=>{const d=new Date(l.date+"T12:00:00");return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).length}
function totalRunMiles(){return state.logs.filter(l=>l.type==="run").reduce((a,l)=>a+(+l.distance||0),0)}
function volume30(){
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
  return state.logs.filter(l=>l.type==="gym"&&new Date(l.date)>=cutoff).reduce((sum,l)=>sum+(l.exercises||[]).reduce((s,e)=>s+(+e.weight||0)*(+e.reps||0)*(+e.sets||0),0),0);
}
function latestWeight(name){
  const logs=[...state.logs].filter(l=>l.type==="gym").sort((a,b)=>b.date.localeCompare(a.date));
  for(const l of logs){const e=(l.exercises||[]).find(x=>x.name===name);if(e&&+e.weight>=0)return +e.weight}
  for(const d of Object.values(state.plan)){if(d.exercises){const e=d.exercises.find(x=>x.name===name);if(e)return e.weight}}
  return 0;
}
function strengthProgress(){
  const names=Object.keys(goalDefaults);let total=0,count=0;
  names.forEach(n=>{const goal=+state.goals[n]||0;if(goal>0){total+=Math.min(1,latestWeight(n)/goal);count++}});
  return count?Math.round(total/count*100):0;
}
function streakWeeks(){
  let streak=0;
  for(let i=0;i<52;i++){
    const {start,end}=weekRange(-i);
    const c=state.logs.filter(l=>{const d=new Date(l.date+"T12:00:00");return d>=start&&d<=new Date(end.getFullYear(),end.getMonth(),end.getDate(),23,59,59)}).length;
    if(c>=3)streak++; else if(i===0&&c<3)continue; else break;
  }
  return streak;
}
function nextSession(){
  const now=new Date(), order=["tuesday","wednesday","friday","sunday"];
  for(const k of order){const d=dayDate(k,0);d.setHours(23,59,59);if(now<=d&&!logFor(k,0))return {key:k,date:dayDate(k,0),...state.plan[k]}}
  return {key:"tuesday",date:dayDate("tuesday",1),...state.plan.tuesday,nextWeek:true};
}

function switchTab(id){
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===id));
  $$(".tab-page").forEach(p=>p.classList.toggle("active",p.id===id));
  const names={dashboard:["YOUR TRAINING","Dashboard"],workouts:["WEEKLY PLAN","Plan"],goals:["PROGRESSION","Goals"],history:["TRAINING LOG","History"],settings:["PREFERENCES","Settings"]};
  $("#pageEyebrow").textContent=names[id][0];$("#pageTitle").textContent=names[id][1];
  if(id==="dashboard")setTimeout(drawChart,80);
  window.scrollTo({top:0,behavior:"smooth"});
}
$$(".nav-item").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
$$("[data-tab-jump]").forEach(b=>b.onclick=()=>switchTab(b.dataset.tabJump));
$("[data-tab-target]").onclick=()=>switchTab("dashboard");

function renderDashboard(){
  const done=completedThisWeek(),pct=Math.round(done/4*100),streak=streakWeeks(),next=nextSession();
  $("#sidebarProgressText").textContent=done+" / 4";$("#sidebarProgressPct").textContent=pct+"%";$("#sidebarProgressBar").style.width=pct+"%";
  $("#weekRing").style.setProperty("--p",pct);$("#weekRingValue").textContent=pct+"%";
  $("#streakCount").textContent=streak;$("#streakBig").textContent=streak;
  $("#totalSessions").textContent=state.logs.length;$("#sessionsThisMonth").textContent=sessionCountThisMonth()+" this month";
  $("#strengthProgress").textContent=strengthProgress();$("#runMiles").textContent=totalRunMiles().toFixed(1);
  $("#volumeValue").textContent=Math.round(volume30()).toLocaleString();
  $("#nextWorkoutTitle").textContent=next.title;
  $("#nextWorkoutSubtitle").textContent=(next.nextWeek?"Next week • ":"")+next.day+" • "+fmtDate(next.date)+" • "+next.subtitle;
  const meta=next.type==="gym"?[next.duration,(next.exercises||[]).length+" exercises","RIR 2–3"]: [next.duration,"Easy pace","Conversational"];
  $("#nextWorkoutMeta").innerHTML=meta.map(x=>'<span class="meta-pill">'+x+'</span>').join("");
  $("#startNextBtn").onclick=()=>openSession(next.key,next.nextWeek?1:0);

  $("#weekList").innerHTML=Object.keys(state.plan).map(k=>{
    const p=state.plan[k],done=!!logFor(k,0);
    return '<div class="week-item '+(done?"done":"")+'"><div class="week-day">'+p.day.slice(0,3).toUpperCase()+'</div><div class="week-item-main"><strong>'+p.title+'</strong><span>'+p.duration+'</span></div><div class="week-check">'+(done?"✓":"")+'</div></div>';
  }).join("");

  const sp=strengthProgress();
  if(state.logs.length===0){$("#coachTitle").textContent="Build the habit first.";$("#coachText").textContent="Week one should feel controlled. Leave 2–3 good reps in reserve and establish clean baselines."}
  else if(done>=4){$("#coachTitle").textContent="Perfect week.";$("#coachText").textContent="All four planned sessions are logged. Recover, then repeat before making big jumps."}
  else if(sp>=75){$("#coachTitle").textContent="Targets are getting close.";$("#coachText").textContent="You're above 75% of your first strength targets. Keep earning small jumps instead of forcing them."}
  else{$("#coachTitle").textContent="Keep stacking clean sessions.";$("#coachText").textContent="Your logged work is driving the recommendations. Hit the top of a rep range before adding weight."}
  drawChart();
}

function renderPlan(){
  const {start,end}=weekRange(weekOffset);
  $("#weekLabel").textContent=weekOffset===0?"This week":weekOffset===1?"Next week":weekOffset===-1?"Last week":fmtDate(start)+" – "+fmtDate(end);
  const cards=[];
  Object.keys(state.plan).forEach(k=>{
    const p=state.plan[k],log=logFor(k,weekOffset),d=dayDate(k,weekOffset);
    let preview="";
    if(p.type==="gym") preview=p.exercises.slice(0,5).map(e=>'<div class="exercise-row"><div><strong>'+e.name+'</strong><span>'+e.sets+' sets • '+Math.round(e.rest/60*10)/10+' min rest</span></div><span class="exercise-target">'+(e.weight?e.weight+" lb • ":"")+e.min+(e.max!==e.min?"–"+e.max:"")+' reps</span></div>').join("")+'<div class="exercise-row"><div><strong>+'+(p.exercises.length-5)+' more</strong><span>Open session for full plan</span></div></div>';
    else preview='<div class="exercise-row"><div><strong>'+p.run.note+'</strong><span>Effort '+p.run.effort+'/10'+(k==="sunday"?" • controlled quality":" • no racing")+'</span></div><span class="exercise-target">'+p.run.minutes+' min target</span></div>';
    cards.push('<article class="card plan-card"><div class="plan-card-top"><div><div class="day-badge">'+p.day.toUpperCase()+' • '+fmtDate(d)+'</div><h3>'+p.title+'</h3><p>'+p.subtitle+'</p></div><span class="type-badge">'+(p.type==="gym"?"STRENGTH":"RUN")+'</span></div><div class="exercise-preview">'+preview+'</div><div class="plan-actions"><button class="'+(log?"secondary-btn":"primary-btn")+'" onclick="openSession(\''+k+'\','+weekOffset+')">'+(log?"View / edit log":"Start & log session")+'</button>'+(log?'<span class="completed-badge">✓ COMPLETE</span>':'')+'</div></article>');
  });
  $("#planGrid").innerHTML=cards.join("");
}

function recommendationFor(e){
  const logs=[...state.logs].filter(l=>l.type==="gym").sort((a,b)=>b.date.localeCompare(a.date));
  const found=logs.map(l=>(l.exercises||[]).find(x=>x.name===e.name)).find(Boolean);
  if(!found)return {text:"Establish baseline",next:e.weight};
  const hit=(+found.reps||0)>=e.max && (+found.rir||0)>=2;
  const inc=e.group==="lower"?+state.settings.lowerIncrement:+state.settings.upperIncrement;
  if(e.assistance) return hit?{text:"Reduce assistance",next:Math.max(0,(+found.weight||e.weight)-inc)}:{text:"Repeat current",next:+found.weight};
  return hit?{text:"Increase next time",next:(+found.weight||e.weight)+inc}:{text:"Repeat & own reps",next:+found.weight};
}

function renderGoals(){
  $("#phaseProgress").style.width=Math.min(100,state.logs.length/32*100)+"%";
  const entries=[];
  if(goalFilter==="strength"){
    const seen=new Set();
    Object.values(state.plan).forEach(p=>(p.exercises||[]).forEach(e=>{
      if(seen.has(e.name)||e.unit==="sec")return;seen.add(e.name);
      const current=latestWeight(e.name),goal=+state.goals[e.name]||0,pc=goal?Math.min(100,Math.round(current/goal*100)):0,rec=recommendationFor(e);
      entries.push('<div class="goal-row"><div class="goal-name"><strong>'+e.name+'</strong><span>'+rec.text+' • next '+rec.next+' lb</span></div><div class="goal-metric"><label>Current</label><strong>'+current+' lb</strong></div><div class="goal-metric"><label>12-week goal</label><strong>'+goal+' lb</strong></div><div><div class="goal-progress"><span style="width:'+pc+'%"></span></div></div><button class="goal-edit" onclick="editGoal(\''+e.name.replace(/'/g,"\\'")+'\')">✎</button></div>');
    }));
  }else{
    const easy=state.plan.wednesday.run.minutes,long=state.plan.sunday.run.minutes;
    [["Easy Run",easy,"runEasyMinutes"],["Long Easy Run",long,"runLongMinutes"]].forEach(([name,current,key])=>{
      const goal=+state.goals[key],pc=Math.min(100,Math.round(current/goal*100));
      entries.push('<div class="goal-row"><div class="goal-name"><strong>'+name+'</strong><span>Build duration gradually while keeping effort easy</span></div><div class="goal-metric"><label>Current plan</label><strong>'+current+' min</strong></div><div class="goal-metric"><label>Goal</label><strong>'+goal+' min</strong></div><div><div class="goal-progress"><span style="width:'+pc+'%"></span></div></div><button class="goal-edit" onclick="editGoal(\''+key+'\')">✎</button></div>');
    });
  }
  $("#goalsList").innerHTML=entries.join("");
  $("#goalTargetSummary").textContent=strengthProgress()+"% to first strength targets";
}
function editGoal(key){
  const current=state.goals[key],unit=key.startsWith("run")?"minutes":"lb";
  const v=prompt("Set goal ("+unit+"):",current);
  if(v!==null&&v!==""&&!isNaN(v)){state.goals[key]=+v;saveState();renderAll();toast("Goal updated")}
}
$$("[data-goal-filter]").forEach(b=>b.onclick=()=>{$$("[data-goal-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");goalFilter=b.dataset.goalFilter;renderGoals()});
$("#recalcGoalsBtn").onclick=()=>{
  Object.values(state.plan).forEach(p=>(p.exercises||[]).forEach(e=>{const r=recommendationFor(e);if(r.text.includes("Increase")||r.text.includes("Reduce"))e.weight=r.next}));
  const recentRuns=state.logs.filter(l=>l.type==="run").slice(-2);
  if(recentRuns.length===2&&recentRuns.every(r=>(+r.effort||10)<=6)){state.plan.wednesday.run.minutes+=+state.settings.runIncrement;state.plan.sunday.run.minutes+=+state.settings.runIncrement}
  saveState();renderAll();toast("Recommendations applied to your plan");
};

function openSession(dayKey,offset=0){
  const p=state.plan[dayKey],date=dayDate(dayKey,offset),existing=logFor(dayKey,offset);
  let rows="";
  if(p.type==="gym"){
    rows=p.exercises.map((e,i)=>{
      const x=existing?.exercises?.find(z=>z.name===e.name)||{};
      return '<div class="log-row"><div class="log-exercise"><strong>'+e.name+'</strong><span>Plan: '+e.sets+' × '+e.min+(e.max!==e.min?"–"+e.max:"")+(e.unit==="sec"?" sec":' • '+(e.weight||"bodyweight")+(e.weight?" lb":""))+' • rest '+e.rest+' sec</span></div><div class="log-field"><label>Weight '+(e.unit==="sec"?"(optional)":"lb")+'</label><input data-field="weight" data-i="'+i+'" type="number" step="1" value="'+(x.weight??e.weight)+'"></div><div class="log-field"><label>Avg reps</label><input data-field="reps" data-i="'+i+'" type="number" step="1" value="'+(x.reps??e.min)+'"></div><div class="log-field"><label>RIR</label><input data-field="rir" data-i="'+i+'" type="number" min="0" max="5" step="1" value="'+(x.rir??2)+'"></div></div>';
    }).join("");
  }else{
    rows='<div class="log-row run"><div class="log-exercise"><strong>'+p.title+'</strong><span>Plan: '+p.run.minutes+' minutes • '+p.run.note+' • effort '+p.run.effort+'/10</span></div><div class="log-field"><label>Minutes</label><input id="runMinutes" type="number" value="'+(existing?.minutes??p.run.minutes)+'"></div><div class="log-field"><label>Miles</label><input id="runDistance" type="number" step=".01" value="'+(existing?.distance??p.run.distance)+'"></div><div class="log-field"><label>Effort 1–10</label><input id="runEffort" type="number" min="1" max="10" value="'+(existing?.effort??p.run.effort)+'"></div></div>';
  }
  $("#sessionModalContent").innerHTML='<div class="session-head"><div class="eyebrow accent">'+p.day.toUpperCase()+' • '+fmtDate(date)+'</div><h2>'+p.title+'</h2><p>'+p.subtitle+' — targets are guidance; record what you actually did.</p></div><div class="session-body"><div class="log-table">'+rows+'</div><div class="session-footer"><div class="session-note">'+(p.type==="gym"?"Aim to finish most working sets with 2–3 clean reps in reserve.":"Keep this easy enough to speak in full sentences.")+'</div><button class="primary-btn" id="saveSessionBtn">'+(existing?"Update session":"Complete session")+'</button></div></div>';
  $("#sessionModal").classList.add("open");
  $("#saveSessionBtn").onclick=()=>saveSession(dayKey,offset,p,date);
}
function saveSession(dayKey,offset,p,date){
  const base={id:Date.now(),date:isoDate(date),dayKey,type:p.type,title:p.title,completedAt:new Date().toISOString()};
  if(p.type==="gym"){
    base.exercises=p.exercises.map((e,i)=>({
      name:e.name,sets:e.sets,targetMin:e.min,targetMax:e.max,
      weight:+document.querySelector('[data-field="weight"][data-i="'+i+'"]').value||0,
      reps:+document.querySelector('[data-field="reps"][data-i="'+i+'"]').value||0,
      rir:+document.querySelector('[data-field="rir"][data-i="'+i+'"]').value||0
    }));
  }else{
    base.minutes=+$("#runMinutes").value||0;base.distance=+$("#runDistance").value||0;base.effort=+$("#runEffort").value||0;
  }
  const idx=state.logs.findIndex(l=>l.date===base.date&&l.dayKey===dayKey);
  if(idx>=0){base.id=state.logs[idx].id;state.logs[idx]=base}else state.logs.push(base);
  state.logs.sort((a,b)=>a.date.localeCompare(b.date));saveState();$("#sessionModal").classList.remove("open");renderAll();toast("Session saved — nice work");
}
window.openSession=openSession;window.editGoal=editGoal;
$("#closeSessionModal").onclick=()=>$("#sessionModal").classList.remove("open");
$("#sessionModal").onclick=e=>{if(e.target===$("#sessionModal"))$("#sessionModal").classList.remove("open")};
$("#quickLogBtn").onclick=()=>{const n=nextSession();openSession(n.key,n.nextWeek?1:0)};
$("#prevWeekBtn").onclick=()=>{weekOffset--;renderPlan()};$("#nextWeekBtn").onclick=()=>{weekOffset++;renderPlan()};

function renderHistory(){
  let logs=[...state.logs].reverse();if(historyFilter!=="all")logs=logs.filter(l=>l.type===historyFilter);
  if(!logs.length){$("#historyList").innerHTML='<div class="history-empty"><strong>No sessions logged yet.</strong><br><br>Your completed workouts and runs will show up here.</div>';return}
  $("#historyList").innerHTML=logs.map(l=>{
    const d=new Date(l.date+"T12:00:00");
    let stats="";
    if(l.type==="gym"){const vol=(l.exercises||[]).reduce((s,e)=>s+(+e.weight||0)*(+e.reps||0)*(+e.sets||0),0);stats=Math.round(vol).toLocaleString()+" lb volume • "+(l.exercises||[]).length+" exercises"}
    else stats=(+l.distance||0).toFixed(2)+" mi • "+l.minutes+" min • effort "+l.effort+"/10";
    return '<div class="history-entry"><div class="history-date"><strong>'+d.getDate()+'</strong><span>'+d.toLocaleDateString(undefined,{month:"short"})+'</span></div><div class="history-main"><strong>'+l.title+'</strong><span>'+d.toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"})+'</span></div><div class="history-stats">'+stats+'</div></div>';
  }).join("");
}
$$("[data-history-filter]").forEach(b=>b.onclick=()=>{$$("[data-history-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");historyFilter=b.dataset.historyFilter;renderHistory()});
$("#clearHistoryBtn").onclick=()=>{if(confirm("Clear all workout history? Your plan and goals will stay.")){state.logs=[];saveState();renderAll();toast("History cleared")}};

function renderSettings(){
  $("#profileName").value=state.profile.name;$("#profileWeight").value=state.profile.weight;$("#profileHeight").value=state.profile.height;$("#profileGoal").value=state.profile.goal;
  $("#upperIncrement").value=state.settings.upperIncrement;$("#lowerIncrement").value=state.settings.lowerIncrement;$("#runIncrement").value=state.settings.runIncrement;$("#weekStart").value=state.settings.weekStart;
}
$("#saveSettingsBtn").onclick=()=>{
  state.profile={name:$("#profileName").value||"Ryan",weight:+$("#profileWeight").value||155,height:$("#profileHeight").value||"5'11\"",goal:$("#profileGoal").value};
  state.settings={upperIncrement:+$("#upperIncrement").value,lowerIncrement:+$("#lowerIncrement").value,runIncrement:+$("#runIncrement").value,weekStart:+$("#weekStart").value};
  saveState();renderAll();toast("Settings saved");
};
$("#exportDataBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="form-gym-data.json";a.click();URL.revokeObjectURL(a.href);
};
$("#importDataInput").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{state=mergeState(JSON.parse(r.result));saveState();renderAll();toast("Data imported")}catch{toast("That file could not be imported")}};r.readAsText(f)};
$("#resetAppBtn").onclick=()=>{if(confirm("Reset the entire app to its original plan?")){state=initialState();saveState();renderAll();toast("App reset")}};

function drawChart(){
  const c=$("#progressChart");if(!c)return;const rect=c.getBoundingClientRect();if(rect.width<10)return;
  const dpr=window.devicePixelRatio||1;c.width=rect.width*dpr;c.height=rect.height*dpr;const ctx=c.getContext("2d");ctx.scale(dpr,dpr);
  const w=rect.width,h=rect.height,pad={l:34,r:18,t:18,b:26};ctx.clearRect(0,0,w,h);
  const gymLogs=state.logs.filter(l=>l.type==="gym").sort((a,b)=>a.date.localeCompare(b.date));
  $("#emptyChart").style.display=gymLogs.length?"none":"flex";
  ctx.strokeStyle="#242b36";ctx.lineWidth=1;ctx.font="9px Inter";ctx.fillStyle="#697384";
  for(let i=0;i<=4;i++){const y=pad.t+(h-pad.t-pad.b)*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText((100-i*25)+"%",4,y+3)}
  const n=12;const pts=[];for(let i=0;i<n;i++){const x=pad.l+(w-pad.l-pad.r)*i/(n-1);const y=pad.t+(h-pad.t-pad.b)*(1-(20+(80*i/(n-1)))/100);pts.push([x,y])}
  ctx.strokeStyle="#45d39b";ctx.globalAlpha=.65;ctx.setLineDash([5,5]);ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
  if(gymLogs.length){
    const grouped=gymLogs.slice(-12);const vals=grouped.map((l,idx)=>{
      let s=0,nm=0;(l.exercises||[]).forEach(e=>{const g=+state.goals[e.name]||0;if(g){s+=Math.min(1,(+e.weight||0)/g);nm++}});return nm?s/nm*100:0;
    });
    const grad=ctx.createLinearGradient(0,pad.t,0,h-pad.b);grad.addColorStop(0,"rgba(124,92,255,.35)");grad.addColorStop(1,"rgba(124,92,255,0)");
    const coords=vals.map((v,i)=>[pad.l+(w-pad.l-pad.r)*(grouped.length===1?.5:i/(grouped.length-1)),pad.t+(h-pad.t-pad.b)*(1-v/100)]);
    ctx.beginPath();coords.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));if(coords.length===1){ctx.lineTo(coords[0][0]+1,coords[0][1])}ctx.lineTo(coords.at(-1)[0],h-pad.b);ctx.lineTo(coords[0][0],h-pad.b);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    ctx.beginPath();coords.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle="#8b6cff";ctx.lineWidth=3;ctx.stroke();
    coords.forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle="#b5a5ff";ctx.fill();ctx.strokeStyle="#10141b";ctx.lineWidth=2;ctx.stroke()});
  }
  ctx.fillStyle="#697384";ctx.font="9px Inter";["W1","W3","W5","W7","W9","W12"].forEach((lab,i)=>{const x=pad.l+(w-pad.l-pad.r)*i/5;ctx.fillText(lab,x-7,h-6)});
}
window.addEventListener("resize",()=>{clearTimeout(window.__chartT);window.__chartT=setTimeout(drawChart,100)});

function renderAll(){renderDashboard();renderPlan();renderGoals();renderHistory();renderSettings()}
renderAll();
