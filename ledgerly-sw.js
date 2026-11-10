var CACHE_NAME="ledgerly-v36";
var APP_SHELL=[
  "./",
  "./Ledgerly-live.html",
  "./ledgerly-live.css",
  "./ledgerly.webmanifest",
  "./ledgerly-live.js",
  "./marketstack-api.js",
  "./version.json",
  "./Ledgerly Golden Orbit Logo.png",
  "./ledgerly-app-icon-v2-192.png",
  "./ledgerly-app-icon-v2-512.png"
];

self.addEventListener("install",function(event){
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache){return cache.addAll(APP_SHELL)}));
  self.skipWaiting();
});

self.addEventListener("activate",function(event){
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(key){return key!==CACHE_NAME}).map(function(key){return caches.delete(key)}));
  }));
  self.clients.claim();
});

self.addEventListener("fetch",function(event){
  if(event.request.method!=="GET")return;
  if(new URL(event.request.url).pathname.endsWith("/version.json")){
    event.respondWith(fetch(event.request,{cache:"no-store"}));
    return;
  }
  event.respondWith(caches.match(event.request).then(function(cached){
    return cached||fetch(event.request).then(function(response){
      if(!response||response.status!==200||response.type==="opaque")return response;
      var copy=response.clone();
      caches.open(CACHE_NAME).then(function(cache){cache.put(event.request,copy)});
      return response;
    }).catch(function(){return caches.match("./Ledgerly-live.html")});
  }));
});
