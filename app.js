(function(){
"use strict";
var SKILLS=["Company and a chat","Transport and lifts","Gardening and lawns","Cleaning and tidying","Shopping","Getting to appointments","Tech help","Cooking together","Pet care","Odd jobs"];
var AVAIL=["Weekday mornings","Weekday afternoons","Weekday evenings","Weekends","Flexible"];
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
  if(v==="board")renderBoard(); if(v==="msgs")renderMsgs(); if(v==="about")renderAbout(); if(v==="sponsor")renderSponsor();
  if(location.hash!=="#"+v)history.replaceState(null,"","#"+v);
  window.scrollTo(0,0);
}
document.addEventListener("click",function(e){
  var t=e.target.closest("[data-v],[data-go]"); if(!t)return;
  e.preventDefault(); show(t.dataset.v||t.dataset.go);
});

/* ---------- forms ---------- */
function fillChecks(){
  var groups={skills:SKILLS,availability:AVAIL};
  $$(".checks").forEach(function(box){
    var g=box.dataset.group;
    box.innerHTML=groups[g].map(function(o){return '<label class="chk"><input type="checkbox" name="'+g+'" value="'+esc(o)+'"><span>'+esc(o)+'</span></label>'}).join("");
  });
  $$("select[name=state]").forEach(function(s){s.innerHTML=STATES.map(function(x){return "<option>"+x+"</option>"}).join("")});
  $("#suburbs").innerHTML=SUBURBS.map(function(x){return '<option value="'+x+'">'}).join("");
  $("#q-type").innerHTML+=SKILLS.map(function(x){return '<option>'+esc(x)+'</option>'}).join("");
  $("#homechips").innerHTML=SKILLS.map(function(x){return '<span class="chip">'+esc(x)+'</span>'}).join("");
}
/* ---------- certificate files: IndexedDB on this device only ---------- */
var DBN="cbv_files", MAXF=5*1024*1024;
function idb(){return new Promise(function(res,rej){if(!window.indexedDB)return rej(new Error("no idb"));var r=indexedDB.open(DBN,1);r.onupgradeneeded=function(){r.result.createObjectStore("certs")};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}})}
function idbDo(mode,fn){return idb().then(function(db){return new Promise(function(res,rej){var tx=db.transaction("certs",mode),st=tx.objectStore("certs"),q=fn(st);tx.oncomplete=function(){res(q&&q.result)};tx.onerror=tx.onabort=function(){rej(tx.error)}})})}
function putCert(id,file){return idbDo("readwrite",function(st){return st.put({name:file.name,type:file.type,size:file.size,blob:file,at:new Date().toISOString()},id)})}
function getCert(id){return idbDo("readonly",function(st){return st.get(id)})}
function delCert(id){return idbDo("readwrite",function(st){return st["delete"](id)}).catch(function(){})}
function clearCerts(){return idbDo("readwrite",function(st){return st.clear()}).catch(function(){})}
function today(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2)}
function checkErrors(f){
  var e=[], n=f.wwccNumber.value.trim().toUpperCase().replace(/\s+/g,""), st=f.state.value, t=today();
  if(!n)e.push("your Working With Children Check number");
  else if(st==="NSW"&&!/^WWC\d{7}[A-Z]$/.test(n))e.push("a valid NSW WWC number (like WWC1234567V, from your clearance email)");
  else if(st!=="NSW"&&!/^[A-Z0-9-]{5,20}$/.test(n))e.push("a valid check number for your state");
  if(!f.wwccExpiry.value)e.push("your WWCC expiry date");else if(f.wwccExpiry.value<=t)e.push("a WWCC that hasn't expired");
  if(!f.policeDate.value)e.push("your police check certificate date");else if(f.policeDate.value>t)e.push("a police check date that isn't in the future");
  var file=f.policeFile.files&&f.policeFile.files[0];
  if(!file)e.push("your police check certificate (PDF or photo)");
  else if(!(file.type==="application/pdf"||/^image\//.test(file.type)))e.push("a police certificate that's a PDF or an image");
  else if(file.size>MAXF)e.push("a certificate file under 5 MB (try a smaller photo)");
  if(!f.fullName.value.trim())e.push("your full name as on your WWCC");
  if(!f.truthful.checked)e.push("to confirm your check details are true");
  return e;
}
function vals(f,n){return $$("input[name="+n+"]:checked",f).map(function(i){return i.value})}
function onSubmit(kind){
  return function(e){
    e.preventDefault(); var f=e.target, out=$(kind==="volunteer"?"#m-help":"#m-need");
    var skills=vals(f,"skills");
    if(!skills.length){out.textContent=kind==="volunteer"?"Please tick at least one skill.":"Please tick at least one type of help.";out.className="msg err";return}
    if(kind==="volunteer"){var errs=checkErrors(f);if(errs.length){out.innerHTML="<b>You can't be listed yet.</b> Volunteers must provide a WWCC and a police check. Please add: "+errs.map(esc).join("; ")+".";out.className="msg err";return}}
    var id=uid();
    var item={id:id,kind:kind,firstName:first(f.firstName.value),suburb:f.suburb.value.trim().slice(0,40),state:f.state.value,
      skills:skills,availability:vals(f,"availability"),about:hideContacts(f.about.value.trim()).slice(0,300),created:new Date().toISOString(),mine:true};
    var privRec={fullName:f.fullName.value.trim(),phone:f.phone.value.trim(),email:f.email.value.trim()};
    if(kind==="volunteer"){item.checksProvided=true;item.checks=f.firstAid.checked?["First aid"]:[];
      privRec.wwccNumber=f.wwccNumber.value.trim().toUpperCase().replace(/\s+/g,"");privRec.wwccExpiry=f.wwccExpiry.value;privRec.policeDate=f.policeDate.value;privRec.wwccState=f.state.value;}
    else{item.forWho=f.forWho.value;item.when=f.when.value;item.date=f.date.value||""}
    var fail=function(){out.textContent="Sorry, this browser won't let the app save. Try turning off private browsing.";out.className="msg err"};
    var finish=function(){
      var pub=load(K.pub,[]);pub.unshift(item);var priv=load(K.priv,{});priv[id]=privRec;
      if(!save(K.pub,pub)||!save(K.priv,priv)){delCert(id);fail();return}
      f.reset(); out.textContent=""; toast(kind==="volunteer"?"Your volunteer profile is on the board":"Your request is on the board");
      boardKind=kind==="volunteer"?"volunteers":"requests"; show("board");
    };
    if(kind==="volunteer"){var file=f.policeFile.files[0];privRec.certName=file.name;
      putCert(id,file).then(finish,function(){out.textContent="Sorry, this browser couldn't keep your certificate file on this device, so you can't be listed yet. Try another browser, or turn off private browsing.";out.className="msg err"});}
    else finish();
  };
}

/* ---------- board ---------- */
function allListings(){
  var rep=load(K.rep,[]);
  return load(K.pub,[]).concat(remote).filter(function(x){return rep.indexOf(x.id)<0});
}
function badge(it){
  if(it.kind!=="volunteer")return "";
  return '<div class="badge" title="WWCC and police check provided by the volunteer. Coffeebreak has not verified them yet. Sight the originals and verify the WWCC with the OCG.">✔ Checks provided (not yet verified by Coffeebreak)</div>'+
    ((it.checks||[]).indexOf("First aid")>=0?' <div class="badge fa">✚ First aid (self-declared)</div>':"")+
    '<div class="meta small">WWCC and police check. Ask to sight the originals, and verify the WWCC with the OCG.</div>';
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
  $$(".tabs button[data-b]").forEach(function(b){b.classList.toggle("on",b.dataset.b===boardKind)});
  var sub=$("#q-suburb").value.trim().toLowerCase(), type=$("#q-type").value;
  var want=boardKind==="volunteers"?"volunteer":"request";
  var items=allListings().filter(function(x){return x.kind===want&&(want!=="volunteer"||x.checksProvided===true)&&(!sub||String(x.suburb).toLowerCase().indexOf(sub)>=0)&&(!type||(x.skills||[]).indexOf(type)>=0)});
  $("#list").innerHTML=items.length?items.map(card).join(""):'<div class="empty">No '+(want==="volunteer"?"volunteers":"open requests")+' match yet.<br><button data-go="'+(want==="volunteer"?"help":"need")+'">'+(want==="volunteer"?"Be the first to offer help":"Post a request")+'</button></div>';
  $("#srcnote").textContent=remoteStatus==="ok"?"Showing listings saved on this device plus the shared Coffeebreak board.":"Showing listings saved on this device. The shared online board isn't connected here yet.";
}
$$(".tabs button[data-b]").forEach(function(b){b.addEventListener("click",function(){boardKind=b.dataset.b;renderBoard()})});
$("#q-suburb").addEventListener("input",renderBoard);$("#q-type").addEventListener("change",renderBoard);
$("#list").addEventListener("click",function(e){
  var c=e.target.closest(".lcard");if(!c)return;var id=c.dataset.id;
  if(e.target.classList.contains("act-report"))report(id);
  else if(e.target.classList.contains("act-connect"))connect(id);
  else if(e.target.classList.contains("act-del")){if(confirm("Remove this listing from the board?")){delCert(id);save(K.pub,load(K.pub,[]).filter(function(x){return x.id!==id}));var p=load(K.priv,{});delete p[id];save(K.priv,p);renderBoard()}}
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
function contactHtml(lid){var p=load(K.priv,{})[lid]||{};var bits=[];if(p.fullName)bits.push(esc(p.fullName));if(p.phone)bits.push("📞 "+esc(p.phone));if(p.email)bits.push("✉ "+esc(p.email));
  if(p.wwccNumber)bits.push('<span class="wwcc">WWCC: <b>'+esc(p.wwccNumber)+'</b> (expires '+esc(p.wwccExpiry)+')<br>Police check dated '+esc(p.policeDate)+'<br><a href="https://ocg.nsw.gov.au/parents-and-carers/what-parents-need-know-about-working-children-check" target="_blank" rel="noopener">Verify this WWCC with the OCG</a>'+(myListings().some(function(m){return m.id===lid})?'<br><button class="small act-cert" data-l="'+esc(lid)+'">View my certificate</button>':"")+'</span>');
  return bits.length?bits.join("<br>"):"No contact details were added."}
function viewCert(lid){getCert(lid).then(function(r){if(!r||!r.blob){toast("No certificate saved on this device");return}var u=URL.createObjectURL(r.blob);var w=window.open(u,"_blank");if(!w){location.href=u}setTimeout(function(){URL.revokeObjectURL(u)},60000)},function(){toast("Couldn't open the certificate on this device")})}
document.addEventListener("click",function(e){var b=e.target.closest(".act-cert");if(b){e.preventDefault();viewCert(b.dataset.l)}});
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
      html+='<div class="reveal"><b>You both agreed to share contact details.</b><div class="two"><div><small>'+esc(nameOf(t.from))+'</small><br>'+contactHtml(t.from)+'</div><div><small>'+esc(nameOf(t.to))+'</small><br>'+contactHtml(t.to)+'</div></div><p class="note">Meet in a public place first. No money handling. Families: ask to sight the volunteer\'s original police certificate and photo ID, and verify their WWCC with the OCG (family name, date of birth and WWC number). Only go ahead if it shows "Cleared".</p></div>';
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
  $("#mine").innerHTML=mine.length?'<div class="box"><b>Your listings:</b> '+mine.map(function(m){return esc(m.firstName)+" ("+(m.kind==="volunteer"?"volunteer":"request")+", "+esc(m.suburb)+")"+(m.kind==="volunteer"?' <button class="small act-cert" data-l="'+esc(m.id)+'">View my certificate</button>':"")}).join(" · ")+'</div>':"";
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
$("#wipe").addEventListener("click",function(){if(confirm("Remove all your listings, messages and contact details from this device?")){[K.pub,K.priv,K.thr,K.rep,"cbv_report_log"].forEach(function(k){localStorage.removeItem(k)});clearCerts();toast("Removed from this device");updateCount()}});
/* ---------- sponsor ---------- */
var sp={amt:20,name:"Supporter",freq:"once"};
function copyText(t,label){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast(label+" copied")},function(){toast(label+": "+t)})}
function spRef(){var who=$("#sp-ref").value.replace(/[^A-Za-z0-9 &.-]/g,"").trim();return ("CBVS "+(sp.name==="Business Sponsor"?"Business":sp.name)+(sp.freq==="monthly"?" Mthly":"")+(who?" "+who:"")).slice(0,35)}
function renderSponsor(){
  $$("#tiers .tier").forEach(function(b){b.classList.toggle("on",+b.dataset.amt===sp.amt)});
  $$("#freq button").forEach(function(b){b.classList.toggle("on",b.dataset.f===sp.freq)});
  $("#pc-amt").textContent="$"+sp.amt+" AUD"+(sp.freq==="monthly"?" / month":"");
  $("#pc-ref").textContent=spRef();$("#monthlynote").hidden=sp.freq!=="monthly";
  var q=$("#spqr");if(!q.dataset.done&&window.QRCode){new QRCode(q,{text:"darkokaz@gmx.com",width:160,height:160,colorDark:"#c2187a",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});q.dataset.done="1"}
}
$("#tiers").addEventListener("click",function(e){var b=e.target.closest(".tier");if(!b)return;sp.amt=+b.dataset.amt;sp.name=b.dataset.name;renderSponsor()});
$("#freq").addEventListener("click",function(e){var b=e.target.closest("button[data-f]");if(!b)return;sp.freq=b.dataset.f;renderSponsor()});
$("#sp-ref").addEventListener("input",renderSponsor);
document.addEventListener("click",function(e){var b=e.target.closest("[data-copy]");if(b)copyText(b.dataset.copy,"PayID")});
$("#copyamt").addEventListener("click",function(){copyText(String(sp.amt),"Amount")});
$("#copyref").addEventListener("click",function(){copyText(spRef(),"Reference")});
$("#copypay").addEventListener("click",function(){var t="darkokaz@gmx.com";(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast("PayID copied")},function(){toast("PayID: "+t)})});
$("#report-general").addEventListener("click",function(){report(null)});

/* ---------- shared board (read-only, public fields only) ---------- */
function loadRemote(){
  var c=window.CBV_CONFIG;if(!c||!c.projectId||!window.fetch){remoteStatus="off";return}
  var q='*[_type=="cbvListing" && approved==true && (kind=="request" || (kind=="volunteer" && checksProvided==true))] | order(_createdAt desc)[0...200]{"id":_id,kind,firstName,suburb,state,skills,availability,checks,checksProvided,about,forWho,when,date}';
  var url="https://"+c.projectId+".apicdn.sanity.io/v"+c.apiVersion+"/data/query/"+c.dataset+"?query="+encodeURIComponent(q);
  var ctl=window.AbortController?new AbortController():null;var tm=setTimeout(function(){if(ctl)ctl.abort()},6000);
  fetch(url,ctl?{signal:ctl.signal}:{}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){
    clearTimeout(tm);remote=(d.result||[]).filter(function(x){return x&&(x.kind==="request"||(x.kind==="volunteer"&&x.checksProvided===true))}).map(function(x){x.firstName=first(x.firstName);x.about=hideContacts(x.about);return x});
    remoteStatus="ok";if($("#v-board").classList.contains("on"))renderBoard();
  }).catch(function(){clearTimeout(tm);remoteStatus="off";if($("#v-board").classList.contains("on"))renderBoard()});
}

fillChecks();
$("#f-help").addEventListener("submit",onSubmit("volunteer"));
$("#f-need").addEventListener("submit",onSubmit("request"));
loadRemote();updateCount();
var h=location.hash.slice(1);if(["home","help","need","board","msgs","safety","checks","sponsor","about"].indexOf(h)>=0)show(h);
})();
