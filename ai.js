import {state,id,canEdit,put,list} from './store.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yen=usd=>Math.ceil(Number(usd||0)*150);
export function bindAI({projectId,entity,notify,dialog}){
 const root=document.querySelector('#ai-assistant');if(!root)return;
 root.innerHTML=`<section class="ai-panel ai-chat"><div class="section-heading"><h3>Claude 開発アシスタント</h3><span class="tag">Sonnet 5.5</span></div><p id="ai-budget">利用額を確認中…</p><details class="ai-chat-history"><summary>このプロジェクトの生成履歴</summary><div id="ai-history"></div></details><div id="ai-result" class="ai-messages" role="log" aria-label="Claudeとのチャット" aria-live="polite"><div class="ai-chat-welcome">コードの説明や修正を相談できます。<br>下の入力欄からメッセージを送ってください。</div></div><div class="ai-composer"><label>AIスキル<select id="ai-skill"><option value="">使用しない</option>${list('resource',projectId).filter(e=>e.payload.category==='skill'&&e.payload.content).map(e=>`<option value="${e.id}">${esc(e.payload.title)}</option>`).join('')}</select></label><label for="ai-prompt">相談・修正の指示</label><textarea id="ai-prompt" rows="3" placeholder="Claudeにメッセージを入力…"></textarea><div class="ai-composer-footer"><small>現在の下書きと指示を送信 · 月$20（約3,000円）上限</small><button id="ai-send" class="primary" ${canEdit()?'':'disabled'}>送信 ↑</button></div></div></section>`;
 const thread=root.querySelector('#ai-result');
 const scroll=()=>{thread.scrollTop=thread.scrollHeight;};
 root.querySelector('#ai-prompt').onkeydown=event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();root.querySelector('#ai-send').click();}};
 const budget=async()=>{if(state.preview){document.querySelector('#ai-budget').textContent='体験モードではClaude APIを呼びません。';return}const month=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'}).slice(0,7)+'-01';const {data,error}=await state.client.from('ai_monthly_budget').select('spent_usd,limit_usd').eq('month',month).maybeSingle();const target=document.querySelector('#ai-budget');if(target)target.textContent=error?'利用額を取得できません':`今月の学校全体：概算${yen(data?.spent_usd)}円 / ${yen(data?.limit_usd??20)}円（処理中の予約額を含む）`;};
 const history=async()=>{if(state.preview)return;const {data,error}=await state.client.from('ai_generations').select('id,response,status,cost_usd,created_at').eq('project_id',projectId).order('created_at',{ascending:false}).limit(10);const target=document.querySelector('#ai-history');if(target)target.innerHTML=error?'履歴を取得できません':(data||[]).map(g=>`<details><summary>${esc(new Date(g.created_at).toLocaleString('ja-JP'))} · ${esc(g.status)} · 約${yen(g.cost_usd)}円</summary><pre>${esc(g.response||'結果なし・処理中')}</pre></details>`).join('')||'まだ履歴はありません';};
 budget();history();
 document.querySelector('#ai-send').onclick=async event=>{
 if(state.preview){notify('Claudeは共同利用でログイン後に使用できます');return}
 const prompt=document.querySelector('#ai-prompt').value.trim();if(!prompt){notify('指示を入力してください');return}
 const code=document.querySelector('#code-form textarea').value;
 const skill=state.entities.find(e=>e.id===document.querySelector('#ai-skill').value)?.payload.content||'';
 const body={id:id(),projectId,path:entity.payload.path,code,prompt:prompt+(skill?'\n\n作業スキル:\n'+skill:'')};
 if(new TextEncoder().encode(JSON.stringify(body)).length>16000){notify('コード・指示・スキルの送信全体を16KB以下にしてください');return}
 event.target.disabled=true;thread.querySelector('.ai-chat-welcome')?.remove();thread.querySelectorAll('.ai-review').forEach(b=>b.disabled=true);thread.insertAdjacentHTML('beforeend',`<article class="ai-message user-message"><strong>あなた</strong><div>${esc(prompt)}</div></article><article class="ai-message assistant-message"><strong>Claude</strong><div class="ai-message-body">回答を考えています…</div></article>`);const output=thread.lastElementChild.querySelector('.ai-message-body');document.querySelector('#ai-prompt').value='';scroll();
 try{const {data,error}=await state.client.functions.invoke('school-ai',{body});if(error){let detail;try{detail=await error.context?.json()}catch{}throw Error(detail?.error||error.message)}if(data.error)throw Error(data.error);
 output.innerHTML=`<p>今回：約${yen(data.cost)}円 · 入力${data.inputTokens} / 出力${data.outputTokens}トークン</p><pre>${esc(data.text)}</pre>${data.truncated?'<p>回答が長さの上限に達しました。コードの適用はできません。依頼範囲を小さくしてください。</p>':''}<button class="ai-copy">回答をコピー</button>`;
 output.querySelector('.ai-copy').onclick=()=>navigator.clipboard.writeText(data.text).then(()=>notify('回答をコピーしました')).catch(()=>notify('コピーできませんでした'));
 const matches=[...data.text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)];
 if(matches.length===1&&!data.truncated&&canEdit()){
 output.insertAdjacentHTML('beforeend','<button class="ai-review">修正前後を確認して適用</button>');
 output.querySelector('.ai-review').onclick=()=>{const editor=document.querySelector('#code-form textarea');if(editor.value!==code){notify('生成後にコードが変わっています。現在のコードで相談し直してください');return}const candidate=matches[0][1].replace(/\n$/,'');const version=state.entities.find(e=>e.id===entity.id)?.version;if(version!==entity.version){notify('保存済みコードが変わっています。ファイルを開き直してください');return}
 dialog('Claudeの修正案を確認',`<p>確認して適用すると校内の下書きに保存します。</p><div class="ai-comparison"><div><strong>修正前</strong><pre>${esc(code)}</pre></div><div><strong>修正後</strong><pre>${esc(candidate)}</pre></div></div>`,async()=>{if(editor.value!==code)throw Error('コードが変わりました。再確認してください');const saved=await put(projectId,'code',{...entity.payload,code:candidate},entity.id,version);entity=saved;editor.value=candidate;notify('修正案を下書きに保存しました')},'確認した修正案を適用');};
 }
 }catch(e){output.textContent=e.message}finally{event.target.disabled=false;scroll();budget();history()}
 };
}
