const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const Profile=require('../dist/models/MatrimonyProfile').default;
const Message=require('../dist/models/Message').default;
const controller=require('../dist/controllers/matrimonyController');
const restores=[];
function stub(obj,key,value){const old=obj[key];obj[key]=value;restores.push(()=>obj[key]=old);}
afterEach(()=>{while(restores.length)restores.pop()();});
const a='000000000000000000000001',b='000000000000000000000002',c='000000000000000000000003';
const room='match_'+a+'_'+b;
function permit(){stub(Profile,'find',async()=>[{user:a,status:'approved',subscription:{isActive:true,expiresAt:new Date(Date.now()+60000)}},{user:b,status:'approved'}]);}
function req(body={},id=a) {
  return { user:{id}, body, params:{roomId:room,userId:id}, query:{}, app:{ get() {
    return { to(target) { return { emit(event,data) { events.push({target,event,data}); } }; } };
  } } };
}
function res(){return{code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
let events=[];
afterEach(()=>events=[]);
const saved={_id:'100000000000000000000001',senderId:a,receiverId:b,roomId:room,text:'Hello',clientMessageId:'reference-message-1234',timestamp:new Date(),isRead:false,toObject(){return {...this};}};
test('persisted sends and duplicate-key retries return the same message to participant rooms only',async()=>{
  permit();let writes=0;
  stub(Message,'findOneAndUpdate',async()=>{if(writes++)throw Object.assign(new Error('duplicate'),{code:11000});return saved;});
  stub(Message,'findOne',async()=>saved);
  for(let i=0;i<2;i++){const r=res();await controller.sendMessage(req({text:'Hello',clientMessageId:saved.clientMessageId}),r);assert.equal(r.code,200);assert.equal(r.body._id,saved._id);}
  assert.deepEqual([...new Set(events.map(e=>e.target))],['user_'+a,'user_'+b]);
});
test('reference reuse for different content is rejected',async()=>{
  permit();stub(Message,'findOneAndUpdate',async()=>saved);
  const r=res();await controller.sendMessage(req({text:'Changed',clientMessageId:saved.clientMessageId}),r);assert.equal(r.code,409);assert.equal(events.length,0);
});
test('outsiders cannot fetch, send or mark another conversation read',async()=>{
  stub(Message,'find',()=>{throw new Error('must not query');});
  for(const method of ['getMessages','sendMessage','markMessagesAsRead']){const r=res();await controller[method](req({},c),r);assert.equal(r.code,403);}
});
test('database outage is retryable 503 without database error disclosure',async()=>{
  stub(Profile,'find',async()=>{throw new Error('database-secret');});
  const r=res();await controller.getMessages(req(),r);assert.equal(r.code,503);assert.doesNotMatch(r.body.error,/database-secret/);
});
test('read receipts are restricted to displayed IDs, receiver and authorized room',async()=>{
  permit();let query;
  stub(Message,'updateMany',async(q)=>{query=q;return{modifiedCount:1};});
  const r=res();await controller.markMessagesAsRead(req({messageIds:[saved._id]}),r);
  assert.equal(r.code,200);assert.equal(query.receiverId,a);assert.equal(query.roomId,room);assert.deepEqual(query._id.$in,[saved._id]);assert.equal(events[0].event,'messages_read');
  for(const ids of [null,['foreign'],Array(201).fill(saved._id)]){const invalid=res();await controller.markMessagesAsRead(req({messageIds:ids}),invalid);assert.equal(invalid.code,400);}
});
test('cached old clients cannot accidentally mark undisplayed messages read',async()=>{
  permit();stub(Message,'updateMany',()=>{throw new Error('must not update');});
  const r=res();await controller.markMessagesAsRead(req(),r);assert.equal(r.code,200);assert.equal(r.body.messageIdsRequired,true);
});
test('older-message cursors must belong to the same authorized room',async()=>{
  permit();stub(Message,'findOne',async q=>{assert.equal(q.roomId,room);return null;});
  const request=req();request.query.before=saved._id;const r=res();await controller.getMessages(request,r);assert.equal(r.code,400);
});
test('valid profile fields persist under the authenticated owner and await human approval',async()=>{
  let query,update;
  stub(Profile,'findOneAndUpdate',async(q,u)=>{query=q;update=u;return{subscription:{isActive:false},toObject:()=>u.$set};});
  const r=res();await controller.createProfile(req({age:29,height:'170 cm',religion:'Hindu',community:'',profession:'Engineer',location:'Visakhapatnam',bio:'About me',user:b,status:'approved'}),r);
  assert.equal(r.code,200);assert.equal(query.user,a);assert.equal(update.$set.age,29);assert.equal(update.$set.status,'pending');assert.equal(update.$setOnInsert.user,a);assert.equal(update.$set.ownerVerified,true);
});
test('inbox groups conversations before limiting, includes unread counts and hides private subscription IDs',async()=>{
  stub(Profile,'findOne',async()=>({status:'approved',subscription:{isActive:true,expiresAt:new Date(Date.now()+60000)}}));
  let pipeline;
  stub(Message,'aggregate',async p=>{pipeline=p;return[{latestMessage:saved,unreadCount:2}];});
  stub(Profile,'find',()=>({populate:async()=>[{user:{_id:b,name:'Recipient'},subscription:{plan:'Gold',paymentTransactionId:'private'},toObject(){return{user:this.user,subscription:this.subscription};}}]}));
  const r=res();await controller.getInbox(req(),r);assert.equal(r.code,200);assert.equal(r.body[0].unreadCount,2);assert.equal(r.body[0].profile.subscription.paymentTransactionId,undefined);assert.ok(pipeline.findIndex(p=>p.$group)<pipeline.findIndex(p=>p.$limit));
});
