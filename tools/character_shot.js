const { chromium } = require('/workspace/wr_tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1280,height:720}}); p.setDefaultTimeout(300000); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()=='error')errs.push(m.text())});
await p.goto('http://localhost:8931/index.html?shot=1&closeup'); await p.waitForFunction('window.__ready===true');
const ax=process.argv[3]; if(ax) await p.evaluate(a=>window.MIXAX=JSON.parse(a),ax);
console.log(await p.evaluate(()=>{return JSON.stringify(window.__mix.map(k=>[k.h.toFixed(2),Object.keys(k.bones).length]));}));
await p.evaluate(w=>{setWeather(w,true);simulate(2.2);},process.argv[4]||'sunny'); await p.screenshot({path:process.argv[2]}); console.log(errs.join('\n')); await b.close();})();
