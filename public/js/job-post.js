/**
 * job-post.js
 * Emphora — Job Posting page logic
 * Depends on: job-post.html structure, localStorage
 */

'use strict';

'use strict';
const user=(()=>{try{return JSON.parse(sessionStorage.getItem('emphora_user')||'null');}catch{return null;}})();
if(!user||user.accountType!=='employer') window.location.href='/';

// User identity
(function(){
  const fn=user.firstName||'',ln=user.lastName||'';
  const ini=((fn[0]||'')+(ln[0]||'')).toUpperCase()||'';
  const ne=document.getElementById('topbar-name');
  const ee=document.getElementById('topbar-email');
  const ae=document.getElementById('topbar-initials');
  if(ne) ne.textContent=(fn+' '+ln).trim();
  if(ee) ee.textContent=user.email||'';
  if(ae){ae.textContent=ini;ae.style.opacity='1';}
  try{const img=localStorage.getItem('emphora_avatar_'+user.email);if(img&&ae){ae.style.backgroundImage=`url(${img})`;ae.style.backgroundSize='cover';ae.style.backgroundPosition='center';ae.style.color='transparent';}}catch(_){}
})();

let theme=localStorage.getItem('em-theme')||'light';
function applyTheme(t){theme=t;document.body.dataset.theme=t;document.querySelector('#theme-btn .material-icons-round').textContent=t==='dark'?'dark_mode':'light_mode';localStorage.setItem('em-theme',t);}
applyTheme(theme);
document.getElementById('theme-btn').onclick=()=>applyTheme(theme==='dark'?'light':'dark');

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}

// ── Skill state ───────────────────────────────────────────────────────────────
// { skillName: { category, minScore } }
let selectedSkills = {};

function scoreColor(s){
  if(s<=2)return '#EF5350';if(s<=4)return '#FF7043';if(s<=5)return '#FFA726';
  if(s<=6)return '#FFCA28';if(s<=7)return '#9CCC65';if(s<=8)return '#26A69A';
  if(s<=9)return '#1E88E5';return '#1A6BCC';
}

// ── Catalogue ─────────────────────────────────────────────────────────────────
const CATALOGUE = [
  { cat:'Operating Systems',     icon:'computer',        items:['Windows','macOS','Linux (Ubuntu)','Linux (Red Hat)','Unix','Android','iOS'] },
  { cat:'Devices',               icon:'devices',         items:['Desktops','Laptops','Tablets','Smartphones','Servers','IoT Devices'] },
  { cat:'Productivity & Office', icon:'work',            items:['Microsoft Office Suite','Google Workspace','LibreOffice','Adobe Creative Suite','Notion','Slack','Trello'] },
  { cat:'Programming Languages', icon:'code',            items:['Python','Java','C','C++','C#','Go','Rust','PHP','Ruby','JavaScript','TypeScript','Shell/Bash','PowerShell','SQL'] },
  { cat:'Web Technologies',      icon:'language',        items:['HTML5','CSS3','Sass/SCSS','JavaScript','TypeScript','Webpack','Node.js','REST APIs','GraphQL','JSON','AJAX'] },
  { cat:'Frameworks & Libraries',icon:'view_quilt',      items:['React','Angular','Vue.js','jQuery','jQuery UI','Bootstrap','Tailwind CSS','Express.js','Django','Flask','Spring Boot'] },
  { cat:'Specializations',       icon:'auto_awesome',    items:['Web Components','Progressive Web Apps (PWA)','UX/UI Design','Interaction Design','Responsive Design','Hi-Fidelity Prototyping','Mobile App Development','Cloud Architecture'] },
  { cat:'Prototyping & Design',  icon:'design_services', items:['Figma','Sketch','Adobe XD','Axure','Miro','InVision','Balsamiq','Canva'] },
  { cat:'Databases',             icon:'storage',         items:['MySQL','PostgreSQL','MongoDB','Redis','Oracle DB','Firebase','Microsoft SQL Server','Cassandra'] },
  { cat:'DevOps & Cloud',        icon:'cloud',           items:['AWS','Azure','Google Cloud Platform','Docker','Kubernetes','Jenkins','GitLab CI/CD','Terraform','Ansible'] },
  { cat:'Networking & Security', icon:'security',        items:['TCP/IP','DNS','VPNs','Firewalls','Penetration Testing','Cybersecurity Tools','Wireshark','SSL/TLS','Encryption'] },
  { cat:'Testing & QA',          icon:'bug_report',      items:['Selenium','Jest','Mocha','Cypress','JUnit','Postman','TestRail','Load Testing Tools'] },
  { cat:'Leadership & Strategy', icon:'military_tech',   items:['Agile Development','Scrum','Kanban','Product Management','UX Strategy','Design Thinking','Stakeholder Communication','Team Leadership','Mentoring'] },
];

// ── Left panel ────────────────────────────────────────────────────────────────
function buildLeft(q=''){
  const container=document.getElementById('jp-cats');
  container.innerHTML='';
  const lq=q.toLowerCase().trim();

  [...CATALOGUE].sort((a,b)=>a.cat.localeCompare(b.cat)).forEach(group=>{
    const visible=group.items.filter(item=>!lq||item.toLowerCase().includes(lq)||group.cat.toLowerCase().includes(lq));
    if(!visible.length)return;
    const selCount=visible.filter(i=>selectedSkills[i]).length;
    const isOpen=!!lq||selCount>0;
    const div=document.createElement('div');
    div.className='jp-cg'+(isOpen?' open':'');
    div.innerHTML=`
      <div class="jp-cg-label">
        <span>
          <span class="material-icons-round" style="font-size:.78rem;vertical-align:middle;margin-right:4px">${group.icon}</span>
          ${esc(group.cat)}
          ${selCount>0?`<span class="jp-badge">${selCount}</span>`:''}
        </span>
        <span class="material-icons-round jp-cg-chevron">chevron_right</span>
      </div>
      <div class="jp-cg-body">
        ${visible.map(item=>{
          const sel=!!selectedSkills[item];
          return `<div class="jp-skill-row${sel?' selected':''}" data-skill="${esc(item)}" data-cat="${esc(group.cat)}">
            <span class="jp-skill-dot"></span>
            <span style="flex:1">${esc(item)}</span>
            ${sel?`<span class="material-icons-round" style="font-size:.8rem;color:var(--primary)">check</span>`:''}
          </div>`;
        }).join('')}
      </div>`;

    div.querySelector('.jp-cg-label').addEventListener('click',()=>div.classList.toggle('open'));
    div.querySelectorAll('.jp-skill-row').forEach(row=>{
      row.addEventListener('click',()=>{
        const skill=row.dataset.skill, cat=row.dataset.cat;
        if(selectedSkills[skill]){
          delete selectedSkills[skill];
        } else {
          selectedSkills[skill]={category:cat,minScore:5};
        }
        buildLeft(q);
        renderSkillsPanel();
      });
    });
    container.appendChild(div);
  });
}

// ── Right skills panel ────────────────────────────────────────────────────────
function renderSkillsPanel(){
  const panel=document.getElementById('jp-skills-panel');
  const countEl=document.getElementById('jp-skill-count');
  const keys=Object.keys(selectedSkills);
  if(countEl) countEl.textContent=keys.length?`(${keys.length})`:'';
  if(!keys.length){
    panel.innerHTML='<div class="jp-skills-empty">No skills added yet — use the left panel to add required skills</div>';
    return;
  }
  // Group by category
  const bycat={};
  keys.forEach(k=>{
    const cat=selectedSkills[k].category||'Other';
    if(!bycat[cat])bycat[cat]=[];
    bycat[cat].push(k);
  });
  panel.innerHTML=Object.keys(bycat).sort().map(cat=>`
    <div style="margin-bottom:.75rem">
      <div style="font-size:.62rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:5px">${esc(cat)}</div>
      <div>
        ${bycat[cat].map(skill=>{
          const minScore=selectedSkills[skill].minScore||5;
          const col=scoreColor(minScore);
          return `<span class="jp-skill-tag" style="color:${col};background:${col}12;border-color:${col}44">
            ${esc(skill)}
            <span class="jp-min-select">
              <select data-skill="${esc(skill)}" title="Minimum score required">
                ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}"${n===minScore?' selected':''}>${n}</option>`).join('')}
              </select>
              min
            </span>
            <button data-skill="${esc(skill)}" aria-label="Remove"><span class="material-icons-round">close</span></button>
          </span>`;
        }).join('')}
      </div>
    </div>`).join('');

  // Events
  panel.querySelectorAll('select[data-skill]').forEach(sel=>{
    sel.addEventListener('change',()=>{
      if(selectedSkills[sel.dataset.skill]) selectedSkills[sel.dataset.skill].minScore=Number(sel.value);
      renderSkillsPanel();
    });
  });
  panel.querySelectorAll('button[data-skill]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      delete selectedSkills[btn.dataset.skill];
      buildLeft(document.getElementById('jp-search').value);
      renderSkillsPanel();
    });
  });
}

// ── Search ────────────────────────────────────────────────────────────────────
document.getElementById('jp-search').addEventListener('input',e=>buildLeft(e.target.value));

// ── Role dropdown with typeahead ─────────────────────────────────────────────
(function(){
  const wrap     = document.getElementById('jpr-wrap');
  const trigger  = document.getElementById('jpr-trigger');
  const search   = document.getElementById('jpr-search');
  const dropdown = document.getElementById('jpr-dropdown');
  const hidden   = document.getElementById('jp-role-select');
  const titleHid = document.getElementById('jp-title');

  function openDD(){ wrap.classList.add('open'); filterItems(search.value); }
  function closeDD(){ wrap.classList.remove('open'); }

  function filterItems(q){
    const lq = q.toLowerCase().trim();
    dropdown.querySelectorAll('.jpr-item').forEach(item => {
      item.style.display = !lq || item.dataset.value.toLowerCase().includes(lq) ? '' : 'none';
    });
    dropdown.querySelectorAll('.jpr-group').forEach(g => {
      const anyVisible = [...g.querySelectorAll('.jpr-item')].some(i=>i.style.display!=='none');
      g.style.display = anyVisible ? '' : 'none';
    });
  }

  function selectValue(val){
    hidden.value = val;
    titleHid.value = val;
    search.value = val;
    dropdown.querySelectorAll('.jpr-item').forEach(i=>i.classList.toggle('selected', i.dataset.value===val));
    closeDD();
  }

  trigger.addEventListener('click', () => wrap.classList.contains('open') ? closeDD() : openDD());
  search.addEventListener('focus', openDD);
  search.addEventListener('input', () => { filterItems(search.value); wrap.classList.add('open'); });
  search.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDD(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      // Use typed value as role if no exact match
      const val = search.value.trim();
      if (val) { selectValue(val); } else { closeDD(); }
    }
  });
  search.addEventListener('blur', () => {
    setTimeout(() => {
      // If user typed something not in list, keep it as custom
      const val = search.value.trim();
      if (val && hidden.value !== val) { selectValue(val); }
      closeDD();
    }, 200);
  });

  dropdown.querySelectorAll('.jpr-item').forEach(item => {
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      selectValue(item.dataset.value);
    });
  });

  document.addEventListener('click', e => { if(!wrap.contains(e.target)) closeDD(); });
})();



buildLeft();
renderSkillsPanel();

// ── Dev: click "Post a Job" h1 to fill test data ─────────────────────────────
document.querySelector('.jp-right-head h1').addEventListener('click', () => {
  // Role
  const search = document.getElementById('jpr-search');
  const hidden  = document.getElementById('jp-role-select');
  const titleH  = document.getElementById('jp-title');
  if(search){ search.value='Lead UX Designer'; }
  if(hidden){ hidden.value='Lead UX Designer'; }
  if(titleH){ titleH.value='Lead UX Designer'; }
  // Select the item visually
  document.querySelectorAll('.jpr-item').forEach(i=>i.classList.toggle('selected',i.dataset.value==='Lead UX Designer'));

  // Details
  const set = (id,val) => { const el=document.getElementById(id); if(el) el.value=val; };
  set('jp-dept',       'Product Design');
  set('jp-location',   'New York, NY');
  set('jp-salary-min', '$150,000');
  set('jp-salary-max', '$190,000');
  set('jp-reports',    'VP of Product Design');

  // Dropdowns
  const setSelect = (id,val) => { const el=document.getElementById(id); if(el){[...el.options].forEach(o=>o.selected=o.value===val);} };
  setSelect('jp-type',      'Full-Time');
  setSelect('jp-workplace', 'Hybrid');
  setSelect('jp-exp',       '5');

  // Descriptions
  set('jp-overview',     'We are looking for a Lead UX Designer to drive the end-to-end design experience of our flagship financial platform. You will work closely with product, engineering, and stakeholders to deliver intuitive, accessible interfaces used by thousands of users daily.');
  set('jp-daytoday',     '\u2022 Lead design sprints and daily standups with the product team\n\u2022 Create wireframes, prototypes, and high-fidelity mockups in Figma\n\u2022 Conduct user research and usability testing sessions\n\u2022 Review and maintain the design system\n\u2022 Collaborate with engineers on implementation and QA');
  set('jp-requirements', '\u2022 5+ years of UX/UI design experience\n\u2022 Proficiency in Figma and prototyping tools\n\u2022 Strong portfolio demonstrating complex product design\n\u2022 Experience with accessibility (WCAG) standards\n\u2022 Excellent communication and presentation skills');
  set('jp-nice',         '\u2022 Experience in fintech or enterprise SaaS\n\u2022 Familiarity with design tokens and component libraries\n\u2022 Knowledge of front-end HTML/CSS');
  set('jp-benefits',     '\u2022 Comprehensive health, dental, and vision\n\u2022 401(k) with 4% company match\n\u2022 Flexible hybrid work (3 days in-office)\n\u2022 $2,000 annual learning & development budget\n\u2022 Unlimited PTO');

  // Skills
  selectedSkills = {
    'Figma':              { category:'Prototyping & Design', minScore:8 },
    'UX/UI Design':       { category:'Specializations',      minScore:8 },
    'Interaction Design': { category:'Specializations',      minScore:7 },
    'Responsive Design':  { category:'Specializations',      minScore:7 },
    'HTML5':              { category:'Web Technologies',      minScore:5 },
    'CSS3':               { category:'Web Technologies',      minScore:5 },
    'Axure':              { category:'Prototyping & Design',  minScore:6 },
    'Sketch':             { category:'Prototyping & Design',  minScore:6 },
  };
  buildLeft();
  renderSkillsPanel();
  console.log('%c✅ Test data filled','color:#2E7D32;font-weight:700');
});


// ── Publish / Draft ───────────────────────────────────────────────────────────
function collectPosting(status){
  return {
    id: 'job_'+(Date.now()),
    status,
    postedBy: user.email,
    title:       document.getElementById('jp-title').value.trim(),
    department:  document.getElementById('jp-dept').value.trim(),
    type:        document.getElementById('jp-type').value,
    location:    document.getElementById('jp-location').value.trim(),
    workplace:   document.getElementById('jp-workplace').value,
    salaryMin:   document.getElementById('jp-salary-min').value.trim(),
    salaryMax:   document.getElementById('jp-salary-max').value.trim(),
    reportsTo:   document.getElementById('jp-reports').value.trim(),
    minExp:      document.getElementById('jp-exp').value,
    overview:    document.getElementById('jp-overview').value.trim(),
    dayToDay:    document.getElementById('jp-daytoday').value.trim(),
    requirements:document.getElementById('jp-requirements').value.trim(),
    niceToHave:  document.getElementById('jp-nice').value.trim(),
    benefits:    document.getElementById('jp-benefits').value.trim(),
    skills:      {...selectedSkills},
    createdAt:   new Date().toISOString(),
  };
}

// Track whether form has changed since last publish
let lastPublishedSnapshot = null;
function formSnapshot(){
  const p = collectPosting('active');
  return JSON.stringify({...p, createdAt:null, id:null});
}
function markPublished(){
  lastPublishedSnapshot = formSnapshot();
  const btn = document.getElementById('jp-publish');
  btn.innerHTML = '<span class="material-icons-round">check_circle</span>Job Posted';
  btn.style.background = '#2E7D32';
  btn.disabled = true;
  btn.style.opacity = '.7';
  btn.style.cursor = 'not-allowed';
}
function watchFormChanges(){
  // Re-enable publish button if form drifts from snapshot
  if(!lastPublishedSnapshot) return;
  if(formSnapshot() !== lastPublishedSnapshot){
    lastPublishedSnapshot = null;
    const btn = document.getElementById('jp-publish');
    btn.innerHTML = '<span class="material-icons-round">publish</span>Publish Job';
    btn.style.background = '';
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.cursor = '';
  }
}
// Watch all inputs for changes
document.querySelector('.jp-right').addEventListener('input', watchFormChanges);
document.querySelector('.jp-right').addEventListener('change', watchFormChanges);

document.getElementById('jp-publish').addEventListener('click',()=>{
  const posting=collectPosting('active');
  if(!posting.title){ document.getElementById('jpr-search').focus(); return; }
  // Log all fields to console before publishing
  console.group('%c📋 Emphora — Publishing Job Posting', 'color:#1A6BCC;font-weight:700;font-size:14px');
  console.log('%cRole & Details','font-weight:700;color:#00897B');
  console.table({
    Title:         posting.title,
    Department:    posting.department||'—',
    Type:          posting.type,
    Workplace:     posting.workplace||'—',
    Location:      posting.location||'—',
    'Salary Min':  posting.salaryMin||'—',
    'Salary Max':  posting.salaryMax||'—',
    'Reports To':  posting.reportsTo||'—',
    'Min Exp':     posting.minExp ? posting.minExp+' yr(s)' : 'Any',
    Status:        posting.status,
    'Posted By':   posting.postedBy,
    'Created At':  posting.createdAt,
  });
  console.log('%cDescriptions','font-weight:700;color:#00897B');
  console.log('Overview:',       posting.overview||'—');
  console.log('Day-to-Day:',     posting.dayToDay||'—');
  console.log('Requirements:',   posting.requirements||'—');
  console.log('Nice to Have:',   posting.niceToHave||'—');
  console.log('Benefits:',       posting.benefits||'—');
  const skillKeys = Object.keys(posting.skills||{});
  console.log('%cRequired Skills ('+skillKeys.length+')','font-weight:700;color:#00897B');
  if(skillKeys.length){
    console.table(skillKeys.reduce((acc,k)=>{acc[k]='min score: '+(posting.skills[k].minScore||5)+' · category: '+(posting.skills[k].category||'—');return acc;},{}));
  } else {
    console.log('No skills specified');
  }
  console.log('%cFull Posting Object','font-weight:700;color:#555');
  console.log(posting);
  console.groupEnd();
  savePosting(posting);
  markPublished();
});

document.getElementById('jp-draft').addEventListener('click',()=>{
  const posting=collectPosting('draft');
  savePosting(posting);
  window.location.href='employer.html';
});

function savePosting(posting){
  const KEY='emphora_job_postings_'+user.email;
  let postings=[];
  try{postings=JSON.parse(localStorage.getItem(KEY)||'[]');}catch(_){}
  postings.unshift(posting);
  try{localStorage.setItem(KEY,JSON.stringify(postings));}catch(_){}
}