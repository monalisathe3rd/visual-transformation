/* Visual Transformation — pure tracking rules (also testable with Node). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.VTCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const DEFAULT_CATEGORIES = [
    {id:'fitness',name:'Fitness',emoji:'✿'},
    {id:'self-care',name:'Self Care',emoji:'♡'},
    {id:'chores',name:'Chores / Cleaning',emoji:'⌂'}
  ];
  const THEMES = [
    {id:'sage',name:'Sage & Linen',bg:'#F7F5F0',paper:'#FFFFFF',text:'#343F37',muted:'#78867A',accent:'#819A82',soft:'#E7EEE5',outline:'#DEE4DA'},
    {id:'rose',name:'Dusty Rose',bg:'#FBF5F2',paper:'#FFFFFF',text:'#503F46',muted:'#937E85',accent:'#BF899D',soft:'#F7E4EB',outline:'#ECDCE1'},
    {id:'ocean',name:'Sea Glass',bg:'#F2F8F7',paper:'#FFFFFF',text:'#354950',muted:'#718D91',accent:'#699CA1',soft:'#DFF0EF',outline:'#D7E6E4'},
    {id:'honey',name:'Golden Hour',bg:'#FCF8EF',paper:'#FFFFFF',text:'#51453A',muted:'#978778',accent:'#B79A67',soft:'#F7EDCF',outline:'#EEE5D5'},
    {id:'lavender',name:'Lavender Haze',bg:'#F7F5FA',paper:'#FFFFFF',text:'#484359',muted:'#8D849E',accent:'#9386B3',soft:'#EDE7F7',outline:'#E5E0ED'},
    // Pinterest palettes: each preset uses colors from one reference image only.
    // `swatches` keeps the original photo colors visible in the Theme Gallery.
    {id:'fern-garden',group:'pinterest',name:'Fern Garden',bg:'#DDF2E3',paper:'#F4FBF6',text:'#195F34',muted:'#247B47',accent:'#25854D',accentInk:'#FFFFFF',soft:'#BAE1C5',outline:'#93CEA5',swatches:['#DDF2E3','#BAE1C5','#93CEA5','#6BB785','#47A068','#25854D','#195F34']},
    {id:'raspberry-wine',group:'pinterest',name:'Raspberry Wine',bg:'#300708',paper:'#5A0C14',text:'#F1DCDF',muted:'#E6A7B6',accent:'#D47F93',accentInk:'#300708',soft:'#7A0E16',outline:'#B63550',swatches:['#300708','#7A0E16','#D0CDCE','#B63550','#D47F93','#588B44']},
    {id:'cherry-blossom',group:'pinterest',name:'Cherry Blossom',bg:'#AD8AA9',paper:'#EBDDE9',text:'#2F1822',muted:'#5D3857',accent:'#2C75B1',accentInk:'#FFFFFF',soft:'#D4BCD4',outline:'#885C7C',swatches:['#2C75B1','#5D3857','#885C7C','#AD8AA9','#2F1822']},
    {id:'enchanted-forest',group:'pinterest',name:'Enchanted Forest',bg:'#171E1C',paper:'#2A342D',text:'#E4E9E3',muted:'#ACB0AB',accent:'#084E71',accentInk:'#FFFFFF',soft:'#4C5447',outline:'#767C6F',swatches:['#171E1C','#2A342D','#4C5447','#767C6F','#ACB0AB','#084E71']},
    {id:'golden-poppy',group:'pinterest',name:'Golden Poppy',bg:'#2E3841',paper:'#3B464E',text:'#FAF3D1',muted:'#DDE3B1',accent:'#F5CF12',accentInk:'#2E3841',soft:'#596236',outline:'#7E8A32',swatches:['#2E3841','#7E8A32','#F5CF12','#DE8F04']},
    {id:'winter-berry',group:'pinterest',name:'Winter Berry',bg:'#EAE3E1',paper:'#FAF6F4',text:'#312525',muted:'#676A68',accent:'#7B031C',accentInk:'#FFFFFF',soft:'#E2D7D9',outline:'#A2A5A4',swatches:['#7B031C','#EAE3E1','#A2A5A4','#676A68','#312525']},
    {id:'antique-gold',group:'pinterest',name:'Antique Gold',bg:'#C6AE73',paper:'#EEE2C6',text:'#2E311A',muted:'#6B5B2D',accent:'#6B5B2D',accentInk:'#FFFFFF',soft:'#D6C795',outline:'#AD9664',swatches:['#C6AE73','#AD9664','#6B5B2D','#AD8330','#2E311A']},
    {id:'sage-morning',group:'pinterest',name:'Sage Morning',bg:'#D6DDDB',paper:'#F2F5F2',text:'#5C4426',muted:'#566B4D',accent:'#5C4426',accentInk:'#FFFFFF',soft:'#C8C3B9',outline:'#789A70',swatches:['#D6DDDB','#C8C3B9','#789A70','#5C4426']},
    {id:'pink-orchid',group:'pinterest',name:'Pink Orchid',bg:'#DBB4C3',paper:'#F4E6EA',text:'#1E2301',muted:'#6E6434',accent:'#364206',accentInk:'#FFFFFF',soft:'#C58FA3',outline:'#AD6A7E',swatches:['#C58FA3','#DBB4C3','#1E2301','#AD6A7E','#364206','#6E6434']},
    {id:'blueberry-peach',group:'pinterest',name:'Blueberry Peach',bg:'#B7CED9',paper:'#EDF4F7',text:'#1A2950',muted:'#97394F',accent:'#3473B7',accentInk:'#FFFFFF',soft:'#D9E6ED',outline:'#B49889',swatches:['#B7CED9','#3473B7','#1A2950','#97394F','#B49889']},
    {id:'summer-bloom',group:'pinterest',name:'Summer Bloom',bg:'#E2BBB3',paper:'#F8ECE9',text:'#1F331A',muted:'#6C5F47',accent:'#A55AA0',accentInk:'#FFFFFF',soft:'#E6D2D7',outline:'#A55AA0',swatches:['#1F331A','#6C5F47','#A55AA0','#E2BBB3']},
    {id:'bamboo-mist',group:'pinterest',name:'Bamboo Mist',bg:'#D2CCC1',paper:'#EFEBE4',text:'#313B18',muted:'#555E48',accent:'#60681A',accentInk:'#FFFFFF',soft:'#A2A299',outline:'#7B8484',swatches:['#D2CCC1','#7B8484','#A2A299','#60681A','#636B5D','#313B18']},
    {id:'florists-market',group:'pinterest',name:'Florist’s Market',bg:'#CAA0A1',paper:'#F2DCDE',text:'#321F17',muted:'#742B2C',accent:'#742B2C',accentInk:'#FFFFFF',soft:'#E4C5CA',outline:'#8C5E63',swatches:['#321F17','#742B2C','#8C5E63','#CAA0A1','#C29E07']},
    {id:'blue-courtyard',group:'pinterest',name:'Blue Courtyard',bg:'#C2CAE5',paper:'#EFF1F8',text:'#022924',muted:'#586464',accent:'#BB3E69',accentInk:'#FFFFFF',soft:'#D4DFED',outline:'#A3B6D5',swatches:['#C2CAE5','#A3B6D5','#022924','#586464','#998D96','#164740','#BB3E69']},
    {id:'velvet-valentine',group:'pinterest',name:'Velvet Valentine',bg:'#D4CED2',paper:'#F4E9EA',text:'#350204',muted:'#883C36',accent:'#680407',accentInk:'#FFFFFF',soft:'#CBAEAE',outline:'#D17265',swatches:['#D4CED2','#350204','#680407','#9F0507','#CBAEAE','#A8352C','#D17265']},
  ];
  const goodDate = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(new Date(x + 'T12:00:00').getTime());
  function dateKey(d) { return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
  function dateFromKey(s) { return new Date(s+'T12:00:00'); }
  function addDays(s,n) { const d=dateFromKey(s); d.setDate(d.getDate()+n); return dateKey(d); }
  function weekday(s) { return DAYS[dateFromKey(s).getDay()]; }
  function dayScheduled(h,s) { return Array.isArray(h.weekdays) && h.weekdays.includes(weekday(s)) && s >= (h.roundStart || h.startDate || s); }
  function clamp(n,min,max) { return Math.max(min,Math.min(max,n)); }
  function makeId() { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'vt-'+Date.now()+'-'+Math.random().toString(36).slice(2); }
  function makeHabit({name,categoryId,goalDays,weekdays,startDate,pattern='flower'}) {
    return {id:makeId(),name:String(name).trim(),categoryId,goalDays:Number(goalDays),weekdays:[...weekdays],startDate,roundStart:startDate,lastReviewed:addDays(startDate,-1),completedDates:[],skippedDates:[],allowSkip:false,progress:0,streak:0,freezes:0,usedFreezes:0,resets:0,status:'active',round:1,pattern,pixelColors:null};
  }
  function earned(h) {
    if (h.streak>0 && h.streak%14===0) h.freezes=Math.min(2,h.freezes+1);
  }
  // Only review closed days. Today's unfinished work is not yet a miss.
  function reviewUntil(h,today) {
    if (h.status!=='active' || !goodDate(today)) return false;
    const until=addDays(today,-1);
    const baseline=h.lastReviewed || addDays(h.roundStart || today,-1);
    if (!goodDate(baseline) || baseline>=until) return false;
    let changed=false;
    let cursor=addDays(baseline,1);
    // Bound catch-up work; new habits can't generate millions of iterations.
    for (let count=0; cursor<=until && count<36525; count++,cursor=addDays(cursor,1)) {
      if (dayScheduled(h,cursor) && !h.completedDates.includes(cursor) && !(h.skippedDates||[]).includes(cursor)) {
        if (h.freezes>0) { h.freezes--;h.usedFreezes++; }
        else if (h.progress>0 || h.streak>0 || h.completedDates.length>0) {h.progress=0;h.streak=0;h.freezes=0;h.completedDates=[];h.pixelResetDate=cursor;h.resets++;}
        changed=true;
      }
      h.lastReviewed=cursor;
      changed=true;
    }
    return changed;
  }
  function complete(h,today) {
    if (h.status!=='active' || !dayScheduled(h,today) || h.completedDates.includes(today)) return {ok:false};
    reviewUntil(h,today);
    if (h.status!=='active' || h.completedDates.includes(today)) return {ok:false};
    h.completedDates.push(today);
    h.progress++;
    h.streak++;
    earned(h);
    h.lastReviewed=today;
    if (h.progress>=h.goalDays) {h.progress=h.goalDays;h.status='ready';return {ok:true,finished:true};}
    return {ok:true,finished:false};
  }
  // Skips are opt-in per habit and exempt that scheduled day from penalties.
  // They earn no pixel, do not increase the completion streak, and cost no freeze.
  function skip(h,today) {
    if (!h.allowSkip || h.status!=='active' || !dayScheduled(h,today) ||
        h.completedDates.includes(today) || (h.skippedDates||[]).includes(today)) return false;
    reviewUntil(h,today);
    h.skippedDates=h.skippedDates||[];
    h.skippedDates.push(today);
    // Do not advance lastReviewed here: a same-day Undo must restore normal
    // missed-day detection if the user then leaves the day incomplete.
    return true;
  }
  function undoSkip(h,today) {
    if (!h.allowSkip || !(h.skippedDates||[]).includes(today)) return false;
    h.skippedDates=h.skippedDates.filter(s=>s!==today);
    return true;
  }
  function nextDayNumber(h,day) {
    let n=h.progress+1;
    if (n>h.goalDays) return null;
    if (!dayScheduled(h,day)) return null;
    if (h.completedDates.includes(day)) return h.progress;
    return n;
  }
  function endRound(h,today,gallery,restart) {
    if (h.status!=='ready') return false;
    gallery.push({id:makeId(),habitName:h.name,goalDays:h.goalDays,finishedOn:h.completedDates[h.completedDates.length-1] || today,pattern:h.pattern,pixelColors:h.pixelColors ? [...h.pixelColors] : null,round:h.round});
    if (restart) {
      h.round++;
      h.roundStart=addDays(today,1); // Can't complete two rounds on one calendar day.
      h.lastReviewed=today;
      h.completedDates=[];h.skippedDates=[];h.progress=0;h.streak=0;h.freezes=0;h.usedFreezes=0;h.resets=0;h.status='active';
    } else { h.status='ended'; }
    return true;
  }
  function guessRecentStreak(completed,weekdays,today) {
    const set=new Set(completed);let d=today,streak=0;
    if (weekdays.includes(weekday(d)) && !set.has(d)) d=addDays(d,-1);
    for(let n=0;n<3650;n++,d=addDays(d,-1)) {
      if (!weekdays.includes(weekday(d))) continue;
      if (!set.has(d)) break;
      streak++;
    }
    return streak;
  }
  function migrateLegacy(legacy,today) {
    if (!Array.isArray(legacy)) throw Error('Old habit data is not a list.');
    const cats=DEFAULT_CATEGORIES.map(c=>({...c}));
    const habits=[];
    for (const old of legacy) {
      if (!old || typeof old.name!=='string') continue;
      const catName=String(old.category || 'Other');
      let cat=cats.find(c=>c.name===catName);
      if(!cat){cat={id:makeId(),name:catName,emoji:'✦'};cats.push(cat);}
      const weeks=Array.isArray(old.weekdays) ? old.weekdays.filter(d=>DAYS.includes(d)) : [];
      const completions=Array.isArray(old.completedDates) ? [...new Set(old.completedDates.filter(goodDate))].sort() : [];
      // Missing start dates were never recorded; do not invent past penalties.
      const start=goodDate(old.startDate) && old.startDate<=today ? old.startDate : today;
      const goal=Number.isSafeInteger(Number(old.goalDays)) && Number(old.goalDays)>0 ? clamp(Number(old.goalDays),1,10000) : 30;
      const progress=clamp(completions.length,0,goal);
      const alreadyToday=completions.includes(today);
      habits.push({id:String(old.id ?? makeId()),name:old.name,categoryId:cat.id,goalDays:goal,weekdays:weeks,startDate:start,roundStart:start,
        // Initialize from today rather than imposing resets based on days before the upgrade.
        lastReviewed:alreadyToday?today:addDays(today,-1),completedDates:completions,progress,
        streak:guessRecentStreak(completions,weeks,today),freezes:clamp(Number(old.streakFreezes)||0,0,2),usedFreezes:0,resets:0,
        status:progress>=goal?'ready':'active',round:1,pattern:'flower',pixelColors:null,legacy:true,allowSkip:false,skippedDates:[]});
    }
    return {version:2,categories:cats,habits,tasks:[],gallery:[],settings:{themeId:'sage',customTheme:null}};
  }
  function blankState(){return {version:2,categories:DEFAULT_CATEGORIES.map(c=>({...c})),habits:[],tasks:[],gallery:[],settings:{themeId:'sage',customTheme:null}};}
  function validState(s) {
    return s && s.version===2 && s.settings && typeof s.settings==='object' && Array.isArray(s.categories) && Array.isArray(s.habits) && Array.isArray(s.tasks) && Array.isArray(s.gallery)
      && (s.diary===undefined || (Array.isArray(s.diary) && s.diary.every(e=>e && typeof e.id==='string' && goodDate(e.date) && typeof e.title==='string' && typeof e.text==='string')))
      && s.categories.every(c=>c && typeof c.id==='string' && typeof c.name==='string')
      && s.tasks.every(t=>t && typeof t.id==='string' && typeof t.name==='string' && Array.isArray(t.items) && t.items.every(i=>i && typeof i.id==='string' && typeof i.text==='string' && typeof i.done==='boolean'))
      && s.gallery.every(g=>g && typeof g.id==='string' && typeof g.habitName==='string' && Number.isInteger(g.goalDays) && g.goalDays>0)
      && s.habits.every(h=>h && typeof h.name==='string' && typeof h.categoryId==='string' && Number.isInteger(h.goalDays) && h.goalDays>=1 && h.goalDays<=10000
        && Array.isArray(h.weekdays) && Array.isArray(h.completedDates) && Number.isFinite(h.progress) && Number.isFinite(h.streak) && Number.isFinite(h.freezes));
  }
  return {DAYS,DEFAULT_CATEGORIES,THEMES,goodDate,dateKey,dateFromKey,addDays,weekday,dayScheduled,makeId,makeHabit,reviewUntil,complete,skip,undoSkip,nextDayNumber,endRound,migrateLegacy,blankState,validState,clamp};
});
