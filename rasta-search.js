/* Rasta Search — shared Persian/Arabic-aware search and ranking for all app sections. */
(function(root){
'use strict';
const VERSION='1.0.0';
const ARABIC_DIGITS='٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS='۰۱۲۳۴۵۶۷۸۹';
function normalize(value){
 return String(value==null?'':value).normalize('NFKC').toLocaleLowerCase('fa')
  .replace(/[\u064B-\u065F\u0670\u0640]/g,'')
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک')
  .replace(/[٠-٩]/g,d=>String(ARABIC_DIGITS.indexOf(d)))
  .replace(/[۰-۹]/g,d=>String(PERSIAN_DIGITS.indexOf(d)))
  .replace(/[أإآ]/g,'ا').replace(/ة/g,'ه')
  .replace(/[\u200c\u200f\u200e]/g,' ')
  .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
function editDistance(a,b){
 if(Math.abs(a.length-b.length)>2)return 3;
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const row=[i];let min=i;
  for(let j=1;j<=b.length;j++){
   const v=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
   row[j]=v;if(v<min)min=v;
  }
  if(min>2)return 3;
  prev=row;
 }
 return prev[b.length];
}
function score(query,...values){
 const q=normalize(query);if(!q)return 1;
 const terms=q.split(' ').filter(Boolean);
 const hay=normalize(values.flat(Infinity).filter(v=>v!=null).join(' '));
 if(!hay)return 0;
 const words=hay.split(' ');
 let total=0;
 for(const term of terms){
  if(hay.includes(term)){total+=hay===term?12:words.some(w=>w===term)?10:6;continue}
  if(term.length<4)return 0;
  let best=0;
  for(const word of words){
   if(word.startsWith(term)||term.startsWith(word)){best=Math.max(best,4);continue}
   const distance=editDistance(term,word);
   if(distance===1)best=Math.max(best,3);
   else if(distance===2&&term.length>=7)best=Math.max(best,1);
  }
  if(!best)return 0;
  total+=best;
 }
 return total;
}
function matches(query,...values){return !normalize(query)||score(query,...values)>0}
function rank(items,query,textOf){
 const getText=typeof textOf==='function'?textOf:(item)=>item;
 return (Array.isArray(items)?items:[]).map((item,index)=>({item,index,score:score(query,getText(item))}))
  .filter(x=>!normalize(query)||x.score>0)
  .sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.item);
}
async function searchFoodReference(query,client){
 const q=String(query==null?'':query).trim();
 if(normalize(q).length<2)throw new Error('نام غذا را با حداقل دو نویسه وارد کنید.');
 if(!client||!client.functions||typeof client.functions.invoke!=='function')throw new Error('برای جست‌وجوی مرجع، ابتدا وارد حساب رستا شوید.');
 const {data,error}=await client.functions.invoke('nutrition-food-search',{body:{query:q}});
 if(error){
  let message=error.message||'جست‌وجوی مرجع ناموفق بود.';
  try{const detail=await error.context?.json();if(detail?.message)message=detail.message}catch(_){}
  throw new Error(message);
 }
 if(data&&data.error)throw new Error(data.message||'جست‌وجوی مرجع ناموفق بود.');
 return rank(Array.isArray(data&&data.foods)?data.foods:[],q,item=>[item.description,item.food_category]);
}
root.RastaSearch=Object.freeze({version:VERSION,normalize,score,matches,rank,searchFoodReference});
if(root.RastaCore)root.RastaCore.registerModule('search-engine',{kind:'engine',version:VERSION,source:'rasta-search.js',dependencies:[]});
})(typeof window!=='undefined'?window:globalThis);
