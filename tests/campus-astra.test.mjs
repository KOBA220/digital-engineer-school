import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {campusSceneHTML,bindCampusScene} from '../campus-astra.js';
test('embedded room navigation accepts only this campus and cleans up on departure',()=>{
 const dom=new JSDOM(campusSceneHTML(),{url:'https://school.test/'});
 globalThis.window=dom.window;globalThis.document=dom.window.document;
 const frame=document.querySelector('iframe'),opened=[];
 const dispose=bindCampusScene({rooms:[['editing'],['dev']],onEnter:room=>opened.push(room)});
 const send=(origin,source,room)=>window.dispatchEvent(new window.MessageEvent('message',{origin,source,data:{type:'school:enter-room',room}}));
 send('https://other.test',frame.contentWindow,'editing');send(window.location.origin,window,'editing');send(window.location.origin,frame.contentWindow,'invalid');
 assert.deepEqual(opened,[]);
 send(window.location.origin,frame.contentWindow,'editing');assert.deepEqual(opened,['editing']);
 const source=frame.contentWindow;dispose();send(window.location.origin,source,'dev');assert.deepEqual(opened,['editing']);assert.equal(document.querySelector('iframe'),null);
 dom.window.close();
});
