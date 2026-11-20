const $=id=>document.getElementById(id);
let confirmedName='',appendBatch=false,questionType='',pendingLists=null;
let mode='ta',prepared=false,phone='',recognition=null,clock=null;
function invalidate(){$('editSheet').hidden=true;hideReceipt();$('receiptStatus').textContent='';prepared=false;$('send').disabled=true;$('taBox').hidden=$('enBox').hidden=true;$('feedback').textContent='Prepare the list to review your changes.'}
function refresh(){const ready=prepared&&phone&&(mode==='en'||$('ta').value.trim())&&(mode==='ta'||$('en').value.trim());$('send').disabled=!ready}
function select(value){mode=value;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));if(prepared){$('taBox').hidden=mode==='en';$('enBox').hidden=mode==='ta'}refresh();renderReceipt()}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>select(b.dataset.mode));select(mode);
let voiceProvider="";
fetch('/settings').then(r=>{if(!r.ok)throw Error();return r.json()}).then(s=>{voiceProvider=s.voiceProvider||'';if(voiceProvider)$('micstatus').textContent='Voice provider: '+voiceProvider+'.';phone=s.phone;document.querySelector('.store').textContent=s.name;$('recipient').textContent=phone?'The store chat opens with your order text. Attach the PNG to send the receipt.':'The owner needs to add the store’s WhatsApp number.';refresh()}).catch(()=>$('recipient').textContent='Could not load the store number. Reload before sending.');
for(let n=0;n<43;n++){let bar=document.createElement('i');bar.style.height=(9+Math.abs(Math.sin(n*1.92)*Math.cos(n*.14))*53)+'px';bar.style.animationDelay=(n%7)*.07+'s';$('waves').append(bar)}
$('raw').oninput=invalidate;$('ta').oninput=$('en').oninput=()=>{refresh();renderReceipt()};
for(const lang of ['ta','en']){
  $(lang).onblur=()=>{ $(lang).value=numberedList($(lang).value); refresh() };
}
function showPrepared(lists, missing=false, uncertain=false){
  for(const lang of ['ta','en']) $(lang).value=numberedList(lists[lang]);
  prepared=true;
  $('editSheet').hidden=false;
  $('editSheet').open=missing||uncertain;
  select(mode);
  $('feedback').textContent=missing?'Review the items marked as missing a quantity.':'Review your completed order below.';
  $('feedback').scrollIntoView({block:'nearest'});
}
$('format').onclick=()=>{
  if(!$('manualEntry').hidden){$('itemForm').requestSubmit();return}
  reviewTranscript();
};
function chatLink(number,message){return 'https://wa.me/'+number+'?text='+encodeURIComponent(message)}
$('send').onclick=()=>{refresh();if($('send').disabled)return;const message=['வாடிக்கையாளர் பெயர்: '+confirmedName,mode!=='en'?'தமிழ்\n'+numberedList($('ta').value):'',mode!=='ta'?'English\n'+numberedList($('en').value):''].filter(Boolean).join('\n\n');location.href=chatLink(phone,message)};
$('record').onclick=()=>{
 if(recognition){recognition.stop();return}
 if(voiceProvider && window.MediaRecorder && navigator.mediaDevices?.getUserMedia){recordVoice();return}
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech){$('micstatus').textContent='Voice input is unavailable. Type your order below.';$('raw').focus();return}
 const r=new Speech();recognition=r;r.lang=$('speech').value;r.continuous=true;r.interimResults=false;
 let got=false,error=false;const reset=()=>{clearInterval(clock);recognition=null;$('record').lastElementChild.textContent='Start recording';$('waves').classList.remove('active');$('speech').disabled=false;$('format').disabled=false};
 r.onstart=()=>{let start=Date.now();$('timer').textContent='00:00';$('speech').disabled=true;$('format').disabled=true;$('record').lastElementChild.textContent='Stop recording';$('waves').classList.add('active');$('micstatus').textContent='Listening…';clock=setInterval(()=>{let t=Math.floor((Date.now()-start)/1000);$('timer').textContent=[Math.floor(t/60),t%60].map(x=>String(x).padStart(2,'0')).join(':')},500)};
 r.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal){if(!got){$('raw').value='';got=true}$('raw').value+=($('raw').value?' ':'')+e.results[i][0].transcript;invalidate()}};
 r.onerror=e=>{error=true;$('micstatus').textContent=e.error==='not-allowed'?'Allow microphone access or type below.':'Recording interrupted. Retry or type your response.'};
 r.onend=()=>{reset();if(got && !$('voiceEntry').hidden){lastTranscript=null;reviewTranscript();askMore();return}if(!error)$('micstatus').textContent=got?'List captured. Record again to replace it.':'No speech detected. Retry or type below.'};
 try{r.start()}catch{reset();$('micstatus').textContent='Microphone unavailable. Type below.'}
};

function switchEntry(manual){
  if(recognition)recognition.stop();
  $('manualEntry').hidden=!manual;
  $('format').textContent=manual?'Prepare item list':'Review items';
  $('voiceEntry').hidden=manual;
  $('manualTab').setAttribute('aria-pressed',String(manual));
  $('voiceTab').setAttribute('aria-pressed',String(!manual));
  invalidate();
}
let lastTranscript=null;
$('manualTab').onclick=()=>{
  if(recognition){recognition.stop();return}
  if($('raw').value.trim())reviewTranscript();
  else switchEntry(true);
};
$('voiceTab').onclick=()=>switchEntry(false);

function numberRows(){
  const rows=Array.from($('itemRows').children);
  rows.forEach((row,index)=>{
    row.querySelector('legend').textContent='Item '+(index+1);
    row.querySelector('.removeRow').hidden=rows.length===1;
  });
}
function addItem(focus){
  const row=$('itemTemplate').content.firstElementChild.cloneNode(true);
  $('itemRows').append(row);
  numberRows();
  if(focus){invalidate();row.querySelector('.product').focus()}
  return row;
}
$('addRow').onclick=()=>addItem(true);
$('itemRows').onclick=event=>{
  const button=event.target.closest('button');
  if(!button)return;
  const row=button.closest('fieldset');
  if(button.classList.contains('removeRow')){row.remove();numberRows()}
  else{
    const field=row.querySelector('.amount');
    const current=field.valueAsNumber||0;
    const next=current+Number(button.dataset.step);
    if(next>0)field.value=String(Number(next.toFixed(3)));
  }
  invalidate();
};
$('itemForm').oninput=event=>{event.target.setCustomValidity('');invalidate()};
$('itemForm').onchange=invalidate;
const unitNames={'':'',dozen:'டஜன்',kg:'கிலோ',g:'கிராம்',L:'லிட்டர்',ml:'மில்லி',packet:'பாக்கெட்',piece:'எண்ணிக்கை',box:'பெட்டி',bottle:'பாட்டில்',jar:'ஜார்'};
function transcriptRows(raw,language){
  const normalized=prepare(raw.replace(/[.!?]+(?=\s|$)/gu,','));
  const names=normalized[language].split('\n');
  return normalized.en.split('\n').filter(line=>itemText(line)).map((line,index)=>{
    // The formatter normalises recognised quantities into English numbers.
    const value=itemText(line);
    const units='kg|g|litre|ml|packet|piece|box(?:es)?|bottles?|jars?|dozen';
    const quantity='(\\d+(?:[./]\\d+)?)(?:\\s*('+units+'))?';
    const prefix=value.match(new RegExp('^'+quantity+'\\s+(.+)$','iu'));
    const suffix=value.match(new RegExp('^(.+?)\\s+'+quantity+'$','iu'));
    const product=prefix?prefix[3]:suffix?suffix[1]:value;
    const amount=prefix?prefix[1]:suffix?suffix[2]:'';
    const unit=(prefix?prefix[2]:suffix?suffix[3]:'')||'';
    const [top,bottom]=amount.split('/');
    const number=bottom?Number(top)/Number(bottom):Number(top);
    const label=items.find(row=>row[0]===product);
    return {name:language==='ta'?(label?label[1]:splitReceiptItem(names[index]||line)[0]||product):product,
      amount:number>0&&Number.isFinite(number)?String(number):'',
      unit:({litre:'L',boxes:'box',bottles:'bottle',jars:'jar'})[unit]||unit};
  });
}
function startBatch(){
  if(!appendBatch)$('itemRows').replaceChildren();
  appendBatch=false;
}
function reviewTranscript(){
  const raw=$('raw').value.trim();
  if(!raw){$('raw').focus();return}
  if(raw!==lastTranscript){
    const rows=transcriptRows(raw,$('speech').value==='en-IN'?'en':'ta');
    if(!rows.length){$('micstatus').textContent='Enter at least one item.';return}
    startBatch();
    for(const item of rows){
      const row=addItem(false);
      row.querySelector('.product').value=item.name;
      row.querySelector('.amount').value=item.amount;
      row.querySelector('.unit').value=item.unit;
    }
    lastTranscript=raw;
  }
  switchEntry(true);
  $('manualEntry').scrollIntoView({block:'start'});
}
function formLists(rows){
  const lists={ta:[],en:[]};
  for(const {name,amount,unit,ta,en} of rows){
    const match=items.find(entry=>new RegExp('^(?:'+variants(entry)+')$','iu').test(name));
    lists.ta.push((ta||(match?match[1]:name))+' | '+amount+(unit?' '+unitNames[unit]:''));
    lists.en.push((en||(match?match[0]:name))+' | '+amount+(unit?' '+unit:''));
  }
  return {ta:lists.ta.join('\n'),en:lists.en.join('\n')};
}
$('itemForm').onsubmit=event=>{
  event.preventDefault();
  const rows=[];
  for(const row of $('itemRows').children){
    const input=row.querySelector('.product');
    const name=input.value.trim();
    if(!name||name.includes('|')){input.setCustomValidity('Enter an item name without the | character.');input.reportValidity();return}
    rows.push({...(row.dataset.original===name?row.dataset:{}),name,amount:row.querySelector('.amount').value,unit:row.querySelector('.unit').value});
  }
  pendingLists=formLists(rows);openQuestion('name');
};
addItem(false);

async function recordVoice(reply=false){
 const button=reply?$('answerMic'):$('record'),status=reply?$('talkStatus'):$('micstatus');
 const label=value=>{if(reply)button.textContent=value;else button.lastElementChild.textContent=value};
 let stream,timeout;
 const lock=busy=>{
   if(reply)lockAnswer(busy);
   $('format').disabled=$('speech').disabled=$('voiceTab').disabled=$('manualTab').disabled=busy;
 };
 const reset=()=>{
   clearInterval(clock);clearTimeout(timeout);
   stream?.getTracks().forEach(t=>t.stop());
   recognition=null;button.disabled=false;lock(false);
   label(reply?'Reply by voice':'Start recording');$('waves').classList.remove('active');
 };
 try{
   lock(true);button.disabled=true;
   stream=await navigator.mediaDevices.getUserMedia({audio:{noiseSuppression:true}});
   const mimeType=['audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t));
   if(!mimeType)throw Error('Use keyboard dictation or type your response.');
   const recorder=new MediaRecorder(stream,{mimeType,audioBitsPerSecond:64000});
   const chunks=[];recognition={stop:()=>{if(recorder.state==='recording'){button.disabled=true;recorder.stop()}}};
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   let failed=false;
   recorder.onerror=()=>{failed=true;reset();status.textContent='Recording interrupted. Retry or type your response.'};
   recorder.onstop=async()=>{
     let answered=false;
     if(failed)return;
     clearTimeout(timeout);clearInterval(clock);stream.getTracks().forEach(t=>t.stop());
     button.disabled=true;status.textContent='Transcribing…';
     try{
       const recording=new Blob(chunks,{type:mimeType});
       const audio=voiceProvider!=='Groq'?await speechWav(recording):recording;
       const response=await fetch('/transcribe',{method:'POST',headers:{'Content-Type':audio.type,'X-Voice-Purpose':reply?'reply':'order','X-Speech-Language':reply?'ta':$('speech').value.slice(0,2)},body:audio});
       if([401,403].includes(response.status))throw Error('The store owner needs to check the voice connection. You can type instead.');
       if(!response.ok)throw Error(response.status===429?'Voice usage limit reached. Type your response or try again later.':'Transcription failed. Retry or type your response.');
       const result=await response.json();
       if(reply){if(!result.text)throw Error('No speech detected. Try again.');reset();answered=true;acceptAnswer(result.text);return}
       if(!result.text||(Array.isArray(result.items)&&!result.items.length))throw Error('No speech detected. Try again or type below.');
       $('raw').value=result.text;recognition=null;invalidate();
       if(Array.isArray(result.items)){
         startBatch();
         for(const item of result.items){
           const row=addItem(false), name=$('speech').value==='en-IN'?item.en:item.ta;
           row.querySelector('.product').value=name;
           Object.assign(row.dataset,{original:name,ta:item.ta,en:item.en});
           row.querySelector('.amount').value=item.amount??'';
           row.querySelector('.unit').value=item.unit;
         }
         lastTranscript=result.text.trim();switchEntry(true);$('manualEntry').scrollIntoView({block:'start'});
       }else {lastTranscript=null;reviewTranscript()}
       askMore();
       status.textContent='Items recorded.';
     }catch(error){status.textContent=error.message}
     finally{if(!answered)reset()}
   };
   recorder.start();button.disabled=false;label('Stop recording');$('waves').classList.add('active');
   status.textContent=voiceProvider==='Sarvam'?'Listening. Recording stops after 29 seconds.':'கேட்கிறேன். முடிந்ததும் Stop recordingங்கள். '+voiceProvider+'.';const start=Date.now();$('timer').textContent='00:00';
   clock=setInterval(()=>{const t=Math.floor((Date.now()-start)/1000);$('timer').textContent=[Math.floor(t/60),t%60].map(x=>String(x).padStart(2,'0')).join(':')},500);
   timeout=setTimeout(()=>recognition?.stop(),voiceProvider==='Sarvam'?29000:120000);
 }catch(error){reset();status.textContent=error.name==='NotAllowedError'?'Allow microphone access or type your response.':error.message}
}

// Normalise phone recorder formats to mono 16 kHz PCM for Gemini.
async function speechWav(blob){
 const context=new (window.AudioContext||window.webkitAudioContext)();
 let decoded;
 try{decoded=await context.decodeAudioData(await blob.arrayBuffer())}
 finally{await context.close()}
 const offline=new OfflineAudioContext(1,Math.max(1,Math.ceil(decoded.duration*16000)),16000);
 const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
 const samples=(await offline.startRendering()).getChannelData(0);
 const output=new ArrayBuffer(44+samples.length*2),view=new DataView(output);
 function label(at,str){for(let i=0;i<str.length;i++)view.setUint8(at+i,str.charCodeAt(i))}
 label(0,'RIFF');view.setUint32(4,output.byteLength-8,true);label(8,'WAVE');label(12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);label(36,'data');view.setUint32(40,samples.length*2,true);
 samples.forEach((s,i)=>view.setInt16(44+i*2,Math.round(Math.min(1,Math.max(-1,s))*32767),true));
 return new Blob([output],{type:'audio/wav'});
}

function speakTamil(message){
  if(!window.speechSynthesis)return;
  speechSynthesis.cancel();
  const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('ta'));
  const prompt=new SpeechSynthesisUtterance(message);
  prompt.lang='ta-IN';if(voice)prompt.voice=voice;
  speechSynthesis.speak(prompt);
}
function openQuestion(kind){
  questionType=kind;
  const name=kind==='name';
  const spokenQuestion=name?'இந்தப் பட்டியலை யார் அனுப்புகிறார்கள்? உங்கள் பெயரைச் சொல்லுங்கள்.':'இன்னும் பொருட்கள் சேர்க்க வேண்டுமா?';
  $('question').textContent=name?'What is your name?':'Would you like to add more items?';
  $('talkStatus').textContent=name?'Tap Reply by voice and say your name, or type it below.':'Answer yes or no in Tamil, or choose a button below.';
  $('yesMore').hidden=$('noMore').hidden=name;
  $('nameLabel').hidden=$('confirmName').hidden=!name;
  if(name)$('customerName').value=confirmedName;
  if(!$('talk').open)$('talk').showModal();
  speakTamil(spokenQuestion);
}
function askMore(){openQuestion('more')}
function closeQuestion(){
  window.speechSynthesis?.cancel();$('talk').close();questionType='';
}
function moreItems(){
  closeQuestion();appendBatch=true;lastTranscript=null;
  $('raw').value='';switchEntry(false);
  $('micstatus').textContent='Say the additional items and quantities.';
  $('record').click();
}
function finishItems(){
  closeQuestion();
  $('itemForm').requestSubmit();
}
function lockAnswer(busy){
  for(const id of ['yesMore','noMore','confirmName','customerName'])$(id).disabled=busy;
}
function acceptAnswer(text){
  const answer=text.trim().replace(/[.!?।]+$/u,'').trim();
  if(questionType==='name'){
    $('customerName').value=answer.replace(/^(?:என்(?:னுடைய)? பெயர்|என் பேரு|என் பெயரு|என்னோட பெயர்|my name is)\s+/iu,'').slice(0,80);
    $('talkStatus').textContent='Check the spelling and confirm your name.';
  }else if(/இல்லை|இல்ல\b|வேண்டாம்|முடி|போதும்|^no$/iu.test(answer)||answer==='இல்ல')finishItems();
  else if(/ஆம்|ஆமா|ஆமாம்|வேண்டும்|சேர்|^yes$/iu.test(answer))moreItems();
  else $('talkStatus').textContent='Please answer yes or no in Tamil.';
}
$('yesMore').onclick=moreItems;$('noMore').onclick=finishItems;
$('confirmName').onclick=()=>{
  const name=$('customerName').value.trim();
  if(!name){$('talkStatus').textContent='Say or type your name.';$('customerName').focus();return}
  confirmedName=name;closeQuestion();showPrepared(pendingLists);
  speakTamil('நன்றி மீண்டும் வருக, இந்த நாள்,  இனிய நாளாக அமைய வாழ்த்துக்கள்...');
};
$('talk').oncancel=e=>{if(recognition||$('confirmName').disabled)e.preventDefault();else window.speechSynthesis?.cancel()};
$('answerMic').onclick=()=>{
  window.speechSynthesis?.cancel();
  if(recognition){recognition.stop();return}
  if(voiceProvider&&window.MediaRecorder&&navigator.mediaDevices?.getUserMedia){recordVoice(true);return}
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){$('talkStatus').textContent='Voice input is unavailable. Use the controls below.';return}
  const r=new Speech();r.lang='ta-IN';recognition=r;lockAnswer(true);
  $('answerMic').textContent='Stop recording';let result='';
  r.onresult=e=>{result=e.results[0][0].transcript};
  r.onerror=()=>{$('talkStatus').textContent='No speech detected. Use the controls below.'};
  r.onend=()=>{recognition=null;lockAnswer(false);$('answerMic').textContent='Reply by voice';if(result)acceptAnswer(result)};
  try{r.start()}catch{r.onend()}
};
