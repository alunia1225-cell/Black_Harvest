import Phaser from "phaser";

type Product={id:string,name:string,category:string,basePrice:number};
type Item={productId:string,quantity:number,sellPrice:number};
type Order={productId:string,quantity:number,maxPrice:number,customer:string,expires:number};
type Location={id:string,name:string,type:string,x:number,y:number,w:number,h:number};

const PRODUCTS:Product[]=[
["blue_dream","ブルードリーム","weed",25],["gelato","ジェラート","weed",25],
["og_haze","OGヘイズ","weed",25],["purple_haze","パープルヘイズ","weed",25],
["azure_bloom","アズールブルーム","weed",25],["blood_ember","ブラッドエンバー","weed",25],
["desert_drift","デザートドリフト","weed",25],["frostbyte","フロストバイト","weed",25],
["glacier_dust","グレイシャーダスト","weed",25],["jungle_flame","ジャングルフレイム","weed",25],
["shadow_nectar","シャドウネクター","weed",25],["sunset_kiss","サンセットキス","weed",25],
["amber_shard","アンバーシャード","meth",45],["blue_sky","ブルースカイ","meth",45],
["crystal","クリスタル","meth",45],["flash_gold","フラッシュゴールド","meth",45],
["pure_rose","ピュアローズ","meth",45],["silent_mint","サイレントミント","meth",45],
["blue_frost","ブルーフロスト","coke",60],["crack","クラック","coke",60],
["cream_snow","クリームスノー","coke",60],["diamond_dust","ダイヤモンドダスト","coke",60],
["pale_cut","ペイルカット","coke",60],["white_veil","ホワイトヴェイル","coke",60]
].map(([id,name,category,p])=>({id,name,category,basePrice:Number(p)}));

const LOCATIONS:Location[]=[
{id:"safe_house",name:"安全地帯",type:"家",x:150,y:130,w:230,h:150},
{id:"gun_store",name:"銃器店",type:"店舗",x:900,y:90,w:160,h:110},
{id:"hardware_store",name:"金物店",type:"店舗",x:1080,y:90,w:170,h:110},
{id:"gas_mart",name:"ガスマート",type:"店舗",x:1110,y:230,w:140,h:100},
{id:"pawn_shop",name:"質屋",type:"店舗",x:900,y:240,w:150,h:100},
{id:"bank",name:"銀行",type:"店舗",x:700,y:240,w:150,h:100},
{id:"warehouse",name:"倉庫",type:"保管",x:100,y:470,w:250,h:170},
{id:"chemistry",name:"化学ステーション",type:"製造",x:470,y:470,w:190,h:150},
{id:"blending",name:"混合ステーション",type:"製造",x:690,y:470,w:190,h:150},
{id:"police_station",name:"警察署",type:"警察",x:1030,y:470,w:230,h:170}
];

class State{
 day=1; minute=8*60; money=500; suspicion=0; energy=100;
 inventory:Item[]=[{productId:"blue_dream",quantity:5,sellPrice:30}];
 storage:Item[]=[]; order:Order|null=null; inside:Location|null=null;
 getProduct(id:string){const p=PRODUCTS.find(x=>x.id===id);if(!p)throw Error(id);return p}
 save(){localStorage.setItem("black-harvest-v3",JSON.stringify({
  day:this.day,minute:this.minute,money:this.money,suspicion:this.suspicion,energy:this.energy,
  inventory:this.inventory,storage:this.storage,order:this.order
 }))}
 load(){const r=localStorage.getItem("black-harvest-v3");if(!r)return false;try{
  const x=JSON.parse(r);Object.assign(this,x);return true
 }catch{return false}}
}

class Scene extends Phaser.Scene{
 s=new State(); player!:Phaser.GameObjects.Rectangle; info!:Phaser.GameObjects.Text;
 msg!:Phaser.GameObjects.Text; orderText!:Phaser.GameObjects.Text;
 inventoryPanel!:Phaser.GameObjects.Container; activeLocation:Location|null=null;
 cursors!:Phaser.Types.Input.Keyboard.CursorKeys; keys!:Record<string,Phaser.Input.Keyboard.Key>;
 mapW=1400;mapH=760; moving=false;

 constructor(){super("Main")}
 create(){
  this.s.load();
  this.drawWorld();
  this.player=this.add.rectangle(600,380,28,28,0xe4c967).setDepth(20);
  const kb=this.input.keyboard!;this.cursors=kb.createCursorKeys();
  this.keys={w:kb.addKey("W"),a:kb.addKey("A"),s:kb.addKey("S"),d:kb.addKey("D"),e:kb.addKey("E"),i:kb.addKey("I")};
  this.makeHud();this.makeInventory();this.makeTouch();
  kb.on("keydown-I",()=>this.toggleInventory());kb.on("keydown-E",()=>this.interact());
  this.time.addEvent({delay:8000,loop:true,callback:()=>this.tick(10)});
  this.cameras.main.setBounds(0,0,this.mapW,this.mapH).startFollow(this.player,true,.08,.08);
  this.spawnOrder();
  this.say("WASD / 矢印で移動。Eで建物を調べる。Iでインベントリ。");
 }
 update(_t:number,delta:number){
  if(this.inventoryPanel.visible)return;
  let x=0,y=0;if(this.cursors.left.isDown||this.keys.a.isDown)x--;if(this.cursors.right.isDown||this.keys.d.isDown)x++;
  if(this.cursors.up.isDown||this.keys.w.isDown)y--;if(this.cursors.down.isDown||this.keys.s.isDown)y++;
  if(x||y){const n=Math.hypot(x,y);this.player.x=Phaser.Math.Clamp(this.player.x+x/n*delta*.18,15,this.mapW-15);this.player.y=Phaser.Math.Clamp(this.player.y+y/n*delta*.18,15,this.mapH-15)}
 }
 drawWorld(){
  const g=this.add.graphics();g.fillStyle(0x14171c);g.fillRect(0,0,this.mapW,this.mapH);
  g.fillStyle(0x292e37);g.fillRect(0,330,this.mapW,90);g.fillRect(400,0,70,this.mapH);g.fillRect(850,0,70,this.mapH);
  for(const l of LOCATIONS){g.fillStyle(l.type==="警察"?0x30343b:l.type==="製造"?0x2c3330:l.type==="保管"?0x34302a:0x282d36);g.fillRect(l.x,l.y,l.w,l.h);g.lineStyle(2,0x5c6674);g.strokeRect(l.x,l.y,l.w,l.h);this.add.text(l.x+10,l.y+10,l.name,{fontSize:"18px",color:"#f0f0f0"})}
  this.add.text(25,25,"BLACK HARVEST",{fontSize:"30px",color:"#fff"});
  this.add.text(25,60,"街",{fontSize:"18px",color:"#aeb5bf"});
 }
 makeHud(){
  this.add.rectangle(0,0,460,86,0x0b0e13,.94).setOrigin(0).setScrollFactor(0).setDepth(100);
  this.add.text(18,10,"BLACK HARVEST",{fontSize:"24px"}).setScrollFactor(0).setDepth(101);
  this.info=this.add.text(18,46,"",{fontSize:"14px",color:"#d5d9df"}).setScrollFactor(0).setDepth(101);
  this.msg=this.add.text(20,105,"",{fontSize:"16px",color:"#f3d56d",backgroundColor:"#11151b",padding:{left:10,right:10,top:6,bottom:6}}).setScrollFactor(0).setDepth(101);
  this.orderText=this.add.text(20,145,"",{fontSize:"15px",color:"#b8e1ff",backgroundColor:"#11151b",padding:{left:10,right:10,top:6,bottom:6}}).setScrollFactor(0).setDepth(101);
  this.refresh();
 }
 refresh(){this.info?.setText(`所持金 $${this.s.money}  手配度 ${this.s.suspicion}%  ${this.s.day}日目 ${this.timeText()}`);this.orderText?.setText(this.s.order?`注文：${this.s.getProduct(this.s.order.productId).name} ×${this.s.order.quantity} / 上限 $${this.s.order.maxPrice}`:"現在の注文：なし")}
 timeText(){return `${String(Math.floor(this.s.minute/60)).padStart(2,"0")}:${String(this.s.minute%60).padStart(2,"0")}`}
 say(t:string){this.msg?.setText(t);this.time.delayedCall(2600,()=>this.msg?.setText(""))}
 tick(min:number){this.s.minute+=min;this.s.suspicion=Math.max(0,this.s.suspicion-1);if(this.s.minute>=23*60&&this.s.inside?.type!=="家"){this.say("門限です。安全地帯へ戻ってください。");this.s.suspicion=Math.min(100,this.s.suspicion+5)}if(this.s.minute>=24*60)this.nextDay();this.refresh()}
 spawnOrder(){
  const p=PRODUCTS[Math.floor(Math.random()*PRODUCTS.length)];
  const q=1+Math.floor(Math.random()*2);
  this.s.order={productId:p.id,quantity:q,maxPrice:p.basePrice+15+Math.floor(Math.random()*20),customer:["ユウ","レン","カイ","ミナ"][Math.floor(Math.random()*4)],expires:this.s.minute+180};
  this.refresh();
 }
 interact(){
  const near=LOCATIONS.find(l=>Phaser.Math.Distance.Between(this.player.x,this.player.y,l.x+l.w/2,l.y+l.h/2)<Math.max(l.w,l.h)*.75);
  if(this.s.inside){this.exitBuilding();return}
  if(!near){this.say("近くに調べられる場所がありません。");return}
  this.enterBuilding(near);
 }
 enterBuilding(l:Location){this.s.inside=l;this.activeLocation=l;this.player.x=600;this.player.y=380;
  this.say(`${l.name}に入りました。Eで外へ戻ります。`);
  if(l.type==="店舗")this.say(`${l.name}：商品を確認できます。`);
  if(l.type==="保管")this.say("保管庫：インベントリから預け入れ・取り出しができます。");
  if(l.type==="製造")this.say("製造設備：レシピ解析後に加工を接続します。");
  if(l.type==="警察"){this.s.suspicion=Math.max(0,this.s.suspicion-10);this.say("警察署：手配度が少し下がりました。")}
 }
 exitBuilding(){this.s.inside=null;this.activeLocation=null;this.player.x=600;this.player.y=380;this.say("街へ戻りました。")}
 makeInventory(){
  this.inventoryPanel=this.add.container(0,0).setScrollFactor(0).setDepth(300).setVisible(false);
  this.inventoryPanel.add(this.add.rectangle(0,0,560,620,0x0d1015,.98).setOrigin(0));
  this.inventoryPanel.add(this.add.text(25,20,"インベントリ",{fontSize:"30px"}));
  const close=this.add.text(515,18,"×",{fontSize:"30px"}).setInteractive({useHandCursor:true});close.on("pointerdown",()=>this.toggleInventory());this.inventoryPanel.add(close);
  this.renderInventory();
 }
 renderInventory(){
  if(!this.inventoryPanel)return;
  this.inventoryPanel.list.slice(3).forEach(o=>this.inventoryPanel.remove(o,true));
  let y=75;
  for(const item of this.s.inventory){
   const p=this.s.getProduct(item.productId);
   const row=this.add.rectangle(280,y+25,510,58,0x1b2129,1);row.setOrigin(.5);
   const text=this.add.text(25,y,`${p.name} ×${item.quantity}\n価格 $${item.sellPrice}`,{fontSize:"14px"});
   const price=this.add.text(395,y+9,"価格 +5",{fontSize:"13px",color:"#e7cf73"}).setInteractive({useHandCursor:true});
   price.on("pointerdown",()=>{item.sellPrice+=5;this.renderInventory();this.say(`${p.name}：売値を $${item.sellPrice} に変更`)});
   const sell=this.add.text(470,y+9,"売却",{fontSize:"13px",color:"#9de2aa"}).setInteractive({useHandCursor:true});
   sell.on("pointerdown",()=>this.sellItem(item));
   this.inventoryPanel.add(row,text,price,sell);y+=70;
  }
  const hint=this.add.text(25,560,"客の注文に合えば自動で交渉できます。",{fontSize:"14px",color:"#8e98a5"});this.inventoryPanel.add(hint);
 }
 sellItem(item:Item){
  if(item.quantity<=0)return;
  const p=this.s.getProduct(item.productId);
  if(!this.s.order||this.s.order.productId!==p.id){this.say("現在の客の注文と一致しません。");return}
  const order=this.s.order;
  const offered=item.sellPrice;
  if(item.quantity<order.quantity){this.say("数量が足りません。");return}
  if(offered<=order.maxPrice){item.quantity-=order.quantity;this.s.money+=offered*order.quantity;this.s.suspicion=Math.min(100,this.s.suspicion+order.quantity*5);this.say(`${order.customer}との取引成立。$${offered*order.quantity}を受け取りました。`);this.s.order=null;this.spawnOrder()}
  else{
   const counter=Math.max(p.basePrice,Math.floor((offered+order.maxPrice)/2));
   if(counter<=order.maxPrice+5){item.sellPrice=counter;item.quantity-=order.quantity;this.s.money+=counter*order.quantity;this.s.suspicion=Math.min(100,this.s.suspicion+order.quantity*5);this.say(`価格交渉成立。$${counter*order.quantity}を受け取りました。`);this.s.order=null;this.spawnOrder()}
   else this.say(`${order.customer}：「高すぎる」。取引を断られました。`);
  }
  if(item.quantity<=0)this.s.inventory=this.s.inventory.filter(x=>x!==item);
  this.renderInventory();this.refresh();this.s.save();
 }
 toggleInventory(){this.inventoryPanel.setVisible(!this.inventoryPanel.visible);if(this.inventoryPanel.visible)this.renderInventory()}
 makeTouch(){
  const y=()=>this.scale.height-80;
  const b=(label:string,x:number,dx:number,dy:number)=>{const r=this.add.circle(x,y(),25,0x29313b,.9).setScrollFactor(0).setDepth(250).setInteractive({useHandCursor:true});this.add.text(x,y(),label,{fontSize:"18px"}).setOrigin(.5).setScrollFactor(0).setDepth(251);r.on("pointerdown",()=>{this.player.x=Phaser.Math.Clamp(this.player.x+dx,15,this.mapW-15);this.player.y=Phaser.Math.Clamp(this.player.y+dy,15,this.mapH-15)})};
  b("←",35,-35,0);b("↓",75,0,35);b("→",115,35,0);
  const up=this.add.circle(75,y()-45,25,0x29313b,.9).setScrollFactor(0).setDepth(250).setInteractive({useHandCursor:true});this.add.text(75,y()-45,"↑",{fontSize:"18px"}).setOrigin(.5).setScrollFactor(0).setDepth(251);up.on("pointerdown",()=>this.player.y=Math.max(15,this.player.y-35));
  const i=this.add.rectangle(this.scale.width-75,y(),120,40,0x29313b,.95).setScrollFactor(0).setDepth(250).setInteractive({useHandCursor:true});this.add.text(this.scale.width-75,y(),"インベントリ",{fontSize:"13px"}).setOrigin(.5).setScrollFactor(0).setDepth(251);i.on("pointerdown",()=>this.toggleInventory());
  const e=this.add.rectangle(this.scale.width-75,y()-50,120,40,0x29313b,.95).setScrollFactor(0).setDepth(250).setInteractive({useHandCursor:true});this.add.text(this.scale.width-75,y()-50,"調べる / 入る",{fontSize:"12px"}).setOrigin(.5).setScrollFactor(0).setDepth(251);e.on("pointerdown",()=>this.interact());
 }
 nextDay(){this.s.day++;this.s.minute=8*60;this.s.suspicion=Math.max(0,this.s.suspicion-15);this.s.save();this.say(`一日終了。${this.s.day}日目が始まりました。`);this.spawnOrder();this.refresh()}
}

new Phaser.Game({type:Phaser.AUTO,parent:"app",width:1280,height:720,backgroundColor:"#101216",scene:[Scene],scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH}});
