const { chromium } = require('/workspace/wr_tools/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:1280,height:720}}); p.setDefaultTimeout(300000);
 const errs=[]; p.on('console',m=>{if(['error','warning'].includes(m.type()))errs.push(m.type()+': '+m.text())}); p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 await p.goto('http://localhost:8931/index.html?shot=1'+(process.argv[3]||'')+'');
 await p.waitForFunction('window.__ready===true',null,{timeout:240000});
 const list=(process.argv[2]||'sunny,overcast,rain,snow,fog,wind').split(',');
 for(const w of list){ await p.evaluate(w=>window.setWeather(w,true),w); const t0=Date.now();
   await p.evaluate(w=>window.simulate(w==='rain'?2.0:3.0),w); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>r())));
   await p.screenshot({path:`/workspace/weather-real/screenshots/${w}.png`,timeout:300000}); console.log('shot',w,Date.now()-t0,'ms');}
 if(process.env.AUD)console.log(JSON.stringify(await p.evaluate(()=>window.__audioTest()))); console.log(errs.slice(0,20).join('\n')); await b.close();
})();
