/* Visual Transformation — screen layout, storage and interactions. */
(() => {
  'use strict';
  const C = window.VTCore;
  const KEY = 'vtStateV2';
  const screen = document.getElementById('screen');
  const dialog = document.getElementById('editor');
  const dialogContent = document.getElementById('dialogContent');
  const toastNode = document.getElementById('toast');
  const today = () => C.dateKey(new Date());
  let view = { page:'home', categoryId:null, all:false, artId:null, artType:'habit' };
  const ensureState = value => { if(!Array.isArray(value.sharedPictures)) value.sharedPictures=[]; return value; };
  let state = loadState();
  let toastTimer;
  let picturePickerPending = null;
  const sharedOf = id => state.sharedPictures.find(p=>p.id===id);
  const linkedPicture = h => h?.sharedPictureId ? sharedOf(h.sharedPictureId) : null;
  const memberHabits = p => (p.habitIds||[]).map(habitOf).filter(Boolean);
  function sharedStats(p){
    const members=memberHabits(p);
    const goalDays=members.reduce((n,h)=>n+h.goalDays,0);
    const progress=p.archived?goalDays:members.reduce((n,h)=>n+Math.min(h.goalDays,Math.max(h.progress,Number(p.credited?.[h.id]||0))),0);
    return {goalDays,progress,members};
  }
  function sharedDisplay(p){
    const stats=sharedStats(p);
    return {...p,goalDays:Math.max(1,stats.goalDays),progress:stats.progress,round:1};
  }
  function archiveSharedIfFinished(p){
    if(!p || p.archived)return false;
    const v=sharedStats(p);
    if(!v.goalDays || v.progress<v.goalDays)return false;
    state.gallery.push({id:C.makeId(),habitName:p.name,goalDays:v.goalDays,
      finishedOn:today(),pattern:p.pattern,pixelColors:p.pixelColors?[...p.pixelColors]:null,round:1,shared:true});
    p.archived=true;
    return true;
  }
  function tidySharedPictures(){
    // Each habit may belong to at most one shared image.
    state.sharedPictures.forEach(p=>{
      p.habitIds=(p.habitIds||[]).filter(id=>habitOf(id)?.sharedPictureId===p.id);
    });
    const dropped=state.sharedPictures.filter(p=>p.habitIds.length<2);
    dropped.forEach(p=>p.habitIds.forEach(id=>{const h=habitOf(id);if(h)h.sharedPictureId=null;}));
    state.sharedPictures=state.sharedPictures.filter(p=>p.habitIds.length>=2);
  }
  function mix(a,b,t){
    const part=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
    const x=part(a),y=part(b);
    return '#'+x.map((v,i)=>Math.round(v*(1-t)+y[i]*t).toString(16).padStart(2,'0')).join('').toUpperCase();
  }
  function brightness(hex){
    return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
      .map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4)
      .reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  }
  function darkPalette(t){
    if(t.group!=='pinterest')return t;
    const colors=[...t.swatches].sort((a,b)=>brightness(a)-brightness(b));
    const darkest=colors[0],lightest=colors.at(-1),second=colors[1]||darkest;
    // Keep the darkest palette shade in the background and the lightest shade
    // for text/buttons. Slight blends add depth without introducing foreign hues.
    return {...t,bg:darkest,paper:mix(darkest,second,.35),text:lightest,
      muted:lightest,accent:lightest,accentInk:darkest,
      soft:mix(darkest,lightest,.14),outline:mix(darkest,lightest,.31)};
  }
  const patternNames = {flower:'Wildflower',heart:'Little Heart',sunrise:'Sunrise',mountain:'Mountains',plant:'Growing Plant',star:'Starlight'};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const button = (label,action,extra='',cls='button') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
  const plural = (n,singular,other=singular+'s') => `${n} ${n===1?singular:other}`;
  const categoryOf = id => state.categories.find(c=>c.id===id);
  const habitOf = id => state.habits.find(h=>h.id===id);

  function loadState() {
    try {
      const newData = localStorage.getItem(KEY);
      if(newData){
        const parsed=JSON.parse(newData);
        if (C.validState(parsed)) return ensureState(parsed);
        console.warn('Stored newer app data did not validate; old data was kept untouched.');
      }
      const old = localStorage.getItem('vtHabits');
      if(old){
        const data=C.migrateLegacy(JSON.parse(old),today());
        localStorage.setItem(KEY, JSON.stringify(data));
        return ensureState(data);
      }
    } catch(err) { console.warn('Storage could not be loaded; original data was not erased.',err); }
    return ensureState(C.blankState());
  }
  function save() {
    try {localStorage.setItem(KEY,JSON.stringify(state));return true;}
    catch(e){console.error(e);toast('Unable to save. Storage may be full — export a backup.');return false;}
  }
  function toast(msg) {
    toastNode.textContent=msg;
    toastNode.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toastNode.classList.remove('visible'),3000);
  }
  function review() {
    let changed=false, resets=0, spent=0;
    state.habits.forEach(h=>{
      const r=h.resets||0, f=h.usedFreezes||0;
      if(C.reviewUntil(h,today())) changed=true;
      resets+=(h.resets||0)-r;
      spent+=(h.usedFreezes||0)-f;
    });
    if(changed)save();
    if(resets)toast(`${plural(resets,'habit')} restarted after an unprotected missed day.`);
    else if(spent)toast(`${plural(spent,'Streak Freeze')} protected your progress! ❄`);
  }
  function due(h,date=today()){return h.status==='active'&&C.dayScheduled(h,date)&&!h.completedDates.includes(date)&&!(h.skippedDates||[]).includes(date);}
  function status(h){
    if(h.status==='ended')return 'Finished';
    if(h.status==='ready')return 'Goal reached';
    if(h.completedDates.includes(today()))return 'Completed today';
    if((h.skippedDates||[]).includes(today()))return 'Skipped today · streak protected';
    if(C.dayScheduled(h,today()))return 'Due today';
    return 'Not scheduled today';
  }
  function countDue(catId){return state.habits.filter(h=>h.categoryId===catId&&due(h)).length;}
  function totalDone(){return state.habits.filter(h=>h.completedDates.includes(today())).length;}
  function readableInk(hex){
    if(!/^#[0-9a-fA-F]{6}$/.test(hex||'')) return '#FFFFFF';
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
    const [r,g,b]=rgb.map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));
    return 0.2126*r+0.7152*g+0.0722*b>0.18?'#17211B':'#FFFFFF';
  }
  function activeTheme(){
    if(state.settings?.themeId==='custom' && state.settings?.customTheme) return state.settings.customTheme;
    return darkPalette(C.THEMES.find(t=>t.id===state.settings?.themeId) || C.THEMES[0]);
  }
  function applyTheme(){
    const theme=activeTheme();
    document.body.classList.toggle('pinterest-dark',theme.group==='pinterest');
    const colors={bg:theme.bg,paper:theme.paper,text:theme.text,muted:theme.muted,accent:theme.accent,
      'accent-ink':theme.accentInk||readableInk(theme.accent),soft:theme.soft,line:theme.outline};
    Object.entries(colors).forEach(([key,val])=>document.documentElement.style.setProperty('--'+key,val));
    const meta=document.getElementById('themeMeta');if(meta)meta.content=theme.bg;
  }
  function navigate(page,opts={}) {
    view={...view,page,...opts};
    render();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function render(){
    review();
    applyTheme();
    document.getElementById('dateBadge').textContent=new Date().toLocaleDateString(undefined,{month:'short',day:'numeric'});
    document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===(view.page==='category'?'home':view.page==='art'?'gallery':view.page)));
    if(view.page==='category')renderCategory();
    else if(view.page==='tasks')renderTasks();
    else if(view.page==='gallery')renderGallery();
    else if(view.page==='settings')renderSettings();
    else if(view.page==='art')renderArtwork();
    else renderHome();
    drawCanvases();
  }
  function renderHome(){
    const remaining=state.habits.filter(h=>due(h)).length;
    const freezes=state.habits.filter(h=>h.status==='active').reduce((sum,h)=>sum+h.freezes,0);
    screen.innerHTML=`
      <div class="hero"><div><div class="eyebrow">YOUR LITTLE DAILY RITUALS</div>
        <h1 class="heading">A little better,<br>every day.</h1>
        <p class="lede" style="margin-bottom:0">Every habit you keep becomes a picture you can see.</p></div>
        <div class="hero-flower" aria-hidden="true">✿</div></div>
      <div class="stats">
        <div class="panel"><div class="tiny-label">Left today</div><div class="big-number">${remaining}</div></div>
        <div class="panel"><div class="tiny-label">Done today</div><div class="big-number">${totalDone()}</div></div>
        <div class="panel"><div class="tiny-label">❄ Freezes saved</div><div class="big-number">${freezes}</div></div>
      </div>
      <div class="topline"><h2 class="section-title">My habit categories</h2>${button('+ Category','category-new','','button soft')}</div>
      <div class="category-grid">${state.categories.map(c=>`
        <button type="button" class="category-card" data-action="category-open" data-id="${esc(c.id)}">
          <span class="cat-emoji">${esc(c.emoji||'✦')}</span>
          <span class="cat-name">${esc(c.name)}</span>
          <span class="cat-bottom"><span>${plural(state.habits.filter(h=>h.categoryId===c.id&&h.status!=='ended').length,'habit')}</span><strong>${countDue(c.id)} left today →</strong></span>
        </button>`).join('')}</div>
      ${state.categories.length?'':'<div class="empty">Create a category to begin.</div>'}
      <div class="hint" style="margin-top:22px">Tap a category to see today’s habits. Your completed habits disappear from the daily view until their next scheduled day.</div>`;
  }
  function renderCategory(){
    const cat=categoryOf(view.categoryId);
    if(!cat){navigate('home');return;}
    const all=state.habits.filter(h=>h.categoryId===cat.id);
    const active=all.filter(h=>h.status==='active');
    const pending=active.filter(h=>due(h));
    const weekDays=Array.from({length:7},(_,i)=>C.addDays(today(),i));
    const visible=view.all?all:pending;
    screen.innerHTML=`
      ${button('← All categories','home','','back')}
      <div class="topline"><div><div class="eyebrow">HABIT CATEGORY</div><h1 class="heading">${esc(cat.emoji||'✦')} ${esc(cat.name)}</h1><p class="lede">${plural(pending.length,'habit')} left to do today</p></div>
      <div class="row">${button('+ Add Habit','habit-new',`data-category="${esc(cat.id)}"`,'button primary')}${button('Edit category','category-edit',`data-id="${esc(cat.id)}"`,'button')}</div></div>
      <div class="row" style="margin:12px 0 19px">${button('○ Today’s habits','show-today','',view.all?'button small':'button small soft')}${button('☰ View all habits','show-all','',view.all?'button small soft':'button small')}</div>
      <div class="panel"><div class="topline"><strong>${view.all?'Full habit tracker':'Today’s unfinished habits'}</strong><span class="muted small-text">Week starts with today ↓</span></div>
      ${!visible.length?`<div class="empty" style="margin-top:14px"><span class="illustration">${view.all?'✎':'✿'}</span>${view.all?'No habits in this category yet.':'You’re all caught up for today!'}<br><span class="small-text">${view.all?'Add a habit to begin.':'Switch to View all habits to see upcoming or finished habits.'}</span></div>`:`
      <div class="tracker-scroller" style="margin-top:15px"><table class="tracker"><thead><tr><th>Day</th>${visible.map(h=>`<th scope="col" title="${esc(h.name)}"><span class="grid-head-name">${esc(h.name)}</span><span class="grid-head-progress">${h.status==='active'?'Day '+(h.progress+1)+' / '+h.goalDays:h.progress+' / '+h.goalDays}</span></th>`).join('')}</tr></thead>
      <tbody>${weekDays.map((day,i)=>`<tr class="${i===0?'today-row':''}"><td>${i===0?'● ':''}${esc(C.weekday(day))}<div class="muted" style="font-size:10px">${day.slice(5)}</div></td>${visible.map(h=>{
        if(h.status!=='active')return '<td><span class="grid-dash">—</span></td>';
        if(!C.dayScheduled(h,day))return '<td><span class="grid-dash">—</span></td>';
        if(h.completedDates.includes(day))return '<td><span class="grid-circle complete" aria-label="Completed">✓</span></td>';
        if((h.skippedDates||[]).includes(day))return '<td><span class="grid-circle complete" aria-label="Skipped">↷</span></td>';
        if(i!==0)return '<td><span class="grid-circle" aria-label="Upcoming habit">·</span></td>';
        return `<td><button type="button" class="grid-circle due" data-action="habit-done" data-id="${esc(h.id)}" aria-label="Complete ${esc(h.name)} today">○</button></td>`;
      }).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="muted small-text" style="margin:13px 0 0">Tap today's circle to complete a habit. Future-day circles are a schedule preview, not early check-ins.</p>`}
      </div>
      <div class="topline"><h2 class="section-title">${view.all?'Every habit':'Up next today'}</h2><span class="muted small-text">${view.all?all.length:pending.length} shown</span></div>
      <div class="habit-list">${visible.map(h=>renderHabitCard(h)).join('')||'<div class="empty">Nothing to show here right now.</div>'}</div>`;
  }
  function renderHabitCard(h){
    const done=h.completedDates.includes(today());
    return `<div class="habit-card">
      ${due(h)?`<button class="check-circle" type="button" data-action="habit-done" data-id="${esc(h.id)}" aria-label="Complete ${esc(h.name)}">○</button>`:`<span class="check-circle" style="opacity:.5" aria-hidden="true">${done?'✓':'·'}</span>`}
      <div class="habit-main"><strong>${esc(h.name)}</strong>
        <div class="detail">${esc(status(h))} · ${h.progress}/${h.goalDays} days · 🔥 ${h.streak} · ❄ ${h.freezes}/2</div>
        <div class="progress-track"><div style="width:${Math.min(100,100*h.progress/h.goalDays)}%"></div></div>
        <div class="detail">${h.weekdays.length===7?'Every day':h.weekdays.map(d=>esc(d)).join(' · ')||'No weekdays set'}</div>
      </div>
      <div class="mini-actions">
        ${button('▦ Art','art-open',`data-id="${esc(linkedPicture(h)?.id||h.id)}" data-type="${linkedPicture(h)?'shared':'habit'}"`,'button small soft')}
        ${due(h)&&h.allowSkip?button('↷ Skip today','habit-skip',`data-id="${esc(h.id)}"`,'button small'):''}
        ${(h.skippedDates||[]).includes(today())?button('Undo skip','habit-undo-skip',`data-id="${esc(h.id)}"`,'button small'):''}
        ${button('Edit','habit-edit',`data-id="${esc(h.id)}"`,'button small')}
        ${h.status==='ready'?button('Finish / repeat','round-finish',`data-id="${esc(h.id)}"`,'button small primary'):''}
      </div>
    </div>`;
  }
  function renderTasks(){
    const complete=state.tasks.reduce((n,s)=>n+s.items.filter(t=>t.done).length,0);
    const total=state.tasks.reduce((n,s)=>n+s.items.length,0);
    screen.innerHTML=`<div class="eyebrow">KEEP LIFE ORGANIZED</div><div class="topline"><div><h1 class="heading">My task sheets</h1><p class="lede">Simple checklists, separate from your habits.</p></div>${button('+ New sheet','sheet-new','','button primary')}</div>
      <div class="subtle-panel" style="margin-bottom:18px"><strong>${plural(state.tasks.length,'sheet')}</strong> · ${complete} of ${total} tasks checked off <span class="muted small-text">(Task sheets never affect streaks.)</span></div>
      ${state.tasks.length?state.tasks.map(s=>`<section class="task-sheet">
        <div class="topline"><div><h2 style="margin:0;font-size:20px;font-family:Georgia,serif;font-weight:normal">${esc(s.name)}</h2><span class="muted small-text">${s.items.filter(t=>t.done).length}/${s.items.length} completed</span></div>
          <div class="row">${button('Rename','sheet-rename',`data-id="${esc(s.id)}"`,'button small')}${button('Delete','sheet-delete',`data-id="${esc(s.id)}"`,'button small danger')}</div></div>
        <div>${s.items.map(item=>`<div class="task-item ${item.done?'done':''}"><input type="checkbox" data-sheet="${esc(s.id)}" data-item="${esc(item.id)}" id="task-${esc(item.id)}" ${item.done?'checked':''}><label for="task-${esc(item.id)}">${esc(item.text)}</label>${button('×','task-delete',`data-sheet="${esc(s.id)}" data-id="${esc(item.id)}" aria-label="Delete task"`,'button small')}</div>`).join('')||'<p class="muted small-text">This sheet is empty. Add your first task below.</p>'}</div>
        <form data-form="task-add" data-sheet="${esc(s.id)}" class="task-add"><input name="text" type="text" placeholder="Write a new task…" maxlength="200" required aria-label="New task"><button class="button primary" type="submit">+ Add</button></form>
        ${s.items.some(t=>t.done)?`<div style="margin-top:12px">${button('Clear checked tasks','task-clear',`data-id="${esc(s.id)}"`,'button small')}</div>`:''}
      </section>`).join(''):'<div class="empty"><span class="illustration">☑</span>No task sheets yet.<br>Create a sheet for chores, projects, or anything else.</div>'}`;
  }
  function renderGallery(){
    const ongoing=state.habits.filter(h=>h.status!=='ended' && !linkedPicture(h));
    const shared=state.sharedPictures.filter(p=>memberHabits(p).length>=2);
    screen.innerHTML=`<div class="eyebrow">YOUR VISUAL PROGRESS</div><h1 class="heading">Pixel gallery</h1>
      <p class="lede">Every successful habit completion reveals one pixel. A picture can belong to one habit, or several together.</p>
      <div class="row" style="margin-bottom:20px">${button('+ Create shared picture','picture-new','','button primary')}</div><p class="hint">To upload your own photo: tap any growing picture below → <strong>Upload my own image</strong> → select a JPG or PNG. For a shared image, first create a shared picture.</p>
      <h2 class="section-title">Growing right now</h2>
      <div class="gallery-grid">${ongoing.map(h=>galleryCard(h,'habit')).join('')}${shared.map(p=>galleryCard(sharedDisplay(p),'shared')).join('')||'<div class="empty">Your habits will create art here.</div>'}</div>
      <h2 class="section-title">Completed pieces ✦</h2>
      <div class="gallery-grid">${state.gallery.map(g=>galleryCard(g,'gallery')).join('')||'<div class="empty">Complete a habit round or shared picture to save finished pixel art here!</div>'}</div>`;
  }
  function galleryCard(x,type){
    const goal=x.goalDays;
    const current=type==='gallery'?goal:x.progress;
    const associated=type==='shared'?`<span class="muted small-text">${memberHabits(x).map(h=>esc(h.name)).join(' + ')}</span>`:'';
    return `<button class="gallery-card" data-action="art-open" data-id="${esc(x.id)}" data-type="${type}" type="button" style="color:var(--text);cursor:pointer">
      <canvas class="pixel-canvas" data-pixel-id="${esc(x.id)}" data-pixel-type="${type}" aria-label="${esc(x.habitName||x.name)} pixel artwork, ${current} of ${goal} pixels revealed"></canvas>
      <strong>${esc(x.habitName||x.name)}</strong>${associated}<span class="muted small-text">${current}/${goal} squares revealed</span></button>`;
  }
  function renderArtwork(){
    const isGallery=view.artType==='gallery',isShared=view.artType==='shared';
    const real=isGallery?state.gallery.find(g=>g.id===view.artId):isShared?sharedOf(view.artId):habitOf(view.artId);
    if(!real){navigate('gallery');return;}
    const x=isShared?sharedDisplay(real):real;
    const done=isGallery?x.goalDays:x.progress;
    const associated=isShared?`<p class="muted small-text">Connected habits: ${memberHabits(real).map(h=>esc(h.name)).join(', ')}</p>`:'';
    screen.innerHTML=`${button('← Pixel gallery','gallery','','back')}
      <div class="eyebrow">ONE SQUARE AT A TIME</div><h1 class="heading">${esc(x.name||x.habitName)}</h1>
      <p class="lede">${done} of ${x.goalDays} pixels revealed. ${isGallery?'A completed achievement!':isShared?'One pixel for every completed scheduled day across all linked habits.':'Your picture reveals itself as you complete scheduled habit days.'}</p>
      ${associated}
      <div class="panel" style="text-align:center">
        <canvas class="pixel-canvas pixel-large" data-pixel-id="${esc(x.id)}" data-pixel-type="${view.artType}" role="img" aria-label="Pixel art: ${done} of ${x.goalDays} pixels revealed"></canvas>
        <div class="progress-track"><div style="width:${Math.min(100,done*100/x.goalDays)}%"></div></div>
        <div class="row between" style="margin-top:15px"><span class="muted small-text">${Math.round(done*100/x.goalDays)}% uncovered</span><span class="pill">${esc(patternNames[x.pattern]||'Custom picture')}</span></div>
      </div>
      ${!isGallery && !real.archived?`<div class="panel" style="margin-top:18px"><h2 style="margin:0 0 7px">Choose your pixel picture</h2><p class="muted small-text">Changing artwork doesn't change your habit progress.</p>
        <div class="row" style="margin-top:12px">${button('Change pattern',isShared?'picture-pattern':'art-pattern',`data-id="${esc(x.id)}"`,'button')}${button('Upload my own image','art-upload',`data-id="${esc(x.id)}"`,'button soft')}${isShared?button('Edit linked habits','picture-edit',`data-id="${esc(x.id)}"`,'button'):''}</div>
        <p class="muted small-text" style="margin:12px 0 0">To upload: tap <strong>Upload my own image</strong>, choose a JPG or PNG, then wait for the confirmation. Every completed day reveals one colored square. Everything stays on this device.</p>
        ${x.pixelColors?.length===x.goalDays?`<div class="image-upload-confirm">✓ Your custom picture is saved on this device.</div><p class="small-text muted" style="margin:9px 0">Picture preview (the finished image, before all squares are revealed):</p><canvas class="pixel-canvas pixel-preview" data-pixel-id="${esc(x.id)}" data-pixel-type="${view.artType}" data-preview="true" role="img" aria-label="Preview of selected pixel picture"></canvas>`:''}</div>`:''}
      <div class="hint" style="margin-top:18px">${isShared?'If a linked habit resets, the pixels earned by that habit in its current round disappear. Other habits keep their pixels.':'A missed day without a freeze clears the revealed squares, but keeps the picture design so you can try again.'}</div>`;
  }
  function renderSettings(){
    const pinterest=C.THEMES.filter(t=>t.group==='pinterest');
    const starters=C.THEMES.filter(t=>t.group!=='pinterest');
    const editor=activeTheme();
    const fields=[
      ['bg','Background'],['paper','Cards & panels'],['text','Main text'],
      ['muted','Secondary text'],['accent','Buttons & accents'],
      ['soft','Highlighted areas'],['outline','Borders']
    ];
    const card=t=>`<button type="button" class="theme-card ${state.settings.themeId===t.id?'selected':''}"
      data-action="theme-set" data-id="${esc(t.id)}" aria-pressed="${state.settings.themeId===t.id?'true':'false'}">
      <span class="swatches">${(t.swatches||[t.bg,t.text,t.accent,t.soft]).map(c=>`<i style="background:${esc(c)}"></i>`).join('')}</span>
      <span class="theme-name">${esc(t.name)}</span>
      <span class="selected-text">${state.settings.themeId===t.id?'✓ Selected':'Tap to apply'}</span>
    </button>`;
    const custom=state.settings.customTheme?`<div class="theme-grid">${card({...state.settings.customTheme,id:'custom',name:'My Custom Theme',swatches:fields.map(([key])=>state.settings.customTheme[key])})}</div>`:'';
    screen.innerHTML=`<div class="eyebrow">MAKE IT YOURS</div><h1 class="heading">Settings</h1>
      <p class="lede">Choose a theme anytime. Your habits, task sheets, and progress will stay the same.</p>
      <h2 class="section-title">Your Pinterest palettes · ${pinterest.length} themes</h2>
      <p class="muted small-text">For every Pinterest palette, the darkest color becomes the background and the lightest becomes the text and main buttons. The theme never borrows a color from another photo.</p>
      <div class="theme-grid">${pinterest.map(card).join('')}</div>
      <h2 class="section-title">Original themes</h2><div class="theme-grid">${starters.map(card).join('')}</div>
      <h2 class="section-title">Customize your own</h2>
      <div class="panel"><p class="muted small-text" style="margin-top:0">Start from the currently selected palette, adjust any color, then save it as your custom theme. You can return to the Pinterest palettes anytime.</p>
        ${custom}
        <form data-form="theme-custom">
          <div class="theme-editor">${fields.map(([key,label])=>`<label class="color-field"><span>${esc(label)}</span><input name="${key}" type="color" value="${esc(editor[key])}" aria-label="${esc(label)}" required></label>`).join('')}</div>
          <button type="submit" class="button primary" style="margin-top:15px">Save My Custom Theme</button>
        </form>
      </div>
      <h2 class="section-title">Your data</h2>
      <div class="panel"><p class="muted small-text" style="margin:0 0 15px">Your habits and checklists are saved in this device's browser. They won't automatically sync with another phone or laptop.</p>
        <div class="row">${button('↓ Download backup','backup-download','','button primary')}${button('↑ Restore backup','backup-restore','','button')}</div>
        <p class="muted small-text" style="margin:12px 0 0">Restoring replaces current data. Always save a fresh backup first. Your original older app data is also left untouched during the upgrade.</p>
      </div>
      <h2 class="section-title">Install on your phone</h2><div class="panel"><p style="margin-top:0">Once uploaded to GitHub Pages, open the app in Chrome on your Android phone. Use Chrome's menu and choose <strong>Add to Home screen</strong> or <strong>Install app</strong> if available.</p>
        <p class="muted small-text">After the first online visit, the app's files can be saved for offline use. Back up your progress before clearing browser data, uninstalling, or changing devices.</p></div>`;
  }
  function drawCanvases(){
    document.querySelectorAll('canvas[data-pixel-id]').forEach(canvas=>{
      const x=canvas.dataset.pixelType==='gallery'?state.gallery.find(g=>g.id===canvas.dataset.pixelId):canvas.dataset.pixelType==='shared'?sharedDisplay(sharedOf(canvas.dataset.pixelId)):habitOf(canvas.dataset.pixelId);
      if(!x)return;
      drawPixels(canvas,x,canvas.dataset.preview==='true'?x.goalDays:canvas.dataset.pixelType==='gallery'?x.goalDays:x.progress);
    });
  }
  function patternColor(pattern,x,y){
    const r=Math.sqrt((x-.5)**2+(y-.39)**2);
    if(pattern==='heart'){
      const X=(x-.5)*2.5,Y=(.52-y)*2.5;
      return Math.pow(X*X+Y*Y-1,3)-X*X*Math.pow(Y,3)<=0?'#BD758B':'#F4E9E8';
    }
    if(pattern==='sunrise'){
      if(y>.66)return x>.5?'#79918A':'#597D7A';
      if(Math.sqrt((x-.5)**2+(y-.72)**2)<.32)return '#EFC67C';
      return y<.34?'#B3CED7':'#E9B4A0';
    }
    if(pattern==='mountain'){
      if(y>.75)return '#6F8D7A';
      if(y> .31+Math.abs(x-.33)*1.4 || y>.37+Math.abs(x-.72)*1.8)return y<.48?'#DAD8CB':'#8299A2';
      return '#DBE9EA';
    }
    if(pattern==='plant'){
      if(y>.85)return '#B98778';
      if(Math.abs(x-.5)<.05&&y>.31)return '#66876A';
      if((Math.pow((x-(.5+Math.sin(y*8)*.19))/.22,2)+Math.pow((y-.43)/.13,2)<1) ||
         (Math.pow((x-(.5-Math.sin(y*7)*.20))/.22,2)+Math.pow((y-.61)/.12,2)<1))return '#69966E';
      return '#F0F0DF';
    }
    if(pattern==='star'){
      const ang=Math.atan2(y-.48,x-.5);
      const rad=Math.sqrt((x-.5)**2+(y-.48)**2);
      return rad<(.22+.12*Math.cos(5*ang))?'#E9C47B':'#697C9C';
    }
    if(r<.12)return '#E9C86D';
    for(let i=0;i<7;i++){
      const a=i*2*Math.PI/7;
      if(Math.hypot(x-(.5+.22*Math.cos(a)),y-(.39+.22*Math.sin(a)))<.17)return '#BE91A1';
    }
    if(Math.abs(x-.5)<.035&&y>.53)return '#759A73';
    if(y>.60&&((x>.49&&x<.78&&Math.abs(y-(.9-(x-.5)*.55))<.08)||(x<.5&&x>.22&&Math.abs(y-(.8+(x-.5)*.6))<.08)))return '#85A68C';
    return '#EDF0E5';
  }
  const orderCache=new Map();
  function revealOrder(key,n){
    const k=key+':'+n;
    if(orderCache.has(k))return orderCache.get(k);
    let seed=2166136261;
    for(const char of k) seed=Math.imul(seed ^ char.charCodeAt(0),16777619)>>>0;
    let a=Array.from({length:n},(_,i)=>i);
    for(let i=n-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[a[i],a[j]]=[a[j],a[i]];}
    const rank=new Uint32Array(n);
    a.forEach((position,i)=>{rank[position]=i;});
    if(orderCache.size>80)orderCache.clear();
    orderCache.set(k,rank);return rank;
  }
  function drawPixels(canvas,x,done){
    const count=x.goalDays;
    const cols=Math.ceil(Math.sqrt(count));
    const rows=Math.ceil(count/cols);
    const px=count>2500?9:count>900?13:20;
    const gap=1;
    canvas.width=cols*px;
    canvas.height=rows*px;
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    const rank=revealOrder(String(x.id)+':'+(x.round||1),count);
    ctx.fillStyle='#E9ECE5';ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let i=0;i<count;i++){
      const col=i%cols,row=Math.floor(i/cols);
      ctx.fillStyle=rank[i]<done?(x.pixelColors?.[i]||patternColor(x.pattern||'flower',(col+.5)/cols,(row+.5)/rows)):'#D7DED5';
      ctx.fillRect(col*px+gap,row*px+gap,px-2*gap,px-2*gap);
    }
  }
  function openDialog(html){dialogContent.innerHTML=html;dialog.showModal();const first=dialog.querySelector('input:not([type=hidden]),textarea');if(first)first.focus();}
  function closeDialog(){if(dialog.open)dialog.close();dialogContent.replaceChildren();}
  function categoryDialog(cat=null){
    openDialog(`<button class="dialog-close" type="button" data-action="dialog-close" aria-label="Close">×</button>
      <h2>${cat?'Edit category':'New category'}</h2><form data-form="category" data-id="${esc(cat?.id||'')}">
      <label class="form-label" for="catName">Category name</label><input id="catName" name="name" type="text" maxlength="45" value="${esc(cat?.name||'')}" placeholder="e.g. Learning" required>
      <label class="form-label" for="catEmoji">Symbol or emoji</label><input id="catEmoji" name="emoji" type="text" maxlength="6" value="${esc(cat?.emoji||'✿')}">
      <div class="form-foot">${cat?button('Delete category','category-delete',`data-id="${esc(cat.id)}"`,'button danger'):''}<button class="button primary" type="submit">Save category</button></div></form>`);
  }
  function habitDialog(h=null,categoryId=null){
    const name=h?.name||'',goal=h?.goalDays||30,week=h?.weekdays||[...C.DAYS],selected=h?.categoryId||categoryId||state.categories[0]?.id;
    openDialog(`<button class="dialog-close" type="button" data-action="dialog-close" aria-label="Close">×</button>
      <h2>${h?'Edit habit':'Create a habit'}</h2><form data-form="habit" data-id="${esc(h?.id||'')}">
      <label class="form-label" for="habitName">Habit name</label><input id="habitName" name="name" type="text" required maxlength="90" value="${esc(name)}" placeholder="e.g. Morning walk">
      <label class="form-label" for="habitCategory">Category</label><select id="habitCategory" name="categoryId">${state.categories.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
      <label class="form-label" for="habitGoal">Successful days in this round</label><input id="habitGoal" name="goalDays" type="number" min="1" max="10000" step="1" value="${goal}" required>
      <label class="form-label" for="habitStart">Start date</label><input id="habitStart" name="startDate" type="date" value="${esc(h?.startDate||today())}" required ${h?.progress?'disabled':''}>
      ${h?.progress?'<div class="muted small-text">A started habit keeps its original start date to protect its history.</div>':''}
      <label class="form-label">Days this habit is scheduled</label>
      <div class="weekdays">${['S','M','T','W','T','F','S'].map((short,i)=>`<label><input type="checkbox" name="weekdays" value="${C.DAYS[i]}" ${week.includes(C.DAYS[i])?'checked':''}><span>${short}</span></label>`).join('')}</div>
      <label class="skip-choice"><input type="checkbox" name="allowSkip" value="yes" ${h?.allowSkip?'checked':''}><span><strong>Allow "Skip today" on this habit</strong><small>Optional days off without spending a freeze, changing your day number, or revealing a pixel. Other habits keep their normal rules.</small></span></label>
      <label class="form-label" for="habitPattern">Pixel image</label><select id="habitPattern" name="pattern">${Object.entries(patternNames).map(([id,label])=>`<option value="${id}" ${id===(h?.pattern||'flower')?'selected':''}>${label}</option>`).join('')}</select>
      <p class="muted small-text">You can also upload your own picture from the Pixel Gallery later. Exactly one square will reveal for each successful day.</p>
      <div class="form-foot">${h?button('Delete habit','habit-delete',`data-id="${esc(h.id)}"`,'button danger'):''}<button type="button" class="button" data-action="dialog-close">Cancel</button><button class="button primary" type="submit">Save habit</button></div>
      </form>`);
  }
  function sheetDialog(sheet=null){
    openDialog(`<button class="dialog-close" data-action="dialog-close" type="button">×</button><h2>${sheet?'Rename task sheet':'New task sheet'}</h2>
      <form data-form="sheet" data-id="${esc(sheet?.id||'')}"><label class="form-label" for="sheetName">Sheet name</label><input id="sheetName" type="text" name="name" maxlength="75" required value="${esc(sheet?.name||'')}" placeholder="e.g. Saturday cleaning"><div class="form-foot"><button type="submit" class="button primary">Save sheet</button></div></form>`);
  }
  function patternDialog(h){
    openDialog(`<button type="button" class="dialog-close" data-action="dialog-close">×</button><h2>Choose pixel artwork</h2>
      <p class="muted small-text">Choose a picture for ${esc(h.name)}. Your revealed squares will stay revealed.</p>
      <form data-form="pattern" data-id="${esc(h.id)}"><label class="form-label" for="patternChoice">Pattern</label><select id="patternChoice" name="pattern">${Object.entries(patternNames).map(([id,label])=>`<option value="${id}" ${h.pattern===id?'selected':''}>${label}</option>`).join('')}</select><div class="form-foot"><button class="button primary" type="submit">Use this artwork</button></div></form>`);
  }
  function sharedDialog(pic=null){
    const chosen=new Set(pic?.habitIds||[]);
    const choices=state.habits.filter(h=>h.status!=='ended'||chosen.has(h.id));
    openDialog(`<button class="dialog-close" type="button" data-action="dialog-close">×</button>
      <h2>${pic?'Edit shared picture':'Create a shared picture'}</h2>
      <p class="muted small-text">Choose two or more habits. Each completion reveals one square on this SAME picture. Habits keep their separate schedules, goals and streaks.</p>
      <form data-form="shared-picture" data-id="${esc(pic?.id||'')}">
      <label class="form-label">Picture name</label><input name="name" type="text" maxlength="80" placeholder="e.g. Blooming Garden" value="${esc(pic?.name||'')}" required>
      <label class="form-label">Connected habits</label>
      <div class="linked-habit-options">${choices.map(h=>`<label class="linked-option"><input type="checkbox" name="habitIds" value="${esc(h.id)}" ${chosen.has(h.id)?'checked':''}><span>${esc(h.name)} <small>(${h.progress}/${h.goalDays})${h.sharedPictureId&&h.sharedPictureId!==pic?.id?' · will move from another picture':''}</small></span></label>`).join('')||'<p>Create some habits first, then connect them here.</p>'}</div>
      <p class="muted small-text">The picture has one pixel per total goal day across its connected habits. Existing completions will appear as revealed pixels.</p>
      <label class="form-label">Pixel design</label><select name="pattern">${Object.entries(patternNames).map(([id,label])=>`<option value="${id}" ${id===(pic?.pattern||'flower')?'selected':''}>${label}</option>`).join('')}</select>
      <div class="form-foot">${pic?button('Delete shared picture','picture-delete',`data-id="${esc(pic.id)}"`,'button danger'):''}<button type="button" data-action="dialog-close" class="button">Cancel</button><button type="submit" class="button primary">Save picture</button></div>
      </form>`);
  }
  function sharedPatternDialog(pic){
    if(!pic)return;
    openDialog(`<button type="button" class="dialog-close" data-action="dialog-close">×</button><h2>Choose pixel artwork</h2>
      <form data-form="shared-pattern" data-id="${esc(pic.id)}"><label class="form-label">Pattern</label><select name="pattern">${Object.entries(patternNames).map(([id,label])=>`<option value="${id}" ${id===pic.pattern?'selected':''}>${label}</option>`).join('')}</select><div class="form-foot"><button class="button primary" type="submit">Use this artwork</button></div></form>`);
  }
  function roundDialog(h){
    openDialog(`<button class="dialog-close" type="button" data-action="dialog-close">×</button><div class="eyebrow">YOU DID IT ✦</div><h2>${esc(h.name)} complete!</h2>
      <p>You've revealed all ${h.goalDays} pixels in your artwork. Choose what to do next.</p>
      <div class="row">${button('Finish this habit','round-end',`data-id="${esc(h.id)}"`,'button')}${button('Start another round ↻','round-repeat',`data-id="${esc(h.id)}"`,'button primary')}</div>
      <p class="muted small-text">Either choice saves your completed picture to your Achievement Gallery.</p>`);
  }
  function handleAction(action,el){
    const id=el.dataset.id;
    switch(action){
      case 'home':case 'tasks':case 'gallery':case 'settings': navigate(action);break;
      case 'category-open':navigate('category',{categoryId:id,all:false});break;
      case 'category-new':categoryDialog();break;
      case 'category-edit':categoryDialog(categoryOf(id));break;
      case 'category-delete':{
        if(state.habits.some(h=>h.categoryId===id)){toast('Move or delete habits in this category first.');return;}
        if(confirm('Delete this empty category?')){state.categories=state.categories.filter(c=>c.id!==id);save();closeDialog();navigate('home');}
        break;
      }
      case 'habit-new':habitDialog(null,el.dataset.category);break;
      case 'habit-edit':habitDialog(habitOf(id));break;
      case 'habit-delete':{
        const h=habitOf(id);
        if(!h)return;
        if(confirm(`Delete “${h.name}” and its progress? Download a backup first if you might want it later.`)){
          state.habits=state.habits.filter(x=>x.id!==id);tidySharedPictures();save();closeDialog();render();toast('Habit deleted.');
        }
        break;
      }
      case 'habit-done':{
        const h=habitOf(id);if(!h)return;
        const result=C.complete(h,today());if(!result.ok){toast('This habit is not due today.');return;}
        const shared=linkedPicture(h);
        const sharedComplete=archiveSharedIfFinished(shared);
        save();render();
        if(sharedComplete)toast('Your shared pixel picture is complete and saved! ✦');
        if(result.finished)roundDialog(h);
        else toast('One more square revealed! ✦');
        break;
      }
      case 'habit-skip':{
        const h=habitOf(id);if(!h||!C.skip(h,today())){toast('Skip is unavailable for this habit today.');return;}
        save();render();toast('Skipped today. No freeze spent and no progress lost. ↷');break;
      }
      case 'habit-undo-skip':{
        const h=habitOf(id);if(h&&C.undoSkip(h,today())){save();render();toast('Skip undone. You can still complete today.');}break;
      }
      case 'show-today':view.all=false;render();break;
      case 'show-all':view.all=true;render();break;
      case 'art-open':navigate('art',{artId:id,artType:el.dataset.type||'habit'});break;
      case 'art-pattern':patternDialog(habitOf(id));break;
      case 'picture-new':sharedDialog();break;
      case 'picture-edit':sharedDialog(sharedOf(id));break;
      case 'picture-pattern':sharedPatternDialog(sharedOf(id));break;
      case 'picture-delete':{
        const p=sharedOf(id);if(!p)return;
        if(confirm(`Delete “${p.name}”? Its linked habits will return to their individual pictures; their progress stays saved.`)){
          p.habitIds.forEach(hid=>{const h=habitOf(hid);if(h)h.sharedPictureId=null;});
          state.sharedPictures=state.sharedPictures.filter(x=>x.id!==id);save();closeDialog();navigate('gallery');
        }break;
      }
      case 'art-upload':{picturePickerPending={artId:view.artId,artType:view.artType};const input=document.getElementById('artPicture');input.dataset.artId=view.artId;input.dataset.artType=view.artType;input.value='';input.click();break;}
      case 'round-finish':roundDialog(habitOf(id));break;
      case 'round-end':case 'round-repeat':{
        const h=habitOf(id);if(!h)return;
        const shared=linkedPicture(h);
        const pictureGoal=h.goalDays;
        // A completed habit keeps its full contribution in the shared artwork
        // when the habit begins a new round. This doesn't change its streak.
        if(C.endRound(h,today(),shared?[]:state.gallery,action==='round-repeat')){
          if(shared){shared.credited=shared.credited||{};shared.credited[h.id]=pictureGoal;archiveSharedIfFinished(shared);}
          save();closeDialog();render();toast(action==='round-repeat'?'New round starts tomorrow!':'Achievement saved!');
        }
        break;
      }
      case 'sheet-new':sheetDialog();break;
      case 'sheet-rename':sheetDialog(state.tasks.find(s=>s.id===id));break;
      case 'sheet-delete':{
        const sheet=state.tasks.find(s=>s.id===id);
        if(sheet&&confirm(`Delete the “${sheet.name}” task sheet and all its tasks?`)){
          state.tasks=state.tasks.filter(s=>s.id!==id);save();render();
        }
        break;
      }
      case 'task-delete':{
        const sheet=state.tasks.find(s=>s.id===el.dataset.sheet);
        if(sheet){sheet.items=sheet.items.filter(t=>t.id!==id);save();render();}
        break;
      }
      case 'task-clear':{
        const sheet=state.tasks.find(s=>s.id===id);
        if(sheet&&confirm('Remove all checked tasks from this sheet?')){
          sheet.items=sheet.items.filter(t=>!t.done);save();render();
        }
        break;
      }
      case 'theme-set':
        if(id==='custom' && !state.settings.customTheme)break;
        if(id!=='custom' && !C.THEMES.some(t=>t.id===id))break;
        state.settings.themeId=id;save();render();break;
      case 'backup-download':downloadBackup();break;
      case 'backup-restore':document.getElementById('restoreFile').click();break;
      case 'dialog-close':closeDialog();break;
    }
  }
  document.addEventListener('click',event=>{
    const el=event.target.closest('[data-action],.bottom-nav button[data-page]');
    if(!el)return;
    const action=el.dataset.action||el.dataset.page;
    if(action){event.preventDefault();handleAction(action,el);}
  });
  document.addEventListener('submit',event=>{
    const form=event.target;if(!form.dataset.form)return;
    event.preventDefault();const formData=new FormData(form);const f=form.dataset.form;
    if(f==='theme-custom'){
      const fields=['bg','paper','text','muted','accent','soft','outline'];
      const picked={};
      for(const key of fields){
        const value=String(formData.get(key)||'');
        if(!/^#[0-9a-fA-F]{6}$/.test(value)){
          toast('Please choose a valid color for every field.');return;
        }
        picked[key]=value;
      }
      state.settings.customTheme={...picked,accentInk:readableInk(picked.accent)};
      state.settings.themeId='custom';
      save();render();toast('Your custom colors are saved!');
    } else if(f==='category'){
      const name=String(formData.get('name')||'').trim(),emoji=String(formData.get('emoji')||'✿').trim()||'✿';
      if(!name)return;
      const cat=categoryOf(form.dataset.id);
      if(cat){cat.name=name;cat.emoji=emoji;}
      else state.categories.push({id:C.makeId(),name,emoji});
      save();closeDialog();render();toast('Category saved!');
    } else if(f==='habit'){
      const name=String(formData.get('name')||'').trim();
      const days=formData.getAll('weekdays');
      const num=Number(formData.get('goalDays'));
      const h=habitOf(form.dataset.id);
      const categoryId=String(formData.get('categoryId'));
      const allowSkip=formData.has('allowSkip');
      const startDate=h?.progress?h.startDate:String(formData.get('startDate'));
      const pattern=String(formData.get('pattern')||'flower');
      if(!name||!days.length||!categoryOf(categoryId)||!Number.isSafeInteger(num)||num<1||num>10000||!C.goodDate(startDate)){
        toast('Enter a name, duration, start date, and at least one weekday.');return;
      }
      if(h&&num<h.progress){toast('Goal cannot be shorter than current progress.');return;}
      if(h){
        if(h.goalDays!==num)h.pixelColors=null; // Different pixel counts need a new image conversion.
        if(h.startDate!==startDate){h.startDate=startDate;h.roundStart=startDate;h.lastReviewed=C.addDays(startDate,-1);}
        h.name=name;h.goalDays=num;h.weekdays=days;h.categoryId=categoryId;h.allowSkip=allowSkip;
        if(h.progress>=num)h.status='ready';
        else if(h.status==='ready')h.status='active';
        if(h.pattern!==pattern)h.pixelColors=null;
        h.pattern=pattern;
      } else {const newHabit=C.makeHabit({name,categoryId,goalDays:num,weekdays:days,startDate,pattern});newHabit.allowSkip=allowSkip;state.habits.push(newHabit);}
      save();closeDialog();render();toast('Habit saved!');
    } else if(f==='shared-picture'){
      const name=String(formData.get('name')||'').trim();
      const ids=[...new Set(formData.getAll('habitIds').map(String))];
      const selected=ids.map(habitOf);
      if(!name || ids.length<2 || selected.some(h=>!h||(h.status==='ended'&&h.sharedPictureId!==form.dataset.id))){
        toast('Give your picture a name and select at least 2 active habits.');return;
      }
      let pic=sharedOf(form.dataset.id);
      const oldGoals=pic?sharedStats(pic).goalDays:0;
      if(pic?.archived && (ids.length!==pic.habitIds.length || ids.some(id=>!pic.habitIds.includes(id)))){
        toast('This shared picture is already complete. Create a new picture to change the linked habits.');return;
      }
      if(!pic){pic={id:C.makeId(),name,pattern:'flower',pixelColors:null,habitIds:[],credited:{},archived:false};state.sharedPictures.push(pic);}
      pic.name=name;pic.pattern=String(formData.get('pattern')||'flower');
      const previous=pic.habitIds||[];
      previous.filter(id=>!ids.includes(id)).forEach(id=>{const h=habitOf(id);if(h)h.sharedPictureId=null;});
      ids.forEach(id=>{const h=habitOf(id);h.sharedPictureId=pic.id;});
      pic.habitIds=ids;
      const newGoal=sharedStats(pic).goalDays;
      if(newGoal!==oldGoals && pic.pixelColors)pic.pixelColors=null;
      pic.credited=Object.fromEntries(Object.entries(pic.credited||{}).filter(([id])=>ids.includes(id)));
      tidySharedPictures();
      archiveSharedIfFinished(pic);
      save();closeDialog();navigate('gallery');toast('Your shared picture is ready!');
    } else if(f==='shared-pattern'){
      const pic=sharedOf(form.dataset.id);
      if(pic){pic.pattern=String(formData.get('pattern')||'flower');pic.pixelColors=null;save();closeDialog();render();}
    } else if(f==='sheet'){
      const name=String(formData.get('name')||'').trim();if(!name)return;
      const s=state.tasks.find(t=>t.id===form.dataset.id);
      if(s)s.name=name;else state.tasks.push({id:C.makeId(),name,items:[]});
      save();closeDialog();render();
    } else if(f==='task-add'){
      const text=String(formData.get('text')||'').trim();
      const s=state.tasks.find(t=>t.id===form.dataset.sheet);
      if(s&&text){s.items.push({id:C.makeId(),text,done:false});save();render();}
    } else if(f==='pattern'){
      const h=habitOf(form.dataset.id);
      if(h){h.pattern=String(formData.get('pattern')||'flower');h.pixelColors=null;save();closeDialog();render();}
    }
  });
  document.addEventListener('change',async event=>{
    if(event.target.matches('.task-item input[type="checkbox"]')){
      const sheet=state.tasks.find(s=>s.id===event.target.dataset.sheet);
      const item=sheet?.items.find(t=>t.id===event.target.dataset.item);
      if(item){item.done=event.target.checked;save();render();}
    }
    if(event.target.id==='restoreFile'){
      const file=event.target.files?.[0];event.target.value='';if(file)await restoreFile(file);
    }
    if(event.target.id==='artPicture'){
      const input=event.target;const file=input.files?.[0];const target=input.dataset.artId?{artId:input.dataset.artId,artType:input.dataset.artType||'habit'}:picturePickerPending;input.value='';picturePickerPending=null;delete input.dataset.artId;delete input.dataset.artType;if(file&&target)await usePicture(file,target);
    }
  });
  function downloadBackup(){
    const data={app:'Visual Transformation',version:2,exportedAt:new Date().toISOString(),state};
    const file=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(file),a=document.createElement('a');
    a.href=url;a.download='visual-transformation-backup-'+today()+'.json';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
    toast('Backup downloaded. Keep it somewhere safe!');
  }
  async function restoreFile(file){
    if(file.size>12*1024*1024){toast('That backup is too large.');return;}
    let parsed;
    try {parsed=JSON.parse(await file.text());}catch(e){toast('This file is not valid JSON.');return;}
    let restored;
    if(parsed?.app!=='Visual Transformation'){toast('Not a Visual Transformation backup.');return;}
    if(parsed.version===2 && C.validState(parsed.state))restored=parsed.state;
    else if(Array.isArray(parsed.habits)){
      try{restored=C.migrateLegacy(parsed.habits,today());}catch(e){/* leave invalid */}
    }
    if(!restored){toast('The backup format was not recognized. Nothing was changed.');return;}
    if(!confirm(`Restore a backup with ${restored.habits.length} habits? This REPLACES all currently saved habits, task lists, and gallery items. Download a fresh backup first if needed.`))return;
    try{localStorage.setItem(KEY,JSON.stringify(restored));}catch(e){toast('Could not save this backup. Nothing was changed.');return;}
    state=ensureState(restored);closeDialog();navigate('home');toast('Your backup was restored successfully!');
  }
  async function usePicture(file,target){
    const h=target.artType==='shared'?sharedOf(target.artId):habitOf(target.artId);
    if(h?.archived){toast('That shared picture is already finished. Create a new picture for your next artwork.');return;}
    const numberOfPixels=target.artType==='shared'&&h?sharedStats(h).goalDays:h?.goalDays;
    if(!h || !numberOfPixels || !(file.type.startsWith('image/')||/\.(png|jpe?g|webp|gif)$/i.test(file.name))){toast('Please choose a JPG or PNG picture.');return;}
    if(file.size>15*1024*1024){toast('Choose an image smaller than 15 MB.');return;}
    const blobUrl=URL.createObjectURL(file);
    try{
      const image=new Image();image.src=blobUrl;await new Promise((resolve,reject)=>{if(image.complete&&image.naturalWidth)return resolve();image.onload=()=>resolve();image.onerror=()=>reject(Error('Image could not be decoded'));});
      const cols=Math.ceil(Math.sqrt(numberOfPixels)), rows=Math.ceil(numberOfPixels/cols);
      const canvas=document.createElement('canvas');canvas.width=cols;canvas.height=rows;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(!ctx)throw Error('Canvas unavailable');
      const ratio=Math.max(cols/image.width,rows/image.height);
      const w=image.width*ratio,he=image.height*ratio;
      ctx.drawImage(image,(cols-w)/2,(rows-he)/2,w,he);
      const rgba=ctx.getImageData(0,0,cols,rows).data;
      h.pixelColors=Array.from({length:numberOfPixels},(_,i)=>{
        const off=i*4;
        return '#'+[rgba[off],rgba[off+1],rgba[off+2]].map(v=>v.toString(16).padStart(2,'0')).join('');
      });
      if(save()){view={...view,page:'art',artId:target.artId,artType:target.artType};render();toast('Picture uploaded! Check the full-color preview below your growing artwork.');}
    }catch(err){console.error(err);toast('Unable to open that picture. Please try a JPG or PNG.');}
    finally{URL.revokeObjectURL(blobUrl);}
  }
  document.getElementById('artPicture').addEventListener('cancel',()=>{picturePickerPending=null;});
  window.addEventListener('focus',()=>{if(!picturePickerPending)render();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && !picturePickerPending)render();});
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  render();
})();
