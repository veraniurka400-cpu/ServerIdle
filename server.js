require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");

const app = express();
const db = new Database("serveridle.sqlite");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, google_id TEXT UNIQUE, email TEXT, display_name TEXT, roblox_id TEXT, roblox_name TEXT);
CREATE TABLE IF NOT EXISTS scripts (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, kind TEXT NOT NULL, code TEXT NOT NULL, image_url TEXT, author_id TEXT NOT NULL, author_name TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS link_codes (code TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER DEFAULT 0);
`);
app.use(express.json({limit:"250kb"}));
app.use(express.urlencoded({extended:false}));
app.use(session({
  secret: process.env.SESSION_SECRET || "development-only-change-me",
  resave:false, saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:7*24*60*60*1000}
}));
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((u,done)=>done(null,u.id));
passport.deserializeUser((id,done)=>done(null,db.prepare("SELECT id,email,display_name,roblox_id,roblox_name FROM users WHERE id=?").get(id)||false));

if(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET){
  passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:(process.env.BASE_URL||"http://localhost:3000")+"/auth/google/callback"
  },(accessToken,refreshToken,profile,done)=>{
    try{
      const id=profile.id, email=profile.emails?.[0]?.value||"", name=profile.displayName||"Developer";
      db.prepare(`INSERT INTO users(id,google_id,email,display_name) VALUES(?,?,?,?)
        ON CONFLICT(google_id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name`)
        .run(id,id,email,name);
      done(null,db.prepare("SELECT id,email,display_name,roblox_id,roblox_name FROM users WHERE google_id=?").get(id));
    }catch(e){done(e);}
  }));
}
const requireAuth=(req,res,next)=>req.isAuthenticated()?next():res.status(401).json({error:"Inicia sesión con Google primero."});
app.use(express.static(path.join(__dirname,"public")));

app.get("/auth/google",(req,res,next)=>{
  if(!process.env.GOOGLE_CLIENT_ID) return res.status(503).send("Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env primero.");
  passport.authenticate("google",{scope:["profile","email"]})(req,res,next);
});
app.get("/auth/google/callback",(req,res,next)=>{
  passport.authenticate("google",{failureRedirect:"/?login=error"})(req,res,()=>res.redirect("/"));
});
app.post("/auth/logout",(req,res)=>req.logout(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>res.json({user:req.user||null}));

// Public Script Cloud. Publishing requires a signed-in account.
app.get("/api/scripts",(req,res)=>{
  const q=String(req.query.q||"").slice(0,80);
  const rows=q
    ? db.prepare("SELECT id,title,description,kind,image_url,author_name,created_at FROM scripts WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC LIMIT 50").all(`%${q}%`,`%${q}%`)
    : db.prepare("SELECT id,title,description,kind,image_url,author_name,created_at FROM scripts ORDER BY created_at DESC LIMIT 50").all();
  res.json(rows);
});
app.post("/api/scripts",requireAuth,(req,res)=>{
  const {title,description,kind,code,image_url}=req.body||{};
  if(!title?.trim()||!description?.trim()||!code?.trim()) return res.status(400).json({error:"Completa título, descripción y código."});
  if(!["Script","LocalScript","ModuleScript"].includes(kind)) return res.status(400).json({error:"Tipo de script no válido."});
  if(title.length>70||description.length>500||code.length>50000) return res.status(413).json({error:"Límite de contenido superado."});
  const id=crypto.randomUUID();
  db.prepare("INSERT INTO scripts VALUES(?,?,?,?,?,?,?,?,?)").run(id,title.trim(),description.trim(),kind,code,image_url||null,req.user.id,req.user.display_name,new Date().toISOString());
  res.json({ok:true,id});
});
app.get("/api/scripts/:id",(req,res)=>{
  const row=db.prepare("SELECT id,title,description,kind,code,image_url,author_name,created_at FROM scripts WHERE id=?").get(req.params.id);
  row?res.json(row):res.status(404).json({error:"No encontrado."});
});

// Four-digit linking handshake. Website shows code; owner enters it in their own Roblox experience.
app.post("/api/link-code",requireAuth,(req,res)=>{
  const code=String(crypto.randomInt(1000,10000));
  const expires=Date.now()+5*60*1000;
  db.prepare("INSERT INTO link_codes(code,user_id,expires_at) VALUES(?,?,?)").run(code,req.user.id,expires);
  res.json({code,expires_in_seconds:300});
});
app.post("/api/roblox/claim",(req,res)=>{
  const {code,robloxUserId,robloxUsername,serverSecret}=req.body||{};
  // In production set ROBLOX_SERVER_SECRET and send it only from your own Roblox server script.
  if(!process.env.ROBLOX_SERVER_SECRET || serverSecret!==process.env.ROBLOX_SERVER_SECRET) return res.status(403).json({error:"Servidor no autorizado."});
  const row=db.prepare("SELECT * FROM link_codes WHERE code=? AND used=0").get(String(code||""));
  if(!row||row.expires_at<Date.now()) return res.status(400).json({error:"Código inválido o vencido."});
  if(!/^\d{1,20}$/.test(String(robloxUserId||""))||!robloxUsername) return res.status(400).json({error:"Datos Roblox inválidos."});
  db.prepare("UPDATE users SET roblox_id=?,roblox_name=? WHERE id=?").run(String(robloxUserId),String(robloxUsername).slice(0,30),row.user_id);
  db.prepare("UPDATE link_codes SET used=1 WHERE code=?").run(String(code));
  res.json({ok:true});
});

// Game discovery through Roblox Open Cloud. API key never reaches the browser.
app.get("/api/roblox/experiences",requireAuth,async(req,res)=>{
  if(!req.user.roblox_id) return res.status(400).json({error:"Vincula primero tu cuenta Roblox desde el juego."});
  const key=process.env.ROBLOX_OPEN_CLOUD_API_KEY;
  if(!key) return res.status(503).json({error:"Falta configurar ROBLOX_OPEN_CLOUD_API_KEY en el servidor."});
  try{
    const r=await fetch(`https://apis.roblox.com/cloud/v2/users/${req.user.roblox_id}/universes`,{headers:{"x-api-key":key}});
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:"Roblox Open Cloud no pudo listar las experiencias.",details:data});
    res.json(data);
  }catch(e){res.status(502).json({error:"No se pudo conectar con Roblox."});}
});

app.get("/health",(req,res)=>res.json({ok:true,service:"serverIdle"}));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`serverIdle listo en http://localhost:${port}`));
