(function(){
"use strict";
var SKILLS=["Company and a chat","Transport and lifts","Gardening and lawns","Cleaning and tidying","Shopping","Getting to appointments","Tech help","Cooking together","Pet care","Odd jobs"];
var AVAIL=["Weekday mornings","Weekday afternoons","Weekday evenings","Weekends","Flexible"];
var CHECKS=["Working With Children Check","Police check","First aid"];
var STATES=["NSW","ACT","VIC","QLD","SA","WA","TAS","NT"];
var SUBURBS=["Newcastle","Maitland","Cessnock","Lake Macquarie","Port Stephens","Charlestown","Kurri Kurri","Kotara","Wallsend","Mayfield","Hamilton","Merewether","Belmont","Toronto","Raymond Terrace","Nelson Bay","Singleton","Muswellbrook","Dungog","East Maitland","Rutherford","Cardiff","Warners Bay","Swansea","Morisset","Beresfield","Thornton","Kearsley","Weston","Abermain"];
var K={pub:"cbv_public",priv:"cbv_private",thr:"cbv_threads",rep:"cbv_reports"};
var remote=[], remoteStatus="checking";
var boardKind="requests";

function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function load(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function uid(){return "l"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function first(s){return String(s||"").trim().split(/\s+/)[0].slice(0,30)}
function hideContacts(t){return String(t||"").replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g,"[hidden]").replace(/(\+?\d[\d\s().-]{6,}\d)/g,"[hidden]")}
function toast(t){var el=$("#toast");el.textContent=t;el.className="show";clearTimeout(toast._t);toast._t=setTimeout(function(){el.className=""},2600)}

/* ---------- views ---------- */
function show(v){
  $$(".view").forEach(function(s){s.classList.toggle("on",s.id==="v-"+v)});
  $$("#nav button").forEach(function(b){b.classList.toggle("on",b.dataset.v===v)});
  if(v==="board")renderBoard(); if(v==="msgs")renderMsgs(); if(v==="about")renderAbout();
  if(location.hash!=="#"+v)history.replaceState(null,"","#"+v);
  window.scrollTo(0,0);
}
document.addEventListener("click",function(e){
  var t=e.target.closest("[data-v],[data-go]"); if(!t)return;
  e.preventDefault(); show(t.dataset.v||t.dataset.go);
});

/* ---------- forms ---------- */
function fillChecks(){
  var groups={skills:SKILLS,availability:AVAIL,checks:CHECKS};
  $$(".checks").forEach(function(box){
    var g=box.dataset.group;
    box.innerHTML=groups[g].map(function(o){return '<label class="chk"><input type="checkbox" name="'+g+'" value="'+esc(o)+'"><span>'+esc(o)+'</span></label>'}).join("");
  });
  $$("select[name=state]").forEach(function(s){s.innerHTML=STATES.map(function(x){return "<option>"+x+"</option>"}).join("")});
  $("#suburbs").innerHTML=SUBURBS.map(function(x){return '<option value="'+x+'">'}).join("");
  $("#q-type").innerHTML+=SKILLS.map(function(x){return '<option>'+esc(x)+'</option>'}).join("");
  $("#homechips").innerHTML=SKILLS.map(function(x){return '<span class="chip">'+esc(x)+'</span>'}).join("");
}
function vals(f,n){return $$("input[name="+n+"]:checked",f).map(function(i){return i.value})}
function onSubmit(kind){
  return function(e){
    e.preventDefault(); var f=e.target, out=$(kind==="volunteer"?"#m-help":"#m-need");
    var skills=vals(f,"skills");
    if(!skills.length){out.textContent=kind==="volunteer"?"Please tick at least one skill.":"Please tick at least one type of help.";out.className="msg err";return}
    var id=uid();
    var item={id:id,kind:kind,firstName:first(f.firstName.value),suburb:f.suburb.value.trim().slice(0,40),state:f.state.value,
      skills:skills,availability:vals(f,"availability"),about:hideContacts(f.about.value.trim()).slice(0,300),created:new Date().toISOString(),mine:true};
    if(kind==="volunteer")item.checks=vals(f,"checks");
    else{item.forWho=f.forWho.value;item.when=f.when.value;item.date=f.date.value||""}
    var pub=load(K.pub,[]);pub.unshift(item);
    var priv=load(K.priv,{});priv[id]={fullName:f.fullName.value.trim(),phone:f.phone.value.trim(),email:f.email.value.trim()};
    if(!save(K.pub,pub)||!save(K.priv,priv)){out.textContent="Sorry, this browser won't let the app save. Try turning off private browsing.";out.className="msg err";return}
    f.reset(); out.textContent=""; toast(kind==="volunteer"?"Your volunteer profile is on the board":"Your request is on the board");
    boardKind=kind==="volunteer"?"volunteers":"requests"; show("board");
  };
}

/* ---------- board ---------- */
function allListings(){
  var rep=load(K.rep,[]);
  return load(K.pub,[]).concat(remote).filter(function(x){return rep.indexOf(x.id)<0});
}
function badge(it){
  if(it.kind!=="volunteer"||!it.checks||!it.checks.length)return "";
  return '<div class="badge" title="Self-declared. Coffeebreak does not verify checks.">✔ Checks (self-declared): '+esc(it.checks.join(", "))+'</div>';
}
function card(it){
  var tag=it.kind==="volunteer"?"Volunteer":"Needs a hand";
  var sub=it.kind==="request"?'<div class="meta">For: '+esc(it.forWho||"Me")+' · '+esc(it.when||"")+(it.date?' · from '+esc(it.date):"")+'</div>':"";
  return '<article class="lcard '+it.kind+'" data-id="'+esc(it.id)+'">'+
    '<div class="lhead"><span class="ltag">'+tag+'</span><b>'+esc(it.firstName)+'</b><span class="sub">'+esc(it.suburb)+(it.state?", "+esc(it.state):"")+'</span>'+(it.mine?'<span class="mine">Yours</span>':"")+'</div>'+
    sub+'<div class="chips">'+(it.skills||[]).map(function(s){return '<span class="chip">'+esc(s)+'</span>'}).join("")+'</div>'+
    (it.availability&&it.availability.length?'<div class="meta">Available: '+esc(it.availability.join(", "))+'</div>':"")+
    (it.about?'<p class="about">'+esc(it.about)+'</p>':"")+badge(it)+
    '<div class="row">'+(it.mine?'<button class="alt act-del">Remove</button>':'<button class="act-connect">Ask to connect</button>')+
    '<button class="link act-report">Report a concern</button></div></article>';
}
function renderBoard(){
  $$(".tabs button").forEach(function(b){b.classList.toggle("on",b.dataset.b===boardKind)});
  var sub=$("#q-suburb").value.trim().toLowerCase(), type=$("#q-type").value;
  var want=boardKind==="volunteers"?"volunteer":"request";
  var items=allListings().filter(function(x){return x.kind===want&&(!sub||String(x.suburb).toLowerCase().indexOf(sub)>=0)&&(!type||(x.skills||[]).indexOf(type)>=0)});
  $("#list").innerHTML=items.length?items.map(card).join(""):'<div class="empty">No '+(want==="volunteer"?"volunteers":"open requests")+' match yet.<br><button data-go="'+(want==="volunteer"?"help":"need")+'">'+(want==="volunteer"?"Be the first to offer help":"Post a request")+'</button></div>';
  $("#srcnote").textContent=remoteStatus==="ok"?"Showing listings saved on this device plus the shared Coffeebreak board.":"Showing listings saved on this device. The shared online board isn't connected here yet.";
}
$$(".tabs button").forEach(function(b){b.addEventListener("click",function(){boardKind=b.dataset.b;renderBoard()})});
$("#q-suburb").addEventListener("input",renderBoard);$("#q-type").addEventListener("change",renderBoard);
$("#list").addEventListener("click",function(e){
  var c=e.target.closest(".lcard");if(!c)return;var id=c.dataset.id;
  if(e.target.classList.contains("act-report"))report(id);
  else if(e.target.classList.contains("act-connect"))connect(id);
  else if(e.target.classList.contains("act-del")){if(confirm("Remove this listing from the board?")){save(K.pub,load(K.pub,[]).filter(function(x){return x.id!==id}));var p=load(K.priv,{});delete p[id];save(K.priv,p);renderBoard()}}
});

/* ---------- dialog ---------- */
function ask(html,okText,cb){
  var d=$("#dlg");$("#dlgbody").innerHTML=html;$("#dlgok").textContent=okText;
  d.onclose=function(){if(d.returnValue==="ok")cb(d)};
  if(d.showModal)d.showModal();else{d.setAttribute("open","");}
}
function find(id){return allListings().filter(function(x){return x.id===id})[0]}
function report(id){
  var it=id?find(id):null;
  ask('<h3>Report a concern</h3><p>'+(it?"About "+esc(it.firstName)+" in "+esc(it.suburb)+". ":"")+'If anyone is in danger call <b>000</b>.</p><label>What happened?<select id="r-why"><option>Feels unsafe</option><option>Asking for money or bank details</option><option>Inappropriate content</option><option>Spam or fake</option><option>Something else</option></select></label><label>Details (optional)<textarea id="r-txt" rows="3" maxlength="400"></textarea></label>',"Report",function(){
    if(id){var r=load(K.rep,[]);r.push(id);save(K.rep,r)}
    var log=load("cbv_report_log",[]);log.push({id:id||"",why:$("#r-why").value,at:new Date().toISOString()});save("cbv_report_log",log);
    toast(id?"Thanks. That listing is now hidden on this device.":"Thanks, your concern has been noted.");renderBoard();
  });
}
function myListings(){return load(K.pub,[]).filter(function(x){return x.mine})}
function connect(id){
  var it=find(id);if(!it)return;var mine=myListings();
  if(!mine.length){ask('<h3>Post first</h3><p>To ask '+esc(it.firstName)+' to connect, first post your own '+(it.kind==="request"?"volunteer profile":"request")+'. That way they can see who you are.</p>',"Go",function(){show(it.kind==="request"?"help":"need")});return}
  ask('<h3>Ask '+esc(it.firstName)+' to connect</h3><label>Send as<select id="c-from">'+mine.map(function(m){return '<option value="'+esc(m.id)+'">'+esc(m.firstName)+" ("+(m.kind==="volunteer"?"volunteer":"request")+", "+esc(m.suburb)+')</option>'}).join("")+'</select></label><label>Message<textarea id="c-msg" rows="3" maxlength="400" placeholder="Hi, I live nearby and could help on Tuesday mornings."></textarea></label><p class="note">Don\'t include phone numbers or emails. They are hidden until you both agree to share.</p>',"Send request",function(){
    var thr=load(K.thr,[]);
    thr.unshift({id:uid(),from:$("#c-from").value,to:id,toName:it.firstName,toLocal:!!it.mine,remote:!it.mine,
      msgs:[{by:"from",text:hideContacts($("#c-msg").value.trim()||"Hi, I'd like to connect."),at:new Date().toISOString()}],fromAgree:true,toAgree:false,status:"pending"});
    save(K.thr,thr);toast("Request sent to "+it.firstName);show("msgs");
  });
}

/* ---------- messages ---------- */
function contactHtml(lid){var p=load(K.priv,{})[lid]||{};var bits=[];if(p.fullName)bits.push(esc(p.fullName));if(p.phone)bits.push("📞 "+esc(p.phone));if(p.email)bits.push("✉ "+esc(p.email));return bits.length?bits.join("<br>"):"No contact details were added."}
function nameOf(lid){var l=find(lid);return l?l.firstName+" ("+l.suburb+")":"a listing"}
function renderMsgs(){
  var thr=load(K.thr,[]), mineIds=myListings().map(function(m){return m.id});
  var html="";
  thr.forEach(function(t){
    var iAmFrom=mineIds.indexOf(t.from)>=0, iAmTo=mineIds.indexOf(t.to)>=0;
    if(!iAmFrom&&!iAmTo)return;
    var title=iAmTo?"From "+esc(nameOf(t.from))+" to your listing "+esc(nameOf(t.to)):"To "+esc(t.toName);
    html+='<article class="thread" data-t="'+t.id+'"><h3>'+title+'</h3>'+
      t.msgs.map(function(m){return '<div class="bubble '+m.by+'">'+esc(m.text)+'</div>'}).join("");
    if(t.status==="agreed"){
      html+='<div class="reveal"><b>You both agreed to share contact details.</b><div class="two"><div><small>'+esc(nameOf(t.from))+'</small><br>'+contactHtml(t.from)+'</div><div><small>'+esc(nameOf(t.to))+'</small><br>'+contactHtml(t.to)+'</div></div><p class="note">Meet in a public place first. No money handling.</p></div>';
    }else if(t.status==="declined"){
      html+='<p class="note">This request was declined. Contact details were not shared.</p>';
    }else if(iAmTo){
      html+='<p class="note">'+esc(nameOf(t.from))+' has agreed to share contact details. Share yours too?</p><div class="row"><button class="act-agree">Agree and share contacts</button><button class="alt act-decline">Decline</button></div>';
    }else{
      html+='<p class="note">Waiting for '+esc(t.toName)+' to agree. Contact details stay hidden until then.'+(t.remote?' This request is saved on this device until the shared online board is switched on.':'')+'</p>';
    }
    if(t.status!=="declined")html+='<div class="row"><input class="reply" placeholder="Reply (no phone or email)" maxlength="400"><button class="act-reply small">Send</button></div>';
    html+='</article>';
  });
  $("#threads").innerHTML=html||'<div class="empty">No messages yet. Find someone on the <button data-go="board">board</button>.</div>';
  var mine=myListings();
  $("#mine").innerHTML=mine.length?'<div class="box"><b>Your listings:</b> '+mine.map(function(m){return esc(m.firstName)+" ("+(m.kind==="volunteer"?"volunteer":"request")+", "+esc(m.suburb)+")"}).join(" · ")+'</div>':"";
  updateCount();
}
$("#threads").addEventListener("click",function(e){
  var a=e.target.closest(".thread");if(!a)return;var thr=load(K.thr,[]),t=thr.filter(function(x){return x.id===a.dataset.t})[0];if(!t)return;
  var mineIds=myListings().map(function(m){return m.id});
  if(e.target.classList.contains("act-agree")){t.toAgree=true;if(t.fromAgree)t.status="agreed";toast("Contact details shared")}
  else if(e.target.classList.contains("act-decline")){t.status="declined"}
  else if(e.target.classList.contains("act-reply")){var v=$(".reply",a).value.trim();if(!v)return;t.msgs.push({by:mineIds.indexOf(t.to)>=0&&mineIds.indexOf(t.from)<0?"to":"from",text:hideContacts(v),at:new Date().toISOString()})}
  else return;
  save(K.thr,thr);renderMsgs();
});
function updateCount(){
  var mineIds=myListings().map(function(m){return m.id});
  var n=load(K.thr,[]).filter(function(t){return t.status==="pending"&&mineIds.indexOf(t.to)>=0}).length;
  var el=$("#msgcount");el.hidden=!n;el.textContent=n;
}

/* ---------- about ---------- */
function renderAbout(){
  $("#storenote").textContent=remoteStatus==="ok"?"Listings approved by Coffeebreak are shown from the shared board. What you post here is saved on this device and shows only first name and suburb.":"What you post is saved on this device only (in this browser). Only your first name and suburb show on the board. Your contact details never leave your device unless you agree to share them.";
}
$("#wipe").addEventListener("click",function(){if(confirm("Remove all your listings, messages and contact details from this device?")){[K.pub,K.priv,K.thr,K.rep,"cbv_report_log"].forEach(function(k){localStorage.removeItem(k)});toast("Removed from this device");updateCount()}});
$("#copypay").addEventListener("click",function(){var t="darkokaz@gmx.com";(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast("PayID copied")},function(){toast("PayID: "+t)})});
$("#report-general").addEventListener("click",function(){report(null)});

/* ---------- shared board (read-only, public fields only) ---------- */
function loadRemote(){
  var c=window.CBV_CONFIG;if(!c||!c.projectId||!window.fetch){remoteStatus="off";return}
  var q='*[_type=="cbvListing" && approved==true] | order(_createdAt desc)[0...200]{"id":_id,kind,firstName,suburb,state,skills,availability,checks,about,forWho,when,date}';
  var url="https://"+c.projectId+".apicdn.sanity.io/v"+c.apiVersion+"/data/query/"+c.dataset+"?query="+encodeURIComponent(q);
  var ctl=window.AbortController?new AbortController():null;var tm=setTimeout(function(){if(ctl)ctl.abort()},6000);
  fetch(url,ctl?{signal:ctl.signal}:{}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){
    clearTimeout(tm);remote=(d.result||[]).filter(function(x){return x&&(x.kind==="volunteer"||x.kind==="request")}).map(function(x){x.firstName=first(x.firstName);x.about=hideContacts(x.about);return x});
    remoteStatus="ok";if($("#v-board").classList.contains("on"))renderBoard();
  }).catch(function(){clearTimeout(tm);remoteStatus="off";if($("#v-board").classList.contains("on"))renderBoard()});
}

fillChecks();
$("#f-help").addEventListener("submit",onSubmit("volunteer"));
$("#f-need").addEventListener("submit",onSubmit("request"));
loadRemote();updateCount();
var h=location.hash.slice(1);if(["home","help","need","board","msgs","safety","about"].indexOf(h)>=0)show(h);
})();
