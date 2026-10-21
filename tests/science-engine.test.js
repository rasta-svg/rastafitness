const assert = require('node:assert/strict');
require('../rasta-science-engine.js');
const engine = globalThis.RastaScienceEngine;
assert.ok(engine, 'science engine must export a global API');

const exercises = [
  {id:'squat',name:'اسکوات',muscle:'پا و باسن',type:'قدرتی',equipment:'بدون وسیله',place:'خانه',level:'مبتدی',sets:3,reps:'10–12'},
  {id:'lunge',name:'لانج',muscle:'پا و باسن',type:'قدرتی',equipment:'بدون وسیله',place:'خانه',level:'متوسط',sets:3,reps:'8 هر پا'},
  {id:'push',name:'شنا روی دیوار',muscle:'سینه و پشت بازو',type:'قدرتی',equipment:'بدون وسیله',place:'خانه',level:'مبتدی',sets:3,reps:'10–15'},
  {id:'row',name:'پارویی دمبل',muscle:'پشت و بازو',type:'قدرتی',equipment:'دمبل',place:'باشگاه',level:'متوسط',sets:3,reps:'10–12'},
  {id:'press',name:'پرس سرشانه',muscle:'سرشانه',type:'قدرتی',equipment:'دمبل',place:'باشگاه',level:'متوسط',sets:3,reps:'8–12'},
  {id:'plank',name:'پلانک',muscle:'میان‌تنه',type:'میان‌تنه',equipment:'بدون وسیله',place:'خانه',level:'مبتدی',sets:3,reps:'20–30 ثانیه'},
  {id:'walk',name:'پیاده‌روی تند',muscle:'قلب و تنفس',type:'هوازی',equipment:'بدون وسیله',place:'خانه',level:'مبتدی',sets:1,reps:'20 دقیقه'},
  {id:'cycle',name:'دوچرخه ثابت',muscle:'قلب و تنفس',type:'هوازی',equipment:'دوچرخه ثابت',place:'باشگاه',level:'مبتدی',sets:1,reps:'15 دقیقه'},
  {id:'jump',name:'جامپینگ جک',muscle:'تمام بدن',type:'هوازی',equipment:'بدون وسیله',place:'خانه',level:'متوسط',sets:3,reps:'30 ثانیه'},
  {id:'burpee',name:'برپی',muscle:'تمام بدن',type:'هوازی',equipment:'بدون وسیله',place:'خانه',level:'پیشرفته',sets:3,reps:'6–8'},
  {id:'stretch',name:'کشش همسترینگ',muscle:'انعطاف',type:'انعطاف',equipment:'بدون وسیله',place:'خانه',level:'مبتدی',sets:2,reps:'20 ثانیه'},
  {id:'catcow',name:'گربه گاو',muscle:'تحرک',type:'انعطاف',equipment:'بدون وسیله',place:'خانه',level:'مبتدی',sets:2,reps:'8 تکرار'}
];
const base = {
  goal:'تناسب اندام', place:'خانه', level:'مبتدی', weeklyDays:'5',
  trainingSplit:'تمام بدن', equipment:'بدون وسیله', sessionFocus:'متعادل',
  intensity:'متوسط', restTime:'60–90', warmup:'8', cooldown:'5',
  limitations:'ندارد', exercisePreference:'متعادل', priorityMuscle:'متعادل',
  adaptation:'متعادل', cardioType:'پیاده‌روی', progression:'تکرار'
};
const build = profile => engine.buildProgram({profile:{...base,...profile},exercises,durationMinutes:30});
for (let days=2;days<=7;days++) {
  const result=build({weeklyDays:String(days)});
  assert.equal(result.blocked,false,days+' sessions should build');
  assert.equal(result.days.length,days,'requested weekly session count must be respected');
  for (const day of result.days) {
    assert.ok(day.ids.length>0,'each session must contain movements');
    assert.ok(day.ids.every(id=>exercises.some(ex=>ex.id===id)),'all ids must exist');
    assert.ok(day.prescriptions,'each session must include prescriptions');
  }
}
const beginner=build({weeklyDays:'3'});
assert.ok(!beginner.days.some(day=>day.ids.some(id=>exercises.find(ex=>ex.id===id).level==='پیشرفته')),'beginner plan must not include advanced exercises');
const lowImpact=build({weeklyDays:'3',limitations:'کم‌فشار',exercisePreference:'بدون پرش'});
assert.ok(!lowImpact.days.some(day=>day.ids.some(id=>['jump','burpee'].includes(id))),'low-impact plan must exclude jumping exercises');
const knee=build({weeklyDays:'3',limitations:'زانو'});
assert.ok(!knee.days.some(day=>day.ids.some(id=>['lunge'].includes(id))),'knee care filter must exclude lunges');
assert.equal(build({limitations:'مشورت'}).blocked,true,'professional review selection must stop automatic programming');
const cycling=build({weeklyDays:'4',trainingSplit:'قدرتی و هوازی',equipment:'ترکیبی',place:'باشگاه',cardioType:'دوچرخه'});
assert.ok(cycling.days.filter(day=>day.focus==='هوازی').every(day=>day.ids.every(id=>id==='cycle')),'cycling preference should choose cycling when available');
assert.equal(engine.prescription(exercises[0],{...base,restTime:'120–180'}).restSeconds,150,'heavy-rest selection must be honored');
assert.equal(engine.nextLoad({weight:10,repsCompleted:12,repsTarget:12,setsCompleted:3,setsTarget:3,goodForm:true,progression:'تکنیک'}).action,'hold','technique-first progression must not increase load');
assert.equal(engine.recoveryAdvice({sleepHours:null}).status,'normal','unknown sleep must not be treated as zero hours');
assert.ok(engine.estimateNutrition({current_weight_kg:70,height_cm:175,age_years:30,sex:'male',activity_level:'moderate',goal:'general_health'}).target_energy_kcal>0,'nutrition estimate must be positive for valid adult data');
assert.match(engine.weeklyGuidance(base,build({weeklyDays:'3'}).days),/۱۵۰ تا ۳۰۰/,'weekly aerobic guideline should be visible');
assert.equal(engine.estimateNutrition({current_weight_kg:70,height_cm:175,age_years:30,sex:'female',activity_level:'moderate',goal:'general_health',pregnant_or_breastfeeding:true}).requires_professional_review,true,'pregnancy/breastfeeding must stop automated nutrition targets');
assert.equal(engine.estimateNutrition({current_weight_kg:70,height_cm:175,age_years:30,sex:'male',activity_level:'moderate',goal:'general_health',health_conditions:['kidney disease']}).requires_professional_review,true,'reported medical conditions must stop automated nutrition targets');
assert.equal(engine.estimateNutrition({current_weight_kg:35,height_cm:130,age_years:100,sex:'female',activity_level:'sedentary',goal:'fat_loss'}).requires_professional_review,true,'out-of-range calorie estimates must be flagged instead of clamped silently');
console.log('Rasta Science Engine tests passed.');
