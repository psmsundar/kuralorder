import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
function page(body,script=''){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#16483c"><title>Kural Orders</title><style>'+read('ui/style.css')+'</style></head><body>'+read(body)+script+'</body></html>'}
const assets={'/':['text/html; charset=utf-8',page('ui/customer.html','<script src="/app.js"></script>')],'/owner':['text/html; charset=utf-8',page('ui/owner.html')],'/app.js':['text/javascript; charset=utf-8',read('ui/format.js')+'\n'+read('ui/receipt.js')+'\n'+read('ui/app.js')],'/qr.svg':['image/svg+xml',read('ui/qr.svg')]};
fs.writeFileSync('worker/index.js','const assets='+JSON.stringify(assets)+';\n'+read('worker/handler.txt'));
