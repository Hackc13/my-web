const dbRaw = Array.isArray(window.LIFEINVADER_DATABASE) ? window.LIFEINVADER_DATABASE : [];

const frequentAds = [
  {keys:["progen"], text:'Buying Progen containers. Budget: Negotiable.', source:'Policy example'},
  {keys:["progen"], text:'Selling "Progen 675 LT" with full configuration, visual upgrades, insurance and drift kit. Price: Negotiable.', source:'Policy example'}
];

const cards = document.querySelector('#cards');
const dbInput = document.querySelector('#db');
const quickSearch = document.querySelector('#search');
const categoryButtons = [...document.querySelectorAll('#dbCats button')];
let selectedCategory = 'All';

function groupFor(item){
  if(item.type === 'vehicle') return 'Vehicles';
  if(item.type === 'clothing') return 'Clothing';
  if(item.type === 'sound' || item.type === 'animated') return 'Sounds & Animations';
  if(item.type === 'item') return 'Items';
  if(item.type === 'pet') return 'Pets';
  if(item.type === 'business') return 'Businesses';
  if(item.type === 'place') return 'Places';
  return 'Other';
}

function iconFor(item){
  const sub=(item.subcategory||'').toLowerCase();
  if(item.type==='vehicle'){
    if(sub==='boats') return '🛥️';
    if(sub==='planes') return '✈️';
    if(sub==='helicopters') return '🚁';
    if(sub==='motorcycles') return '🏍️';
    return '🚗';
  }
  if(item.type==='clothing') return '♟';
  if(item.type==='sound') return '🔊';
  if(item.type==='animated') return '✨';
  if(item.type==='item') return '◈';
  return '•';
}

function searchable(item){
  return [item.name,item.type,item.subcategory,item.sellable?'sellable':'not sellable'].join(' ').toLowerCase();
}

function render(q=''){
  const term=String(q||'').trim().toLowerCase();
  const filtered=dbRaw.filter(item=>{
    const catOk=selectedCategory==='All' || groupFor(item)===selectedCategory;
    const qOk=!term || searchable(item).includes(term);
    return catOk && qOk;
  });
  cards.innerHTML = filtered.map((x,i)=>{
    const status=x.sellable===false ? '<p class="not-sellable">● NOT SELLABLE</p>' : '<p class="sellable">● SELLABLE</p>';
    return `<div class="card">
      <div class="icon">${iconFor(x)}</div>
      <div class="body">
        <span class="tag">${(x.subcategory||groupFor(x)).toUpperCase()}</span>
        <h4 title="${escapeHtml(x.name)}">${escapeHtml(x.name)}</h4>
        <p>Category: ${escapeHtml(x.subcategory||groupFor(x))}</p>
        ${status}
        <div class="actions">
          <button onclick="cp(${JSON.stringify(x.name)})">⧉ Copy</button>
          <button class="ins" onclick="ins(${JSON.stringify(x.name)})">⊞ Insert</button>
        </div>
      </div>
    </div>`;
  }).join('') || `<div class="empty-db">No entries found in <b>${escapeHtml(selectedCategory)}</b>.</div>`;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showFrequent(q){
  const box=document.querySelector('#frequentBox');
  const list=document.querySelector('#frequentList');
  const x=String(q||'').trim().toLowerCase();
  const matches=x ? frequentAds.filter(a=>a.keys.some(k=>x.includes(k)||k.includes(x))) : [];
  list.innerHTML=matches.map((a,i)=>`<div class="frequent-item"><span>${escapeHtml(a.text)}<small>${escapeHtml(a.source)}</small></span><button onclick="useFrequent(${i})">Use</button></div>`).join('');
  box.hidden=!matches.length;
  window._freqMatches=matches;
}

window.useFrequent=function(i){
  const a=window._freqMatches?.[i];
  if(!a)return;
  document.querySelector('#raw').value=a.text;
  run();
  toast('Frequent policy example inserted');
};

function run(){
  const raw=document.querySelector('#raw').value;
  const r=window.LifeInvaderPolicy.check(raw);
  const st=document.querySelector('#policyStatus');
  const bn=document.querySelector('#policyBanner');
  const list=document.querySelector('#ruleList');
  const out=document.querySelector('#out');
  out.textContent=r.output || '—';

  st.textContent = r.severity==='PASS' ? 'ALL CLEAN! ✦' :
                   r.severity==='BLACKLIST' ? 'PHONE BLACKLIST' :
                   r.severity==='REJECT' ? 'REJECT' : 'REVIEW REQUIRED';
  st.className=r.severity.toLowerCase();

  bn.className='passed '+r.severity.toLowerCase();
  bn.textContent=r.severity==='PASS' ? '● Policy Check Passed' :
                 r.severity==='BLACKLIST' ? '● Phone Blacklist Required' :
                 r.severity==='REJECT' ? '● Advertisement Rejected' :
                 '● Policy Review Required';

  const rows=[];
  r.issues.forEach(i=>rows.push(`<p class="rule-${i.type.toLowerCase()}">● ${escapeHtml(i.text)}</p>`));
  r.corrections.forEach(i=>rows.push(`<p class="rule-correction">✓ ${escapeHtml(i)}</p>`));
  r.manual.forEach(i=>rows.push(`<p class="rule-warning">ℹ ${escapeHtml(i)}</p>`));
  list.innerHTML=rows.join('') || '<p class="rule-pass">✓ No policy issues detected.</p>';
  showFrequent(raw);
}

dbInput.oninput=e=>{render(e.target.value);showFrequent(e.target.value)};
quickSearch.oninput=e=>{render(e.target.value);showFrequent(e.target.value)};

categoryButtons.forEach(btn=>{
  btn.addEventListener('click',()=>{
    categoryButtons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    selectedCategory=btn.dataset.cat;
    render(dbInput.value||quickSearch.value||'');
  });
});

document.querySelector('#raw').oninput=run;
document.querySelector('#spark').onclick=()=>{document.querySelector('#raw').value='Buying Progen containers';run()};
document.querySelector('#buy').onclick=()=>{document.querySelector('#raw').value='Buying "Adder". Budget: Negotiable.';run()};
document.querySelector('#copy').onclick=()=>cp(document.querySelector('#out').textContent);
document.querySelector('#submit').onclick=()=>toast('Policy result saved locally');

function cp(t){navigator.clipboard?.writeText(t);toast('Copied to clipboard')}
function ins(t){document.querySelector('#raw').value=`Buying "${t}". Budget: Negotiable.`;run();toast(t+' inserted')}
function toast(t){let e=document.createElement('div');e.className='toast';e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),1800)}
document.querySelector('.notice i').onclick=e=>e.target.parentElement.remove();

run();
render();
