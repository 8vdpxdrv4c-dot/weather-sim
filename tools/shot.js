const { chromium } = require('/workspace/wr_tools/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:1280,height:720}}); p.setDefaultTimeout(300000);
 const errs=[]; p.on('console',m=>{if(['error','warning'].includes(m.type()))errs.push(m.type()+': '+m.text())}); p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 const base=process.env.URL||'http://localhost:8941/';
 await p.goto(base+'?shot=1');
 await p.waitForFunction('window.__ready===true',null,{timeout:240000});
 const list=(process.argv[2]||'sunny,overcast,rain,snow,fog,wind').split(',');
 for(const w of list){ await p.evaluate(w=>window.setWeather(w,true),w); await p.evaluate(()=>window.simulate(2.0));
   await p.screenshot({path:`/workspace/weather-v2/screenshots/${w}.png`}); console.log('shot',w);}
 if(process.env.SEQ){ await p.evaluate(()=>window.setWeather(process?0:0,true)).catch(()=>{});
   for(const w of process.env.SEQ.split(',')){ await p.evaluate(w=>window.setWeather(w,true),w); await p.evaluate(()=>window.simulate(1));
   for(let i=0;i<6;i++){ await p.evaluate(()=>window.simulate(1/30,1/30)); await p.screenshot({path:`/tmp/seq_${w}_${i}.png`}); } } }
 if(process.env.KIDS){ await p.evaluate(()=>{window.setWeather('sunny',true);kidAct(0,'sit');kidAct(1,'walk');kidAct(2,'look');kidAct(3,'walk');kidAct(4,'sit');window.simulate(3);}); await p.screenshot({path:'/workspace/weather-v2/screenshots/kids.png'}); console.log('kids'); }
 console.log('ERRS:\n'+errs.join('\n')); await b.close();
})();
