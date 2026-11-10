(function(){
  var API_KEY="";
  var STORAGE_KEY="ledgerly_marketstack_key";
  var ENDPOINT="https://api.marketstack.com/v2/eod";

  function getKey(){
    if(window.ledgerlyDesktop)return window.ledgerlyDesktop.apiKeyGet();
    try{return localStorage.getItem(STORAGE_KEY)||API_KEY||""}catch(e){return API_KEY||""}
  }

  function setKey(value){
    if(window.ledgerlyDesktop){window.ledgerlyDesktop.apiKeySet(value);return}
    try{localStorage.setItem(STORAGE_KEY,String(value||"").trim())}catch(e){}
  }

  function fetchQuotes(symbols){
    if(window.ledgerlyDesktop)return window.ledgerlyDesktop.marketstack(symbols);
    var key=getKey();
    if(!key)return Promise.reject(new Error("API key Marketstack belum diisi"));
    var url=ENDPOINT+"?access_key="+encodeURIComponent(key)+"&symbols="+encodeURIComponent(symbols.join(","))+"&limit="+symbols.length;
    return fetch(url,{cache:"no-store"}).then(function(response){
      return response.json().then(function(body){
        if(!response.ok||body.error)throw new Error(body.error&&body.error.message||"Marketstack HTTP "+response.status);
        var rows=Array.isArray(body.data)?body.data:[];
        var latest={};
        rows.forEach(function(row){
          var symbol=String(row.symbol||"").toUpperCase();
          var open=Number(row.open),close=Number(row.close);
          if(symbol&&isFinite(open)&&open!==0&&isFinite(close)&&!latest[symbol]){
            latest[symbol]={symbol:symbol,changePct:(close-open)/open*100};
          }
        });
        return latest;
      });
    });
  }

  window.LedgerlyMarketstack={getKey:getKey,setKey:setKey,fetchQuotes:fetchQuotes};
})();
