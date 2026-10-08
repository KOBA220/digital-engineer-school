import {test} from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../store.js';
import {officeURL,teamRules,officeDocuments,rulesHTML,officeHTML} from '../team-work.js';
test('Office links accept only HTTPS Microsoft document locations',()=>{
 for(const url of ['https://1drv.ms/p/s!document','https://onedrive.live.com/edit?id=123','https://team.sharepoint.com/:x:/r/sites/team/book.xlsx'])assert.equal(officeURL(url),url);
 for(const url of ['javascript:alert(1)','http://1drv.ms/p/x','https://sharepoint.com.evil.test/doc','https://evilsharepoint.com/doc','https://user:pass@1drv.ms/p/x','https://1drv.ms:444/p/x','https://1drv.ms/','bad'])assert.equal(officeURL(url),'');
});
test('team rules and Office registrations stay within their project and escape content',()=>{
 state.preview=false;state.role='viewer';state.entities=[
  {id:'r1',kind:'resource',project_id:'p1',payload:{category:'team-rule',title:'<script>alert(1)</script>',content:'A & B'}},
  {id:'r2',kind:'resource',project_id:'p2',payload:{category:'team-rule',title:'別の約束'}},
  {id:'d1',kind:'resource',project_id:'p1',payload:{category:'shared-office',title:'議事録',officeType:'word',url:'https://1drv.ms/w/document'}},
  {id:'d2',kind:'resource',project_id:'p2',payload:{category:'shared-office',title:'別の資料'}},
  {id:'gone',deleted:true,kind:'resource',project_id:'p1',payload:{category:'team-rule'}}
 ];
 assert.deepEqual(teamRules('p1').map(e=>e.id),['r1']);assert.deepEqual(officeDocuments('p1').map(e=>e.id),['d1']);
 const html=rulesHTML('p1');assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('data-team-rule-edit'));assert.ok(!html.includes('別の約束'));
 const office=officeHTML('p1');assert.ok(office.includes('https://1drv.ms/w/document'));assert.ok(!office.includes('data-office-delete'));assert.ok(!office.includes('別の資料'));
 state.role='editor';assert.ok(rulesHTML('p1').includes('data-team-rule-edit'));assert.ok(officeHTML('p1').includes('data-office-delete'));
});
