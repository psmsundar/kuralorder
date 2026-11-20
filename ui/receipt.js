function itemText(line) {
  return line.trim().replace(/^(?:\d+\.\s+|[•*-]\s*)/, '').trim();
}

function numberedList(text) {
  return text.split('\n').map(itemText).filter(Boolean)
    .map((item, index) => (index + 1) + '. ' + item).join('\n');
}

function splitReceiptItem(line) {
  const value = itemText(line);
  if (value.includes('|')) {
    const divider = value.indexOf('|');
    return [value.slice(0, divider).trim(), value.slice(divider + 1).trim()];
  }
  const numbers = words.filter(w => /^\d/.test(w[0])).map(w => w[1]).join('|');
  const units = words.filter(w => !/^\d/.test(w[0])).flatMap(w => w.slice(0, 2)).join('|');
  const amount = '(?:\\d+(?:[./]\\d+)?|'+numbers+')(?:\\s*(?:'+units+'))?';
  const prefix = value.match(new RegExp('^('+amount+')\\s+(.+)$','iu'));
  if (prefix) return [prefix[2],prefix[1]];
  const suffix = value.match(new RegExp('^(.+?)\\s+('+amount+')$','iu'));
  return suffix ? [suffix[1],suffix[2]] : [value,''];
}

let receiptFile=null, receiptUrl='', revision=0;
function hideReceipt(){
  revision++;
  receiptFile=null;
  if(receiptUrl) URL.revokeObjectURL(receiptUrl);
  receiptUrl='';
  $('receipt').hidden=true;
  $('preview').removeAttribute('src');
  $('download').removeAttribute('href');
}
function renderReceipt(){
  hideReceipt();
  if(!prepared)return;
  const version=revision;
  const sections=(mode==='both'?['ta','en']:[mode]).map(lang=>({
    lang, rows:$(lang).value.split('\n').filter(s=>s.trim()).map(splitReceiptItem)
  }));
  if(sections.some(s=>!s.rows.length||s.rows.some(([p])=>!p))){
    $('receiptStatus').textContent='Enter a product and quantity on every line to generate the PNG.';
    return;
  }
  const canvas=document.createElement('canvas');
  const width=960, edges=[54,212,640,906];
  const ctx=canvas.getContext('2d');
  if(!ctx){$('receiptStatus').textContent='Image generation is unavailable in this browser.';return}
  const font='500 39px system-ui, sans-serif';
  ctx.font=font;
  function wrap(value,limit){
    const lines=[];let current='';
    for(const word of value.split(/\s+/)){
      const next=current?current+' '+word:word;
      if(current&&ctx.measureText(next).width>limit){lines.push(current);current=word}
      else current=next;
    }
    if(current)lines.push(current);
    return lines;
  }
  const groups=sections.map(({lang,rows})=>({lang,rows:rows.map(([p,q])=>{
    const product=wrap(p,edges[2]-edges[1]-30);
    const quantity=wrap(q || (lang==='ta'?'அளவு தேவை':'Quantity needed'),edges[3]-edges[2]-24);
    return {product,quantity,height:32+60*Math.max(product.length,quantity.length)};
  })}));
  const height=265+groups.reduce((sum,g)=>sum+260+g.rows.reduce((n,r)=>n+r.height,0),0)+24;
  if(height>16000){$('receiptStatus').textContent='This order is too long for one PNG. Split it into shorter orders.';return}
  canvas.width=width;canvas.height=height;
  ctx.fillStyle='#faf9f5';ctx.fillRect(0,0,width,height);
  ctx.strokeStyle='#383832';ctx.lineWidth=5;ctx.strokeRect(22,22,width-44,height-44);
  ctx.strokeStyle='#181815';ctx.lineWidth=4;ctx.lineJoin='round';ctx.lineCap='round';
  function stroke(points){
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
  }
  const cx=width/2;
  stroke([[cx-44,94],[cx-34,133],[cx+34,133],[cx+44,94]]);
  ctx.strokeRect(cx-48,83,96,11);
  stroke([[cx-29,86],[cx-12,55]]);stroke([[cx+29,86],[cx+12,55]]);
  for(const dx of [-21,-7,7,21])stroke([[cx+dx,102],[cx+dx,123]]);
  ctx.fillStyle='#151513';ctx.textBaseline='middle';ctx.textAlign='center';
  ctx.font='bold 29px system-ui';ctx.fillText('ARB TRADERS',cx,170);
  ctx.font='30px system-ui';
  ctx.fillText((mode==='en'?'Customer: ':'வாடிக்கையாளர் பெயர்: ')+confirmedName,cx,221,width-120);
  let y=265;
  for(const {lang,rows} of groups){
    const tamil=lang==='ta';
    ctx.font='bold 54px system-ui';ctx.textAlign='center';
    ctx.fillText(tamil?'மளிகைப் பொருட்கள் பட்டியல்':'Grocery Items List',cx,y+28,width-116);
    y+=92;
    const top=y;
    ctx.fillStyle='#edece7';ctx.fillRect(edges[0],y,edges[3]-edges[0],84);
    ctx.fillStyle='#151513';ctx.font='bold 38px system-ui';ctx.lineWidth=2;
    const labels=tamil?['வ.எண்','பொருள்','அளவு']:['Sl. No.','Product','Quantity'];
    labels.forEach((s,i)=>ctx.fillText(s,(edges[i]+edges[i+1])/2,y+42,edges[i+1]-edges[i]-14));
    y+=84;
    ctx.font=font;
    for(const [index,row] of rows.entries()){
      stroke([[edges[0],y],[edges[3],y]]);
      const middle=y+row.height/2;
      ctx.textAlign='center';ctx.fillText(String(index+1),(edges[0]+edges[1])/2,middle);
      for(const [column,lines] of [[1,row.product],[2,row.quantity]]){
        ctx.textAlign=column===1?'left':'center';
        const x=column===1?edges[1]+15:(edges[2]+edges[3])/2;
        lines.forEach((line,i)=>ctx.fillText(line,x,middle+(i-(lines.length-1)/2)*60,edges[column+1]-edges[column]-24));
      }
      y+=row.height;
    }
    ctx.strokeRect(edges[0],top,edges[3]-edges[0],y-top);
    for(const x of edges.slice(1,-1))stroke([[x,top],[x,y]]);
    ctx.textAlign='center';ctx.font='bold 37px system-ui';
    ctx.fillText((tamil?'மொத்தப் பொருட்கள்: ':'Total items: ')+rows.length,cx,y+47);
    y+=84;
  }
  $('receiptStatus').textContent='Generating receipt…';
  canvas.toBlob(blob=>{
    if(version!==revision)return;
    if(!blob){$('receiptStatus').textContent='Could not create the PNG. Try a shorter order.';return}
    receiptFile=new File([blob],'ARB-TRADERS-order.png',{type:'image/png'});
    receiptUrl=URL.createObjectURL(blob);
    $('preview').src=receiptUrl;$('download').href=receiptUrl;
    $('receipt').hidden=false;
    $('shareImage').hidden=!navigator.canShare?.({files:[receiptFile]});
    $('receiptStatus').textContent=$('shareImage').hidden?'Download the PNG, open the store chat and attach the image.':'Choose WhatsApp and the store chat when sharing the PNG.';
  },'image/png');
}
document.getElementById('shareImage').onclick=async()=>{
  if(!receiptFile)return;
  try{await navigator.share({files:[receiptFile]})}
  catch(e){if(e.name!=='AbortError')$('receiptStatus').textContent='Sharing was unavailable. Download the PNG and attach it in WhatsApp.'}
};
