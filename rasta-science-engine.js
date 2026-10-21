/* Rasta Science Engine — deterministic, explainable training and wellness rules.
 * General-fitness support only; not diagnosis, rehabilitation, or individualized medical care.
 */
(function(root){
'use strict';
const VERSION='1.0.0';
const faNum=v=>Number(String(v??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const text=v=>String(v??'').normalize('NFKC').replace(/[يى]/g,'ی').replace(/ك/g,'ک').trim();
const includes=(v,parts)=>parts.some(p=>text(v).includes(p));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const splitNames=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const typeFocus={
 'بالاتنه':['سینه','پشت','سرشانه','بازو'],
 'push':['سینه','سرشانه','پشت بازو'],
 'pull':['پشت','جلو بازو','بازو','همسترینگ'],
 'پایین تنه':['پا','باسن','همسترینگ','ساق'],
 'میان تنه':['میان‌تنه','شکم','پهلو'],
 'هوازی':['هوازی','قلب','تنفس'],
 'تحرک':['انعطاف','تحرک','کشش'],
 'تمام بدن':['تمام بدن','پا','سینه','پشت','میان‌تنه','باسن']
};
function equipmentAllowed(e,p){
 const eq=text(e.equipment||''), pref=text(p.equipment||'ترکیبی'), place=text(p.place||'هر دو');
 if(place==='خانه' && includes(eq,['دستگاه','دوچرخه ثابت']) && pref!=='ترکیبی') return false;
 if(includes(pref,['بدون وسیله']) && !includes(eq,['بدون وسیله','پله محکم'])) return false;
 if(includes(pref,['دمبل']) && !includes(eq,['دمبل','بدون وسیله','پله محکم'])) return false;
 if(includes(pref,['کش مقاومتی']) && !includes(eq,['کش','بدون وسیله','پله محکم'])) return false;
 if(includes(pref,['دستگاه']) && !includes(eq,['دستگاه','دوچرخه ثابت','بدون وسیله'])) return false;
 if(includes(pref,['هالتر']) && !includes(eq,['هالتر','وزنه','بدون وسیله'])) return false;
 if(includes(pref,['وزن بدن']) && !includes(pref,['دمبل']) && !includes(eq,['بدون وسیله','پله محکم'])) return false;
 if(place==='خانه' && includes(eq,['دستگاه','دوچرخه ثابت','هالتر'])) return false;
 return true;
}
function safeForLimit(e,p){
 const hay=text([e.name,e.muscle,e.type,e.desc,e.equipment].join(' '));
 const lowImpact=includes(p.limitations,['کم‌فشار'])||includes(p.adaptation,['کم‌فشار'])||includes(p.exercisePreference,['بدون پرش']);
 if(includes(p.level,['مبتدی'])&&includes(e.level,['پیشرفته']))return false;
 if(lowImpact && includes(hay,['پرش','جامپ','برپی','دویدن سریع'])) return false;
 if(includes(p.limitations,['زانو']) && includes(hay,['لانج','جامپ','پرش','استپ‌آپ','دویدن'])) return false;
 if(includes(p.limitations,['کمر']) && includes(hay,['ددلیفت','خم‌شدن از لگن','چرخش شدید'])) return false;
 if(includes(p.limitations,['شانه']) && includes(hay,['پرس سرشانه','شنا سوئدی','لت سیم‌کش'])) return false;
 if(includes(p.limitations,['مچ']) && includes(hay,['شنا سوئدی','پلانک','برپی'])) return false;
 if(includes(p.exercisePreference,['بدون پرش']) && includes(hay,['پرش','جامپ','برپی'])) return false;
 return true;
}
function scoreExercise(e,focus,p,used,all){
 const m=text(e.muscle),t=text(e.type),name=text(e.name);
 let score=0;
 const wanted=typeFocus[focus]||typeFocus['تمام بدن'];
 if(wanted.some(k=>m.includes(k)||t.includes(k)||name.includes(k)))score+=7;
 if(focus==='تمام بدن' && includes(m,['پا','باسن','سینه','پشت','میان‌تنه']))score+=2;
 if(text(p.level)==text(e.level))score+=2;
 else if(text(p.level).includes('مبتدی') && text(e.level).includes('پیشرفته'))score-=9;
 if(text(e.place)===text(p.place)||p.place==='هر دو')score+=1;
 if(used.has(e.id))score+=includes(p.adaptation,['ثبات'])?4:-1000;
 if(includes(p.priorityMuscle,['سینه'])&&includes(m,['سینه']))score+=5;
 if(includes(p.priorityMuscle,['پشت'])&&includes(m,['پشت']))score+=5;
 if(includes(p.priorityMuscle,['سرشانه'])&&includes(m,['سرشانه']))score+=5;
 if(includes(p.priorityMuscle,['بازو'])&&includes(m,['بازو']))score+=5;
 if(includes(p.priorityMuscle,['پا و باسن'])&&includes(m,['پا','باسن']))score+=5;
 if(includes(p.priorityMuscle,['میان‌تنه'])&&includes(m,['میان‌تنه','شکم']))score+=5;
 if(includes(p.goal,['چربی'])) score+=t.includes('هوازی')?5:0;
 if(includes(p.goal,['انعطاف','تحرک'])) score+=includes(t,['انعطاف','یوگا','پیلاتس'])?7:0;
 if(includes(p.adaptation,['تنوع'])&&!used.has(e.id))score+=2;
 if(includes(p.adaptation,['ثبات'])&&used.has(e.id))score+=2;
 if(includes(p.exercisePreference,['ساده']))score+=includes(e.level,['مبتدی'])?2:0;
 return score;
}
function chooseForFocus(exercises,focus,p,used,count){
 let candidates=exercises.filter(e=>equipmentAllowed(e,p)&&safeForLimit(e,p));
 if(focus==='هوازی'){
  candidates=candidates.filter(e=>includes(e.type,['هوازی','استقامتی','HIIT'])||includes(e.muscle,['قلب','تنفس']));
  const cardio=text(p.cardioType||'');
  if(includes(cardio,['پیاده‌روی'])){const preferred=candidates.filter(e=>includes(e.name,['پیاده‌روی','راه‌رفتن','راه رفتن']));if(preferred.length)candidates=preferred}
  else if(includes(cardio,['دوچرخه'])){const preferred=candidates.filter(e=>includes(e.name,['دوچرخه','cycle']));if(preferred.length)candidates=preferred}
  else if(includes(cardio,['دویدن'])){const preferred=candidates.filter(e=>includes(e.name,['دویدن','جاگینگ','run']));if(preferred.length)candidates=preferred}
  else if(includes(cardio,['اینتروال'])){const preferred=candidates.filter(e=>includes(e.type,['HIIT'])||includes(e.name,['اینتروال','تناوبی']));if(preferred.length)candidates=preferred}
  if(includes(cardio,['کم‌فشار'])){const preferred=candidates.filter(e=>!includes(e.name,['پرش','جامپ','برپی','دویدن سریع']));if(preferred.length)candidates=preferred}
 }
 else if(focus==='تحرک')candidates=candidates.filter(e=>includes(e.type,['انعطاف','یوگا','پیلاتس','تحرک'])||includes(e.name,['کشش','گربه','چرخش آرام']));
 else if(focus==='میان تنه')candidates=candidates.filter(e=>includes(e.muscle,['میان‌تنه','شکم','پهلو'])||includes(e.type,['میان‌تنه']));
 else if(focus==='بالاتنه')candidates=candidates.filter(e=>includes(e.muscle,['سینه','پشت','سرشانه','بازو']));
 else if(focus==='push')candidates=candidates.filter(e=>includes(e.muscle,['سینه','سرشانه','پشت بازو']));
 else if(focus==='pull')candidates=candidates.filter(e=>includes(e.muscle,['پشت','جلو بازو','بازو','همسترینگ','باسن']));
 else if(focus==='پایین تنه')candidates=candidates.filter(e=>includes(e.muscle,['پا','باسن','همسترینگ','ساق']));
 if(!candidates.length)candidates=exercises.filter(e=>equipmentAllowed(e,p)&&safeForLimit(e,p)&&!includes(e.type,['HIIT']));
 const picked=[];
 while(candidates.length&&picked.length<count){
  const ranked=candidates.map(e=>({e,score:scoreExercise(e,focus,p,used,new Set())})).sort((a,b)=>b.score-a.score);
  const top=ranked.slice(0,Math.min(5,ranked.length));
  const pick=top.find(x=>!picked.some(y=>y.id===x.e.id))||ranked[0];
  picked.push(pick.e);used.add(pick.e.id);
  candidates=candidates.filter(e=>e.id!==pick.e.id);
 }
 return picked;
}
function sessionFocuses(p,days){
 const split=text(p.trainingSplit||'تمام بدن'),goal=text(p.goal||'');
 if(includes(split,['بالاتنه/پایین','بالا/پایین']))return Array.from({length:days},(_,i)=>i%2===0?'بالاتنه':'پایین تنه');
 if(includes(split,['فشار/کشش/پا','push/pull/legs'])){const seq=['push','pull','پایین تنه'];return Array.from({length:days},(_,i)=>seq[i%3]);}
 if(includes(split,['قدرتی و هوازی','قدرت + هوازی','قدرتی + هوازی']))return Array.from({length:days},(_,i)=>i%2===0?'تمام بدن':'هوازی');
 if(includes(split,['تحرک/بازیابی','بازیابی']))return Array.from({length:days},(_,i)=>i%2===0?'تحرک':'تمام بدن');
 if(includes(split,['تمام بدن'])){const seq=days<=3?Array.from({length:days},()=> 'تمام بدن'):['تمام بدن','هوازی','تمام بدن','تحرک','تمام بدن','هوازی','تحرک'];return seq.slice(0,days);}
 if(includes(split,['ترکیبی']))return Array.from({length:days},(_,i)=>['بالاتنه','پایین تنه','تمام بدن','هوازی','تحرک','بالاتنه','پایین تنه'][i%7]);
 if(includes(goal,['انعطاف','تحرک']))return Array.from({length:days},()=> 'تحرک');
 if(includes(goal,['چربی']))return Array.from({length:days},(_,i)=>i%3===2?'هوازی':'تمام بدن');
 return Array.from({length:days},(_,i)=>['بالاتنه','پایین تنه','تمام بدن','هوازی','بالاتنه','پایین تنه','تحرک'][i%7]);
}
function prescription(e,p){
 const level=text(p.level||'مبتدی'),intensity=text(p.intensity||'متوسط');
 const isCardio=includes(e.type,['هوازی','استقامتی','HIIT']),isMobility=includes(e.type,['انعطاف','یوگا','پیلاتس','تحرک']);
 let sets=Number(e.sets)||3, reps=String(e.reps||'8–12'), rir=3, rest=60;
 if(includes(level,['مبتدی'])){sets=Math.min(3,sets);rir=3}
 if(includes(p.progression,['تکنیک','ثابت']))rir=Math.max(rir,4);
 if(includes(level,['پیشرفته'])){sets=Math.min(5,sets+1);rir=1}
 if(includes(intensity,['سبک'])){sets=Math.max(1,sets-1);rir=4}
 if(includes(intensity,['چالش‌برانگیز']))rir=Math.max(1,rir-1);
 if(isCardio){sets=1;reps=String(e.reps||'10–20 دقیقه');rest=60}
 else if(isMobility){sets=Math.min(3,Math.max(2,sets));reps=String(e.reps||'8–12 تکرار یا 20–30 ثانیه');rest=30}
 else if(includes(p.restTime,['30–45']))rest=40;
 else if(includes(p.restTime,['90–120']))rest=105;
 else if(includes(p.restTime,['2–3','120–180']))rest=150;
 else if(includes(p.restTime,['خودتنظیم']))rest=90;
 else rest=75;
 return {sets,reps,restSeconds:rest,rir,tempo:'کنترل‌شده؛ بخش پایین‌رفتن حدود ۲ ثانیه',warmupMinutes:clamp(faNum(p.warmup)||8,0,20),cooldownMinutes:clamp(faNum(p.cooldown)||5,0,20)};
}
function buildProgram({profile={},exercises=[],durationMinutes=30}){
 const days=clamp(faNum(profile.weeklyDays)||faNum(profile.days)||3,2,7);
 const focuses=sessionFocuses(profile,days),used=new Set(),out=[];
 const requestedFocus=text(profile.sessionFocus||'متعادل');
 if(requestedFocus!=='متعادل'&&focuses.length){const mapped=requestedFocus==='میان تنه'?'میان تنه':requestedFocus;focuses[0]=mapped;}
 if(includes(profile.cardioType,['بدون هوازی']))for(let i=0;i<focuses.length;i++)if(focuses[i]==='هوازی')focuses[i]='تحرک';
 const blocked=includes(profile.limitations,['ابتدا با متخصص','مشورت با متخصص','مشورت']);
 if(blocked)return {blocked:true,warning:'با توجه به گزینه محدودیت انتخاب‌شده، برنامه خودکار ساخته نشد. ابتدا با پزشک یا فیزیوتراپیست/متخصص واجد صلاحیت مشورت کن.',days:[]};
 for(let i=0;i<days;i++){
  const focus=focuses[i],mins=clamp(Number(durationMinutes)||30,10,150);
  const count=focus==='تحرک'?3:focus==='هوازی'?2:includes(profile.adaptation,['زمان محدود'])||includes(profile.exercisePreference,['کوتاه'])?3:Math.max(4,Math.min(7,Math.floor((mins-(faNum(profile.warmup)||8)-(faNum(profile.cooldown)||5))/5)));
  const dayProfile={...profile};if(includes(profile.intensity,['متغیر']))dayProfile.intensity=i%4===3?'چالش‌برانگیز':i%2===1?'سبک':'متوسط';
  const chosen=chooseForFocus(exercises,focus,dayProfile,used,count);
  if(!chosen.length)return {blocked:true,warning:'با تجهیزات و محدودیت‌های انتخاب‌شده حرکت ایمن کافی در کتابخانه پیدا نشد. تنظیمات را بازبینی کن یا از متخصص راهنمایی بگیر.',days:[]};
  const type=focus==='هوازی'?'هوازی':focus==='تحرک'?'بازیابی':'قدرتی';
  out.push({title:splitNames[i]+' · '+focus,type,mins,focus,ids:chosen.map(e=>e.id),prescriptions:Object.fromEntries(chosen.map(e=>[e.id,prescription(e,dayProfile)])),warmupMinutes:clamp(faNum(profile.warmup)||8,0,20),cooldownMinutes:clamp(faNum(profile.cooldown)||5,0,20),restRecommendationSeconds:prescription(chosen[0],dayProfile).restSeconds,engineVersion:VERSION});
 }
 return {blocked:false,days:out,summary:{sessionsPerWeek:days,focuses,weeklyMinutes:out.reduce((s,d)=>s+d.mins,0),recovery:'بین جلسات سخت عضله مشابه را بازیابی کن؛ درد تیز، سرگیجه یا تنگی نفس غیرعادی علامت توقف تمرین است.'},warning:includes(profile.limitations,['زانو','کمر','شانه','مچ'])?'برنامه با فیلترهای عمومی محدود شده؛ این فیلترها جایگزین ارزیابی پزشکی یا برنامه توان‌بخشی نیستند.':'برنامه عمومی است؛ شدت را با فرم صحیح و توان روزانه تنظیم کن.'};
}
function estimateNutrition(a){
 const w=Number(a.current_weight_kg),h=Number(a.height_cm),age=Number(a.age_years);
 if(!(w>=35&&w<=300&&h>=130&&h<=230&&age>=18&&age<=100))return null;
 const needsReview=!!a.pregnant_or_breastfeeding||!!a.needs_professional_review||
  (Array.isArray(a.health_conditions)&&a.health_conditions.length>0);
 if(needsReview)return {requires_professional_review:true,target_energy_kcal:null,
  reason:'برای بارداری/شیردهی یا وضعیت پزشکی ثبت‌شده، برآورد خودکار انرژی متوقف شد و بررسی متخصص لازم است.'};
 const offset=a.sex==='male'?5:a.sex==='female'?-161:-78;
 const bmr=10*w+6.25*h-5*age+offset;
 const factors={sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9};
 const maintenance=bmr*(factors[a.activity_level]||1.45);
 const goal=a.goal==='fat_loss'?-Math.min(400,maintenance*.15):a.goal==='muscle_gain'?Math.min(200,maintenance*.07):0;
 const rawTarget=maintenance+goal;
 if(!Number.isFinite(rawTarget)||rawTarget<1400||rawTarget>4200)return {requires_professional_review:true,target_energy_kcal:null,
  reason:'برآورد انرژی خارج از محدوده محافظه‌کارانه این نسخه است؛ برای جلوگیری از پیشنهاد نامناسب، تولید خودکار متوقف شد.'};
 const kcal=Math.round(clamp(rawTarget,1400,4200)/50)*50;
 const proteinPerKg=a.goal==='muscle_gain'?1.6:a.goal==='fat_loss'?1.4:1.2;
 const protein=Math.round(clamp(proteinPerKg*w,0,2*w));
 const fat=Math.round(kcal*.28/9),carbs=Math.max(0,Math.round((kcal-protein*4-fat*9)/4));
 return {bmr:Math.round(bmr),maintenance_kcal:Math.round(maintenance),target_energy_kcal:kcal,target_protein_g:protein,target_fat_g:fat,target_carbohydrate_g:carbs,method:'Mifflin–St Jeor; فعالیت و هدف تخمینی',uncertainty:'برآورد فرمولی است و با روند وزن، مصرف واقعی، وضعیت سلامت و کیفیت داده‌ها باید بازبینی شود.'};
}
function analyzeProgress({adherence='medium',sleep='medium',protein='maybe',plateauWeeks='2',weightTrend=null,strengthTrend=null}={}){
 const advice=[];
 if(adherence==='low')advice.push('ابتدا پایبندی را بهتر کن؛ پیش از افزایش حجم یا شدت، برنامه‌ای قابل‌اجرا انتخاب کن.');
 else if(adherence==='medium')advice.push('ثبات جلسات را ثبت کن و تعداد روزهای واقعاً قابل انجام را مبنا قرار بده.');
 if(sleep==='low')advice.push('خواب ناکافی می‌تواند ریکاوری را مختل کند؛ تمرین سنگین را با خستگی زیاد کاهش بده.');
 else if(sleep==='medium')advice.push('در صورت امکان خواب منظم نزدیک ۷ تا ۹ ساعت را هدف بگیر.');
 if(protein==='no')advice.push('پروتئین روزانه و انرژی کل را از غذاهای متنوع بررسی کن؛ هدف دقیق به فرد وابسته است.');
 if(weightTrend==='down'&&strengthTrend==='down')advice.push('هم‌زمانی افت وزن و قدرت می‌تواند با کمبود انرژی/ریکاوری همراه باشد؛ فعلاً فشار تمرین را بیشتر نکن.');
 if(weightTrend==='stable'&&strengthTrend==='up')advice.push('ثبات وزن همراه با افزایش قدرت می‌تواند پیشرفت مطلوب باشد؛ فقط وزن را معیار موفقیت ندان.');
 if(plateauWeeks==='1')advice.push('یک هفته برای تشخیص توقف پیشرفت کافی نیست؛ روند را در شرایط مشابه چند هفته دنبال کن.');
 else if(plateauWeeks==='3')advice.push('پس از ۲ تا ۴ هفته توقف، ابتدا تکنیک، خواب، پایبندی و ثبت بار را بررسی کن و فقط یک متغیر را تغییر بده.');
 else advice.push('در توقف طولانی، بار تمرین و ریکاوری را بازبینی کن؛ کاهش موقت فشار یا راهنمایی مربی واجد صلاحیت می‌تواند مناسب باشد.');
 advice.push('افزایش وزنه یا تکرار فقط وقتی انجام شود که تمام ست‌ها با دامنه و فرم مناسب و بدون درد غیرعادی کامل شده‌اند.');
 return advice;
}
function nextLoad({weight=0,repsCompleted=0,repsTarget=12,setsCompleted=0,setsTarget=3,goodForm=true,pain=false,progression='تکرار'}={}){
 if(pain)return {action:'stop',message:'به دلیل درد تمرین را متوقف کن؛ در صورت تداوم یا شدت درد از متخصص کمک بگیر.'};
 if(!goodForm)return {action:'hold',message:'وزنه را افزایش نده؛ ابتدا فرم و کنترل حرکت را بهتر کن.'};
 if(includes(progression,['ثابت']))return {action:'hold',message:'روش پیشرفت انتخابی حفظ بار است؛ فعلاً وزنه یا حجم را افزایش نده.'};
 if(includes(progression,['تکنیک']))return {action:'hold',message:'روش انتخابی اولویت تکنیک است؛ تا تثبیت فرم، بار را افزایش نده.'};
 if(setsCompleted>=setsTarget&&repsCompleted>=repsTarget){if(includes(progression,['حجم']))return {action:'consider_sets',message:'اگر ریکاوری خوب است، به‌جای افزایش وزنه فقط یک ست به یک حرکت اضافه کن و واکنش را پایش کن.'};return {action:'small_increase',weightSuggestion:weight>0?Math.round(weight*1.025*2)/2:null,message:'اگر این عملکرد در جلسه بعد هم با فرم مناسب تکرار شد، افزایش کوچک وزنه را بررسی کن.'};}
 return {action:'hold',message:'تا کامل شدن هدف تکرار با فرم مناسب، بار فعلی را حفظ کن.'};
}
function weeklyGuidance(profile={},plan=[]){
 if(includes(profile.cardioType,['بدون هوازی']))return ' · هوازی برنامه‌ریزی‌شده فعلاً خاموش است؛ اگر هدف سلامت عمومی است، فعالیت روزانه را جداگانه در نظر بگیر.';
 const mins=(Array.isArray(plan)?plan:[]).filter(d=>d&&d.focus==='هوازی').reduce((sum,d)=>sum+(Number(d.mins)||0),0);
 if(mins<150)return ' · هوازی برنامه فعلی حدود '+mins+' دقیقه در هفته است؛ راهنمای عمومی بزرگسالان سالم ۱۵۰ تا ۳۰۰ دقیقه هوازی متوسط در هفته است. به‌تدریج و متناسب با توان خودت افزایش بده؛ این عدد هدف عمومی است، نه نسخه فردی.';
 return ' · زمان هوازی برنامه به حدود '+mins+' دقیقه در هفته می‌رسد؛ شدت و تحمل فردی را هم پایش کن.';
}
function recoveryAdvice({sleepHours=null,soreness='unknown',pain=false,energy='normal'}={}){
 if(pain)return {status:'stop',message:'تمرین را متوقف کن؛ درد شدید، ناگهانی یا پایدار نیازمند ارزیابی تخصصی است.'};
 if(soreness==='high'||energy==='low'||(sleepHours!==null&&sleepHours!==undefined&&sleepHours!==''&&Number.isFinite(Number(sleepHours))&&Number(sleepHours)<5))return {status:'reduce',message:'امروز شدت یا حجم را کم کن یا بازیابی فعال انتخاب کن؛ تمرین سنگین را به زمان مناسب‌تری موکول کن.'};
 if(sleepHours!==null&&sleepHours!==undefined&&sleepHours!==''&&Number.isFinite(Number(sleepHours))&&Number(sleepHours)<7)return {status:'caution',message:'با خواب کم، شدت را بر اساس احساس و کیفیت فرم تنظیم کن.'};
 return {status:'normal',message:'طبق برنامه پیش برو و فرم صحیح را بر افزایش بار مقدم بدان.'};
}
root.RastaScienceEngine={version:VERSION,buildProgram,prescription,estimateNutrition,analyzeProgress,nextLoad,recoveryAdvice,weeklyGuidance,equipmentAllowed,safeForLimit};
})(typeof window!=='undefined'?window:globalThis);
