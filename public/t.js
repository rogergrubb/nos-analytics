// NOS Analytics Tracker v2.0 — NumberOneSon Software
// Drop-in: <script src="https://analytics.numberoneson.us/t.js" data-site="mysite"></script>
// Features: pageview, click, error, conversion, scroll, duration, SPA, consent, DNT
;(function(){
  'use strict';
  var d=document,w=window,n=navigator,s=screen;
  var el=d.currentScript||d.querySelector('script[data-site]');
  if(!el)return;
  var site=el.getAttribute('data-site')||'unknown';
  var endpoint=el.getAttribute('data-endpoint')||el.src.replace(/\/t\.js.*/,'/api/collect');

  // Respect Do Not Track
  if(n.doNotTrack==='1'||w.doNotTrack==='1'){
    // Expose noop API so sites don't break
    w.nosAnalytics={track:function(){},identify:function(){}};
    return;
  }

  // Check consent (if consent manager is present)
  // Sites can set window.__nos_consent = false to disable tracking
  if(w.__nos_consent===false){
    w.nosAnalytics={track:function(){},identify:function(){}};
    return;
  }

  // Fingerprint-lite: hash of screen+tz+lang (no cookies)
  function hash(str){for(var h=0,i=0;i<str.length;i++)h=((h<<5)-h)+str.charCodeAt(i),h|=0;return Math.abs(h).toString(36)}
  var fp=hash([s.width,s.height,s.colorDepth,Intl.DateTimeFormat().resolvedOptions().timeZone,n.language,n.languages?n.languages.join():'',(new Date).getTimezoneOffset()].join('|'));

  // UTM params
  function utms(){var p=new URLSearchParams(w.location.search),u={};['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(function(k){var v=p.get(k);if(v)u[k]=v});return u}

  // Device info
  var ua=n.userAgent;
  function detect(){
    var mobile=/Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    var tablet=/iPad|Android(?!.*Mobi)/i.test(ua);
    var os=/(Windows|Mac OS|Linux|Android|iOS|iPhone OS)[^\);]*/i.exec(ua);
    var br=/(Chrome|Firefox|Safari|Edge|Opera|SamsungBrowser)[\/\s]([\d.]+)/i.exec(ua);
    return{
      deviceType:tablet?'tablet':mobile?'mobile':'desktop',
      os:os?os[0].trim():'Unknown',
      browser:br?br[1]:'Unknown',
      browserVersion:br?br[2]:'',
      screen:s.width+'x'+s.height
    }
  }

  // Scroll depth tracking
  var maxScroll=0;
  function trackScroll(){
    var h=d.documentElement.scrollHeight-w.innerHeight;
    if(h>0){var pct=Math.round(w.scrollY/h*100);if(pct>maxScroll)maxScroll=pct}
  }
  var scrollTimer;
  w.addEventListener('scroll',function(){clearTimeout(scrollTimer);scrollTimer=setTimeout(trackScroll,150)},{passive:true});

  // Send event
  function send(type,data){
    var payload=Object.assign({
      site:site,
      type:type,
      url:w.location.href,
      path:w.location.pathname,
      referrer:d.referrer||'',
      fp:fp,
      ts:Date.now()
    },detect(),utms(),data||{});
    var body=JSON.stringify(payload);
    if(n.sendBeacon){n.sendBeacon(endpoint,body)}
    else{try{var x=new XMLHttpRequest();x.open('POST',endpoint,true);x.setRequestHeader('Content-Type','application/json');x.send(body)}catch(e){}}
  }

  // Page view
  var startTime=Date.now();
  send('pageview');

  // Track SPA navigation
  var lastPath=w.location.pathname;
  function checkNav(){
    if(w.location.pathname!==lastPath){
      send('leave',{duration:Math.round((Date.now()-startTime)/1000),scrollDepth:maxScroll});
      lastPath=w.location.pathname;startTime=Date.now();maxScroll=0;
      send('pageview');
    }
  }
  var origPush=history.pushState;
  history.pushState=function(){origPush.apply(this,arguments);checkNav()};
  w.addEventListener('popstate',checkNav);

  // CTA click tracking
  d.addEventListener('click',function(e){
    var t=e.target.closest('[data-track],[data-nos-track],a[href^="http"]');
    if(!t)return;
    var label=t.getAttribute('data-track')||t.getAttribute('data-nos-track')||t.textContent.trim().slice(0,50);
    var href=t.getAttribute('href')||'';
    send('click',{label:label,href:href,tag:t.tagName});
  },true);

  // --- ERROR TRACKING (Fix #5) ---
  w.addEventListener('error',function(e){
    send('error',{
      errorMessage:e.message||'Unknown error',
      errorSource:e.filename||'',
      errorLine:e.lineno||0,
      errorCol:e.colno||0
    });
  });
  w.addEventListener('unhandledrejection',function(e){
    var msg='';
    if(e.reason){msg=e.reason.message||e.reason.toString()||'Unhandled promise rejection'}
    send('error',{errorMessage:msg,errorSource:'promise'});
  });

  // --- PUBLIC API (Fix #1: Conversion tracking) ---
  w.nosAnalytics={
    // Track custom events — especially 'signup' and 'paid' for funnel
    // Usage: nosAnalytics.track('signup', { plan: 'pro' })
    //        nosAnalytics.track('paid', { amount: 29, plan: 'pro' })
    track:function(event,data){
      send('event',Object.assign({event:event},data||{}));
    },
    // Associate with a user
    identify:function(userId){
      fp=hash(userId+site);
      send('identify',{userId:userId});
    }
  };

  // Send leave event with session data
  function leave(){send('leave',{duration:Math.round((Date.now()-startTime)/1000),scrollDepth:maxScroll})}
  d.addEventListener('visibilitychange',function(){if(d.visibilityState==='hidden')leave()});
  w.addEventListener('pagehide',leave);
})();
