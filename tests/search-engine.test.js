'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','rasta-search.js'),'utf8');
const context={RastaCore:{registerModule(id,options){this.registration={id,options}}}};
vm.createContext(context);
new vm.Script(source,{filename:'rasta-search.js'}).runInContext(context);
const search=context.RastaSearch;
assert.ok(search,'shared search API is exported');
assert.equal(search.normalize('ي ك ۱۲٣'),'ی ک 123');
assert.equal(search.normalize('قورمه‌سبزی'),'قورمه سبزی');
assert.ok(search.matches('کورمه سبزی','قورمه‌سبزی خانگی'),'common Persian typing variants should match');
const ranked=search.rank([{name:'عدسی'}, {name:'قورمه سبزی'}, {name:'قورمه سبزی خانگی'}],'قورمه سبزی',x=>x.name);
assert.equal(ranked[0].name,'قورمه سبزی','exact match ranks first');
assert.equal(context.RastaCore.registration.id,'search-engine');
async function run(){
 let calls=0;
 const client={functions:{invoke:async(name,{body})=>{
  calls++;assert.equal(name,'nutrition-food-search');
  return {data:{foods:[
   {description:'Chicken thigh, raw',food_category:'Poultry'},
   {description:'Chicken breast, raw',food_category:'Poultry'}
  ]},error:null};
 }}};
 search.clearFoodReferenceCache();
 const [a,b]=await Promise.all([
  search.searchFoodReference('Chicken breast',client),
  search.searchFoodReference('  chicken   breast ',client)
 ]);
 assert.equal(calls,1,'concurrent equivalent reference queries should share one request');
 assert.equal(a[0].description,'Chicken breast, raw','reference results rank by relevance');
 assert.equal(b[0].description,'Chicken breast, raw');
 a[0].description='mutated by caller';
 const cached=await search.searchFoodReference('CHICKEN BREAST',client);
 assert.equal(cached[0].description,'Chicken breast, raw','caller mutation must not corrupt cached results');
 assert.equal(calls,1,'equivalent searches should use the short-lived cache');
 await assert.rejects(()=>search.searchFoodReference('x',client),/حداقل دو نویسه/);
 console.log('Rasta shared search tests passed.');
}
run().catch(error=>{console.error(error);process.exitCode=1});
