require("dotenv").config();
const express=require("express"), path=require("path"), crypto=require("crypto"), session=require("express-session");
const app=express(), PORT=process.env.PORT||3000;
const CLIENT_ID=process.env.INSTAGRAM_APP_ID, CLIENT_SECRET=process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI=process.env.INSTAGRAM_REDIRECT_URI||`http://localhost:${PORT}/auth/instagram/callback`;
const API_VERSION=process.env.GRAPH_API_VERSION||"v26.0";
const API_BASE="https://graph.instagram.com";
app.use(express.json());
app.use(session({secret:process.env.SESSION_SECRET||crypto.randomBytes(32).toString("hex"),resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:1000*60*60*24*30}}));
app.use(express.static(path.join(__dirname,"public")));

function requireConfig(res){if(!CLIENT_ID||!CLIENT_SECRET)return res.status(500).json({error:"尚未設定 INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET"});}
async function postForm(url,body){const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(body)});const d=await r.json();if(!r.ok||d.error_type||d.error)throw new Error(d.error_message||d.error?.message||`HTTP ${r.status}`);return d}
async function graph(pathname,params={}){const token=params.access_token||global.__NO__;const p={...params};delete p.access_token;const u=new URL(`${API_BASE}/${API_VERSION}/${pathname}`);Object.entries(p).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok||d.error)throw new Error(d.error?.message||`Graph API HTTP ${r.status}`);return d}
function shortcode(url){const m=url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/i);return m?m[1]:null}

app.get("/auth/instagram",(req,res)=>{
 requireConfig(res);
 const state=crypto.randomBytes(24).toString("hex");req.session.oauthState=state;
 const u=new URL("https://www.instagram.com/oauth/authorize");
 u.searchParams.set("client_id",CLIENT_ID);u.searchParams.set("redirect_uri",REDIRECT_URI);u.searchParams.set("response_type","code");
 u.searchParams.set("scope","instagram_business_basic,instagram_business_manage_comments");u.searchParams.set("state",state);
 res.redirect(u.toString());
});
app.get("/auth/instagram/callback",async(req,res)=>{
 try{
  if(!req.query.code)return res.redirect("/?error="+encodeURIComponent("Instagram 沒有回傳授權碼"));
  if(req.query.state!==req.session.oauthState)return res.status(400).send("OAuth state 驗證失敗，請重新登入。");
  const short=await postForm("https://api.instagram.com/oauth/access_token",{client_id:CLIENT_ID,client_secret:CLIENT_SECRET,grant_type:"authorization_code",redirect_uri:REDIRECT_URI,code:req.query.code});
  const long=await (async()=>{const u=new URL(`${API_BASE}/access_token`);u.searchParams.set("grant_type","ig_exchange_token");u.searchParams.set("client_secret",CLIENT_SECRET);u.searchParams.set("access_token",short.access_token);const r=await fetch(u);const d=await r.json();if(!r.ok||d.error)throw new Error(d.error?.message||"長效 Token 換取失敗");return d})();
  const profile=await graph("me",{fields:"user_id,username",access_token:long.access_token});
  req.session.ig={userId:profile.user_id,username:profile.username,accessToken:long.access_token,expiresIn:long.expires_in};
  delete req.session.oauthState;res.redirect("/");
 }catch(e){res.status(500).send("Instagram 授權失敗："+e.message)}
});
app.get("/api/auth/me",(req,res)=>res.json(req.session.ig?{loggedIn:true,username:req.session.ig.username,userId:req.session.ig.userId}:{loggedIn:false}));
app.post("/auth/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

async function allPages(firstPath,params,token){
 let all=[],after=null;
 do{const p={...params};if(after)p.after=after;const d=await graph(firstPath,{...p,access_token:token});all.push(...(d.data||[]));after=d.paging?.cursors?.after||null}while(after);return all;
}
app.get("/api/comments",async(req,res)=>{
 try{
  if(!req.session.ig)return res.status(401).json({error:"請先登入 Instagram"});
  const code=shortcode(req.query.url||"");if(!code)return res.status(400).json({error:"不是有效的 Instagram 貼文網址"});
  const s=req.session.ig;
  const media=await allPages("me/media",{fields:"id,permalink,caption,media_type,timestamp",limit:"100"},s.accessToken);
  const target=media.find(x=>x.permalink===req.query.url||x.permalink?.replace(/\\/$/,"")===req.query.url.replace(/\\/$/,"")||x.permalink?.includes(`/p/${code}/`)||x.permalink?.includes(`/reel/${code}/`));
  if(!target)return res.status(404).json({error:"找不到這篇貼文。Instagram API 只能讀取目前授權專業帳號擁有的媒體。"});
  const comments=await allPages(`${target.id}/comments`,{fields:"id,text,username,timestamp,from",limit:"100"},s.accessToken);
  res.json({media:target,comments});
 }catch(e){res.status(500).json({error:e.message})}
});
app.listen(PORT,()=>console.log(`IG Lottery: http://localhost:${PORT}`));
