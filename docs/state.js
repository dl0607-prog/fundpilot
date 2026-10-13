import {lessons,questionBank} from './content.js';
import {dayPlan} from './curriculum.js';
export const KEY='fundpilot:v1';
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function initial(){return {version:1,started:today(),examDate:'',records:{},attempts:[],draft:null,drafts:{},assessments:[],activeExam:null,officialRead:{},dayEvidence:{},checklist:{}};}
const knownId=id=>id!==null&&id!==''&&Number.isInteger(Number(id))&&!!lessons[Number(id)];
const isoDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s));
const object=s=>s&&typeof s==='object'&&!Array.isArray(s);
const examKeys=new Set(['checkpoint1','checkpoint2','checkpoint3','mock1','mock3','final','focus1','focus3']);
const qkeys=new Set(questionBank.map(q=>q.key));
function validExam(e,finished=false){return object(e)&&examKeys.has(e.kind)&&Array.isArray(e.keys)&&e.keys.length>0&&new Set(e.keys).size===e.keys.length&&e.keys.every(k=>qkeys.has(k))&&object(e.answers)&&Object.entries(e.answers).every(([k,v])=>e.keys.includes(k)&&Number.isInteger(v)&&v>=0&&v<4)&&Number.isFinite(Date.parse(e.startedAt))&&Number.isFinite(Date.parse(e.deadline))&&Number.isInteger(e.index)&&e.index>=0&&e.index<e.keys.length&&(!finished||(Number.isFinite(Date.parse(e.finishedAt))&&Number.isInteger(e.score)&&e.score>=0&&e.score<=e.keys.length));}
export function valid(s){
 if(!(s?.version===1&&isoDate(s.started)&&(s.examDate===''||isoDate(s.examDate))&&object(s.records)&&Array.isArray(s.attempts)))return false;
 if(!Object.entries(s.records).every(([id,r])=>knownId(id)&&r&&isoDate(r.completed)&&typeof r.due==='string'&&Number.isFinite(Date.parse(r.due))&&Number.isInteger(r.reviews)&&r.reviews>=0&&(r.reflection===undefined||typeof r.reflection==='string')))return false;
 if(!s.attempts.every(a=>a&&knownId(a.id)&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<lessons[a.id].options.length&&typeof a.correct==='boolean'&&Number.isFinite(Date.parse(a.at))))return false;
 const d=s.draft;if(d&&!(knownId(d.id)&&Number.isInteger(d.step)&&d.step>=0&&d.step<4&&typeof d.light==='boolean'&&typeof d.text==='string'&&Array.isArray(d.checked)&&d.checked.every(x=>Number.isInteger(x)&&x>=0&&x<lessons[d.id].criteria.length)&&typeof d.passed==='boolean'))return false;
 if(s.assessments!==undefined&&(!Array.isArray(s.assessments)||!s.assessments.every(e=>validExam(e,true))))return false;
 if(s.activeExam&&!validExam(s.activeExam))return false;
 if(s.officialRead!==undefined&&(!object(s.officialRead)||!Object.entries(s.officialRead).every(([id,v])=>knownId(id)&&typeof v==='boolean')))return false;
 if(s.checklist!==undefined&&(!object(s.checklist)||!Object.values(s.checklist).every(v=>typeof v==='boolean')))return false;
 if(s.dayEvidence!==undefined&&(!object(s.dayEvidence)||!Object.entries(s.dayEvidence).every(([day,v])=>Number(day)>=1&&Number(day)<=30&&object(v)&&typeof v.text==='string'&&Number.isFinite(Date.parse(v.at)))))return false;
 if(s.drafts!==undefined&&(!object(s.drafts)||!Object.entries(s.drafts).every(([id,d])=>knownId(id)&&object(d)&&Number(d.id)===Number(id)&&Number.isInteger(d.step)&&d.step>=0&&d.step<4&&typeof d.text==='string'&&Array.isArray(d.checked)&&d.checked.every(x=>Number.isInteger(x)&&x>=0&&x<lessons[id].criteria.length)&&typeof d.light==='boolean'&&typeof d.passed==='boolean')))return false;
 return true;
}
export function normalize(s){return {...initial(),...s,drafts:s.drafts|| (s.draft?{[s.draft.id]:s.draft}:{}),assessments:s.assessments||[],officialRead:s.officialRead||{},dayEvidence:s.dayEvidence||{},checklist:s.checklist||{}};}
export function read(storage){const raw=storage.getItem(KEY);if(!raw)return initial();const s=JSON.parse(raw);if(!valid(s))throw new Error('学习记录格式不兼容，请先导出原始记录。');return normalize(s);}
export function save(storage,s){storage.setItem(KEY,JSON.stringify(s));}
export function attempt(s,id,choice,answer){return {...s,attempts:[...s.attempts,{id,choice,correct:choice===answer,at:new Date().toISOString()}]};}
export function complete(s,id){const prev=s.records[id];const drafts={...(s.drafts||{})};delete drafts[id];const reviews=(prev?.reviews||0)+(prev?1:0);const due=new Date();due.setDate(due.getDate()+[1,3,7,14][Math.min(reviews,3)]);return {...s,draft:null,drafts,records:{...s.records,[id]:{completed:today(),reviews,due:due.toISOString(),reflection:s.draft?.id===id?s.draft.text:(prev?.reflection||''),checked:s.draft?.id===id?[...s.draft.checked]:(prev?.checked||[])}}};}
export function dueIds(s){return Object.keys(s.records).filter(id=>new Date(s.records[id].due)<=new Date()).map(Number);}
export function wrongIds(s){const latest=new Map();s.attempts.forEach(a=>latest.set(a.id,a));return [...latest.values()].filter(a=>!a.correct).map(a=>a.id);}
export function examWrongIds(s){const latest={};s.assessments.forEach(e=>e.keys.forEach(k=>latest[k]=e.answers[k]===questionBank.find(q=>q.key===k).answer));return [...new Set(Object.entries(latest).filter(([k,v])=>!v).map(([k])=>questionBank.find(q=>q.key===k).id))];}
export function allWeakIds(s){return [...new Set([...wrongIds(s),...examWrongIds(s)])];}
export const examConfig={focus1:{title:'科目一原文重点检验',count:12,minutes:18,subject:1,maxId:99,focusOnly:true},focus3:{title:'科目三原文重点检验',count:12,minutes:18,subject:3,maxId:99,focusOnly:true},checkpoint1:{title:'第一周因果检验',count:12,minutes:15,subject:1,maxId:22},checkpoint2:{title:'科目一阶段检验',count:20,minutes:24,subject:1,maxId:36},checkpoint3:{title:'股权投资阶段检验',count:16,minutes:20,subject:3,maxId:49},mock1:{title:'科目一计时训练',count:100,minutes:120,subject:1,maxId:99},mock3:{title:'科目三计时训练',count:100,minutes:120,subject:3,maxId:99},final:{title:'最后的混合场景检验',count:20,minutes:24,subject:null,maxId:99}};
export function makeExam(kind,random=Math.random){
 const c=examConfig[kind];if(!c)throw Error('未知检验类型');
 const pool=questionBank.filter(q=>(!c.subject||q.subject===c.subject)&&q.id<=c.maxId&&(!c.focusOnly||q.focus));
 if(pool.length<c.count)throw Error('题量不足，不能生成训练卷');
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 let picked=[];
 if(kind.startsWith('mock')){
  // At least one item per existing unit, then include the new source-grounded items.
  const ids=[...new Set(pool.map(q=>q.id))];
  picked=ids.map(id=>shuffle(pool.filter(q=>q.id===id))[0]);
  const used=new Set(picked.map(q=>q.key));
  const focus=shuffle(pool.filter(q=>q.focus&&!used.has(q.key)));
  picked.push(...focus.slice(0,c.count-picked.length));
 }
 const used=new Set(picked.map(q=>q.key));
 picked.push(...shuffle(pool.filter(q=>!used.has(q.key))).slice(0,c.count-picked.length));
 const keys=shuffle(picked).map(q=>q.key);const now=new Date();
 return {kind,keys,answers:{},index:0,startedAt:now.toISOString(),deadline:new Date(+now+c.minutes*60000).toISOString()};
}
export function finishExam(s){const e=s.activeExam;if(!e)return s;const score=e.keys.filter(k=>e.answers[k]===questionBank.find(q=>q.key===k).answer).length;return {...s,activeExam:null,assessments:[...s.assessments,{...e,score,finishedAt:new Date().toISOString()}]};}
export const officialTasks=['registration','subjects','date','admit','identity','location','examRules'];
export function dayDone(s,d){if(d.lessonIds.some(id=>!s.records[id]||(lessons[id].sections&&!s.officialRead[id])))return false;if(d.assessment?.startsWith('checkpoint')||d.assessment?.startsWith('mock'))return s.assessments.some(e=>e.kind===d.assessment);if(d.assessment==='repair')return !!s.dayEvidence[29];if(d.assessment==='finish')return s.assessments.some(e=>e.kind==='final')&&officialTasks.every(k=>s.checklist[k]);return true;}
export function currentDay(s){return dayPlan.find(d=>!dayDone(s,d))||dayPlan[29];}
export function nextId(s,count=lessons.length){if(s.draft)return s.draft.id;const d=currentDay(s);return d.lessonIds.find(id=>!s.records[id])??d.lessonIds.find(id=>!s.officialRead[id])??dueIds(s)[0]??0;}
