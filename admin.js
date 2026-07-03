/* ═══════════════════════════════════════════════════════════════
   SpireONE Control — admin dashboard
   ความปลอดภัยจริงอยู่ที่ database.rules.json (บังคับฝั่ง server ของ Google)
   โค้ดหน้านี้เป็นแค่ UI — ต่อให้แก้ JS ในเบราว์เซอร์ rules ก็ปฏิเสธอยู่ดี
   ═══════════════════════════════════════════════════════════════ */

const fbConfig={apiKey:"AIzaSyDDtvz4d4FRG_KOq5EQHmlDijU-x1FDZlQ",authDomain:"sp1p-82396.firebaseapp.com",
  databaseURL:"https://sp1p-82396-default-rtdb.firebaseio.com",projectId:"sp1p-82396",
  storageBucket:"sp1p-82396.appspot.com",messagingSenderId:"924479207020",appId:"1:924479207020:web:ec64428a61403e1ad48a49"};

firebase.initializeApp(fbConfig);
const auth=firebase.auth(),db=firebase.database();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ROLE_RANK={owner:3,admin:2,moderator:1,user:0};
let me=null; // {uid,name,email,photo,role}

/* ── toast ── */
let toastT=null;
function toast(m,ic="ti-check"){const t=$("toast");t.innerHTML=`<i class="ti ${ic}"></i>${esc(m)}`;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2600)}

/* ── audit ── */
function audit(action,detail){if(!me)return;
  db.ref("auditLog").push({at:Date.now(),by:me.email,byName:me.name,action,detail:detail||""}).catch(()=>{})}

/* ── auth flow ── */
$("btnLogin").onclick=async()=>{
  const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:"select_account"});
  try{await auth.signInWithPopup(p)}catch(e){if(e.code!=="auth/popup-closed-by-user")toast("เข้าสู่ระบบไม่สำเร็จ","ti-x")}
};
const doLogout=()=>auth.signOut();
$("btnLogout1").onclick=doLogout;$("btnLogout2").onclick=doLogout;

auth.onAuthStateChanged(async u=>{
  if(!u){me=null;$("gate").style.display="grid";$("shell").style.display="none";$("gateDenied").style.display="none";$("btnLogin").style.display="inline-flex";return}
  let role="user";
  try{const r=await db.ref("roles/"+u.uid).once("value");if(r.val())role=r.val()}catch(e){}
  if(!ROLE_RANK[role]||ROLE_RANK[role]<1){
    // ไม่ใช่ทีมงาน — แสดง UID ให้ขอสิทธิ์ แล้วไม่ให้เข้า
    $("btnLogin").style.display="none";$("gateDenied").style.display="block";$("myUid").textContent=u.uid;
    return;
  }
  me={uid:u.uid,name:u.displayName||u.email,email:u.email,photo:u.photoURL||"",role};
  $("gate").style.display="none";$("shell").style.display="flex";
  $("mePic").innerHTML=me.photo?`<img src="${esc(me.photo)}" referrerpolicy="no-referrer"/>`:esc(me.name.charAt(0).toUpperCase());
  $("meName").textContent=me.name;$("meRole").textContent=me.role;
  // moderator เห็นเฉพาะหน้าเนื้อหา+ภาพรวม
  document.querySelectorAll('[data-need="admin"]').forEach(b=>{b.style.display=ROLE_RANK[role]>=2?"":"none"});
  loadOverview();loadUsers();loadContent();loadSettings();loadAudit();
});

/* ── nav ── */
$("sideNav").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  document.querySelectorAll("#sideNav button").forEach(x=>x.classList.toggle("active",x===b));
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.dataset.page===b.dataset.page));
});

/* ── data cache ── */
let allUsers={},allRoles={},allBans={};

async function fetchAll(){
  const gets=[db.ref("users").once("value")];
  if(ROLE_RANK[me.role]>=1)gets.push(db.ref("roles").once("value"));
  if(ROLE_RANK[me.role]>=2)gets.push(db.ref("bans").once("value"));
  const[us,rs,bs]=await Promise.all(gets);
  allUsers=us.val()||{};allRoles=(rs&&rs.val())||{};allBans=(bs&&bs.val())||{};
}
const userArr=()=>Object.entries(allUsers).map(([uid,u])=>({uid,...u,role:allRoles[uid]||"user",banned:!!allBans[uid]}));

/* ═══ OVERVIEW ═══ */
async function loadOverview(){
  try{await fetchAll()}catch(e){toast("อ่านข้อมูลไม่ได้ — ตรวจ rules","ti-alert-triangle");return}
  const arr=userArr(),now=Date.now();
  const stats=[
    {n:arr.length,l:"ผู้ใช้ทั้งหมด",ic:"ti-users"},
    {n:arr.filter(u=>now-(u.lastLogin||0)<864e5).length,l:"ใช้งานใน 24 ชม.",ic:"ti-activity"},
    {n:arr.filter(u=>now-(u.lastLogin||0)<6048e5).length,l:"ใช้งานใน 7 วัน",ic:"ti-calendar-week"},
    {n:arr.filter(u=>ROLE_RANK[u.role]>=1).length,l:"ทีมงาน",ic:"ti-shield"},
    {n:arr.filter(u=>u.banned).length,l:"ถูกแบน",ic:"ti-ban"},
  ];
  $("ovStats").innerHTML=stats.map(s=>`<div class="stat"><i class="ti ${s.ic}"></i><div class="n">${s.n}</div><div class="l">${s.l}</div></div>`).join("");
  $("ovRecent").innerHTML=arr.sort((a,b)=>(b.lastLogin||0)-(a.lastLogin||0)).slice(0,8).map(u=>`<tr>
    <td>${u.photo?`<img class="mini-av" src="${esc(u.photo)}" referrerpolicy="no-referrer"/>`:""}${esc(u.name)||"-"}</td>
    <td>${esc(u.email)||"-"}</td><td><span class="role-tag role-${u.role}">${u.role}</span></td>
    <td>${u.lastLogin?new Date(u.lastLogin).toLocaleString("th-TH",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"-"}</td></tr>`).join("");
}

/* ═══ USERS & ROLES ═══ */
function canEdit(target){ // owner แก้ได้ทุกคนยกเว้น owner ด้วยกัน / admin แก้ได้เฉพาะ moderator+user
  if(me.role==="owner")return target.role!=="owner";
  if(me.role==="admin")return ROLE_RANK[target.role]<2;
  return false;
}
function assignable(){ // ยศที่ฉันตั้งให้คนอื่นได้
  if(me.role==="owner")return["admin","moderator","user"];
  if(me.role==="admin")return["moderator","user"];
  return[];
}
function renderUsers(){
  const q=($("userSearch").value||"").toLowerCase();
  const arr=userArr().filter(u=>!q||(u.name||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q));
  $("userRows").innerHTML=arr.sort((a,b)=>ROLE_RANK[b.role]-ROLE_RANK[a.role]||(b.lastLogin||0)-(a.lastLogin||0)).map(u=>{
    const editable=canEdit(u)&&u.uid!==me.uid;
    const roleCell=editable
      ?`<select class="rsel" data-role-uid="${esc(u.uid)}">${["user","moderator","admin"].filter(r=>assignable().includes(r)||r===u.role).map(r=>`<option value="${r}" ${r===u.role?"selected":""}>${r}</option>`).join("")}</select>`
      :`<span class="role-tag role-${u.role}">${u.role}</span>`;
    const banBtn=editable?`<button class="btn sm ${u.banned?'':'danger'}" data-ban-uid="${esc(u.uid)}" data-banned="${u.banned?1:0}">
        <i class="ti ${u.banned?'ti-lock-open':'ti-ban'}"></i> ${u.banned?"ปลดแบน":"แบน"}</button>`:"";
    return`<tr>
      <td>${u.photo?`<img class="mini-av" src="${esc(u.photo)}" referrerpolicy="no-referrer"/>`:""}${esc(u.name)||"-"}${u.uid===me.uid?' <span style="color:var(--faint);font-size:11px">(คุณ)</span>':""}</td>
      <td>${esc(u.email)||"-"}</td><td>${roleCell}</td>
      <td>${u.banned?'<span class="role-tag ban-tag">BANNED</span>':'<span class="role-tag ok-tag">ACTIVE</span>'}</td>
      <td>${banBtn}</td></tr>`}).join("")||'<tr><td colspan="5" style="color:var(--faint)">ไม่พบผู้ใช้</td></tr>';
}
async function loadUsers(){try{await fetchAll()}catch(e){return}renderUsers()}
$("userSearch").addEventListener("input",renderUsers);
$("btnReloadUsers").onclick=loadUsers;

document.addEventListener("change",async e=>{
  const sel=e.target.closest("[data-role-uid]");if(!sel)return;
  const uid=sel.dataset.roleUid,newRole=sel.value,u=allUsers[uid]||{};
  try{
    if(newRole==="user")await db.ref("roles/"+uid).remove();
    else await db.ref("roles/"+uid).set(newRole);
    audit("เปลี่ยนยศ",`${u.email||uid} → ${newRole}`);
    toast(`เปลี่ยนยศ ${u.name||"ผู้ใช้"} เป็น ${newRole}`,"ti-shield-check");
    await loadUsers();loadOverview();
  }catch(err){toast("ถูกปฏิเสธโดย security rules","ti-lock");renderUsers()}
});
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-ban-uid]");if(!b)return;
  const uid=b.dataset.banUid,banned=b.dataset.banned==="1",u=allUsers[uid]||{};
  if(!banned&&!confirm(`แบน ${u.name||u.email||uid}? ผู้ใช้จะเข้าเว็บไม่ได้และเขียนข้อมูลไม่ได้`))return;
  try{
    if(banned)await db.ref("bans/"+uid).remove();
    else await db.ref("bans/"+uid).set({at:Date.now(),by:me.email});
    audit(banned?"ปลดแบน":"แบน",u.email||uid);
    toast(banned?"ปลดแบนแล้ว":"แบนแล้ว",banned?"ti-lock-open":"ti-ban");
    await loadUsers();loadOverview();
  }catch(err){toast("ถูกปฏิเสธโดย security rules","ti-lock")}
});

/* ═══ CONTENT ═══ */
const BB_ACCS=["gold","cyan","green"];
function bbCard(x={}){return`<div class="item-card" data-kind="bb">
  <div class="row">
    <input class="inp f-tag" placeholder="TAG" value="${esc(x.tag||"")}"/>
    <input class="inp f-title" placeholder="หัวข้อ" value="${esc(x.title||"")}"/>
    <select class="inp f-acc">${BB_ACCS.map(a=>`<option ${x.acc===a?"selected":""}>${a}</option>`).join("")}</select>
    <button class="del" title="ลบ"><i class="ti ti-trash"></i></button>
  </div>
  <div class="row"><textarea class="inp f-body" placeholder="เนื้อหา">${esc(x.body||"")}</textarea><span></span></div>
</div>`}
function magCard(x={}){return`<div class="item-card" data-kind="mag">
  <div class="row">
    <input class="inp f-tag" placeholder="หมวด" value="${esc(x.tag||"")}"/>
    <input class="inp f-title" placeholder="ชื่อบทความ" value="${esc(x.title||"")}"/>
    <input class="inp f-issue" placeholder="ฉบับ" value="${esc(x.issue||"")}"/>
    <button class="del" title="ลบ"><i class="ti ti-trash"></i></button>
  </div>
  <div class="row"><textarea class="inp f-body" placeholder="คำโปรย">${esc(x.body||"")}</textarea><span></span></div>
</div>`}
async function loadContent(){
  try{
    const[bb,mg]=await Promise.all([db.ref("content/billboard").once("value"),db.ref("content/mags").once("value")]);
    const bbs=Object.values(bb.val()||{}),mgs=Object.values(mg.val()||{});
    $("bbList").innerHTML=bbs.map(bbCard).join("")||bbCard();
    $("magList").innerHTML=mgs.map(magCard).join("")||magCard();
  }catch(e){}
}
$("btnAddBb").onclick=()=>$("bbList").insertAdjacentHTML("beforeend",bbCard());
$("btnAddMag").onclick=()=>$("magList").insertAdjacentHTML("beforeend",magCard());
document.addEventListener("click",e=>{const d=e.target.closest(".item-card .del");if(d)d.closest(".item-card").remove()});
$("btnSaveBb").onclick=async()=>{
  const items=[...$("bbList").querySelectorAll(".item-card")].map(c=>({
    tag:c.querySelector(".f-tag").value.trim(),title:c.querySelector(".f-title").value.trim(),
    acc:c.querySelector(".f-acc").value,body:c.querySelector(".f-body").value.trim(),icon:"ti-news"
  })).filter(x=>x.title);
  try{await db.ref("content/billboard").set(items);audit("แก้ Billboard",items.length+" สไลด์");toast("บันทึก Billboard แล้ว — ขึ้นเว็บทันที")}
  catch(e){toast("ถูกปฏิเสธโดย security rules","ti-lock")}
};
$("btnSaveMag").onclick=async()=>{
  const items=[...$("magList").querySelectorAll(".item-card")].map(c=>({
    tag:c.querySelector(".f-tag").value.trim(),title:c.querySelector(".f-title").value.trim(),
    issue:c.querySelector(".f-issue").value.trim(),body:c.querySelector(".f-body").value.trim(),ic:"ti-news"
  })).filter(x=>x.title);
  try{await db.ref("content/mags").set(items);audit("แก้นิตยสาร",items.length+" บทความ");toast("บันทึกนิตยสารแล้ว")}
  catch(e){toast("ถูกปฏิเสธโดย security rules","ti-lock")}
};

/* ═══ SETTINGS ═══ */
const FEATURES=[["diagnose","วินิจฉัย AI"],["magazine","นิตยสาร"],["garage","Garage"],["shop","ช็อป"]];
async function loadSettings(){
  if(ROLE_RANK[me.role]<2)return;
  const s=(await db.ref("siteConfig").once("value")).val()||{};
  const f=s.features||{};
  $("featGrid").innerHTML=FEATURES.map(([k,label])=>`<label class="switch-row"><span>${label}</span>
    <div class="switch ${f[k]===false?"":"on"}" data-feat="${k}"></div></label>`).join("");
  $("swMaint").classList.toggle("on",!!s.maintenance);
  $("bcastText").value=(s.broadcast&&s.broadcast.text)||"";
}
document.addEventListener("click",async e=>{
  const sw=e.target.closest("[data-feat]");
  if(sw){const k=sw.dataset.feat,on=!sw.classList.contains("on");
    try{await db.ref("siteConfig/features/"+k).set(on);sw.classList.toggle("on",on);
      audit("ตั้งค่า feature",`${k} = ${on?"เปิด":"ปิด"}`);toast(`${on?"เปิด":"ปิด"} ${k} แล้ว`)}
    catch(err){toast("ถูกปฏิเสธโดย security rules","ti-lock")}return}
  if(e.target.closest("#swMaint")){const on=!$("swMaint").classList.contains("on");
    if(on&&!confirm("เปิด Maintenance mode? ผู้ใช้ทั่วไปจะเข้าเว็บไม่ได้"))return;
    try{await db.ref("siteConfig/maintenance").set(on);$("swMaint").classList.toggle("on",on);
      audit("Maintenance",on?"เปิด":"ปิด");toast("Maintenance "+(on?"เปิด":"ปิด"))}
    catch(err){toast("ถูกปฏิเสธโดย security rules","ti-lock")}}
});
$("btnSaveBcast").onclick=async()=>{
  const text=$("bcastText").value.trim();
  try{
    if(text)await db.ref("siteConfig/broadcast").set({text,at:Date.now(),by:me.email});
    else await db.ref("siteConfig/broadcast").remove();
    audit("Broadcast",text||"(เอาออก)");toast(text?"ประกาศแล้ว — ทุกคนเห็นทันที":"เอาประกาศออกแล้ว");
  }catch(e){toast("ถูกปฏิเสธโดย security rules","ti-lock")}
};

/* ═══ AUDIT LOG ═══ */
async function loadAudit(){
  if(ROLE_RANK[me.role]<2)return;
  try{
    const snap=await db.ref("auditLog").limitToLast(100).once("value");
    const arr=Object.values(snap.val()||{}).sort((a,b)=>b.at-a.at);
    $("auditRows").innerHTML=arr.map(x=>`<tr>
      <td style="font-family:var(--mono);font-size:11.5px;white-space:nowrap">${new Date(x.at).toLocaleString("th-TH",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</td>
      <td>${esc(x.byName||x.by)}</td><td><b>${esc(x.action)}</b></td><td style="color:var(--dim)">${esc(x.detail)}</td></tr>`).join("")
      ||'<tr><td colspan="4" style="color:var(--faint)">ยังไม่มีบันทึก</td></tr>';
  }catch(e){}
}
