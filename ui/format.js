const items=[
 ['tomato','தக்காளி','tomatoes|thakkali'],['milk','பால்','paal'],['rice','அரிசி','arisi'],['onion','வெங்காயம்','onions|vengayam'],['potato','உருளைக்கிழங்கு','potatoes|urulaikizhangu'],['egg','முட்டை','eggs|muttai'],['sugar','சர்க்கரை','sakkarai'],['salt','உப்பு','uppu'],['oil','எண்ணெய்','ennai'],['carrot','கேரட்','carrots'],['banana','வாழைப்பழம்','bananas'],['bread','பிரெட்','ரொட்டி'],['curd','தயிர்','thayir'],['dal','பருப்பு','paruppu'],['tea','தேயிலை','tea powder'],['coffee','காபி','kaapi']
];
const words=[
 ['0.5','அரை','half|arai'],['0.25','கால்','quarter|kaal'],['1','ஒரு','one|oru|ஒன்று'],['2','இரண்டு','two|rendu|ரெண்டு'],['3','மூன்று','three|moonu'],['4','நான்கு','four|naalu'],['5','ஐந்து','five|anju'],['6','ஆறு','six'],['7','ஏழு','seven'],['8','எட்டு','eight'],['9','ஒன்பது','nine'],['10','பத்து','ten'],
 ['kg','கிலோ','kilograms?|kilos?'],['g','கிராம்','grams?'],['litre','லிட்டர்','litres?|liters?|liter'],['ml','மில்லி','மி.லி'],['packet','பாக்கெட்','packets?|பேக்கெட்|பாக்கெட்டுகள்'],['piece','எண்ணிக்கை','pieces?'],['dozen','டஜன்','dozens?']
];
function token(pattern){return new RegExp('(?<![\\p{L}\\p{M}])(?:'+pattern+')(?![\\p{L}\\p{M}])','giu')}
function variants(row){return (/^\d/.test(row[0])?[row[1],row[2]]:row).join('|')}
function prepare(raw){
 let source=raw.trim().replace(/(\d)(?=kg|ml|கிலோ|கிராம்)/giu,'$1 ');
 // Separate a new quantity after a recognised item in continuous dictation.
 for(const row of items)source=source.replace(token(variants(row)),(match,offset,all)=>{
 const next=all.slice(offset+match.length);
 const startsQuantity=/^\s+(?:\d|one\b|two\b|three\b|half\b|ஒரு|இரண்டு|ரெண்டு|மூன்று)/iu.test(next);
 const prefix=all.slice(0,offset).split(/[,;\n]/).pop();
 return match+(startsQuantity&&(/\d/.test(prefix)||words.slice(0,12).some(w=>token(variants(w)).test(prefix)))?', ':'');
 });
 const lines=source.split(/[,;\n]+|\s+(?:and|மற்றும்)\s+/iu).map(v=>v.trim()).filter(Boolean);
 let uncertain=false,missing=false;
 const result={en:[],ta:[]};
 for(const line of lines){
 let rest=line, parts=[];
 const matchers=[...items,...words].map(row=>({row,rx:token(variants(row))}));
 while(rest){
 let best=null;
 for(const m of matchers){m.rx.lastIndex=0;const hit=m.rx.exec(rest);if(hit&&(!best||hit.index<best.hit.index||hit.index===best.hit.index&&hit[0].length>best.hit[0].length))best={hit,row:m.row}}
 if(!best){parts.push(rest);break}
 parts.push(rest.slice(0,best.hit.index),best.row);rest=rest.slice(best.hit.index+best.hit[0].length)
 }
 const loose=parts.filter(p=>typeof p==='string').join(' ').replace(/\bof\b/gi,'');
 if(/[\p{L}\p{M}]/u.test(loose))uncertain=true;
 if(!/\d/.test(line)&&!parts.some(p=>Array.isArray(p)&&/^\d/.test(p[0])))missing=true;
 for(const [lang,index] of [['en',0],['ta',1]]){
 const translated=parts.map(p=>Array.isArray(p)?p[index]:p.replace(/\bof\b/gi,'')).join('').replace(/\s+/g,' ').trim();result[lang].push('• '+translated);
 }
 }
 return {en:result.en.join('\n'),ta:result.ta.join('\n'),uncertain,missing};
}
