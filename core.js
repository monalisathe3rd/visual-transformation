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
    {id:'lavender',name:'Lavender Haze',bg:'#F7F5FA',paper:'#FFFFFF',text:'#484359',muted:'#8D849E',accent:'#9386B3',soft:'#EDE7F7',outline:'#E5E0ED'}
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
    return {id:makeId(),name:String(name).trim(),categoryId,goalDays:Number(goalDays),weekdays:[...weekdays],startDate,roundStart:startDate,lastReviewed:addDays(startDate,-1),completedDates:[],progress:0,streak:0,freezes:0,usedFreezes:0,resets:0,status:'active',round:1,pattern,pixelColors:null};
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
      if (dayScheduled(h,cursor) && !h.completedDates.includes(cursor)) {
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
      h.completedDates=[];h.progress=0;h.streak=0;h.freezes=0;h.usedFreezes=0;h.resets=0;h.status='active';
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
        status:progress>=goal?'ready':'active',round:1,pattern:'flower',pixelColors:null,legacy:true});
    }
    return {version:2,categories:cats,habits,tasks:[],gallery:[],settings:{themeId:'sage',customTheme:null}};
  }
  function blankState(){return {version:2,categories:DEFAULT_CATEGORIES.map(c=>({...c})),habits:[],tasks:[],gallery:[],settings:{themeId:'sage',customTheme:null}};}
  function validState(s) {
    return s && s.version===2 && s.settings && typeof s.settings==='object' && Array.isArray(s.categories) && Array.isArray(s.habits) && Array.isArray(s.tasks) && Array.isArray(s.gallery)
      && s.categories.every(c=>c && typeof c.id==='string' && typeof c.name==='string')
      && s.tasks.every(t=>t && typeof t.id==='string' && typeof t.name==='string' && Array.isArray(t.items) && t.items.every(i=>i && typeof i.id==='string' && typeof i.text==='string' && typeof i.done==='boolean'))
      && s.gallery.every(g=>g && typeof g.id==='string' && typeof g.habitName==='string' && Number.isInteger(g.goalDays) && g.goalDays>0)
      && s.habits.every(h=>h && typeof h.name==='string' && typeof h.categoryId==='string' && Number.isInteger(h.goalDays) && h.goalDays>=1 && h.goalDays<=10000
        && Array.isArray(h.weekdays) && Array.isArray(h.completedDates) && Number.isFinite(h.progress) && Number.isFinite(h.streak) && Number.isFinite(h.freezes));
  }
  return {DAYS,DEFAULT_CATEGORIES,THEMES,goodDate,dateKey,dateFromKey,addDays,weekday,dayScheduled,makeId,makeHabit,reviewUntil,complete,nextDayNumber,endRound,migrateLegacy,blankState,validState,clamp};
});
