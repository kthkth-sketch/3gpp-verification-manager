'use strict';
(() => {
const KEY='3gpp-standard-notes-v1';
const fields=['claim','document','version','verdict','clause','pdfPage','printedPage','reason'];
const $=id=>document.getElementById(id);
let records=[], editing=null, pendingDelete=null, readBlocked=false;
const labels={Supported:'Supported',Contradicted:'Contradicted',Unknown:'미확인'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notify(text,error=false){$('message').textContent=text;$('message').className=error?'error':'';$('message').hidden=false;}
function validRecord(r){return r&&typeof r==='object'&&typeof r.id==='string'&&fields.every(k=>typeof r[k]==='string')&&Object.hasOwn(labels,r.verdict)&&typeof r.updatedAt==='string'&&Number.isFinite(Date.parse(r.updatedAt));}
try {const raw=localStorage.getItem(KEY);if(raw!==null){const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||!parsed.every(validRecord)||new Set(parsed.map(r=>r.id)).size!==parsed.length)throw new Error('Invalid data');records=parsed;}}
catch(e){readBlocked=true;$('storage-state').textContent='저장 데이터 확인 필요';notify('저장된 기록을 읽을 수 없습니다. 기존 데이터를 보호하기 위해 변경을 중지했습니다. 브라우저 저장소 설정을 확인하고 새로고침해 주세요.',true);}
function commit(next,success){
 if(readBlocked){notify('기존 데이터를 읽지 못해 변경할 수 없습니다. 저장소 설정을 확인한 뒤 새로고침해 주세요.',true);return false;}
 try {localStorage.setItem(KEY,JSON.stringify(next));}catch(e){$('storage-state').textContent='저장 실패';notify('저장하지 못했습니다. 입력 내용은 유지됩니다. 브라우저 저장소 허용 여부와 남은 용량을 확인한 뒤 다시 시도해 주세요.',true);return false;}
 records=next;$('storage-state').textContent='이 브라우저에 저장';notify(success);render();return true;
}
function reset(){editing=null;$('record-form').reset();$('form-title').textContent='새 검증 기록';$('submit-btn').textContent='＋ 검증 기록 추가';$('cancel-edit').hidden=true;}
function formatDate(value){return new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(value));}
function render(){
 $('total').textContent=records.length;
 for(const [id,key] of [['supported','Supported'],['contradicted','Contradicted'],['unknown','Unknown']])$(id).textContent=records.filter(r=>r.verdict===key).length;
 $('list-count').textContent=records.length+'건';
 const q=$('search').value.trim().toLocaleLowerCase();const f=$('filter').value;
 const shown=records.filter(r=>(f==='all'||r.verdict===f)&&(!q||(r.claim+' '+r.document).toLocaleLowerCase().includes(q)));
 $('results-count').textContent=shown.length+' / '+records.length+'건 표시';
 if(!shown.length){$('records').innerHTML=records.length?'<div class="empty"><div class="empty-icon">⌕</div><strong>검색 결과가 없습니다</strong><p>검색어나 판정 필터를 변경해 보세요.</p><button class="btn" id="clear-search">검색 조건 초기화</button></div>':'<div class="empty"><div class="empty-icon">≡</div><strong>첫 번째 검증 기록을 남겨 보세요</strong><p>왼쪽에 주장과 근거를 입력하거나,<br>시연용 예시로 화면 구성을 확인할 수 있습니다.</p><span class="small">자동 판정 없이, 확인한 내용을 직접 기록합니다.</span></div>';return;}
 $('records').innerHTML=shown.map(r=>`<article class="record"><div class="record-top"><span class="badge ${r.verdict}">${labels[r.verdict]}</span>${r.demo?'<span class="badge demo">시연용 예시</span>':''}<span class="doc">${escape(r.document)} · ${escape(r.version)}</span></div><h3>${escape(r.claim)}</h3><div class="meta"><span>절·표 <b>${escape(r.clause||'미기재')}</b></span><span>PDF <b>${escape(r.pdfPage||'미확인')}</b></span><span>인쇄 <b>${escape(r.printedPage||'미확인')}</b></span></div><p class="reason-text">${escape(r.reason)}</p><div class="record-bottom"><span class="small">${formatDate(r.updatedAt)} · KST 수정</span><div class="actions"><button class="text-btn" data-edit="${escape(r.id)}">수정</button><button class="text-btn danger" data-delete="${escape(r.id)}">삭제</button></div></div></article>`).join('');
}
$('record-form').addEventListener('submit',event=>{
 event.preventDefault();
 const data=Object.fromEntries(fields.map(k=>[k,$(k).value.trim()]));
 const required=[['claim','검증할 주장'],['document','표준 문서명'],['version','버전'],['reason','판정 이유']];
 for(const [key,label] of required){if(!data[key]){notify(label+'을(를) 입력해 주세요.',true);$(key).focus();return;}}
 if(!Object.hasOwn(labels,data.verdict)){notify('판정을 선택해 주세요.',true);return;}
 if($('pdfPage').validity.badInput||(data.pdfPage&&(!Number.isInteger(Number(data.pdfPage))||Number(data.pdfPage)<1||Number(data.pdfPage)>100000))){notify('PDF 페이지는 1~100000 사이의 정수로 입력해 주세요.',true);$('pdfPage').focus();return;}
 if(!$('record-form').checkValidity()){notify('입력한 값의 형식과 길이를 확인해 주세요.',true);return;}
 const original=records.find(r=>r.id===editing);
 if(editing&&!original){notify('수정할 기록을 찾을 수 없습니다. 새로고침 후 확인해 주세요.',true);return;}
 const item={...data,id:editing||('note-'+Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-')),demo:original?.demo||false,updatedAt:new Date().toISOString()};
 const next=editing?records.map(r=>r.id===editing?item:r):[item,...records];
 if(commit(next,editing?'검증 기록을 수정했습니다.':'검증 기록을 저장했습니다.'))reset();
});
$('cancel-edit').addEventListener('click',()=>{reset();notify('수정을 취소했습니다.');});
$('search').addEventListener('input',render);$('filter').addEventListener('change',render);
$('records').addEventListener('click',event=>{
 const edit=event.target.closest('[data-edit]');const del=event.target.closest('[data-delete]');
 if(event.target.closest('#clear-search')){$('search').value='';$('filter').value='all';render();}
 if(edit){const r=records.find(r=>r.id===edit.dataset.edit);if(!r)return;editing=r.id;fields.forEach(k=>$(k).value=r[k]);$('form-title').textContent='검증 기록 수정';$('submit-btn').textContent='수정 내용 저장';$('cancel-edit').hidden=false;$('claim').focus();$('form-title').scrollIntoView({behavior:'smooth',block:'center'});notify(r.demo?'시연용 예시를 수정 중입니다. 예시 표시는 유지됩니다.':'기록을 수정한 뒤 저장해 주세요.');}
 if(del){pendingDelete=del.dataset.delete;$('delete-dialog').showModal();$('delete-cancel').focus();}
});
$('delete-cancel').addEventListener('click',()=>{$('delete-dialog').close();pendingDelete=null;});
$('delete-dialog').addEventListener('cancel',()=>{pendingDelete=null;});
$('delete-confirm').addEventListener('click',()=>{const id=pendingDelete;if(!id)return;const ok=commit(records.filter(r=>r.id!==id),'검증 기록을 삭제했습니다.');$('delete-dialog').close();pendingDelete=null;if(ok&&editing===id)reset();});
$('demo-btn').addEventListener('click',()=>{
 const examples=[
 {id:'demo-supported',verdict:'Supported',claim:'[시연] 원문에서 주장과 일치하는 조건을 확인한 경우',reason:'화면 구성을 보여 주기 위한 가상 기록입니다. 실제 표준을 검증한 결과가 아니며, 절·표·페이지 번호는 입력하지 않았습니다.'},
 {id:'demo-contradicted',verdict:'Contradicted',claim:'[시연] 주장에 대한 반례를 원문에서 확인한 경우',reason:'판정 유형을 설명하기 위한 가상 기록입니다. 실제 반례나 표준 근거를 제시한 것이 아닙니다.'},
 {id:'demo-unknown',verdict:'Unknown',claim:'[시연] 판정에 필요한 조건을 아직 확인하지 못한 경우',reason:'정보가 부족한 상태를 표현한 가상 기록입니다. 확인하지 못한 근거 위치는 비워 둡니다.'}];
 const missing=examples.filter(e=>!records.some(r=>r.id===e.id));if(!missing.length){notify('시연용 예시가 이미 추가되어 있습니다.');return;}
 const now=new Date().toISOString();commit([...missing.map(e=>({document:'3GPP TS (시연용)',version:'버전 미지정',clause:'',pdfPage:'',printedPage:'',demo:true,updatedAt:now,...e})),...records],'시연용 예시를 추가했습니다. 실제 표준 검증 결과가 아닙니다.');
});
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null){readBlocked=true;notify('다른 탭에서 저장 데이터가 변경되었습니다. 입력 내용을 별도로 복사한 뒤 새로고침해 주세요.',true);}});
render();
})();
