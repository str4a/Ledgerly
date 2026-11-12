import { STORAGE_KEYS, getStorage } from "./state.js";
import { esc, inputNumber, formatInput, formatSignedInput, pc, dfmt, pad, cl } from "./format.js";
import { registerServiceWorker } from "./pwa.js";
import { convertAmount, expectancy, maxDrawdown, profitFactor, winRate } from "./calc.js";
import { fetchRate as fetchRateData } from "./rate.js";

(function(){
var APP_VERSION="1.4.1",R=16500,RT=null,RK=STORAGE_KEYS.rate,KEY=STORAGE_KEYS.transactions,SET=STORAGE_KEYS.settings,KELAS=["Saham","Kripto","Forex","Komoditas"];
var storage=getStorage();
function requestJson(url,options){return window.ledgerlyDesktop?window.ledgerlyDesktop.fetchJson(url,options||{}):fetch(url,options||{}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json()})}
var CC={Saham:"var(--c-saham)",Kripto:"var(--c-kripto)",Forex:"var(--c-forex)",Komoditas:"var(--c-komoditas)"};
var cur="IDR",flt="Semua",T=[];
var $=function(i){return document.getElementById(i)};
var nid=new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}),nus=new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
function b64(bytes){var s="",i;for(i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s)}
function bytes(s){var raw=atob(s),a=new Uint8Array(raw.length),i;for(i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return a}
function digest(s){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)).then(function(x){return b64(new Uint8Array(x))})}
function derive(password,salt){return crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]).then(function(k){return crypto.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:120000,hash:"SHA-256"},k,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])})}
function validTransactions(value){return Array.isArray(value)&&value.every(function(t){return t&&typeof t==="object"&&typeof t.id==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)&&KELAS.indexOf(t.kelas)>=0&&typeof t.sym==="string"&&t.sym.length<=32&&(t.cur==="IDR"||t.cur==="USD")&&typeof t.pl==="number"&&isFinite(t.pl)})}
function encryptBackup(password){var salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),data=new TextEncoder().encode(JSON.stringify({version:1,transactions:T}));return derive(password,salt).then(function(key){return crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,data)}).then(function(cipher){return JSON.stringify({version:2,encrypted:true,salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(cipher))})})}
function decryptBackup(data,password){return derive(password,bytes(data.salt)).then(function(key){return crypto.subtle.decrypt({name:"AES-GCM",iv:bytes(data.iv)},key,bytes(data.data))}).then(function(raw){return JSON.parse(new TextDecoder().decode(raw))})}
function idr(t){return convertAmount(t.pl,t.cur,R)}
function money(v,sg){var x=cur==="IDR"?v:v/R,a=Math.abs(x),s=(sg?(x>0?"+":x<0?"-":""):(x<0?"-":""));return s+(cur==="IDR"?"Rp"+nid.format(Math.round(a)):"$"+nus.format(a))}
function own(t){var a=Math.abs(t.pl),s=t.pl>0?"+":t.pl<0?"-":"";return s+(t.cur==="IDR"?"Rp "+nid.format(Math.round(a)):"$"+nus.format(a))}
function sh(v){var x=cur==="IDR"?v:v/R,a=Math.abs(x),s=x<0?"-":"",p=cur==="IDR"?"Rp ":"$ ";if(a>=1e9)return s+p+(a/1e9).toFixed(1)+" M";if(a>=1e6)return s+p+(a/1e6).toFixed(1)+" jt";if(a>=1e3)return s+p+Math.round(a/1e3)+" rb";return s+p+Math.round(a)}
function compactMoney(v,sg){return money(v,sg)}
function seed(){
  var s=[["2026-09-06","Saham","BBCA","IDR",1250000],["2026-09-08","Kripto","BTC","USD",1850],["2026-09-10","Saham","TLKM","IDR",-480000],["2026-09-12","Komoditas","XAU/USD","USD",900],["2026-09-14","Kripto","ETH","USD",920],["2026-09-16","Forex","GBP/JPY","USD",14500],["2026-09-17","Saham","ASII","IDR",2100000],["2026-09-18","Komoditas","XAU/USD","USD",-450],["2026-09-19","Kripto","SOL","USD",2400],["2026-09-21","Forex","EUR/USD","USD",4200],["2026-09-23","Kripto","ETH","USD",-640],["2026-09-25","Saham","BMRI","IDR",1750000],["2026-09-27","Komoditas","WTI","USD",700],["2026-09-29","Forex","USD/JPY","USD",-2800],["2026-10-01","Saham","GOTO","IDR",-620000],["2026-10-03","Kripto","BTC","USD",1300],["2026-10-05","Komoditas","XAU/USD","USD",1300],["2026-10-07","Saham","UNVR","IDR",-310000],["2026-10-09","Kripto","DOGE","USD",-380],["2026-10-12","Komoditas","XAG/USD","USD",-300],["2026-10-14","Saham","ANTM","IDR",1900000],["2026-10-16","Forex","GBP/JPY","USD",21000],["2026-10-19","Kripto","SOL","USD",1750],["2026-10-21","Komoditas","WTI","USD",520],["2026-10-23","Forex","EUR/USD","USD",-1900],["2026-10-25","Saham","BBRI","IDR",980000],["2026-10-27","Kripto","BNB","USD",600],["2026-10-28","Komoditas","XAU/USD","USD",650]];
  return s.map(function(r,i){var f=r[1]==="Forex"||r[1]==="Komoditas";return{id:"s"+i,date:r[0],kelas:r[1],sym:r[2],cur:r[3],pl:r[4],dur:30+(i*37)%200,lot:f?+(0.1+(i%5)*0.1).toFixed(2):0,fee:r[3]==="USD"?+(1.5+i%4).toFixed(2):2500,swap:f?+(0.4+i%3*0.3).toFixed(2):0,jam:pad(8+(i*5)%14)+":"+pad((i*17)%60)}});
}
function load(){
  try{var v=storage.getItem(KEY);if(v){var p=JSON.parse(v);if(Array.isArray(p)){T=p}else T=seed()}else T=seed()}catch(e){T=seed()}
  try{var s=JSON.parse(storage.getItem(SET)||"{}");if(s.cur)cur=s.cur;if(s.theme)document.documentElement.setAttribute("data-theme",s.theme)}catch(e){}
}
function save(){try{storage.setItem(KEY,JSON.stringify(T))}catch(e){}}
function saveSet(){try{storage.setItem(SET,JSON.stringify({cur:cur,theme:document.documentElement.getAttribute("data-theme")}))}catch(e){}}
var per="All",PD={"1W":7,"1M":30,"6M":182,"1Y":365};
function inP(t){if(per==="All")return true;var l=new Date();l.setDate(l.getDate()-PD[per]);return t.date>=l.toISOString().slice(0,10)}
function visK(){return T.filter(function(t){return flt==="Semua"||t.kelas===flt}).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0})}
function vis(){return visK().filter(inP)}

function stats(v){
  var tot=0,gw=0,gl=0,w=0,by={};
  v.forEach(function(t){var x=idr(t);tot+=x;if(x>0){gw+=x;w++}else if(x<0)gl-=x;by[t.sym]=by[t.sym]||{s:0,k:t.kelas};by[t.sym].s+=x});
  var best=null;Object.keys(by).forEach(function(k){if(!best||by[k].s>by[best].s)best=k});
  var wr=winRate(v.map(idr)),l=v.filter(function(t){return idr(t)<0}).length;
  $("stats").innerHTML=
   '<div class="card"><div class="k"><span>Total Bersih P&amp;L</span></div><div class="big '+cl(tot)+'">'+money(tot,true)+'</div><div class="sub">dari '+v.length+' transaksi terfilter</div></div>'+
   '<div class="card"><div class="k"><span>Tingkat Kemenangan</span><span>%</span></div><div class="big">'+wr.toFixed(1).replace(".",",")+'%</div><div class="sub"><span class="pos">'+w+' menang</span> / <span class="neg">'+l+' kalah</span></div><div class="prog"><i style="width:'+wr+'%"></i></div></div>'+
   '<div class="card"><div class="k"><span>Total Transaksi</span></div><div class="big">'+v.length+'</div><div class="sub">Profit Factor: '+(function(){var pf=profitFactor(v.map(idr));return pf===Infinity?"∞":pf?pf.toFixed(2):"-"})()+'</div></div>'+
   '<div class="card"><div class="k"><span>Aset Terbaik</span></div><div class="big">'+(best?esc(best):"-")+'</div><div class="sub">'+(best?esc(by[best].k)+" · "+money(by[best].s,true):"Belum ada data")+'</div></div>';
}
function nice(x){var p=Math.pow(10,Math.floor(Math.log10(x))),f=x/p;return(f<=1?1:f<=2?2:f<=5?5:10)*p}
function chart(v){
  var svg=$("chart"),W=svg.clientWidth||700,H=340,L=74,Rr=16,Tp=14,B=34;
  svg.setAttribute("viewBox","0 0 "+W+" "+H);
  if(!v.length){svg.innerHTML='<text x="'+W/2+'" y="'+H/2+'" text-anchor="middle">Belum ada data</text>';return}
  var pts=[],run=0,t0=new Date(v[0].date+"T00:00:00").getTime();
  pts.push({x:t0-864e5,y:0});
  v.forEach(function(t){run+=idr(t);var x=new Date(t.date+"T00:00:00").getTime();if(pts.length&&pts[pts.length-1].x===x)pts[pts.length-1].y=run;else pts.push({x:x,y:run})});
  var ys=pts.map(function(p){return cur==="IDR"?p.y:p.y/R}),lo=Math.min(0,Math.min.apply(null,ys)),hi=Math.max(0,Math.max.apply(null,ys));if(hi===lo)hi=lo+1;
  var st=nice((hi-lo)/4),a=Math.floor(lo/st)*st,b=Math.ceil(hi/st)*st;
  var xa=pts[0].x,xb=pts[pts.length-1].x||xa+1;if(xb===xa)xb=xa+1;
  var X=function(x){return L+(x-xa)/(xb-xa)*(W-L-Rr)},Y=function(y){return Tp+(b-y)/(b-a)*(H-Tp-B)};
  var s='<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--gain)" stop-opacity=".28"/><stop offset="1" stop-color="var(--gain)" stop-opacity=".02"/></linearGradient></defs>';
  for(var g=a;g<=b+st/2;g+=st){var yy=Y(g);s+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)" stroke-dasharray="3 4"/><text x="'+(L-10)+'" y="'+(yy+4)+'" text-anchor="end">'+sh(cur==="IDR"?g:g*R)+'</text>'}
  var d="M"+X(pts[0].x).toFixed(1)+" "+Y(ys[0]).toFixed(1);
  for(var i=1;i<pts.length;i++){var x0=X(pts[i-1].x),x1=X(pts[i].x),y0=Y(ys[i-1]),y1=Y(ys[i]),m=(x0+x1)/2;d+=" C"+m.toFixed(1)+" "+y0.toFixed(1)+" "+m.toFixed(1)+" "+y1.toFixed(1)+" "+x1.toFixed(1)+" "+y1.toFixed(1)}
  var z=Y(Math.max(a,Math.min(0,b)));
  s+='<path d="'+d+" L"+X(xb).toFixed(1)+" "+z+" L"+X(xa).toFixed(1)+" "+z+' Z" fill="url(#g)"/><path d="'+d+'" fill="none" stroke="var(--gain)" stroke-width="2.2" stroke-linejoin="round"/>';
  var n=Math.min(6,pts.length);
  for(var k=0;k<n;k++){var tx=xa+(xb-xa)*k/(n-1),dt=new Date(tx).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});s+='<text x="'+X(tx).toFixed(1)+'" y="'+(H-8)+'" text-anchor="'+(k===0?"start":k===n-1?"end":"middle")+'">'+dt+'</text>'}
  svg.innerHTML=s;
}
function assetHeatmap(v){
  var el=$("assetHeatmap");if(!el)return;
  var by={};
  v.forEach(function(t){
    var x=idr(t),k=t.sym||"Tanpa aset";
    if(!by[k])by[k]={sym:k,kelas:t.kelas||"Lainnya",pnl:0,n:0};
    by[k].pnl+=x;by[k].n++;
  });
  var items=Object.keys(by).map(function(k){return by[k]}).sort(function(a,b){return Math.abs(b.pnl)-Math.abs(a.pnl)});
  if(!items.length){el.innerHTML='<div class="sub">Belum ada data untuk ditampilkan.</div>';return}
  var max=Math.max.apply(null,items.map(function(x){return Math.abs(x.pnl)}))||1;
  el.innerHTML=items.map(function(x){
    var intensity=Math.round(18+Math.abs(x.pnl)/max*62),color=x.pnl>0?"--gain":x.pnl<0?"--loss":"--line";
    var size=Math.max(86,Math.round(86+Math.abs(x.pnl)/max*110));
    return '<button class="asset-tile '+(x.pnl>0?"profit":x.pnl<0?"loss":"flat")+'" type="button" data-heat-symbol="'+esc(x.sym)+'" style="--hm-size:'+size+'px;--hm-intensity:'+intensity+'%"><b>'+esc(x.sym)+'</b><span>'+esc(x.kelas)+'</span><strong>'+money(x.pnl,true)+'</strong><small>'+x.n+' trade</small></button>';
  }).join("");
}
function donut(){
  var sums=KELAS.map(function(k){var q=T.filter(function(t){return t.kelas===k&&inP(t)});return{k:k,n:q.length,s:q.reduce(function(a,t){return a+idr(t)},0)}});
  var tot=sums.reduce(function(a,x){return a+Math.abs(x.s)},0),C=2*Math.PI*78,off=0,s="";
  sums.forEach(function(x){if(!tot||!x.s)return;var len=Math.abs(x.s)/tot*C,gap=Math.min(3,len/2);s+='<circle cx="110" cy="110" r="78" fill="none" stroke="'+CC[x.k]+'" stroke-width="34" stroke-dasharray="'+(len-gap).toFixed(1)+" "+(C-len+gap).toFixed(1)+'" stroke-dashoffset="'+(-off).toFixed(1)+'" transform="rotate(-90 110 110)"/>';off+=len});
  if(!s)s='<circle cx="110" cy="110" r="78" fill="none" stroke="var(--line)" stroke-width="34"/>';
  $("donut").innerHTML=s;
  $("leg").innerHTML=sums.map(function(x){return'<div><span><i style="background:'+CC[x.k]+'"></i><b>'+x.k+'</b> <span class="sub">('+x.n+' trade)</span></span><span class="'+cl(x.s)+'">'+money(x.s,true)+'</span></div>'}).join("");
}
function rows(v){
  var r=v.slice().reverse();$("empty").hidden=r.length>0;
  $("rows").innerHTML=r.map(function(t){return'<tr><td>'+dfmt(t.date)+'</td><td><b>'+esc(t.sym)+'</b></td><td><i class="dot" style="background:'+CC[t.kelas]+'"></i>'+t.kelas+'</td><td class="r '+cl(t.pl)+'">'+own(t)+'</td><td class="r"><button class="x" type="button" data-id="'+esc(t.id)+'" aria-label="Hapus '+esc(t.sym)+'">×</button></td></tr>'}).join("");
}
function streaks(a){var c=0,b=0,r=0,i;a.forEach(function(x){if(x>0){r++;if(r>b)b=r}else r=0});for(i=a.length-1;i>=0&&a[i]>0;i--)c++;return{c:c,b:b}}
function gauge(p){var d='M12 60A48 48 0 0 1 108 60';return'<svg viewBox="0 0 120 64" class="gauge" role="img" aria-label="'+Math.round(p)+' persen"><path d="'+d+'" fill="none" stroke="var(--loss)" stroke-width="14" pathLength="100"/><path d="'+d+'" fill="none" stroke="var(--gain)" stroke-width="14" pathLength="100" stroke-dasharray="'+p.toFixed(1)+' 100"/></svg>'}
function avg(a){return a.length?a.reduce(function(s,x){return s+x},0)/a.length:0}
function rat(a,b){return b?(a/b).toFixed(2):(a?"∞":"-")}
function dual(a,b){return'<div class="prog d"><i style="width:'+((a+b)?a/(a+b)*100:100)+'%"></i></div>'}
function analytics(v){
  var dm={};v.forEach(function(t){dm[t.date]=(dm[t.date]||0)+idr(t)});
  var dv=Object.keys(dm).sort().map(function(k){return dm[k]}),tv=v.map(idr),
  pos=function(x){return x>0},ng=function(x){return x<0},
  w=tv.filter(pos),l=tv.filter(ng),dw=dv.filter(pos),dl=dv.filter(ng),
  wr=tv.length?w.length/tv.length*100:0,dwr=dv.length?dw.length/dv.length*100:0,
  aw=avg(w),al=Math.abs(avg(l)),daw=avg(dw),dal=Math.abs(avg(dl)),st=streaks(tv),ds=streaks(dv);
  $("an").innerHTML=
  '<div class="card"><div class="k"><span>Winrate</span></div><div class="arow"><div class="big2">'+Math.round(wr)+'%</div>'+gauge(wr)+'</div></div>'+
  '<div class="card"><div class="k"><span>Winrate Harian</span></div><div class="arow"><div class="big2">'+Math.round(dwr)+'%</div>'+gauge(dwr)+'</div></div>'+
  '<div class="card"><div class="k"><span>Avg Menang / Kalah</span></div><div class="big2">'+rat(aw,al)+'</div>'+dual(aw,al)+'<div class="sub">'+money(aw,true)+' / '+money(-al,true)+'</div></div>'+
  '<div class="card"><div class="k"><span>Hari Menang / Kalah</span></div><div class="big2">'+(dl.length?rat(daw,dal):"-")+'</div>'+dual(daw,dal)+'<div class="sub">'+dw.length+' hari profit / '+dl.length+' hari loss</div></div>'+
  '<div class="card"><div class="k"><span>Winstreak</span></div><div class="strk"><div><b class="pos">'+ds.c+'</b><span>Hari</span><small>terbaik '+ds.b+'</small></div><div><b class="pos">'+st.c+'</b><span>Trade</span><small>terbaik '+st.b+'</small></div></div></div>';
}
var HMS=[["Teknologi Elektronik",[["NVDA",4300,2.58],["AAPL",3900,2.22],["AVGO",1500,1.1],["AMD",280,-.9]]],["Layanan Teknologi",[["MSFT",3700,-.2],["GOOGL",2300,1.59],["META",1700,.8],["ORCL",600,-1.2]]],["Keuangan",[["JPM",780,-1.86],["V",630,.55],["MA",500,.3],["BAC",350,-.7]]],["Ritel",[["AMZN",2400,-.24],["WMT",750,.4],["COST",420,.9],["HD",380,-.5]]],["Kesehatan",[["LLY",750,.6],["UNH",480,-2.1],["JNJ",400,.2],["ABBV",340,-.3]]],["Konsumen",[["TSLA",1100,4.97],["KO",300,.1],["PG",380,-.2],["MCD",210,.3]]],["Energi",[["XOM",480,-.8],["CVX",270,-.5]]]];
var HMI=[["Keuangan",[["BBCA",1000,.6],["BBRI",650,-.9],["BMRI",480,.3],["BBNI",190,-.4],["BRIS",110,1.4]]],["Energi dan Tambang",[["AMMN",800,2.1],["BYAN",500,-.5],["ADRO",90,-1.3],["ANTM",60,1.8],["PTBA",30,-.2]]],["Telekomunikasi dan Infrastruktur",[["TLKM",300,.4],["ISAT",80,-.7],["TOWR",50,.2],["BSDE",20,-1.1]]],["Konsumen",[["ICBP",120,.5],["UNVR",70,-.6],["INDF",60,.1],["MYOR",40,-1.7]]],["Industri",[["ASII",200,-.3],["UNTR",90,.9]]],["Teknologi",[["GOTO",60,3.2],["BUKA",20,-2.4]]],["Kesehatan",[["KLBF",70,.2],["MIKA",35,-.8]]]];
var HMC=[["BTC",2100,1.2],["ETH",450,-.8],["XRP",160,2.4],["BNB",130,.3],["SOL",110,3.1],["DOGE",35,-1.5],["ADA",30,-.4],["TRX",30,.2],["AVAX",14,-2.2],["LINK",12,1.8],["DOT",8,-1],["LTC",9,.5],["BCH",10,-.3],["UNI",6,4.1]];
var hm={mode:"saham",live:{saham:0,kripto:0},cr:null,q:{},error:""};
function worst(r,s,sd){var mx=0,mn=1e18;r.forEach(function(x){mx=Math.max(mx,x.a);mn=Math.min(mn,x.a)});return Math.max(sd*sd*mx/(s*s),s*s/(sd*sd*mn))}
function sq(a,x,y,w,h,o){
  while(a.length){
    var sd=Math.min(w,h),row=[a[0]],s=a[0].a,wr=worst(row,s,sd),i=1;
    while(i<a.length){var r2=row.concat(a[i]),s2=s+a[i].a,w2=worst(r2,s2,sd);if(w2>wr)break;row=r2;s=s2;wr=w2;i++}
    a=a.slice(i);var th=s/sd,p;
    if(w>=h){p=y;row.forEach(function(r){var q=r.a/th;o.push({d:r.d,x:x,y:p,w:th,h:q});p+=q});x+=th;w-=th}
    else{p=x;row.forEach(function(r){var q=r.a/th;o.push({d:r.d,x:p,y:y,w:q,h:th});p+=q});y+=th;h-=th}
  }
}
function lay(list,x,y,w,h){var tot=list.reduce(function(s,i){return s+i.v},0),o=[];sq(list.slice().sort(function(p,q){return q.v-p.v}).map(function(i){return{a:i.v/tot*w*h,d:i}}),x,y,w,h,o);return o}
function hmItems(){
  if(hm.mode==="kripto")return(hm.cr||HMC.map(function(x){return{sym:x[0],v:x[1],c:x[2]}})).map(function(x){return{sec:"",sym:x.sym,v:x.v,c:x.c}});
  var o=[];(hm.mode==="idx"?HMI:HMS).forEach(function(s){s[1].forEach(function(x){o.push({sec:s[0],sym:x[0],v:x[1],c:hm.q[x[0]]!=null?hm.q[x[0]]:x[2]})})});return o;
}
function hmBg(c){var a=Math.abs(c);if(a<.1)return"#2a2d30";return"color-mix(in srgb,var("+(c>0?"--gain":"--loss")+") "+Math.round(20+Math.min(a,3)/3*55)+"%,#15181a)"}
function hmRender(){
  var el=$("hm"),W=el.clientWidth;if(!W)return;
  el.style.height=(W<560?380:460)+"px";var H=el.clientHeight,its=hmItems(),out=[],h="",lb="";
  if(hm.mode==="kripto")out=lay(its,0,0,W,H);
  else{var g={};its.forEach(function(i){g[i.sec]=g[i.sec]||{sec:i.sec,v:0,k:[]};g[i.sec].v+=i.v;g[i.sec].k.push(i)});
    lay(Object.keys(g).map(function(k){return g[k]}),0,0,W,H).forEach(function(r){var s=r.d,hd=r.h>40?16:0;lb+='<div class="sl" style="left:'+r.x.toFixed(1)+'px;top:'+r.y.toFixed(1)+'px;width:'+r.w.toFixed(1)+'px">'+esc(s.sec)+'</div>';out=out.concat(lay(s.k,r.x,r.y+hd,r.w,r.h-hd))})}
  out.forEach(function(r){var d=r.d,big=r.w>38&&r.h>26,fs=Math.max(10,Math.min(26,Math.sqrt(r.w*r.h)/4.5)),pc=(d.c>0?"+":"")+d.c.toFixed(2)+"%";
    h+='<div class="t" title="'+esc(d.sym)+' '+pc+'" style="left:'+r.x.toFixed(1)+'px;top:'+r.y.toFixed(1)+'px;width:'+r.w.toFixed(1)+'px;height:'+r.h.toFixed(1)+'px;background:'+hmBg(d.c)+'">'+(big?'<span style="font-size:'+fs.toFixed(0)+'px">'+esc(d.sym)+'</span>'+(r.h>46&&r.w>56?'<small>'+pc+'</small>':""):"")+'</div>'});
  el.innerHTML=h+lb;
  var lv=hm.live[hm.mode],k=window.LedgerlyMarketstack?window.LedgerlyMarketstack.getKey():"";
  $("hmSt").textContent=lv?"Live · diperbarui "+new Date(lv).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):(hm.error?"Data contoh — "+hm.error:"Data contoh"+(hm.mode!=="kripto"&&!k?" — isi API key untuk data live":" — belum terhubung ke sumber live"));
  $("hmKey").hidden=hm.mode==="kripto";$("hmKeyIn").value=k;$("hmKeyIn").placeholder="Marketstack API key";
  Array.prototype.forEach.call($("hmTabs").children,function(b){b.setAttribute("aria-pressed",b.getAttribute("data-m")===hm.mode)});
}
function hmFetch(){
  hm.error="";
  if(hm.mode==="kripto"){
    requestJson("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=40&page=1&price_change_percentage=24h").then(function(j){
      if(!Array.isArray(j)||!j.length)throw 0;
      hm.cr=j.map(function(c){return{sym:String(c.symbol).toUpperCase(),v:c.market_cap||1,c:c.price_change_percentage_24h||0}});hm.live.kripto=Date.now();hmRender();
    }).catch(function(){hm.error="gagal mengambil data pasar";hmRender()});return;
  }
  if(!window.LedgerlyMarketstack){hm.error="file Marketstack API belum termuat";hmRender();return}
  var source=hm.mode==="idx"?HMI:HMS,sy=[];
  source.forEach(function(s){s[1].forEach(function(x){sy.push(x[0])})});
  window.LedgerlyMarketstack.fetchQuotes(sy).then(function(quotes){
    var n=0;sy.forEach(function(symbol){var row=quotes[symbol.toUpperCase()];if(row){hm.q[symbol]=row.changePct;n++}});
    hm.live[hm.mode]=n?Date.now():0;if(!n)hm.error="Marketstack tidak mengembalikan data untuk simbol ini";hmRender();
  }).catch(function(error){hm.error=error.message||"tidak dapat terhubung ke Marketstack";hmRender()});
}
var AK=STORAGE_KEYS.account,acc={cur:"USD",start:250000,dep:0};
try{var ac0=JSON.parse(storage.getItem(AK)||"null");if(ac0&&ac0.start>=0)acc=ac0}catch(e){}
function aI(x){return acc.cur==="USD"?x*R:x}
function ci(t,x){return t.cur==="USD"?x*R:x}
function sm(a){return a.reduce(function(s,x){return s+x},0)}

function pr(a,b,c){return'<div class="pr"><span>'+a+'</span><b'+(c?' class="'+c+'"':"")+'>'+b+'</b></div>'}
function perf(v){
  var tv=v.map(idr),n=tv.length,net=sm(tv),base=aI(acc.start+acc.dep),
  w=tv.filter(function(x){return x>0}),l=tv.filter(function(x){return x<0}),
  gw=sm(w),gl=Math.abs(sm(l)),aw=w.length?gw/w.length:0,al=l.length?gl/l.length:0,
  wr=winRate(tv),be=(aw+al)?al/(aw+al)*100:0,ret=base?net/base*100:0,
  bal=base,pk=base,mdd=0,mp=0,dm={},od=[];
  v.forEach(function(t){var x=idr(t);if(!dm[t.date]){dm[t.date]={s:bal,p:0};od.push(t.date)}dm[t.date].p+=x;bal+=x;if(bal>pk)pk=bal;var d=pk-bal;if(d>mdd){mdd=d;mp=pk?d/pk*100:0}});
  mp=maxDrawdown(tv,base);
  var cd=pk-bal,cp=pk?cd/pk*100:0,r=od.map(function(d){return dm[d].s?dm[d].p/dm[d].s:0}),m=avg(r),
  sd=Math.sqrt(avg(r.map(function(x){return(x-m)*(x-m)}))),dn=Math.sqrt(avg(r.map(function(x){return x<0?x*x:0}))),
  sh=r.length>1&&sd>0?m/sd*Math.sqrt(252):null,so=r.length>1&&dn>0?m/dn*Math.sqrt(252):null,
  balance=base+T.reduce(function(s,t){return s+idr(t)},0),
  dur=v.filter(function(t){return t.dur>0}).map(function(t){return t.dur}),ad=avg(dur),
  lots=sm(v.map(function(t){return t.lot||0})),fee=sm(v.map(function(t){return ci(t,t.fee||0)})),sw=sm(v.map(function(t){return ci(t,t.swap||0)}));
  var ok=wr>=be;
  $("perfBody").innerHTML=
  '<div class="pt"><div><div class="k"><span>Net P&amp;L</span></div><div class="big '+cl(net)+'">'+money(net,true)+'</div></div><div class="rtn"><div class="k"><span>Return</span></div><div class="big '+cl(ret)+'">'+(ret>0?"+":"")+pc(ret,2)+'%</div></div></div>'+
  '<div class="sbox"><div class="s3"><div><span>Win rate</span><b>'+pc(wr)+'%</b></div><div><span>Profit factor</span><b>'+(function(){var pf=profitFactor(tv);return pf===Infinity?"∞":pf?pf.toFixed(2):"-"})()+'</b></div><div><span>Expectancy</span><b class="'+cl(net)+'">'+(n?money(expectancy(tv),true):"-")+'</b></div></div>'+
  '<div class="meter"><div class="mt"><i style="width:'+Math.min(100,wr)+'%"></i><u style="left:'+Math.min(100,be)+'%"></u></div><div class="ml"><span class="'+(ok?"pos":"neg")+'">'+pc(Math.abs(wr-be))+' poin '+(ok?"di atas":"di bawah")+' break-even</span><span>Break-even di '+pc(be)+'%</span></div></div></div>'+
  '<div class="trio"><div><h3>Risiko</h3>'+pr("Max drawdown",n?money(-mdd)+" · "+pc(mp,2)+"%":"-","neg")+pr("Drawdown saat ini",n?money(-cd)+" · "+pc(cp,2)+"%":"-",cd>0?"neg":"")+pr("Sharpe ratio",sh===null?"-":sh.toFixed(2))+pr("Sortino ratio",so===null?"-":so.toFixed(2))+'</div>'+
  '<div><h3>Akun</h3>'+pr("Saldo",money(balance))+pr("Modal awal",money(aI(acc.start)))+pr("Setoran",money(aI(acc.dep)))+'</div>'+
  '<div><h3>Trade</h3>'+pr("Avg menang / kalah",money(aw)+" / "+money(al),"")+pr("Rata-rata durasi",dur.length?Math.floor(ad/60)+"j "+Math.round(ad%60)+"m":"-")+pr("Volume",lots?lots.toFixed(2)+" lot":"-")+pr("Komisi / Swap",money(-fee,true)+" / "+money(-sw,true))+'</div></div>';
}
function portfolio(){
  var statsEl=$("portfolioStats");if(!statsEl)return;
  var all=T.map(idr),pnl=sm(all),base=aI(acc.start),deposit=aI(acc.dep),balance=base+deposit+pnl;
  var peak=base+deposit,drawdown=0,by={},ordered=T.slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0});
  ordered.forEach(function(t){var x=idr(t),k=t.kelas||"Lainnya";peak+=x;by[k]=(by[k]||0)+x});
  var equity=base+deposit,prior=base+deposit;
  peak=equity;
  ordered.forEach(function(t){equity+=idr(t);if(equity>peak)peak=equity;drawdown=peak>0?Math.max(0,(peak-equity)/peak*100):0});
  var ret=prior?pnl/prior*100:0, winners=all.filter(function(x){return x>0}).length;
  statsEl.innerHTML=
    '<div class="card"><div class="k"><span>Nilai portofolio</span></div><div class="big '+cl(balance)+'">'+compactMoney(balance,true)+'</div><div class="sub">saldo berjalan</div></div>'+
    '<div class="card"><div class="k"><span>Total modal</span></div><div class="big">'+compactMoney(prior)+'</div><div class="sub">modal awal + setoran</div></div>'+
    '<div class="card"><div class="k"><span>Total P&amp;L</span></div><div class="big '+cl(pnl)+'">'+compactMoney(pnl,true)+'</div><div class="sub">'+(T.length?T.length+" transaksi":"belum ada transaksi")+'</div></div>'+
    '<div class="card"><div class="k"><span>Return</span></div><div class="big '+cl(ret)+'">'+(ret>0?"+":"")+pc(ret,2)+'%</div><div class="sub">'+winners+' transaksi profit</div></div>';
  var total=Math.max(1,Object.keys(by).reduce(function(sum,k){return sum+Math.abs(by[k])},0));
  $("portfolioAssets").innerHTML=Object.keys(by).sort(function(a,b){return Math.abs(by[b])-Math.abs(by[a])}).map(function(k){
    var pct=Math.abs(by[k])/total*100;
    return '<div class="portfolio-asset"><div><b>'+esc(k)+'</b><span class="'+cl(by[k])+'">'+money(by[k],true)+'</span></div><i><em class="'+(by[k]>=0?"gain":"loss")+'" style="width:'+Math.max(4,pct)+'%"></em></i><small>'+pc(pct,1)+'% kontribusi</small></div>';
  }).join("")||'<div class="sub">Belum ada data transaksi.</div>';
  $("portfolioRisk").innerHTML='<div class="risk-list">'+
    pr("Saldo berjalan",compactMoney(balance),cl(balance))+
    pr("Drawdown",pc(drawdown,2)+"%",drawdown>0?"neg":"pos")+
    pr("Setoran",money(deposit,true),"")+
    '</div><div class="meter"><div class="mt"><i style="width:'+Math.min(100,Math.max(0,ret+50))+'%"></i></div><div class="ml"><span>Return portofolio</span><b class="'+cl(ret)+'">'+(ret>0?"+":"")+pc(ret,2)+'%</b></div></div>';
  $("portfolioFlow").innerHTML='<div class="portfolio-flow"><div><span>Modal awal</span><b>'+compactMoney(base)+'</b></div><div><span>Setoran</span><b class="pos">'+compactMoney(deposit,true)+'</b></div><div><span>Trading P&amp;L</span><b class="'+cl(pnl)+'">'+compactMoney(pnl,true)+'</b></div><div class="total"><span>Saldo akhir</span><b>'+compactMoney(balance,true)+'</b></div></div>';
  $("portfolioUpdated").textContent=acc.cur+" · diperbarui "+new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
}
function bars(el,up,dn,lab,fmt){
  var W=el.clientWidth||460,H=220,Lm=6,Rm=60,Tm=10,Bm=22,n=up.length,mx=Math.max(1,Math.max.apply(null,up),Math.max.apply(null,dn.map(Math.abs))),ch=H-Tm-Bm,z=Tm+ch/2,sc=ch/2/mx,bw=(W-Lm-Rm)/n,s='<line x1="'+Lm+'" x2="'+(W-Rm)+'" y1="'+z+'" y2="'+z+'" stroke="var(--line)"/>',i;
  for(i=0;i<n;i++){
    var x=Lm+i*bw+bw*.15,w=Math.max(1,bw*.7),lb=lab(i);
    if(up[i]>0)s+='<rect x="'+x.toFixed(1)+'" y="'+(z-up[i]*sc).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(up[i]*sc).toFixed(1)+'" rx="2" fill="var(--gain)"><title>'+fmt(up[i])+'</title></rect>';
    if(dn[i]<0)s+='<rect x="'+x.toFixed(1)+'" y="'+z.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(-dn[i]*sc).toFixed(1)+'" rx="2" fill="var(--loss)"><title>-'+fmt(-dn[i])+'</title></rect>';
    if(lb)s+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle">'+lb+'</text>';
  }
  s+='<text x="'+(W-Rm+6)+'" y="'+(Tm+10)+'">'+fmt(mx)+'</text><text x="'+(W-Rm+6)+'" y="'+(z+4)+'">0</text><text x="'+(W-Rm+6)+'" y="'+(H-Bm)+'">-'+fmt(mx)+'</text>';
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="100%" height="'+H+'" role="img" aria-label="Grafik batang">'+s+'</svg>';
}
function daily(v){
  var el=$("dly");if(!cm||!el)return;
  var dim=new Date(cm.y,cm.m+1,0).getDate(),pre=cm.y+"-"+pad(cm.m+1)+"-",up=[],dn=[],tot=0,i;
  for(i=0;i<dim;i++){up.push(0);dn.push(0)}
  v.forEach(function(t){if(t.date.indexOf(pre)===0){var x=idr(t),k=+t.date.slice(8)-1;tot+=x;if(x>0)up[k]+=x;else dn[k]+=x}});
  $("dlyTot").innerHTML='<span class="'+cl(tot)+'">'+money(tot)+'</span>';
  bars(el,up,dn,function(i){return i%3===0?String(i+1):""},cf);
}
var DS={by:"hour",m:"count"};
function dist(v){
  var el=$("dst");if(!el)return;
  var n=DS.by==="hour"?24:7,up=[],dn=[],skip=0,i;for(i=0;i<n;i++){up.push(0);dn.push(0)}
  v.forEach(function(t){var k;if(DS.by==="hour"){if(!t.jam){skip++;return}k=parseInt(t.jam.slice(0,2),10)}else k=(new Date(t.date+"T00:00:00").getDay()+6)%7;
    var x=idr(t);if(DS.m==="count"){if(x>0)up[k]++;else if(x<0)dn[k]--}else{if(x>0)up[k]+=x;else dn[k]+=x}});
  bars(el,up,dn,DS.by==="hour"?function(i){return i%3===0?pad(i):""}:function(i){return["Sen","Sel","Rab","Kam","Jum","Sab","Min"][i]},DS.m==="count"?function(x){return String(Math.round(x))}:cf);
  $("dstNote").textContent=(DS.by==="hour"&&skip?skip+" trade tanpa jam tidak dihitung. ":"")+"Atas = menang, bawah = kalah.";
  Array.prototype.forEach.call($("dsBy").children,function(b){b.setAttribute("aria-pressed",b.getAttribute("data-v")===DS.by)});
  Array.prototype.forEach.call($("dsM").children,function(b){b.setAttribute("aria-pressed",b.getAttribute("data-v")===DS.m)});
}
var BO=["metrics","portfolio","calendar","heatmap"],WH={},WL=[["stats","Kartu statistik","metrics"],["an","Winrate, rasio, winstreak","metrics"],["perf","Ringkasan performa","metrics"],["equity","Equity curve dan distribusi kelas","metrics"],["riwayat","Riwayat transaksi","metrics"],["calendar","Kalender","calendar"],["daily","Net Daily P&amp;L","calendar"],["dist","Distribusi trade","calendar"],["yearly","Performa tahunan","calendar"],["heatmap","Heatmap pasar","heatmap"]];
try{WH=JSON.parse(storage.getItem(STORAGE_KEYS.widgets)||"{}")||{}}catch(e){WH={}}
function wSave(){try{storage.setItem(STORAGE_KEYS.widgets,JSON.stringify(WH))}catch(e){}}
function applyW(){Array.prototype.forEach.call(document.querySelectorAll("[data-w]"),function(e){e.classList.toggle("wh",!!WH[e.getAttribute("data-w")])})}
function wList(){var b=$("main").getAttribute("data-board");$("wList").innerHTML=WL.filter(function(w){return w[2]===b}).map(function(w){return'<label class="ck"><input type="checkbox" data-k="'+w[0]+'"'+(WH[w[0]]?"":" checked")+'>'+w[1]+'</label>'}).join("")}
function setBoard(b){
  if(BO.indexOf(b)<0)b="metrics";
  $("main").setAttribute("data-board",b);
  Array.prototype.forEach.call($("nav").children,function(x){x.setAttribute("aria-current",x.getAttribute("data-nav")===b?"page":"false")});
  applyW();render();portfolio();hmRender();
}
var cm=null,sel=null;
function cf(x){if(cur==="USD"){var q=x/R,a=Math.abs(q);return(q<0?"-":"")+"$"+(a>=1000?(a/1000).toFixed(1).replace(".",",")+" rb":nus.format(a))}var b=Math.abs(x),s=x<0?"-":"";if(b>=1e9)return s+(b/1e9).toFixed(1).replace(".",",")+" M";if(b>=1e6)return s+(b/1e6).toFixed(1).replace(".",",")+" jt";if(b>=1e3)return s+Math.round(b/1e3)+" rb";return s+Math.round(b)}
function cal(v){
  if(!cm){var last=v.length?v[v.length-1].date:new Date().toISOString().slice(0,10);cm={y:+last.slice(0,4),m:+last.slice(5,7)-1}}
  var y=cm.y,m=cm.m,first=new Date(y,m,1),dim=new Date(y,m+1,0).getDate(),off=(first.getDay()+6)%7,pre=y+"-"+pad(m+1)+"-",pdim=new Date(y,m,0).getDate(),
  by={},mx=1,tot=0,nt=0,nw=0,mp=0,base=aI(acc.start+acc.dep),bal=base,pd={},ds0={},i,d;
  v.forEach(function(t){var x=idr(t);ds0[t.date]=(ds0[t.date]||0)+x;if(t.date.indexOf(pre)===0){var k=+t.date.slice(8);by[k]=by[k]||{s:0,n:0};by[k].s+=x;by[k].n++;nt++;if(x>0)nw++}});
  Object.keys(ds0).sort().forEach(function(k){pd[k]=bal>0?ds0[k]/bal*100:null;bal+=ds0[k]});
  Object.keys(by).forEach(function(k){var s=by[k].s;tot+=s;mx=Math.max(mx,Math.abs(s));var q=pd[pre+pad(+k)];if(q!=null)mp+=q});
  var h="Sen Sel Rab Kam Jum Sab Min Total".split(" ").map(function(x){return'<div class="dn">'+x+'</div>'}).join(""),ws=0,wn=0,wp=0;
  for(i=0;i<off;i++)h+='<div class="day out"><span class="big">'+(pdim-off+1+i)+'</span></div>';
  for(d=1;d<=dim;d++){
    var b=by[d],ds=pre+pad(d),q=pd[ds];
    if(b){ws+=b.s;wn+=b.n;if(q!=null)wp+=q;var p=Math.round(10+Math.abs(b.s)/mx*32),c=b.s>=0?"--gain":"--loss";
      h+='<button class="day '+(b.s>=0?"w":"l")+(sel===ds?" sel":"")+'" type="button" data-d="'+ds+'" style="background:color-mix(in srgb,var('+c+') '+p+'%,var(--card))"><span class="n">'+d+'</span><span class="v '+cl(b.s)+'">'+cf(b.s)+'</span>'+(q!=null?'<span class="c">'+pc(q,2)+'%</span>':"")+'</button>'}
    else h+='<div class="day e"><span class="big">'+d+'</span></div>';
    if((off+d)%7===0||d===dim){var fl=(7-(off+d)%7)%7;for(i=1;i<=fl;i++)h+='<div class="day out"><span class="big">'+i+'</span></div>';
      h+=wn?'<div class="day tot '+(ws>=0?"w":"l")+'"><span class="v '+cl(ws)+'">'+cf(ws)+'</span><span class="c">'+(wp?(wp>0?"+":"")+pc(wp,2)+"%":wn+" trade")+'</span></div>':'<div class="day tot"><span class="big">-</span></div>';ws=0;wn=0;wp=0}
  }
  $("cal").innerHTML=h;
  $("calTitle").textContent=first.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
  $("calSum").innerHTML=nt?'<div class="cch"><div><span>Trades</span><b>'+nt+'</b></div><div><span>Wins</span><b>'+nw+'</b></div><div><span>Net P&amp;L</span><b class="'+cl(tot)+'">'+money(tot,true)+'</b></div><div><span>Persen</span><b class="'+cl(mp)+'">'+(mp>0?"+":"")+pc(mp,2)+'%</b></div></div>':"Tidak ada transaksi di bulan ini";
  var dt=sel&&sel.indexOf(pre)===0?v.filter(function(t){return t.date===sel}):[];
  $("dayDetail").innerHTML=dt.length?'<b style="color:var(--ink)">'+dfmt(sel)+'</b>'+dt.map(function(t){return'<div class="l"><span><i class="dot" style="background:'+CC[t.kelas]+'"></i>'+esc(t.sym)+' <span class="sub">'+t.kelas+'</span></span><span class="mono '+cl(t.pl)+'">'+own(t)+'</span></div>'}).join(""):"Klik tanggal berwarna untuk melihat detail trade hari itu.";
}
function yearly(v){
  var by={};v.forEach(function(t){var y=+t.date.slice(0,4),m=+t.date.slice(5,7)-1,x=idr(t);by[y]=by[y]||{t:0,n:0,m:{}};var o=by[y];o.t+=x;o.n++;o.m[m]=o.m[m]||{s:0,n:0};o.m[m].s+=x;o.m[m].n++});
  var ys=Object.keys(by).sort(function(a,b){return b-a}),h='<div class="yg"><span></span>'+"Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des YTD".split(" ").map(function(x){return'<div class="h">'+x+'</div>'}).join("");
  ys.forEach(function(y){var o=by[y];h+='<div class="yl">'+y+'</div>';
    for(var m=0;m<12;m++){var c=o.m[m];h+=c?'<button class="yc '+(c.s>=0?"w":"l")+'" type="button" data-ym="'+y+"-"+m+'"><b class="'+cl(c.s)+'">'+(c.s>0?"+":"")+cf(c.s)+'</b><small>'+c.n+' trade</small></button>':'<div class="yc">-</div>'}
    h+='<div class="yc '+(o.t>=0?"w":"l")+'"><b class="'+cl(o.t)+'">'+(o.t>0?"+":"")+cf(o.t)+'</b><small>'+o.n+' trade</small></div>'});
  $("yr").innerHTML=ys.length?h+'</div>':'<div class="sub">Belum ada data.</div>';
}
function render(){
  var v=vis(),mixed=T.some(function(t){return t.cur==="USD"})&&T.some(function(t){return t.cur==="IDR"});
  $("note").hidden=!mixed;$("note").textContent="Ada transaksi dengan mata uang campuran — ditampilkan dalam "+cur+" dengan kurs "+(RT?"live":"cadangan")+" 1 USD = Rp "+nid.format(Math.round(R))+".";
  var rl=$("rate");rl.className="rate"+(RT?" live":"");rl.innerHTML="<i></i>"+(RT?"1 USD = Rp "+nid.format(Math.round(R))+" · sumber "+new Date(RT).toLocaleString("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})+(LF?" · dicek "+new Date(LF).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):""):"Kurs cadangan Rp "+nid.format(R));
  $("cIDR").setAttribute("aria-pressed",cur==="IDR");$("cUSD").setAttribute("aria-pressed",cur==="USD");
  $("chips").innerHTML=["Semua"].concat(KELAS).map(function(c){return'<button class="chip" type="button" data-c="'+c+'" aria-pressed="'+(c===flt)+'">'+c+'</button>'}).join("");
  $("per").innerHTML=["1W","1M","6M","1Y","All"].map(function(p){return'<button type="button" data-p="'+p+'" aria-pressed="'+(p===per)+'">'+p+'</button>'}).join("");
  stats(v);chart(v);donut();assetHeatmap(v);cal(visK());daily(visK());dist(v);analytics(v);perf(v);portfolio();yearly(visK());rows(v);
}
$("cIDR").onclick=function(){cur="IDR";saveSet();render()};
$("cUSD").onclick=function(){cur="USD";saveSet();render()};
var SUN='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
MOON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
function themeIcon(){
  var dark=document.documentElement.getAttribute("data-theme")==="dark",meta=document.querySelector('meta[name="theme-color"]'),button=$("themeBtn");
  button.innerHTML=dark?SUN:MOON;
  button.setAttribute("aria-label",dark?"Ganti ke mode terang":"Ganti ke mode gelap");
  if(meta)meta.setAttribute("content",dark?"#0e0e10":"#f6f4ee");
}
$("themeBtn").onclick=function(){
  var h=document.documentElement;
  h.setAttribute("data-theme",h.getAttribute("data-theme")==="dark"?"light":"dark");
  h.classList.add("tx");setTimeout(function(){h.classList.remove("tx")},450);
  saveSet();themeIcon();
  var button=$("themeBtn");button.classList.remove("spin");void button.offsetWidth;button.classList.add("spin");
};
$("chips").onclick=function(e){var c=e.target.getAttribute("data-c");if(c){flt=c;render()}};
$("rows").onclick=function(e){var id=e.target.getAttribute("data-id");if(id){T=T.filter(function(t){return t.id!==id});save();render()}};
$("addBtn").onclick=function(){$("fd").value=new Date().toISOString().slice(0,10);$("fs").value="";$("fp").value="";["fm","fl","ff","fw","fj"].forEach(function(z){$(z).value=""});$("dlg").showModal()};
$("fp").oninput=$("ff").oninput=$("fw").oninput=function(){var p=this.selectionStart,n=this.value.length;this.value=formatSignedInput(this.value);this.setSelectionRange(Math.max(0,p+(this.value.length-n)),Math.max(0,p+(this.value.length-n)))};
$("cancel").onclick=function(){$("dlg").close()};
$("save").onclick=function(){
  var p=inputNumber($("fp").value),s=$("fs").value.trim().toUpperCase();
  if(isNaN(p)||!s||!$("fd").value){$("fs").focus();return}
  var o={id:"t"+Date.now(),date:$("fd").value,kelas:$("fk").value,sym:s,cur:$("fc").value,pl:p};["fm:dur","fl:lot"].forEach(function(z){var q=z.split(":"),x=parseFloat($(q[0]).value);if(!isNaN(x))o[q[1]]=x});["ff:fee","fw:swap"].forEach(function(z){var q=z.split(":"),x=inputNumber($(q[0]).value);if(!isNaN(x))o[q[1]]=x});if($("fj").value)o.jam=$("fj").value;T.push(o);save();$("dlg").close();render();
};
$("csvBtn").onclick=function(){
  var v=vis();$("csvTxt").value="tanggal,kelas,aset,mata_uang,hasil\n"+v.map(function(t){return[t.date,t.kelas,'"'+t.sym.replace(/"/g,'""')+'"',t.cur,t.pl].join(",")}).join("\n");$("csvDlg").showModal();
};
$("csvCopy").onclick=function(){var ta=$("csvTxt");ta.select();try{navigator.clipboard.writeText(ta.value);$("csvCopy").textContent="Tersalin"}catch(e){document.execCommand&&document.execCommand("copy")}};
$("csvClose").onclick=function(){$("csvDlg").close();$("csvCopy").textContent="Salin"};
$("per").onclick=function(e){var p=e.target.getAttribute("data-p");if(p){per=p;render()}};
$("accBtn").onclick=function(){$("ac").value=acc.cur;$("as").value=formatInput(acc.start);$("ad").value=formatInput(acc.dep);$("accDlg").showModal()};
$("as").oninput=function(){var p=this.selectionStart,n=this.value.length;this.value=formatInput(this.value);this.setSelectionRange(Math.max(0,p+(this.value.length-n)),Math.max(0,p+(this.value.length-n)))};
$("ad").oninput=$("as").oninput;
$("accCancel").onclick=function(){$("accDlg").close()};
 $("accSave").onclick=function(){acc={cur:$("ac").value,start:Math.max(0,inputNumber($("as").value)),dep:Math.max(0,inputNumber($("ad").value))};try{storage.setItem(AK,JSON.stringify(acc))}catch(e){}$("accDlg").close();render()};
$("portfolioAccBtn").onclick=function(){$("accBtn").click()};
$("yr").onclick=function(e){var b=e.target.closest("[data-ym]");if(b){var p=b.getAttribute("data-ym").split("-");cm={y:+p[0],m:+p[1]};sel=null;render();$("cal").scrollIntoView({behavior:"smooth",block:"center"})}};
$("nav").onclick=function(e){var x=e.target.closest("[data-nav]");if(x){var b=x.getAttribute("data-nav");try{history.replaceState(null,"","#"+b)}catch(er){}setBoard(b)}};
window.addEventListener("hashchange",function(){setBoard(location.hash.slice(1))});
$("editBtn").onclick=function(){wList();$("wDlg").showModal()};
$("wList").onchange=function(e){var k=e.target.getAttribute("data-k");if(k){WH[k]=!e.target.checked;wSave();applyW()}};
$("wReset").onclick=function(){WH={};wSave();applyW();wList()};
$("wClose").onclick=function(){$("wDlg").close()};
$("dsBy").onclick=function(e){var v=e.target.getAttribute("data-v");if(v){DS.by=v;dist(vis())}};
$("dsM").onclick=function(e){var v=e.target.getAttribute("data-v");if(v){DS.m=v;dist(vis())}};
$("calPrev").onclick=function(){if(!cm)cal(vis());cm.m--;if(cm.m<0){cm.m=11;cm.y--}sel=null;render()};
$("calNext").onclick=function(){if(!cm)cal(vis());cm.m++;if(cm.m>11){cm.m=0;cm.y++}sel=null;render()};
$("cal").onclick=function(e){var b=e.target.closest("[data-d]");if(b){sel=sel===b.getAttribute("data-d")?null:b.getAttribute("data-d");render()}};
var LF=0;
function checkForUpdate(){
  if(window.ledgerlyDesktop)return;requestJson("version.json?check="+Date.now(),{cache:"no-store"}).then(function(v){
    var b=document.getElementById("updateBtn");if(!b||!v.version)return;
    if(v.version!==APP_VERSION){b.textContent="Update tersedia";b.dataset.ready="true"}else if(b.dataset.ready!=="true"){b.textContent="Sudah terbaru";setTimeout(function(){if(b.dataset.ready!=="true")b.textContent="Cek update"},2200)}
  }).catch(function(){});
}
function installExtraControls(){
  var b=document.getElementById("backupBtn"),r=document.getElementById("restoreBtn"),f=document.getElementById("restoreFile"),c=document.getElementById("clearBtn"),u=document.getElementById("updateBtn"),security=document.getElementById("securityBtn");
  if(b)b.onclick=function(){var password=prompt("Buat password untuk mengenkripsi backup:");if(!password||password.length<8){if(password!==null)alert("Password backup minimal 8 karakter.");return}encryptBackup(password).then(function(payload){var a=document.createElement("a"),blob=new Blob([payload],{type:"application/json"});a.href=URL.createObjectURL(blob);a.download="ledgerly-backup-encrypted-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}).catch(function(){alert("Backup terenkripsi gagal dibuat.")})};
  if(r&&f){r.onclick=function(){f.click()};f.onchange=function(){var file=f.files&&f.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(){try{var data=JSON.parse(reader.result);var result=data.encrypted?decryptBackup(data,prompt("Masukkan password backup:")):Promise.resolve(data);result.then(function(decoded){if(!validTransactions(decoded.transactions))throw new Error("Format tidak valid");if(!confirm("Import akan mengganti seluruh riwayat transaksi. Lanjutkan?"))return;T=decoded.transactions;save();render()}).catch(function(){alert("Backup tidak valid atau password salah.")})}catch(e){alert("File backup tidak valid.")}};reader.readAsText(file);f.value=""}};
  if(c)c.onclick=function(){if(confirm("Hapus semua riwayat transaksi?")){T=[];save();render()}};
  if(u)u.onclick=function(){if(u.dataset.ready==="true")location.reload();else checkForUpdate()};
  if(security)security.onclick=function(){$("securityDlg").showModal()};
  $("securityCancel").onclick=function(){$("securityDlg").close()};
  $("pinSave").onclick=function(){var pin=$("pinInput").value;if(!/^\d{4,12}$/.test(pin)){alert("PIN harus 4 sampai 12 angka.");return}digest(pin).then(function(hash){storage.setItem("ledgerly_pin_hash",hash);$("pinInput").value="";$("securityDlg").close();alert("PIN berhasil disimpan.")})};
  $("pinRemove").onclick=function(){if(confirm("Hapus PIN aplikasi?")){storage.removeItem("ledgerly_pin_hash");$("securityDlg").close();alert("PIN dihapus.")}};
  if(window.ledgerlyDesktop)window.ledgerlyDesktop.onMenu(function(action){if(action==="backup"&&b)b.click();if(action==="import"&&r)r.click()});
}
function fetchRate(){LF=Date.now();
  fetchRateData(R).then(function(result){
    if(result&&result.rate>1000){R=result.rate;RT=result.timestamp;render()}
  }).catch(function(error){
    var note=$("note");
    if(note){note.hidden=false;note.textContent="Kurs USD/IDR gagal diperbarui. Menggunakan kurs terakhir. Periksa koneksi internet lalu coba lagi.";note.dataset.error=error.message||"rate error"}
    render();
  });
}
try{var rc=JSON.parse(storage.getItem(RK)||"null");if(rc&&rc.r>1000){R=rc.r;RT=rc.t}}catch(e){}
window.addEventListener("resize",function(){chart(vis());hmRender();daily(visK());dist(vis())});
$("assetHeatmap").onclick=function(e){var b=e.target.closest("[data-heat-symbol]");if(b){flt="Semua";query=b.getAttribute("data-heat-symbol");render()}};
$("hmTabs").onclick=function(e){var m=e.target.getAttribute("data-m");if(m){hm.mode=m;hmRender();hmFetch()}};
$("hmKeySave").onclick=function(){if(window.LedgerlyMarketstack)window.LedgerlyMarketstack.setKey($("hmKeyIn").value);hmFetch()};
hmRender();hmFetch();setInterval(hmFetch,300000);
setInterval(fetchRate,3600000);
document.addEventListener("visibilitychange",function(){if(!document.hidden&&Date.now()-LF>36e5)fetchRate()});
load();themeIcon();render();installExtraControls();setBoard(location.hash.slice(1));fetchRate();checkForUpdate();registerServiceWorker().catch(function(){});
try{if(storage.getItem("ledgerly_pin_hash")){var entered=prompt("Masukkan PIN Ledgerly:");digest(entered||"").then(function(hash){if(hash!==storage.getItem("ledgerly_pin_hash")){alert("PIN salah. Aplikasi dikunci.");document.body.innerHTML="<main style='padding:32px;font-family:system-ui'><h1>Akses ditolak</h1><p>Reload halaman lalu masukkan PIN yang benar.</p></main>"}})}}catch(e){alert("Verifikasi PIN gagal.")};
})();