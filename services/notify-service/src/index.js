const express=require('express'),mongoose=require('mongoose'),cors=require('cors');
const app=express();app.use(cors());app.use(express.json());
const MONGO_URL=process.env.MONGO_URL||'mongodb://mongo:27017/maindb';
const S=new mongoose.Schema({type:String,message:String,refId:String,by:String},{timestamps:true});
const N=mongoose.model('Notify',S);
app.get('/health',(q,s)=>s.json({ok:true,service:'notify'}));
app.get('/',async(q,s)=>{const d=await N.find().sort({createdAt:-1}).limit(50);s.json({ok:true,data:d});});
app.post('/',async(q,s)=>{const d=await N.create({type:q.body.type||'info',message:q.body.message||'',refId:q.body.refId||'',by:q.headers['x-user-id']||''});s.json({ok:true,data:d});});
mongoose.connect(MONGO_URL).then(()=>app.listen(process.env.PORT||5004,()=>console.log('notify up'))).catch(e=>{console.error(e);process.exit(1);});
