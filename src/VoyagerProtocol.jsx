import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

// ── AUDIO ENGINE ──────────────────────────────────────────────────────────────
class VoyagerAudio {
  constructor() { this.ctx=null; this.engineNode=null; this.engineGain=null;
    this.engineFilter=null; this.masterGain=null; this.singNode=null;
    this.singGain=null; this.enabled=true; }
  _init() {
    if(this.ctx) return;
    try { this.ctx=new(window.AudioContext||window.webkitAudioContext)();
      this.masterGain=this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.55,this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch(e){this.enabled=false;}
  }
  _resume(){ if(this.ctx&&this.ctx.state==='suspended') this.ctx.resume(); }
  startEngine(){
    this._init(); this._resume();
    if(!this.enabled||!this.ctx) return;
    this.stopEngine();
    const o1=this.ctx.createOscillator(), o2=this.ctx.createOscillator();
    const g=this.ctx.createGain(), f=this.ctx.createBiquadFilter();
    o1.type='sawtooth'; o1.frequency.value=55;
    o2.type='sawtooth'; o2.frequency.value=58.2;
    f.type='lowpass'; f.frequency.value=320;
    g.gain.setValueAtTime(0,this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.18,this.ctx.currentTime+0.8);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.masterGain);
    o1.start(); o2.start();
    this.engineNode=[o1,o2]; this.engineGain=g; this.engineFilter=f;
  }
  stopEngine(){
    if(!this.engineNode) return;
    try{ this.engineGain.gain.linearRampToValueAtTime(0,this.ctx.currentTime+0.3);
      setTimeout(()=>{ this.engineNode.forEach(n=>{try{n.stop();}catch(e){}});
        this.engineNode=null; this.engineGain=null; },350); }catch(e){}
  }
  setEngineSpeed(n){
    if(!this.engineGain||!this.ctx) return;
    this.engineGain.gain.setTargetAtTime(0.08+n*0.22,this.ctx.currentTime,0.25);
    if(this.engineNode){
      this.engineNode[0].frequency.setTargetAtTime(48+n*60,this.ctx.currentTime,0.3);
      this.engineNode[1].frequency.setTargetAtTime((48+n*60)*1.056,this.ctx.currentTime,0.3);
    }
    if(this.engineFilter)
      this.engineFilter.frequency.setTargetAtTime(200+n*500,this.ctx.currentTime,0.3);
  }
  playImpact(dmg){
    this._init(); this._resume();
    if(!this.enabled||!this.ctx) return;
    const now=this.ctx.currentTime, vol=Math.min(1,0.25+dmg/80);
    const osc=this.ctx.createOscillator(), g=this.ctx.createGain();
    osc.type='sawtooth'; osc.frequency.setValueAtTime(180,now);
    osc.frequency.exponentialRampToValueAtTime(28,now+0.12);
    g.gain.setValueAtTime(vol,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.18);
    osc.connect(g); g.connect(this.masterGain); osc.start(now); osc.stop(now+0.2);
    const bl=Math.floor(this.ctx.sampleRate*0.08);
    const buf=this.ctx.createBuffer(1,bl,this.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<bl;i++) d[i]=(Math.random()*2-1)*(1-i/bl);
    const ns=this.ctx.createBufferSource(), ng=this.ctx.createGain();
    ns.buffer=buf; ng.gain.setValueAtTime(vol*0.6,now);
    ng.gain.exponentialRampToValueAtTime(0.001,now+0.09);
    ns.connect(ng); ng.connect(this.masterGain); ns.start(now);
  }
  playPickup(type){
    this._init(); this._resume();
    if(!this.enabled||!this.ctx) return;
    const m={alloy:[880,1100],graviton:[660,990],shard:[1050,1400],item:[1200,1600]};
    const [f1,f2]=(m[type]||m.alloy);
    const now=this.ctx.currentTime;
    [f1,f2].forEach((f,i)=>{
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0,now+i*0.06);
      g.gain.linearRampToValueAtTime(0.18,now+i*0.06+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,now+i*0.06+0.32);
      o.connect(g); g.connect(this.masterGain);
      o.start(now+i*0.06); o.stop(now+i*0.06+0.35);
    });
  }
  playPlateForged(){
    this._init(); this._resume();
    if(!this.enabled||!this.ctx) return;
    const now=this.ctx.currentTime;
    [440,550,660,880].forEach((f,i)=>{
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type=i<2?'sine':'triangle'; o.frequency.value=f;
      g.gain.setValueAtTime(0,now+i*0.05);
      g.gain.linearRampToValueAtTime(0.14,now+i*0.05+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,now+i*0.05+0.7);
      o.connect(g); g.connect(this.masterGain);
      o.start(now+i*0.05); o.stop(now+i*0.05+0.75);
    });
  }
  playExplosion(){
    this._init(); this._resume();
    if(!this.enabled||!this.ctx) return;
    const now=this.ctx.currentTime;
    const bl=Math.floor(this.ctx.sampleRate*1.2);
    const buf=this.ctx.createBuffer(1,bl,this.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<bl;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/bl,1.4);
    const ns=this.ctx.createBufferSource();
    const fl=this.ctx.createBiquadFilter(), g=this.ctx.createGain();
    ns.buffer=buf; fl.type='lowpass'; fl.frequency.value=420;
    g.gain.setValueAtTime(1.0,now); g.gain.exponentialRampToValueAtTime(0.001,now+1.1);
    ns.connect(fl); fl.connect(g); g.connect(this.masterGain); ns.start(now);
    const sub=this.ctx.createOscillator(), sg=this.ctx.createGain();
    sub.type='sine'; sub.frequency.setValueAtTime(80,now);
    sub.frequency.exponentialRampToValueAtTime(18,now+0.6);
    sg.gain.setValueAtTime(0.7,now); sg.gain.exponentialRampToValueAtTime(0.001,now+0.65);
    sub.connect(sg); sg.connect(this.masterGain); sub.start(now); sub.stop(now+0.7);
  }
  playShutter(){
    this._init(); this._resume();
    if(!this.enabled||!this.ctx) return;
    const now=this.ctx.currentTime;
    const bl=Math.floor(this.ctx.sampleRate*0.04);
    const buf=this.ctx.createBuffer(1,bl,this.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<bl;i++) d[i]=(Math.random()*2-1)*(1-i/bl);
    const ns=this.ctx.createBufferSource(), g=this.ctx.createGain();
    ns.buffer=buf; g.gain.setValueAtTime(0.25,now);
    ns.connect(g); g.connect(this.masterGain); ns.start(now);
  }
  playSingularityRumble(){
    this._init(); this._resume();
    if(!this.enabled||!this.ctx||this.singNode) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    const f=this.ctx.createBiquadFilter();
    o.type='sawtooth'; o.frequency.value=22;
    f.type='lowpass'; f.frequency.value=180;
    g.gain.setValueAtTime(0,this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.35,this.ctx.currentTime+1.5);
    o.connect(f); f.connect(g); g.connect(this.masterGain);
    o.start(); this.singNode=o; this.singGain=g;
  }
  stopSingularityRumble(){
    if(!this.singNode) return;
    try{ this.singGain.gain.linearRampToValueAtTime(0,this.ctx.currentTime+0.5);
      setTimeout(()=>{try{this.singNode.stop();}catch(e){} this.singNode=null;},600);
    }catch(e){}
  }
  playWhoosh(){
    this._init(); this._resume();
    if(!this.enabled||!this.ctx) return;
    const now=this.ctx.currentTime;
    const bl=Math.floor(this.ctx.sampleRate*0.55);
    const buf=this.ctx.createBuffer(1,bl,this.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<bl;i++) d[i]=(Math.random()*2-1);
    const ns=this.ctx.createBufferSource(), fl=this.ctx.createBiquadFilter();
    const g=this.ctx.createGain();
    ns.buffer=buf; fl.type='bandpass';
    fl.frequency.setValueAtTime(800,now);
    fl.frequency.exponentialRampToValueAtTime(3200,now+0.3);
    fl.frequency.exponentialRampToValueAtTime(200,now+0.55);
    g.gain.setValueAtTime(0.35,now); g.gain.exponentialRampToValueAtTime(0.001,now+0.55);
    ns.connect(fl); fl.connect(g); g.connect(this.masterGain); ns.start(now);
  }
  playVictory(){
    this._init(); this._resume();
    if(!this.enabled||!this.ctx) return;
    const now=this.ctx.currentTime;
    [523,659,784,1047].forEach((f,i)=>{
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type='triangle'; o.frequency.value=f;
      g.gain.setValueAtTime(0,now+i*0.14);
      g.gain.linearRampToValueAtTime(0.2,now+i*0.14+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,now+i*0.14+0.7);
      o.connect(g); g.connect(this.masterGain);
      o.start(now+i*0.14); o.stop(now+i*0.14+0.75);
    });
  }
  setMuted(m){
    if(!this.masterGain||!this.ctx) return;
    this.masterGain.gain.setTargetAtTime(m?0:0.55,this.ctx.currentTime,0.15);
  }
  destroy(){
    this.stopEngine(); this.stopSingularityRumble();
    try{if(this.ctx)this.ctx.close();}catch(e){}
  }
}

// ── HIGH SCORE SYSTEM ─────────────────────────────────────────────────────────
const HS_KEY='voyager_highscore_v2';
function getHighScore(){
  try{ return JSON.parse(localStorage.getItem(HS_KEY))||
    {score:0,distance:0,photos:0,stage:0,date:null}; }
  catch(e){ return {score:0,distance:0,photos:0,stage:0,date:null}; }
}
function saveHighScore(score,distance,photos,stage){
  try{
    const prev=getHighScore();
    if(score>prev.score){
      localStorage.setItem(HS_KEY,JSON.stringify({
        score,distance,photos,stage,
        date:new Date().toLocaleDateString('en-AU')
      }));
      return true;
    }
  }catch(e){}
  return false;
}

const BOUNDS = { x: 6.2, y: 4.2 };
const SHIP_Z = 0;
const SPAWN_Z = -420;
const DESPAWN_Z = 12;
const SHIP_RADIUS = 0.55;
const STAGE7_START = 270;
const STAGE7_DURATION = 25;

const DEBRIS_TYPES = {
  meteorite: { damage: 26, color: 0x8a7a6a, rMin: 0.85, rMax: 1.55, speedMult: 1.0, points: 10, label: 'Meteorite' },
  ice:       { damage: 15, color: 0x9fe8ff, rMin: 0.55, rMax: 1.0,  speedMult: 1.18, points: 15, label: 'Ice Fragment' },
  dust:      { damage: 6,  color: 0x6b6b78, rMin: 0.22, rMax: 0.4,  speedMult: 1.4,  points: 5,  label: 'Dust Cluster' },
  spaghetti: { damage: 42, color: 0x9fb8ff, rMin: 2.4, rMax: 5.5,  speedMult: 1.05, points: 0,  label: 'Spaghettified Matter' },
};
const DEBRIS_KEYS = ['meteorite', 'ice', 'dust'];

const LANDMARKS = [
  { label: 'Crimson Giant', color: 0xff6b4a, size: 13 },
  { label: 'Azure Nebula Cloud', color: 0x4ac8ff, size: 9 },
  { label: 'Ringed World', color: 0xd9b26a, size: 8, ring: true },
  { label: 'Pale Moon', color: 0xd7d7de, size: 4 },
];

const PLANET_BASE_COLOR = 0x4fae8a;
const PLANET_FIELD_COUNT = 9;
const RINGED_DECOY_COUNT = 2;
const EARTHLIKE_DECOY_COUNT = 2;
const WARP_DRIVE_ATTEMPT_LIMIT = 2;
const BLUEPRINT_TARGET = 5;
const CRYSTAL_TARGET = 3;
const WORMHOLE_DURATION = 20;
const CLUE_TYPES = ['lights', 'clouds', 'dyson'];

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default function VoyagerProtocol() {
  const mountRef = useRef(null);
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [highScore, setHighScore] = useState(() => getHighScore());
  const [newRecord, setNewRecord] = useState(false);
  const S = useRef({
    scene: null, camera: null, renderer: null, ship: null, starGroup: null,
    shipPos: { x: 0, y: 0 }, shipTarget: { x: 0, y: 0 },
    objects: [], particles: [], dents: [], plates: [], gravPlates: [], keys: {}, elapsed: 0, spawnAcc: 0, landmarkAcc: 0,
    forwardSpeed: 24, hull: 100, score: 0, distance: 0, repairAcc: 0,
    heat: 0, heatGainMult: 1, materials: 0, platesForged: 0, alloyAcc: 0, sunSpawned: false,
    gravity: 0, gravityMult: 1, gravitonMaterials: 0, gravitonPlatesForged: 0, gravitonAcc: 0, neutronSpawned: false,
    tidalMult: 1, shardMaterials: 0, shardPlatesForged: 0, shardAcc: 0, blackHoleSpawned: false, shardPlates: [],
    successTriggered: false, tunnelT: 0,
    freeFlightActive: false, freeVel: { x: 0, y: 0 }, freeElapsed: 0, pickAttempts: 0, planetFieldSpawned: false,
    landingActive: false, landingVel: { x: 0, z: 0 }, landingPos: { x: 0, z: 0 }, landingElapsed: 0,
    blueprintsCollected: 0, crystalsCollected: 0, landingItemsSpawned: false,
    wormholeActive: false, wormholeElapsed: 0, wormholeT: 0, wormholeSpawnAcc: 0,
    running: false, animating: false, raf: null, lastTime: 0, lastPhoto: 0,
  }).current;

  const [ui, setUi] = useState({
    phase: 'start', hull: 100, speed: 0, score: 0, distance: 0,
    stage: 1, photos: [], flash: false, showLog: false, over: null, repairing: false,
    heat: 0, toast: null, pickupHint: null, gravity: 0, tunnelT: 0, attemptsUsed: 0, candidatesLeft: 0,
    blueprintsCollected: 0, crystalsCollected: 0, wormholeT: 0,
  });
  const uiRef = useRef(ui);
  uiRef.current = ui;

  // ---------- three.js scene setup (once) ----------
  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth, height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070c, 0.0075);

    const camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 900);
    camera.position.set(0, 1.4, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x223344, 1.1);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x88bbff, 0x0a0a12, 0.6);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff2e0, 1.1);
    key.position.set(6, 8, 4);
    scene.add(key);

    // starfield
    const starCount = 1600;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = rand(-70, 70);
      positions[i * 3 + 1] = rand(-70, 70);
      positions[i * 3 + 2] = rand(-460, 20);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.85 });
    const starGroup = new THREE.Points(starGeo, starMat);
    scene.add(starGroup);

    // ship
    const ship = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd6dde3, metalness: 0.65, roughness: 0.35 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x29e6c9, metalness: 0.4, roughness: 0.3, emissive: 0x0c3f39, emissiveIntensity: 0.6 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xffb020, emissiveIntensity: 2.2, roughness: 0.4 });

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 12), bodyMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -1.1;
    ship.add(nose);

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 2.2, 12), bodyMat);
    fuselage.rotation.x = Math.PI / 2;
    ship.add(fuselage);

    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.25, 12), accentMat);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.z = -0.3;
    ship.add(stripe);

    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.0), bodyMat);
      wing.position.set(side * 1.1, -0.05, 0.5);
      wing.rotation.z = side * -0.08;
      ship.add(wing);
    });

    [-0.42, 0.42].forEach((side) => {
      const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), glowMat);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(side, -0.15, 1.15);
      ship.add(engine);
    });

    const engineLight = new THREE.PointLight(0xffb020, 1.4, 6);
    engineLight.position.set(0, -0.1, 1.4);
    ship.add(engineLight);

    ship.position.set(0, 0, SHIP_Z);
    scene.add(ship);

    const freeGeo = new THREE.IcosahedronGeometry(0.32, 1);
    const freeMat = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, emissive: 0x6ff2ff, emissiveIntensity: 2.0, roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.92 });
    const freeEntity = new THREE.Mesh(freeGeo, freeMat);
    const freeGlowGeo = new THREE.IcosahedronGeometry(0.55, 1);
    const freeGlowMat = new THREE.MeshBasicMaterial({ color: 0x6ff2ff, transparent: true, opacity: 0.2 });
    freeEntity.add(new THREE.Mesh(freeGlowGeo, freeGlowMat));
    const freeLight = new THREE.PointLight(0x6ff2ff, 1.6, 8);
    freeEntity.add(freeLight);
    freeEntity.position.set(0, 0, SHIP_Z);
    freeEntity.visible = false;
    scene.add(freeEntity);

    const groundGeo = new THREE.PlaneGeometry(200, 200, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2f7a4f, roughness: 0.9, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.visible = false;
    scene.add(ground);

    const warpShip = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, metalness: 0.75, roughness: 0.25, emissive: 0x1a2a3a, emissiveIntensity: 0.3 });
    const pod = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), hullMat);
    pod.scale.set(1, 0.85, 1.6);
    warpShip.add(pod);

    const domeMat = new THREE.MeshStandardMaterial({ color: 0x8fd3ff, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.8, emissive: 0x2a4a5a, emissiveIntensity: 0.5 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.set(0, 0.32, -0.45);
    dome.rotation.x = -0.25;
    warpShip.add(dome);

    const ringMat = new THREE.MeshStandardMaterial({ color: 0xd8dce0, metalness: 0.8, roughness: 0.3, emissive: 0x3a2c0a, emissiveIntensity: 0.15 });
    const glowRingMat = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffb020, emissiveIntensity: 1.8, roughness: 0.3, metalness: 0.2 });
    const strutMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.6, roughness: 0.4 });
    const ringOffsets = [
      { x: -0.4, z: 0.15, tilt: 0.35 },
      { x: 0.4, z: -0.15, tilt: -0.35 },
    ];
    ringOffsets.forEach(({ x, z, tilt }) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.08, 10, 32), ringMat);
      ring.position.set(x, 0, z);
      ring.rotation.y = Math.PI / 2 + tilt;
      warpShip.add(ring);

      const glow = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.02, 6, 32), glowRingMat);
      glow.position.copy(ring.position);
      glow.rotation.copy(ring.rotation);
      warpShip.add(glow);

      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), strutMat);
      strut.position.set(x * 0.5, 0, z * 0.5);
      strut.rotation.z = Math.PI / 2;
      warpShip.add(strut);
    });

    const warpLight = new THREE.PointLight(0xffb020, 1.6, 8);
    warpShip.add(warpLight);
    warpShip.position.set(0, 0, SHIP_Z);
    warpShip.visible = false;
    scene.add(warpShip);

    S.scene = scene; S.camera = camera; S.renderer = renderer; S.ship = ship; S.starGroup = starGroup; S.freeEntity = freeEntity; S.ground = ground; S.warpShip = warpShip;
    S.keyLight = key; S.ambientLight = ambient;
    S.coolFog = new THREE.Color(0x05070c); S.warmFog = new THREE.Color(0x1a0d08);
    S.coolKey = new THREE.Color(0xfff2e0); S.warmKey = new THREE.Color(0xffa552);
    S.coolAmbient = new THREE.Color(0x223344); S.warmAmbient = new THREE.Color(0x3a1f18);
    S.neutronFog = new THREE.Color(0x040814); S.neutronKey = new THREE.Color(0xbfe3ff); S.neutronAmbient = new THREE.Color(0x1c2a3a);
    S.voidFog = new THREE.Color(0x010102); S.voidKey = new THREE.Color(0xffe6ff); S.voidAmbient = new THREE.Color(0x120a1c);

    const handleResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    // initialise audio engine
    audioRef.current = new VoyagerAudio();

    // static render while idle
    renderer.render(scene, camera);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(S.raf);
      S.objects.forEach((o) => disposeObj(o));
      S.objects = [];
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      if (audioRef.current) audioRef.current.destroy();
      stopWarpOverlay();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function disposeObj(o) {
    S.scene.remove(o.mesh);
    // Handle both plain Meshes and Groups (neutron star, black hole)
    if (o.mesh.isGroup || o.mesh.type === 'Group') {
      o.mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    } else {
      if (o.mesh.geometry) o.mesh.geometry.dispose();
      if (o.mesh.material) {
        if (Array.isArray(o.mesh.material)) o.mesh.material.forEach(m => m.dispose());
        else o.mesh.material.dispose();
      }
    }
  }

  function spawnDebris() {
    const typeKey = choice(DEBRIS_KEYS);
    const t = DEBRIS_TYPES[typeKey];
    const radius = rand(t.rMin, t.rMax);
    const geo = new THREE.IcosahedronGeometry(radius, typeKey === 'dust' ? 0 : 1);
    const mat = new THREE.MeshStandardMaterial({
      color: t.color, roughness: 0.85, metalness: 0.1,
      transparent: typeKey === 'ice', opacity: typeKey === 'ice' ? 0.85 : 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(rand(-BOUNDS.x - 1, BOUNDS.x + 1), rand(-BOUNDS.y - 1, BOUNDS.y + 1), SPAWN_Z);
    S.scene.add(mesh);
    S.objects.push({
      mesh, kind: 'debris', typeKey, radius, hit: false,
      spin: { x: rand(-1, 1), y: rand(-1, 1), z: rand(-1, 1) },
      label: t.label,
    });
  }

  function spawnSpaghetti() {
    const variant = choice(['star', 'planet', 'galaxy']);
    const t = DEBRIS_TYPES.spaghetti;
    let mesh, radius;
    if (variant === 'star') {
      const length = rand(7, 13);
      radius = 0.85;
      const geo = new THREE.CylinderGeometry(0.16, 0.05, length, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0xfff3d0, emissive: 0xffd27a, emissiveIntensity: 1.6, roughness: 0.4, metalness: 0.1 });
      mesh = new THREE.Mesh(geo, mat);
    } else if (variant === 'planet') {
      const length = rand(8, 15);
      radius = 1.15;
      const geo = new THREE.CylinderGeometry(0.55, 0.15, length, 10);
      const mat = new THREE.MeshStandardMaterial({ color: 0x9fb8ff, emissive: 0x4a5fff, emissiveIntensity: 0.7, roughness: 0.55, metalness: 0.2 });
      mesh = new THREE.Mesh(geo, mat);
    } else {
      const length = rand(9, 16);
      radius = 1.3;
      const geo = new THREE.CylinderGeometry(0.5, 0.05, length, 12);
      const mat = new THREE.MeshStandardMaterial({ color: 0xc9a0ff, emissive: 0x8a3cff, emissiveIntensity: 1.1, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.88 });
      mesh = new THREE.Mesh(geo, mat);
    }
    mesh.position.set(rand(-BOUNDS.x - 1, BOUNDS.x + 1), rand(-BOUNDS.y - 1, BOUNDS.y + 1), SPAWN_Z);
    mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
    S.scene.add(mesh);
    S.objects.push({
      mesh, kind: 'debris', typeKey: 'spaghetti', radius, hit: false,
      spin: { x: rand(-0.6, 0.6), y: rand(-0.6, 0.6), z: rand(-0.6, 0.6) },
      label: t.label,
    });
  }

  function spawnLandmark() {
    const lm = choice(LANDMARKS);
    const geo = new THREE.SphereGeometry(lm.size, 20, 20);
    const mat = new THREE.MeshStandardMaterial({ color: lm.color, roughness: 0.6, metalness: 0.1, emissive: lm.color, emissiveIntensity: 0.15 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(rand(-30, 30), rand(-14, 14), SPAWN_Z - rand(0, 80));
    S.scene.add(mesh);
    if (lm.ring) {
      const ringGeo = new THREE.RingGeometry(lm.size * 1.4, lm.size * 1.9, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: lm.color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.3;
      mesh.add(ring);
    }
    S.objects.push({ mesh, kind: 'landmark', radius: lm.size, hit: false, spin: { x: 0, y: 0.05, z: 0 }, label: lm.label });
  }

  function spawnAlloy() {
    const geo = new THREE.OctahedronGeometry(0.4, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6ff2ff, emissive: 0x29e6c9, emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(rand(-BOUNDS.x, BOUNDS.x), rand(-BOUNDS.y, BOUNDS.y), SPAWN_Z);
    const glowGeo = new THREE.OctahedronGeometry(0.62, 0);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x6ff2ff, transparent: true, opacity: 0.22 });
    mesh.add(new THREE.Mesh(glowGeo, glowMat));
    S.scene.add(mesh);
    S.objects.push({ mesh, kind: 'pickup', radius: 0.48, hit: false, spin: { x: 1.4, y: 1.8, z: 0 }, label: 'Alloy Fragment' });
  }

  function spawnSun() {
    const geo = new THREE.SphereGeometry(20, 24, 24);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff8a20, emissiveIntensity: 1.6, roughness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(choice([-1, 1]) * rand(3, 5.5), rand(-2, 2), SPAWN_Z - 260);
    const coronaGeo = new THREE.SphereGeometry(26, 20, 20);
    const coronaMat = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.16 });
    mesh.add(new THREE.Mesh(coronaGeo, coronaMat));
    S.scene.add(mesh);
    S.objects.push({ mesh, kind: 'landmark', radius: 20, hit: false, isSun: true, spin: { x: 0, y: 0.02, z: 0 }, label: 'The Star' });
    S.sunSpawned = true;
  }

  function addPlate() {
    const slots = [
      { x: 0, y: 0.32, z: -0.9 }, { x: 0.42, y: -0.05, z: 0.15 },
      { x: -0.42, y: -0.05, z: 0.15 }, { x: 0, y: -0.3, z: 0.65 }, { x: 0, y: 0.22, z: 0.95 },
    ];
    const slot = slots[S.plates.length % slots.length];
    const geo = new THREE.BoxGeometry(0.32, 0.32, 0.12);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffb020, metalness: 0.7, roughness: 0.3, emissive: 0x7a3c00, emissiveIntensity: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(slot.x, slot.y, slot.z);
    S.ship.add(mesh);
    S.plates.push(mesh);
  }

  function clearPlates() {
    if (S.ship) S.plates.forEach((p) => { S.ship.remove(p); p.geometry.dispose(); p.material.dispose(); });
    S.plates = [];
  }

  function spawnGraviton() {
    const geo = new THREE.TetrahedronGeometry(0.42, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb388ff, emissive: 0x7c4dff, emissiveIntensity: 1.5, roughness: 0.25, metalness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(rand(-BOUNDS.x, BOUNDS.x), rand(-BOUNDS.y, BOUNDS.y), SPAWN_Z);
    const glowGeo = new THREE.TetrahedronGeometry(0.62, 0);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xb388ff, transparent: true, opacity: 0.22 });
    mesh.add(new THREE.Mesh(glowGeo, glowMat));
    S.scene.add(mesh);
    S.objects.push({ mesh, kind: 'pickup', materialType: 'graviton', radius: 0.48, hit: false, spin: { x: 1.6, y: 1.2, z: 0.8 }, label: 'Graviton Crystal' });
  }

  function spawnNeutronStar() {
    const group = new THREE.Group();
    // Core — bright white-blue pulsing sphere
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xd0e8ff, emissive: 0xbfe3ff, emissiveIntensity: 3.2,
      roughness: 0.1, metalness: 0.2
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 32), coreMat);
    group.add(core);

    // Hot spot glow layer
    const hotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.35
    });
    const hot = new THREE.Mesh(new THREE.SphereGeometry(9.5, 16, 16), hotMat);
    group.add(hot);

    // Magnetosphere — large oblate ellipsoid glow
    const magMat = new THREE.MeshBasicMaterial({
      color: 0x8fd3ff, transparent: true, opacity: 0.08,
      side: THREE.BackSide
    });
    const mag = new THREE.Mesh(new THREE.SphereGeometry(28, 16, 16), magMat);
    mag.scale.set(1, 0.35, 1);
    group.add(mag);

    // Polar JETS — two cones firing from poles
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0xc8e8ff, transparent: true, opacity: 0.7
    });
    const jet1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 3.5, 55, 16, 1, true), jetMat);
    jet1.position.y = 36;
    group.add(jet1);
    const jet2 = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 0.1, 55, 16, 1, true), jetMat);
    jet2.position.y = -36;
    group.add(jet2);

    // Jet inner bright cores
    const jetCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9
    });
    const jc1 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.8, 55, 8, 1, true), jetCoreMat);
    jc1.position.y = 36; group.add(jc1);
    const jc2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.01, 55, 8, 1, true), jetCoreMat);
    jc2.position.y = -36; group.add(jc2);

    // Equatorial accretion ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x8fd3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.32
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(13, 18, 48), ringMat);
    ring.rotation.x = Math.PI / 2.2;
    group.add(ring);

    // Second outer ring — dimmer
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xaae8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.15
    });
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(20, 24, 48), ring2Mat);
    ring2.rotation.x = Math.PI / 2.4;
    group.add(ring2);

    // Point light — bright blue-white
    const light = new THREE.PointLight(0xbfe3ff, 4.5, 120);
    group.add(light);

    group.position.set(choice([-1, 1]) * rand(3, 5.5), rand(-2, 2), SPAWN_Z + 180);
    group.userData = { isPulsar: true, pulseT: 0 };
    S.scene.add(group);
    S.objects.push({
      mesh: group, kind: 'landmark', radius: 14, hit: false,
      isNeutron: true, spin: { x: 0, y: 0.6, z: 0.05 }, label: 'Neutron Star'
    });
    S.neutronSpawned = true;
  }

  function addGravPlate() {
    const slots = [
      { x: 0.25, y: 0.15, z: -0.6 }, { x: -0.25, y: 0.15, z: -0.6 },
      { x: 0.3, y: -0.15, z: 0.4 }, { x: -0.3, y: -0.15, z: 0.4 }, { x: 0, y: 0.1, z: 1.1 },
    ];
    const slot = slots[S.gravPlates.length % slots.length];
    const geo = new THREE.BoxGeometry(0.26, 0.26, 0.1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9d6fff, metalness: 0.6, roughness: 0.3, emissive: 0x4a2c8f, emissiveIntensity: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(slot.x, slot.y, slot.z);
    S.ship.add(mesh);
    S.gravPlates.push(mesh);
  }

  function clearGravPlates() {
    if (S.ship) S.gravPlates.forEach((p) => { S.ship.remove(p); p.geometry.dispose(); p.material.dispose(); });
    S.gravPlates = [];
  }

  function spawnHorizonShard() {
    const geo = new THREE.OctahedronGeometry(0.38, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff8ff0, emissive: 0xff4fd8, emissiveIntensity: 1.7, roughness: 0.2, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(rand(-BOUNDS.x, BOUNDS.x), rand(-BOUNDS.y, BOUNDS.y), SPAWN_Z);
    const glowGeo = new THREE.OctahedronGeometry(0.58, 0);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.22 });
    mesh.add(new THREE.Mesh(glowGeo, glowMat));
    S.scene.add(mesh);
    S.objects.push({ mesh, kind: 'pickup', materialType: 'shard', radius: 0.46, hit: false, spin: { x: 1.2, y: 1.6, z: 1.0 }, label: 'Horizon Shard' });
  }

  function spawnBlackHole() {
    const group = new THREE.Group();

    // EVENT HORIZON — pure black sphere
    const horizonMat = new THREE.MeshStandardMaterial({
      color: 0x000000, emissive: 0x000000, roughness: 1.0, metalness: 0
    });
    const horizon = new THREE.Mesh(new THREE.SphereGeometry(8, 32, 32), horizonMat);
    group.add(horizon);

    // PHOTON SPHERE — thin bright ring right at event horizon
    const photonMat = new THREE.MeshBasicMaterial({
      color: 0xffffee, transparent: true, opacity: 0.9,
      side: THREE.DoubleSide
    });
    const photon = new THREE.Mesh(new THREE.RingGeometry(11.5, 12.5, 64), photonMat);
    photon.rotation.x = Math.PI / 2.5;
    group.add(photon);

    // ACCRETION DISK — multiple layers, coloured gradient from white inner to deep red outer
    const diskColors = [
      { inner: 12, outer: 15.5, col: 0xffffff,  op: 0.55, tilt: 2.5, speed: 1.8 },
      { inner: 15, outer: 19,   col: 0xffd080,  op: 0.45, tilt: 2.4, speed: 1.4 },
      { inner: 18, outer: 23,   col: 0xff8040,  op: 0.35, tilt: 2.3, speed: 1.1 },
      { inner: 22, outer: 28,   col: 0xff3030,  op: 0.25, tilt: 2.2, speed: 0.8 },
      { inner: 27, outer: 34,   col: 0x990020,  op: 0.15, tilt: 2.1, speed: 0.6 },
    ];
    diskColors.forEach(({ inner, outer, col, op, tilt, speed }) => {
      const dMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: op,
        side: THREE.DoubleSide
      });
      const disk = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 64), dMat);
      disk.rotation.x = Math.PI / tilt;
      disk.userData = { diskSpeed: speed };
      group.add(disk);
    });

    // GRAVITATIONAL LENSING RINGS — distorted space around BH
    const lensingRings = [
      { r: 36, w: 2.5, col: 0xffe6ff, op: 0.35, tilt: 2.6 },
      { r: 42, w: 1.5, col: 0xee88ff, op: 0.22, tilt: 2.2 },
      { r: 50, w: 1.0, col: 0xcc44dd, op: 0.14, tilt: 2.0 },
      { r: 58, w: 0.8, col: 0xaa22bb, op: 0.08, tilt: 1.9 },
    ];
    lensingRings.forEach(({ r, w, col, op, tilt }) => {
      const lMat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: op,
        side: THREE.DoubleSide
      });
      const lring = new THREE.Mesh(new THREE.RingGeometry(r, r + w, 64), lMat);
      lring.rotation.x = Math.PI / tilt;
      group.add(lring);
    });

    // RELATIVISTIC JETS — narrow bright cones from poles
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0xff88ff, transparent: true, opacity: 0.7
    });
    const jetCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.85
    });
    [1, -1].forEach(dir => {
      const jet = new THREE.Mesh(
        new THREE.CylinderGeometry(dir > 0 ? 0.05 : 2.5, dir > 0 ? 2.5 : 0.05, 50, 12, 1, true),
        jetMat
      );
      jet.position.y = dir * 33;
      group.add(jet);
      const jc = new THREE.Mesh(
        new THREE.CylinderGeometry(dir > 0 ? 0.01 : 0.6, dir > 0 ? 0.6 : 0.01, 48, 8, 1, true),
        jetCoreMat
      );
      jc.position.y = dir * 32;
      group.add(jc);
    });

    // OUTER PURPLE GLOW — Hawking radiation simulation
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x882299, transparent: true, opacity: 0.06,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(22, 16, 16), glowMat);
    group.add(glow);

    // Point light — cool purple
    const light = new THREE.PointLight(0xdd88ff, 2.8, 150);
    group.add(light);

    group.position.set(choice([-1, 1]) * rand(2.5, 4.2), rand(-1.5, 1.5), SPAWN_Z + 220);
    group.userData = { isBH: true };
    S.scene.add(group);
    S.objects.push({
      mesh: group, kind: 'landmark', radius: 14, hit: false,
      isBlackHole: true, spin: { x: 0, y: 0.12, z: 0.02 }, label: 'Black Hole'
    });
    S.blackHoleSpawned = true;
  }

  function addClue(mesh, clueType) {
    if (clueType === 'lights') {
      const lightCount = 55;
      const positions = new Float32Array(lightCount * 3);
      for (let j = 0; j < lightCount; j++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 9.05;
        positions[j * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[j * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[j * 3 + 2] = r * Math.cos(phi);
      }
      const lightGeo = new THREE.BufferGeometry();
      lightGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const lightMat = new THREE.PointsMaterial({ color: 0xffe9a8, size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0.95 });
      mesh.add(new THREE.Points(lightGeo, lightMat));
    } else if (clueType === 'clouds') {
      for (let j = 0; j < 8; j++) {
        const theta = rand(0, Math.PI * 2);
        const phi = rand(Math.PI * 0.25, Math.PI * 0.75);
        const r = 9.12;
        const px = r * Math.sin(phi) * Math.cos(theta);
        const py = r * Math.sin(phi) * Math.sin(theta);
        const pz = r * Math.cos(phi);
        const blobGeo = new THREE.SphereGeometry(rand(1.1, 2.0), 10, 10);
        const blobMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
        const blob = new THREE.Mesh(blobGeo, blobMat);
        blob.position.set(px, py, pz);
        blob.scale.set(1, 0.5, 1);
        mesh.add(blob);
      }
    } else {
      const shellGeo = new THREE.IcosahedronGeometry(11.5, 1);
      const panelMat = new THREE.MeshBasicMaterial({ color: 0xcdf6ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
      const panels = new THREE.Mesh(shellGeo, panelMat);
      mesh.add(panels);
      const edges = new THREE.EdgesGeometry(shellGeo);
      const shellMat = new THREE.LineBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.9 });
      const shell = new THREE.LineSegments(edges, shellMat);
      mesh.add(shell);
    }
  }

  function addEarthlikeLook(mesh) {
    const continentColors = [0x4a7c3c, 0x6b8e4e, 0x8a6d4b];
    const continentCount = Math.floor(rand(5, 8));
    for (let j = 0; j < continentCount; j++) {
      const theta = rand(0, Math.PI * 2);
      const phi = rand(Math.PI * 0.18, Math.PI * 0.82);
      const r = 9.05;
      const px = r * Math.sin(phi) * Math.cos(theta);
      const py = r * Math.sin(phi) * Math.sin(theta);
      const pz = r * Math.cos(phi);
      const blobGeo = new THREE.SphereGeometry(rand(1.3, 2.4), 8, 8);
      const blobMat = new THREE.MeshStandardMaterial({ color: choice(continentColors), roughness: 0.85, metalness: 0 });
      const blob = new THREE.Mesh(blobGeo, blobMat);
      blob.position.set(px, py, pz);
      blob.scale.set(1, 0.4, 1);
      mesh.add(blob);
    }
    const wispCount = 5;
    for (let j = 0; j < wispCount; j++) {
      const theta = rand(0, Math.PI * 2);
      const phi = rand(0.1, Math.PI - 0.1);
      const r = 9.32;
      const px = r * Math.sin(phi) * Math.cos(theta);
      const py = r * Math.sin(phi) * Math.sin(theta);
      const pz = r * Math.cos(phi);
      const wispGeo = new THREE.SphereGeometry(rand(1.4, 2.6), 8, 8);
      const wispMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
      const wisp = new THREE.Mesh(wispGeo, wispMat);
      wisp.position.set(px, py, pz);
      wisp.scale.set(1, 0.35, 1);
      mesh.add(wisp);
    }
  }

  function spawnPlanetField() {
    const correctIndex = Math.floor(Math.random() * PLANET_FIELD_COUNT);
    const clueType = choice(CLUE_TYPES);
    const ringedIndices = new Set();
    while (ringedIndices.size < RINGED_DECOY_COUNT) {
      const idx = Math.floor(Math.random() * PLANET_FIELD_COUNT);
      if (idx !== correctIndex) ringedIndices.add(idx);
    }
    const earthlikeIndices = new Set();
    while (earthlikeIndices.size < EARTHLIKE_DECOY_COUNT) {
      const idx = Math.floor(Math.random() * PLANET_FIELD_COUNT);
      if (idx !== correctIndex && !ringedIndices.has(idx)) earthlikeIndices.add(idx);
    }
    const MIN_SEPARATION = 30;
    const placed = [];
    for (let i = 0; i < PLANET_FIELD_COUNT; i++) {
      const isCorrect = i === correctIndex;
      const hasRings = ringedIndices.has(i);
      const isEarthlike = earthlikeIndices.has(i);
      const baseColor = isEarthlike ? 0x2f6fb0 : PLANET_BASE_COLOR;
      const baseEmissive = isEarthlike ? 0x0a1f3a : 0x0d3a2e;
      const geo = new THREE.SphereGeometry(9, 26, 26);
      const mat = new THREE.MeshStandardMaterial({ color: baseColor, emissive: baseEmissive, emissiveIntensity: 0.25, roughness: 0.6, metalness: 0.05 });
      const mesh = new THREE.Mesh(geo, mat);
      const cloudGeo = new THREE.SphereGeometry(9.3, 22, 22);
      const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 });
      mesh.add(new THREE.Mesh(cloudGeo, cloudMat));

      if (hasRings) {
        const ringGeo = new THREE.RingGeometry(13, 17, 40);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xd9c9a0, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.3 + rand(-0.15, 0.15);
        mesh.add(ring);
      }

      if (isEarthlike) addEarthlikeLook(mesh);
      if (isCorrect) addClue(mesh, clueType);

      let pos = null;
      for (let attempt = 0; attempt < 40; attempt++) {
        const candidate = { x: rand(-34, 34), y: rand(-19, 19), z: SPAWN_Z - rand(50, 440) };
        const clear = placed.every((p) => {
          const dx = p.x - candidate.x, dy = p.y - candidate.y, dz = (p.z - candidate.z) * 0.35;
          return Math.sqrt(dx * dx + dy * dy + dz * dz) >= MIN_SEPARATION;
        });
        if (clear) { pos = candidate; break; }
      }
      if (!pos) pos = { x: rand(-34, 34), y: rand(-19, 19), z: SPAWN_Z - rand(50, 440) };
      placed.push(pos);
      mesh.position.set(pos.x, pos.y, pos.z);
      S.scene.add(mesh);
      S.objects.push({ mesh, isPlanet: true, isCorrect, hit: false, spinY: rand(0.03, 0.09) });
    }
    S.planetFieldSpawned = true;
  }

  function spawnLandingItems() {
    for (let i = 0; i < 16; i++) {
      const x = rand(-40, 40), z = rand(-40, 40);
      if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
      const trunkGeo = new THREE.CylinderGeometry(0.25, 0.32, 2.2, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 1.1, z);
      const leavesGeo = new THREE.SphereGeometry(1.6, 10, 10);
      const leavesMat = new THREE.MeshStandardMaterial({ color: choice([0x3f8a4f, 0x4fae5f, 0x2f7a3f]), roughness: 0.85 });
      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.set(x, 2.6, z);
      S.scene.add(trunk); S.scene.add(leaves);
      S.objects.push({ mesh: trunk, isDecor: true });
      S.objects.push({ mesh: leaves, isDecor: true });
    }

    for (let i = 0; i < BLUEPRINT_TARGET; i++) {
      const geo = new THREE.OctahedronGeometry(0.55, 0);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffcf5c, emissive: 0xffb020, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.5 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(rand(-38, 38), 0.7, rand(-38, 38));
      S.scene.add(mesh);
      S.objects.push({ mesh, isBlueprint: true, hit: false, spinY: rand(1, 2) });
    }

    for (let i = 0; i < CRYSTAL_TARGET; i++) {
      const geo = new THREE.ConeGeometry(0.5, 1.4, 6);
      const mat = new THREE.MeshStandardMaterial({ color: 0xb388ff, emissive: 0x7c4dff, emissiveIntensity: 1.3, roughness: 0.25, metalness: 0.4 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(rand(-38, 38), 0.7, rand(-38, 38));
      S.scene.add(mesh);
      S.objects.push({ mesh, isCrystal: true, hit: false, spinY: rand(1, 2) });
    }

    S.landingItemsSpawned = true;
  }

  function addShardPlate() {
    const slots = [
      { x: 0.18, y: 0.28, z: -1.0 }, { x: -0.18, y: 0.28, z: -1.0 },
      { x: 0.46, y: 0.0, z: 0.7 }, { x: -0.46, y: 0.0, z: 0.7 }, { x: 0, y: -0.28, z: 0.0 },
    ];
    const slot = slots[S.shardPlates.length % slots.length];
    const geo = new THREE.BoxGeometry(0.24, 0.24, 0.1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff8ff0, metalness: 0.7, roughness: 0.2, emissive: 0x8a1c6e, emissiveIntensity: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(slot.x, slot.y, slot.z);
    S.ship.add(mesh);
    S.shardPlates.push(mesh);
  }

  function clearShardPlates() {
    if (S.ship) S.shardPlates.forEach((p) => { S.ship.remove(p); p.geometry.dispose(); p.material.dispose(); });
    S.shardPlates = [];
  }

  function resetWorld() {
    S.objects.forEach((o) => disposeObj(o));
    S.objects = [];
    S.particles.forEach((p) => { S.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
    S.particles = [];
    clearDents();
    clearPlates();
    clearGravPlates();
    clearShardPlates();
    S.shipPos = { x: 0, y: 0 };
    S.shipTarget = { x: 0, y: 0 };
    S.elapsed = 0; S.spawnAcc = 0; S.landmarkAcc = 0; S.alloyAcc = 0; S.gravitonAcc = 0; S.shardAcc = 0;
    S.forwardSpeed = 24; S.hull = 100; S.score = 0; S.distance = 0; S.lastPhoto = -5; S.repairAcc = 0;
    S.heat = 0; S.heatGainMult = 1; S.materials = 0; S.platesForged = 0; S.sunSpawned = false; S.pickupHint = null;
    S.gravity = 0; S.gravityMult = 1; S.gravitonMaterials = 0; S.gravitonPlatesForged = 0; S.neutronSpawned = false;
    S.tidalMult = 1; S.shardMaterials = 0; S.shardPlatesForged = 0; S.blackHoleSpawned = false;
    S.successTriggered = false; S.tunnelT = 0;
    S.freeFlightActive = false; S.freeVel = { x: 0, y: 0 }; S.freeElapsed = 0; S.pickAttempts = 0; S.planetFieldSpawned = false;
    S.landingActive = false; S.landingVel = { x: 0, z: 0 }; S.landingPos = { x: 0, z: 0 }; S.landingElapsed = 0;
    S.blueprintsCollected = 0; S.crystalsCollected = 0; S.landingItemsSpawned = false;
    S.wormholeActive = false; S.wormholeElapsed = 0; S.wormholeT = 0; S.wormholeSpawnAcc = 0;
    if (S.ship) { S.ship.position.set(0, 0, SHIP_Z); S.ship.rotation.set(0, 0, 0); S.ship.visible = true; }
    if (S.freeEntity) { S.freeEntity.position.set(0, 0, SHIP_Z); S.freeEntity.visible = false; }
    if (S.warpShip) { S.warpShip.position.set(0, 0, SHIP_Z); S.warpShip.rotation.set(0, 0, 0); S.warpShip.visible = false; }
    if (S.ground) S.ground.visible = false;
    if (S.scene && S.scene.fog) S.scene.fog.color.copy(S.coolFog);
    if (S.keyLight) S.keyLight.color.copy(S.coolKey);
    if (S.ambientLight) S.ambientLight.color.copy(S.coolAmbient);
  }

  function spawnFragments(originPos, colorHex, count, opts = {}) {
    const { sizeMin = 0.08, sizeMax = 0.22, speedMin = 1.5, speedMax = 4.5, life = 0.7, gravity = 1.2 } = opts;
    for (let i = 0; i < count; i++) {
      const size = rand(sizeMin, sizeMax);
      const geo = Math.random() > 0.5 ? new THREE.TetrahedronGeometry(size) : new THREE.IcosahedronGeometry(size, 0);
      const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7, metalness: 0.15, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(originPos);
      S.scene.add(mesh);
      const dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
      const speed = rand(speedMin, speedMax);
      S.particles.push({
        mesh, life, maxLife: life, gravity,
        vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
        spin: { x: rand(-4, 4), y: rand(-4, 4), z: rand(-4, 4) },
      });
    }
  }

  function updateParticles(dt) {
    for (let i = S.particles.length - 1; i >= 0; i--) {
      const p = S.particles[i];
      p.vel.y -= p.gravity * dt;
      p.mesh.position.x += p.vel.x * dt;
      p.mesh.position.y += p.vel.y * dt;
      p.mesh.position.z += p.vel.z * dt;
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.life -= dt;
      const t = clamp(p.life / p.maxLife, 0, 1);
      p.mesh.material.opacity = t;
      p.mesh.scale.setScalar(0.35 + 0.65 * t);
      if (p.life <= 0) {
        S.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        S.particles.splice(i, 1);
      }
    }
  }

  function addDent() {
    const geo = new THREE.SphereGeometry(rand(0.09, 0.17), 6, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 1, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(1, 1, 0.4);
    mesh.position.set(rand(-0.42, 0.42), rand(-0.26, 0.26), rand(-0.9, 0.9));
    mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
    S.ship.add(mesh);
    S.dents.push(mesh);
    if (S.dents.length > 10) {
      const old = S.dents.shift();
      S.ship.remove(old);
      old.geometry.dispose();
      old.material.dispose();
    }
  }

  function clearDents() {
    if (S.ship) S.dents.forEach((d) => { S.ship.remove(d); d.geometry.dispose(); d.material.dispose(); });
    S.dents = [];
  }

  function popDent() {
    const d = S.dents.pop();
    if (!d) return;
    const worldPos = d.getWorldPosition(new THREE.Vector3());
    S.ship.remove(d);
    d.geometry.dispose();
    d.material.dispose();
    spawnFragments(worldPos, 0x29e6c9, 5, { sizeMin: 0.03, sizeMax: 0.08, speedMin: 0.8, speedMax: 2, life: 0.4, gravity: 0 });
  }

  function triggerPlanetExplosion() {
    const origin = S.ship.position.clone();
    S.running = false;
    S.ship.visible = false;
    if (audioRef.current) { audioRef.current.stopEngine(); audioRef.current.playExplosion(); }
    spawnFragments(origin, 0xffb020, 46, { sizeMin: 0.18, sizeMax: 0.55, speedMin: 3, speedMax: 9, life: 1.6, gravity: 2.2 });
    spawnFragments(origin, 0xffffff, 22, { sizeMin: 0.1, sizeMax: 0.3, speedMin: 4, speedMax: 11, life: 1.1, gravity: 1.4 });
    setUi((u) => ({ ...u, phase: 'exploding', flash: 'explode' }));
    setTimeout(() => setUi((u) => (u.flash === 'explode' ? { ...u, flash: false } : u)), 300);
    setTimeout(() => {
      resetWorld();
      S.ship.visible = true;
      S.animating = false;
      cancelAnimationFrame(S.raf);
      setUi((u) => ({
        ...u, phase: 'start', hull: 100, speed: 0, score: 0, distance: 0,
        stage: 1, photos: [], over: null, showLog: false, flash: false, heat: 0, toast: null, repairing: false, gravity: 0, pickupHint: null,
      }));
    }, 1400);
  }

  function triggerSingularitySuccess() {
    S.successTriggered = true;
    S.running = false;
    const origin = S.ship.position.clone();
    S.ship.visible = false;
    if (audioRef.current) { audioRef.current.stopSingularityRumble(); audioRef.current.playWhoosh(); }
    spawnFragments(origin, 0xffffff, 40, { sizeMin: 0.14, sizeMax: 0.4, speedMin: 3, speedMax: 8, life: 1.6, gravity: -0.6 });
    spawnFragments(origin, 0x6ff2ff, 24, { sizeMin: 0.08, sizeMax: 0.24, speedMin: 2, speedMax: 6, life: 1.9, gravity: -0.4 });
    setUi((u) => ({ ...u, phase: 'dissolving', flash: 'emerge' }));
    setTimeout(() => setUi((u) => (u.flash === 'emerge' ? { ...u, flash: false } : u)), 400);
    setTimeout(() => enterFreeFlight(), 1600);
  }

  function enterFreeFlight() {
    S.objects.forEach((o) => disposeObj(o));
    S.objects = [];
    S.freeFlightActive = true;
    S.freeVel = { x: 0, y: 0 };
    S.freeElapsed = 0;
    S.pickAttempts = 0;
    S.planetFieldSpawned = false;
    S.shipPos = { x: 0, y: 0 };
    if (S.freeEntity) { S.freeEntity.position.set(0, 0, SHIP_Z); S.freeEntity.visible = true; }
    S.running = true;
    S.animating = true;
    S.lastTime = performance.now();
    setUi((u) => ({ ...u, phase: 'freeflight', flash: false, toast: null }));
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(loop);
  }

  function triggerWarpDrive() {
    S.running = false;
    setUi((u) => ({ ...u, phase: 'touchdown', flash: 'emerge' }));
    setTimeout(() => setUi((u) => (u.flash === 'emerge' ? { ...u, flash: false } : u)), 400);
    setTimeout(() => enterLanding(), 1600);
  }

  function enterLanding() {
    S.objects.forEach((o) => disposeObj(o));
    S.objects = [];
    S.freeFlightActive = false;
    S.landingActive = true;
    S.landingVel = { x: 0, z: 0 };
    S.landingPos = { x: 0, z: 0 };
    S.landingElapsed = 0;
    S.blueprintsCollected = 0;
    S.crystalsCollected = 0;
    S.landingItemsSpawned = false;
    if (S.freeEntity) { S.freeEntity.position.set(0, 0.3, 0); S.freeEntity.visible = true; }
    if (S.ground) S.ground.visible = true;
    S.camera.position.set(0, 9, 12);
    S.running = true;
    S.animating = true;
    S.lastTime = performance.now();
    setUi((u) => ({ ...u, phase: 'landing', flash: false, toast: null }));
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(loop);
  }

  function triggerWarpAssembled() {
    S.running = false;
    S.animating = false;
    cancelAnimationFrame(S.raf);
    setUi((u) => ({
      ...u, phase: 'warpassembled',
      over: { score: Math.round(S.score), distance: Math.round(S.distance), photos: u.photos.length },
    }));
  }

  function departForEarth() {
    setUi((u) => ({ ...u, phase: 'departing', flash: 'emerge' }));
    setTimeout(() => setUi((u) => (u.flash === 'emerge' ? { ...u, flash: false } : u)), 400);
    setTimeout(() => enterWormhole(), 1400);
  }

  function enterWormhole() {
    S.objects.forEach((o) => disposeObj(o));
    S.objects = [];
    S.landingActive = false;
    if (S.ground) S.ground.visible = false;
    if (S.freeEntity) S.freeEntity.visible = false;
    S.ship.visible = false;
    if (S.warpShip) {
      S.warpShip.visible = true;
      S.warpShip.position.set(0, 0, SHIP_Z);
      S.warpShip.rotation.set(0, 0, 0);
    }
    S.shipPos = { x: 0, y: 0 };
    S.shipTarget = { x: 0, y: 0 };
    S.wormholeActive = true;
    S.wormholeElapsed = 0;
    S.wormholeT = 0;
    S.wormholeSpawnAcc = 0;
    if (S.scene && S.scene.fog) S.scene.fog.color.set(0x1a1408);
    if (S.keyLight) S.keyLight.color.set(0xfff2c0);
    if (S.ambientLight) S.ambientLight.color.set(0x4a3a1a);
    S.camera.position.set(0, 1.4, 6);
    S.running = true;
    S.animating = true;
    S.lastTime = performance.now();
    // Start neckbreaking warp speed overlay
    if (mountRef.current) startWarpOverlay(mountRef.current);
    setUi((u) => ({ ...u, phase: 'wormhole', flash: false }));
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(loop);
  }

  function spawnWormholeShard() {
    // Elongated streaking shard — looks like stars stretching at warp speed
    const geo = new THREE.CylinderGeometry(0.08, 0.08, rand(1.2, 3.5), 6);
    const col = [0xffffff, 0x88ccff, 0xffeeaa, 0x00CEC9][Math.floor(Math.random()*4)];
    const mat = new THREE.MeshBasicMaterial({ color: col });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(rand(-5, 5), rand(-3.5, 3.5), SPAWN_Z);
    mesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    mesh.rotation.z = (Math.random() - 0.5) * 0.3;
    S.scene.add(mesh);
    S.objects.push({ mesh, radius: 0.3, hit: false });
  }

  // Warp speed 2D overlay — speed lines and chromatic aberration
  const _warpOverlay = { active: false, cv: null, ctx: null, t: 0 };
  function startWarpOverlay(mountEl) {
    if (_warpOverlay.cv) return;
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
    mountEl.appendChild(cv);
    _warpOverlay.cv = cv;
    _warpOverlay.ctx = cv.getContext('2d');
    _warpOverlay.active = true;
  }
  function stopWarpOverlay() {
    _warpOverlay.active = false;
    if (_warpOverlay.cv && _warpOverlay.cv.parentNode) {
      _warpOverlay.cv.parentNode.removeChild(_warpOverlay.cv);
    }
    _warpOverlay.cv = null; _warpOverlay.ctx = null; _warpOverlay.t = 0;
  }
  function tickWarpOverlay(wormholeT) {
    const { cv, ctx, active } = _warpOverlay;
    if (!active || !cv || !ctx) return;
    const W = cv.offsetWidth, H = cv.offsetHeight;
    cv.width = W; cv.height = H;
    const cx = W / 2, cy = H / 2;
    const speed = wormholeT;
    _warpOverlay.t += 0.016;
    const t = _warpOverlay.t;

    ctx.clearRect(0, 0, W, H);

    // Chromatic aberration rings at edges
    const chrAmt = speed * 18;
    if (chrAmt > 1) {
      [[-1,'255,0,80'],[0,'0,255,200'],[1,'80,80,255']].forEach(([off, col]) => {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const r = ctx.createRadialGradient(cx + off*chrAmt, cy, W*.38, cx + off*chrAmt, cy, W*.62);
        r.addColorStop(0,'rgba(0,0,0,0)');
        r.addColorStop(.7,'rgba(0,0,0,0)');
        r.addColorStop(.87,`rgba(${col},${0.12*speed})`);
        r.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = r; ctx.fillRect(0,0,W,H);
        ctx.restore();
      });
    }

    // Radial speed lines from centre
    const lineCount = 32;
    for (let li = 0; li < lineCount; li++) {
      const ang = (li / lineCount) * Math.PI * 2 + t * 0.08;
      const len = Math.max(W, H) * (0.3 + speed * 0.55);
      const x1 = cx + Math.cos(ang) * 30;
      const y1 = cy + Math.sin(ang) * 30;
      const x2 = cx + Math.cos(ang) * (30 + len);
      const y2 = cy + Math.sin(ang) * (30 + len);
      const sl = ctx.createLinearGradient(x1, y1, x2, y2);
      const alpha = (0.1 + speed * 0.5) * (0.5 + 0.5 * Math.sin(t * 3 + li));
      sl.addColorStop(0, `rgba(200,220,255,0)`);
      sl.addColorStop(0.3, `rgba(200,220,255,${alpha})`);
      sl.addColorStop(1, `rgba(200,220,255,0)`);
      ctx.strokeStyle = sl;
      ctx.lineWidth = 0.5 + speed * 2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // Tunnel rings converging toward centre
    const ringCount = 10;
    for (let ri = 0; ri < ringCount; ri++) {
      const phase = ((t * 1.8 + ri / ringCount) % 1);
      const r = phase * Math.max(W, H) * 0.65;
      const alpha = (1 - phase) * 0.28 * (1 + speed * 0.6);
      const blue = Math.round(180 + 75 * phase);
      ctx.strokeStyle = `rgba(${Math.round(160*phase)},${blue},255,${alpha})`;
      ctx.lineWidth = 1 + phase * 4;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }

    // Central glow
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 + speed * 90);
    cg.addColorStop(0, `rgba(255,255,255,${0.4 + speed * 0.5})`);
    cg.addColorStop(0.3, `rgba(160,210,255,${0.2 + speed * 0.3})`);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, cy, 60 + speed * 90, 0, Math.PI * 2); ctx.fill();
  }

  function triggerVictory() {
    S.running = false;
    S.animating = false;
    cancelAnimationFrame(S.raf);
    stopWarpOverlay();
    if (audioRef.current) { audioRef.current.stopEngine(); audioRef.current.playVictory(); }
    const finalScore = Math.round(S.score);
    const isNew = saveHighScore(finalScore, Math.round(S.distance), uiRef.current.photos.length, 10);
    if (isNew) { setHighScore(getHighScore()); setNewRecord(true); setTimeout(()=>setNewRecord(false),4000); }
    setUi((u) => ({
      ...u, phase: 'victory',
      over: { score: finalScore, distance: Math.round(S.distance), photos: u.photos.length },
    }));
  }

  function triggerParadiseNoWarp() {
    S.running = false;
    S.animating = false;
    cancelAnimationFrame(S.raf);
    if (audioRef.current) audioRef.current.stopEngine();
    const finalScore = Math.round(S.score);
    const isNew = saveHighScore(finalScore, Math.round(S.distance), uiRef.current.photos.length, 8);
    if (isNew) { setHighScore(getHighScore()); setNewRecord(true); setTimeout(()=>setNewRecord(false),4000); }
    setUi((u) => ({
      ...u, phase: 'settled',
      over: { score: finalScore, distance: Math.round(S.distance), photos: u.photos.length, attempts: S.pickAttempts + 1 },
    }));
  }

  const startGame = useCallback(() => {
    resetWorld();
    setNewRecord(false);
    S.running = true;
    S.animating = true;
    S.lastTime = performance.now();
    if (audioRef.current) audioRef.current.startEngine();
    setUi((u) => ({ ...u, phase: 'playing', hull: 100, speed: 0, score: 0, distance: 0, stage: 1, photos: [], over: null, showLog: false, repairing: false, heat: 0, toast: null, gravity: 0, pickupHint: null, tunnelT: 0, attemptsUsed: 0, candidatesLeft: 0 }));
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(loop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capturePhoto = useCallback(() => {
    if (!S.running) return;
    if (S.elapsed - S.lastPhoto < 0.6) return;
    S.lastPhoto = S.elapsed;
    let best = null, bestDist = Infinity;
    for (const o of S.objects) {
      const p = o.mesh.getWorldPosition(new THREE.Vector3()).project(S.camera);
      if (p.z < -1 || p.z > 1) continue;
      const d = Math.sqrt(p.x * p.x + p.y * p.y);
      if (d < bestDist) { bestDist = d; best = o; }
    }
    let entry;
    if (best && bestDist < 0.85) {
      const quality = bestDist < 0.18 ? 'Perfect Shot' : bestDist < 0.42 ? 'Good Shot' : 'Off-center';
      const bonus = quality === 'Perfect Shot' ? 20 : quality === 'Good Shot' ? 10 : 4;
      S.score += bonus;
      entry = { id: Math.random().toString(36).slice(2), label: best.label, quality, kind: best.kind, dist: Math.round(S.distance) };
    } else {
      entry = { id: Math.random().toString(36).slice(2), label: 'Empty Space', quality: 'No subject in frame', kind: 'none', dist: Math.round(S.distance) };
    }
    setUi((u) => ({ ...u, photos: [entry, ...u.photos].slice(0, 40), flash: true }));
    setTimeout(() => setUi((u) => ({ ...u, flash: false })), 140);
    if (audioRef.current) audioRef.current.playShutter();
  }, []);

  function endGame(reason) {
    S.running = false;
    S.animating = false;
    cancelAnimationFrame(S.raf);
    if (audioRef.current) { audioRef.current.stopEngine(); audioRef.current.stopSingularityRumble(); }
    stopWarpOverlay();
    const finalScore = Math.round(S.score);
    const isNew = saveHighScore(finalScore, Math.round(S.distance), uiRef.current.photos.length, S.stage || 1);
    if (isNew) { setHighScore(getHighScore()); setNewRecord(true); setTimeout(()=>setNewRecord(false),4000); }
    setUi((u) => ({
      ...u, phase: 'over',
      over: { reason, score: finalScore, distance: Math.round(S.distance), photos: u.photos.length },
    }));
  }

  function loop(now) {
    const S_ = S;
    if (!S_.animating) return;
    const dt = clamp((now - S_.lastTime) / 1000, 0, 0.05);
    S_.lastTime = now;

    if (S_.running) {
      S_.elapsed += dt;

      if (S_.freeFlightActive) {
        S_.freeElapsed += dt;
        const k = S_.keys;
        const accel = 15;
        if (k.left) S_.freeVel.x -= accel * dt;
        if (k.right) S_.freeVel.x += accel * dt;
        if (k.up) S_.freeVel.y += accel * dt;
        if (k.down) S_.freeVel.y -= accel * dt;
        const drag = Math.max(0, 1 - 1.4 * dt);
        S_.freeVel.x *= drag;
        S_.freeVel.y *= drag;
        S_.shipPos.x = clamp(S_.shipPos.x + S_.freeVel.x * dt, -38, 38);
        S_.shipPos.y = clamp(S_.shipPos.y + S_.freeVel.y * dt, -22, 22);
        S_.freeEntity.position.x = S_.shipPos.x;
        S_.freeEntity.position.y = S_.shipPos.y;
        S_.freeEntity.rotation.y += dt * 0.8;
        S_.freeEntity.rotation.x += dt * 0.4;

        S_.camera.position.x += (S_.shipPos.x * 0.5 - S_.camera.position.x) * 0.06;
        S_.camera.position.y += ((S_.shipPos.y * 0.5 + 1.1) - S_.camera.position.y) * 0.06;
        S_.camera.position.z = SHIP_Z + 6;
        S_.camera.lookAt(S_.shipPos.x * 0.3, S_.shipPos.y * 0.3, SHIP_Z - 30);

        S_.starGroup.position.z += 14 * dt * 0.4;
        if (S_.starGroup.position.z > 220) S_.starGroup.position.z -= 470;

        if (!S_.planetFieldSpawned && S_.freeElapsed > 2.2) spawnPlanetField();

        S_.distance += 14 * dt;

        for (let i = S_.objects.length - 1; i >= 0; i--) {
          const o = S_.objects[i];
          o.mesh.position.z += 6 * dt;
          o.mesh.rotation.y += (o.spinY || 0.05) * dt;
          if (o.isPlanet && !o.hit) {
            const distZ = Math.abs(o.mesh.position.z - SHIP_Z);
            if (distZ < 22) {
              const dx = o.mesh.position.x - S_.shipPos.x;
              const dy = o.mesh.position.y - S_.shipPos.y;
              if (Math.sqrt(dx * dx + dy * dy) < 9.5) {
                o.hit = true;
                const wasCorrect = o.isCorrect;
                disposeObj(o);
                S_.objects.splice(i, 1);
                if (wasCorrect) {
                  const attemptsUsed = S_.pickAttempts + 1;
                  if (attemptsUsed <= WARP_DRIVE_ATTEMPT_LIMIT) { triggerWarpDrive(); } else { triggerParadiseNoWarp(); }
                } else {
                  S_.score = Math.max(0, S_.score - 40);
                  S_.pickAttempts += 1;
                  setUi((u) => ({ ...u, toast: 'WRONG WORLD', score: Math.round(S_.score) }));
                  setTimeout(() => setUi((u) => (u.toast === 'WRONG WORLD' ? { ...u, toast: null } : u)), 1800);
                }
                break;
              }
            }
          }
          if (o.mesh.position.z > DESPAWN_Z) { disposeObj(o); S_.objects.splice(i, 1); }
        }
      } else if (S_.landingActive) {
        S_.landingElapsed += dt;
        const k = S_.keys;
        const accel = 16;
        if (k.left) S_.landingVel.x -= accel * dt;
        if (k.right) S_.landingVel.x += accel * dt;
        if (k.up) S_.landingVel.z -= accel * dt;
        if (k.down) S_.landingVel.z += accel * dt;
        const drag = Math.max(0, 1 - 3.2 * dt);
        S_.landingVel.x *= drag;
        S_.landingVel.z *= drag;
        S_.landingPos.x = clamp(S_.landingPos.x + S_.landingVel.x * dt, -42, 42);
        S_.landingPos.z = clamp(S_.landingPos.z + S_.landingVel.z * dt, -42, 42);
        S_.freeEntity.position.x = S_.landingPos.x;
        S_.freeEntity.position.z = S_.landingPos.z;
        S_.freeEntity.position.y = 0.3 + Math.sin(S_.landingElapsed * 6) * 0.05;
        S_.freeEntity.rotation.y += dt * 1.2;

        S_.camera.position.x += (S_.landingPos.x - S_.camera.position.x) * 0.08;
        S_.camera.position.z += ((S_.landingPos.z + 12) - S_.camera.position.z) * 0.08;
        S_.camera.position.y += (9 - S_.camera.position.y) * 0.08;
        S_.camera.lookAt(S_.landingPos.x, 0.5, S_.landingPos.z);

        if (!S_.landingItemsSpawned && S_.landingElapsed > 1.0) spawnLandingItems();

        for (let i = S_.objects.length - 1; i >= 0; i--) {
          const o = S_.objects[i];
          if (o.isBlueprint || o.isCrystal) {
            o.mesh.rotation.y += (o.spinY || 1.4) * dt;
            o.mesh.position.y = 0.7 + Math.sin(S_.landingElapsed * 2 + o.mesh.position.x) * 0.15;
            if (!o.hit) {
              const dx = o.mesh.position.x - S_.landingPos.x;
              const dz = o.mesh.position.z - S_.landingPos.z;
              if (Math.sqrt(dx * dx + dz * dz) < 2.4) {
                o.hit = true;
                disposeObj(o);
                S_.objects.splice(i, 1);
                if (o.isBlueprint) { S_.blueprintsCollected += 1; } else { S_.crystalsCollected += 1; }
                if (audioRef.current) audioRef.current.playPickup('item');
                setUi((u) => ({ ...u, toast: o.isBlueprint ? 'BLUEPRINT FRAGMENT RECOVERED' : 'WARP CRYSTAL RECOVERED' }));
                setTimeout(() => setUi((u) => (u.toast && u.toast.includes('RECOVERED') ? { ...u, toast: null } : u)), 1600);
                if (S_.blueprintsCollected >= BLUEPRINT_TARGET && S_.crystalsCollected >= CRYSTAL_TARGET) {
                  triggerWarpAssembled();
                }
              }
            }
          }
        }
      } else if (S_.wormholeActive) {
        S_.wormholeElapsed += dt;
        const wormholeT = clamp(S_.wormholeElapsed / WORMHOLE_DURATION, 0, 1);
        S_.wormholeT = wormholeT;
        S_.forwardSpeed = 90;

        const k = S_.keys;
        const moveSpeed = 6.4;
        if (k.left) S_.shipTarget.x -= moveSpeed * dt;
        if (k.right) S_.shipTarget.x += moveSpeed * dt;
        if (k.up) S_.shipTarget.y += moveSpeed * dt;
        if (k.down) S_.shipTarget.y -= moveSpeed * dt;
        S_.shipTarget.x = clamp(S_.shipTarget.x, -3.2, 3.2);
        S_.shipTarget.y = clamp(S_.shipTarget.y, -2.2, 2.2);
        S_.shipPos.x += (S_.shipTarget.x - S_.shipPos.x) * 0.14;
        S_.shipPos.y += (S_.shipTarget.y - S_.shipPos.y) * 0.14;
        S_.warpShip.position.x = S_.shipPos.x;
        S_.warpShip.position.y = S_.shipPos.y;
        const bank = (S_.shipTarget.x - S_.shipPos.x) * -0.5;
        S_.warpShip.rotation.z += (bank - S_.warpShip.rotation.z) * 0.2;
        S_.warpShip.rotation.y += dt * 0.7;

        const shakeMag = 0.03;
        S_.camera.position.x += (S_.shipPos.x * 0.5 - S_.camera.position.x) * 0.08 + (Math.random() - 0.5) * shakeMag;
        S_.camera.position.y += ((S_.shipPos.y * 0.5 + 1.5) - S_.camera.position.y) * 0.08 + (Math.random() - 0.5) * shakeMag;
        S_.camera.position.z = SHIP_Z + 6;
        S_.camera.lookAt(S_.shipPos.x * 0.3, S_.shipPos.y * 0.3, SHIP_Z - 30);

        S_.starGroup.position.z += S_.forwardSpeed * dt * 0.4;
        if (S_.starGroup.position.z > 220) S_.starGroup.position.z -= 470;

        S_.wormholeSpawnAcc += dt;
        if (S_.wormholeSpawnAcc > 0.32) { S_.wormholeSpawnAcc = 0; spawnWormholeShard(); }

        // Tick neckbreaking warp speed visual overlay
        tickWarpOverlay(wormholeT);

        S_.distance += S_.forwardSpeed * dt;

        for (let i = S_.objects.length - 1; i >= 0; i--) {
          const o = S_.objects[i];
          o.mesh.position.z += S_.forwardSpeed * dt;
          o.mesh.rotation.x += 2 * dt;
          o.mesh.rotation.y += 1.5 * dt;
          if (!o.hit && Math.abs(o.mesh.position.z - SHIP_Z) < 1.3) {
            const dx = o.mesh.position.x - S_.shipPos.x;
            const dy = o.mesh.position.y - S_.shipPos.y;
            if (Math.sqrt(dx * dx + dy * dy) < o.radius + SHIP_RADIUS) {
              o.hit = true;
              spawnFragments(o.mesh.position.clone(), 0xfff2c0, 6, { sizeMin: 0.05, sizeMax: 0.16, speedMin: 1.5, speedMax: 3.5, life: 0.4, gravity: 0.5 });
            }
          }
          if (o.mesh.position.z > DESPAWN_Z) { disposeObj(o); S_.objects.splice(i, 1); }
        }

        if (wormholeT >= 1) { triggerVictory(); }
      } else {

      // difficulty ramp
      const stage7Unlocked = S_.elapsed >= STAGE7_START;
      S_.forwardSpeed = stage7Unlocked
        ? Math.min(150, 58 + (S_.elapsed - STAGE7_START) * 4.6)
        : Math.min(58, 24 + S_.elapsed * 0.5);
      const spawnInterval = Math.max(0.22, 1.05 - S_.elapsed * 0.006);

      // input -> target position
      const k = S_.keys;
      const stage3Unlocked = S_.elapsed >= 55;
      const stage4Unlocked = S_.elapsed >= 90;
      const stage5Unlocked = S_.elapsed >= 150;
      const stage6Unlocked = S_.elapsed >= 210;
      const isRepairing = stage3Unlocked && k.repair && S_.hull < 100;
      const moveSpeed = isRepairing ? 6.4 * 0.45 : 6.4;
      if (k.left) S_.shipTarget.x -= moveSpeed * dt;
      if (k.right) S_.shipTarget.x += moveSpeed * dt;
      if (k.up) S_.shipTarget.y += moveSpeed * dt;
      if (k.down) S_.shipTarget.y -= moveSpeed * dt;

      if (stage5Unlocked) {
        const massive = S_.objects.find((o) => o.isNeutron || o.isBlackHole);
        if (massive) {
          const dz2 = Math.abs(massive.mesh.position.z - SHIP_Z);
          const range = massive.isBlackHole ? 220 : 170;
          const prox = clamp(1 - dz2 / range, 0, 1);
          S_.gravity = Math.round(prox * 100);
          if (prox > 0.02) {
            const gdx = massive.mesh.position.x - S_.shipPos.x;
            const gdy = massive.mesh.position.y - S_.shipPos.y;
            const gdist = Math.sqrt(gdx * gdx + gdy * gdy) || 1;
            const basePull = massive.isBlackHole ? 6.0 : 5.5;
            const pullStrength = massive.isBlackHole
              ? basePull * prox * S_.gravityMult * S_.tidalMult
              : basePull * prox * S_.gravityMult;
            S_.shipTarget.x += (gdx / gdist) * pullStrength * dt;
            S_.shipTarget.y += (gdy / gdist) * pullStrength * dt;
          }
          if (massive.isBlackHole && prox > 0.82) {
            S_.hull -= 12 * S_.tidalMult * (prox - 0.82) * dt;
          }
        } else {
          S_.gravity = 0;
        }
      } else {
        S_.gravity = 0;
      }

      let tunnelT = 0;
      let boundsX = BOUNDS.x, boundsY = BOUNDS.y;
      if (stage7Unlocked) {
        tunnelT = clamp((S_.elapsed - STAGE7_START) / STAGE7_DURATION, 0, 1);
        boundsX = BOUNDS.x - (BOUNDS.x - 2.3) * tunnelT;
        boundsY = BOUNDS.y - (BOUNDS.y - 1.6) * tunnelT;
      }
      S_.tunnelT = tunnelT;
      S_.shipTarget.x = clamp(S_.shipTarget.x, -boundsX, boundsX);
      S_.shipTarget.y = clamp(S_.shipTarget.y, -boundsY, boundsY);
      S_.shipPos.x += (S_.shipTarget.x - S_.shipPos.x) * 0.14;
      S_.shipPos.y += (S_.shipTarget.y - S_.shipPos.y) * 0.14;

      if (isRepairing) {
        const repairRate = 9;
        S_.hull = clamp(S_.hull + repairRate * dt, 0, 100);
        S_.repairAcc += repairRate * dt;
        while (S_.repairAcc >= 11 && S_.dents.length > 0) { S_.repairAcc -= 11; popDent(); }
      }

      S_.ship.position.x = S_.shipPos.x;
      S_.ship.position.y = S_.shipPos.y;
      const bank = (S_.shipTarget.x - S_.shipPos.x) * -0.5;
      const pitch = (S_.shipTarget.y - S_.shipPos.y) * 0.35;
      S_.ship.rotation.z += (bank - S_.ship.rotation.z) * 0.2;
      S_.ship.rotation.x += (pitch - S_.ship.rotation.x) * 0.2;

      // camera follow
      S_.camera.position.x += (S_.shipPos.x * 0.55 - S_.camera.position.x) * 0.08;
      S_.camera.position.y += ((S_.shipPos.y * 0.55 + 1.5) - S_.camera.position.y) * 0.08;
      S_.camera.position.z = SHIP_Z + 6;
      S_.camera.lookAt(S_.shipPos.x * 0.3, S_.shipPos.y * 0.3, SHIP_Z - 30);

      if (stage7Unlocked) {
        const shakeMag = 0.05 + tunnelT * 0.16;
        S_.camera.position.x += (Math.random() - 0.5) * shakeMag;
        S_.camera.position.y += (Math.random() - 0.5) * shakeMag;
        S_.ship.position.x += (Math.random() - 0.5) * shakeMag * 0.4;
        S_.ship.position.y += (Math.random() - 0.5) * shakeMag * 0.4;
        S_.ship.rotation.z += (Math.random() - 0.5) * 0.05;
        S_.ship.rotation.x += (Math.random() - 0.5) * 0.03;
      }

      // starfield drift
      S_.starGroup.position.z += S_.forwardSpeed * dt * 0.4;
      if (S_.starGroup.position.z > 220) S_.starGroup.position.z -= 470;

      // spawn
      S_.spawnAcc += dt;
      if (S_.spawnAcc >= spawnInterval) {
        S_.spawnAcc -= spawnInterval;
        if (stage7Unlocked && Math.random() < 0.3) spawnSpaghetti(); else spawnDebris();
      }
      S_.landmarkAcc += dt;
      if (S_.landmarkAcc >= 14) { S_.landmarkAcc = 0; spawnLandmark(); }

      // stage 4: star approach — sun spawn, alloy pickups, heat
      if (stage4Unlocked) {
        if (!S_.sunSpawned) spawnSun();
        S_.alloyAcc += dt;
        if (S_.alloyAcc >= 2.1) { S_.alloyAcc = 0; spawnAlloy(); }
        const sun = S_.objects.find((o) => o.isSun);
        let heatFactor = 0.05;
        if (sun) {
          const dz = Math.abs(sun.mesh.position.z - SHIP_Z);
          heatFactor = clamp(1 - dz / 200, 0.05, 1);
        }
        const heatDelta = heatFactor < 0.15
          ? 3.2 * S_.heatGainMult * heatFactor * dt - 4 * dt
          : 3.2 * S_.heatGainMult * heatFactor * dt;
        S_.heat = clamp(S_.heat + heatDelta, 0, 100);
        if (S_.heat >= 100) S_.hull -= 14 * dt;

        // stage 5: neutron star — gravity well, graviton pickups
        if (stage5Unlocked) {
          if (!S_.neutronSpawned) spawnNeutronStar();
          S_.gravitonAcc += dt;
          if (S_.gravitonAcc >= 2.3) { S_.gravitonAcc = 0; spawnGraviton(); }
        }

        // stage 6: black hole — stronger pull, tidal damage, shard pickups
        if (stage6Unlocked) {
          if (!S_.blackHoleSpawned) spawnBlackHole();
          S_.shardAcc += dt;
          if (S_.shardAcc >= 2.5) { S_.shardAcc = 0; spawnHorizonShard(); }
        }

        const fogT = clamp((S_.elapsed - 90) / 20, 0, 1);
        S_.scene.fog.color.copy(S_.coolFog).lerp(S_.warmFog, fogT);
        S_.keyLight.color.copy(S_.coolKey).lerp(S_.warmKey, fogT);
        S_.ambientLight.color.copy(S_.coolAmbient).lerp(S_.warmAmbient, fogT);
        if (stage5Unlocked) {
          const fogT5 = clamp((S_.elapsed - 150) / 20, 0, 1);
          S_.scene.fog.color.lerp(S_.neutronFog, fogT5);
          S_.keyLight.color.lerp(S_.neutronKey, fogT5);
          S_.ambientLight.color.lerp(S_.neutronAmbient, fogT5);
        }
        if (stage6Unlocked) {
          const fogT6 = clamp((S_.elapsed - 210) / 20, 0, 1);
          S_.scene.fog.color.lerp(S_.voidFog, fogT6);
          S_.keyLight.color.lerp(S_.voidKey, fogT6);
          S_.ambientLight.color.lerp(S_.voidAmbient, fogT6);
        }
      }

      // move + collide + cleanup
      S_.distance += S_.forwardSpeed * dt;
      S_.score += S_.forwardSpeed * dt * 0.5;
      for (let i = S_.objects.length - 1; i >= 0; i--) {
        const o = S_.objects[i];
        const t = o.kind === 'debris' ? DEBRIS_TYPES[o.typeKey] : null;
        const speedMult = t ? t.speedMult : 0.9;
        o.mesh.position.z += S_.forwardSpeed * speedMult * dt;
        o.mesh.rotation.x += o.spin.x * dt;
        o.mesh.rotation.y += o.spin.y * dt;
        o.mesh.rotation.z += o.spin.z * dt;

        // PULSAR ANIMATION — pulse core + sweep beam
        if (o.isNeutron && o.mesh.children) {
          const pulseAmt = 1 + 0.12 * Math.sin(S_.elapsed * 6.5);
          const core = o.mesh.children[0];
          if (core && core.material) {
            core.material.emissiveIntensity = 2.8 + 1.8 * Math.abs(Math.sin(S_.elapsed * 6.5));
            core.scale.setScalar(pulseAmt);
          }
          // Pulse light flicker
          const light = o.mesh.children.find(c => c.isLight);
          if (light) light.intensity = 3.5 + 3.5 * Math.abs(Math.sin(S_.elapsed * 6.5));
        }

        // BLACK HOLE ACCRETION DISK ANIMATION — each disk layer rotates independently
        if (o.isBlackHole && o.mesh.children) {
          o.mesh.children.forEach(child => {
            if (child.userData && child.userData.diskSpeed) {
              child.rotation.z += child.userData.diskSpeed * dt;
            }
          });
          // Photon sphere shimmer
          const photon = o.mesh.children[1];
          if (photon && photon.material) {
            photon.material.opacity = 0.7 + 0.25 * Math.sin(S_.elapsed * 3.2);
          }
        }

        if (o.kind === 'pickup') {
          const pulse = 1 + 0.18 * Math.sin(S_.elapsed * 5 + o.mesh.position.x);
          o.mesh.scale.setScalar(pulse);
        }

        if (o.kind === 'debris' && !o.hit && Math.abs(o.mesh.position.z - SHIP_Z) < 1.3) {
          const dx = o.mesh.position.x - S_.shipPos.x;
          const dy = o.mesh.position.y - S_.shipPos.y;
          if (Math.sqrt(dx * dx + dy * dy) < o.radius + SHIP_RADIUS) {
            o.hit = true;
            const stage7DamageMult = stage7Unlocked ? 1.6 : 1;
            S_.hull -= t.damage * stage7DamageMult;
            if (audioRef.current) audioRef.current.playImpact(t.damage * stage7DamageMult);
            const isSpaghetti = o.typeKey === 'spaghetti';
            spawnFragments(o.mesh.position.clone(), t.color, isSpaghetti ? 16 : (o.typeKey === 'dust' ? 4 : 8), {
              sizeMin: 0.05, sizeMax: isSpaghetti ? 0.4 : (o.typeKey === 'meteorite' ? 0.26 : 0.15),
              speedMin: isSpaghetti ? 3 : 1.5, speedMax: isSpaghetti ? 8 : 4.5, life: 0.6, gravity: 1.0,
            });
            addDent();
            setUi((u) => ({ ...u, flash: 'hit' }));
            setTimeout(() => setUi((u) => (u.flash === 'hit' ? { ...u, flash: false } : u)), 160);
          }
        }

        if (o.kind === 'pickup' && !o.hit && Math.abs(o.mesh.position.z - SHIP_Z) < 1.3) {
          const dx = o.mesh.position.x - S_.shipPos.x;
          const dy = o.mesh.position.y - S_.shipPos.y;
          if (Math.sqrt(dx * dx + dy * dy) < o.radius + SHIP_RADIUS) {
            o.hit = true;
            S_.score += 8;
            disposeObj(o);
            S_.objects.splice(i, 1);
            if (o.materialType === 'graviton') {
              S_.gravitonMaterials += 1;
              if (audioRef.current) audioRef.current.playPickup('graviton');
              spawnFragments(o.mesh.position.clone(), 0xb388ff, 5, { sizeMin: 0.03, sizeMax: 0.09, speedMin: 1, speedMax: 2.4, life: 0.4, gravity: 0 });
              if (S_.gravitonMaterials % 3 === 0 && S_.gravitonPlatesForged < 5) {
                S_.gravitonPlatesForged += 1;
                S_.gravityMult *= 0.78;
                addGravPlate();
                if (audioRef.current) audioRef.current.playPlateForged();
                setUi((u) => ({ ...u, toast: `GRAVITY PLATE ${S_.gravitonPlatesForged}/5 FORGED` }));
                setTimeout(() => setUi((u) => (u.toast && u.toast.startsWith('GRAVITY PLATE') ? { ...u, toast: null } : u)), 1800);
              }
            } else if (o.materialType === 'shard') {
              S_.shardMaterials += 1;
              if (audioRef.current) audioRef.current.playPickup('shard');
              spawnFragments(o.mesh.position.clone(), 0xff8ff0, 5, { sizeMin: 0.03, sizeMax: 0.09, speedMin: 1, speedMax: 2.4, life: 0.4, gravity: 0 });
              if (S_.shardMaterials % 3 === 0 && S_.shardPlatesForged < 5) {
                S_.shardPlatesForged += 1;
                S_.tidalMult *= 0.75;
                addShardPlate();
                if (audioRef.current) audioRef.current.playPlateForged();
                setUi((u) => ({ ...u, toast: `HORIZON PLATE ${S_.shardPlatesForged}/5 FORGED` }));
                setTimeout(() => setUi((u) => (u.toast && u.toast.startsWith('HORIZON PLATE') ? { ...u, toast: null } : u)), 1800);
              }
            } else {
              S_.materials += 1;
              if (audioRef.current) audioRef.current.playPickup('alloy');
              spawnFragments(o.mesh.position.clone(), 0x6ff2ff, 5, { sizeMin: 0.03, sizeMax: 0.09, speedMin: 1, speedMax: 2.4, life: 0.4, gravity: 0 });
              if (S_.materials % 3 === 0 && S_.platesForged < 5) {
                S_.platesForged += 1;
                S_.heatGainMult *= 0.82;
                addPlate();
                setUi((u) => ({ ...u, toast: `HULL PLATE ${S_.platesForged}/5 FORGED` }));
                setTimeout(() => setUi((u) => (u.toast && u.toast.startsWith('HULL PLATE') ? { ...u, toast: null } : u)), 1800);
              }
            }
            continue;
          }
        }

        if (o.kind === 'landmark' && !o.hit) {
          const hitR = Math.min(o.radius * 0.5, 5.2);
          const distZ = Math.abs(o.mesh.position.z - SHIP_Z);
          if (distZ < hitR * 1.6) {
            const dx = o.mesh.position.x - S_.shipPos.x;
            const dy = o.mesh.position.y - S_.shipPos.y;
            if (Math.sqrt(dx * dx + dy * dy) < hitR + SHIP_RADIUS) {
              o.hit = true;
              disposeObj(o);
              S_.objects.splice(i, 1);
              triggerPlanetExplosion();
              break;
            }
          }
        }

        // Extended despawn for landmark Groups (jets extend far in Y)
        const despawnThresh = o.kind === 'landmark' ? DESPAWN_Z + 80 : DESPAWN_Z;
        if (o.mesh.position.z > despawnThresh) { disposeObj(o); S_.objects.splice(i, 1); }
      }

      if (stage4Unlocked) {
        let nearest = null, nearestDist = Infinity;
        for (const o of S_.objects) {
          if (o.kind === 'pickup' && !o.hit) {
            const d = Math.abs(o.mesh.position.z - SHIP_Z);
            if (d < nearestDist) { nearestDist = d; nearest = o; }
          }
        }
        if (nearest) {
          const dx = nearest.mesh.position.x - S_.shipPos.x;
          const dy = nearest.mesh.position.y - S_.shipPos.y;
          const h = dx > 0.5 ? '▶' : dx < -0.5 ? '◀' : '';
          const v = dy > 0.5 ? '▲' : dy < -0.5 ? '▼' : '';
          const matLabel = nearest.materialType === 'graviton' ? 'GRAVITON' : nearest.materialType === 'shard' ? 'SHARD' : 'ALLOY';
          S_.pickupHint = `${v}${h} ${matLabel} ${Math.round(nearestDist)}u`.trim();
        } else {
          S_.pickupHint = null;
        }
      } else {
        S_.pickupHint = null;
      }

      if (stage7Unlocked && tunnelT >= 1 && !S_.successTriggered) {
        triggerSingularitySuccess();
      }

      // Audio — engine speed scaling + singularity rumble
      if (audioRef.current && S_.running) {
        const speedNorm = clamp((S_.forwardSpeed - 24) / 126, 0, 1);
        audioRef.current.setEngineSpeed(speedNorm);
        if (stage7Unlocked && !S_.successTriggered) {
          audioRef.current.playSingularityRumble();
        }
      }
      }
    }

    updateParticles(dt);
    S_.renderer.render(S_.scene, S_.camera);

    if (S_.running && !S_.freeFlightActive && S_.elapsed >= STAGE7_START && S_.hull <= 25 && !S_.successTriggered) {
      endGame('Structural failure — spaghettified debris tore the hull apart before reaching the singularity.');
      return;
    }
    if (S_.running && !S_.freeFlightActive && !S_.landingActive && !S_.wormholeActive && !S_.successTriggered && S_.hull <= 0) {
      endGame('Hull integrity depleted.');
      return;
    }

    if (S_.running) {
      setUi((u) => {
        if (u.phase === 'playing') {
          return {
            ...u, hull: clamp(S_.hull, 0, 100), speed: Math.round(S_.forwardSpeed * 10),
            score: Math.round(S_.score), distance: Math.round(S_.distance),
            stage: S_.elapsed < 25 ? 1 : S_.elapsed < 55 ? 2 : S_.elapsed < 90 ? 3 : S_.elapsed < 150 ? 4 : S_.elapsed < 210 ? 5 : S_.elapsed < 270 ? 6 : 7,
            repairing: S_.elapsed >= 55 && !!S_.keys.repair && S_.hull < 100,
            heat: Math.round(S_.heat), pickupHint: S_.pickupHint, gravity: S_.gravity, tunnelT: S_.tunnelT,
          };
        }
        if (u.phase === 'freeflight') {
          const candidatesLeft = S_.objects.filter((o) => o.isPlanet).length;
          return { ...u, distance: Math.round(S_.distance), score: Math.round(S_.score), attemptsUsed: S_.pickAttempts, candidatesLeft };
        }
        if (u.phase === 'landing') {
          return { ...u, blueprintsCollected: S_.blueprintsCollected, crystalsCollected: S_.crystalsCollected };
        }
        if (u.phase === 'wormhole') {
          return { ...u, distance: Math.round(S_.distance), wormholeT: S_.wormholeT };
        }
        return u;
      });
    }

    if (S_.animating) S_.raf = requestAnimationFrame(loop);
  }

  // ---------- input ----------
  useEffect(() => {
    const down = (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'arrowup'].includes(k)) S.keys.up = true;
      if (['s', 'arrowdown'].includes(k)) S.keys.down = true;
      if (['a', 'arrowleft'].includes(k)) S.keys.left = true;
      if (['d', 'arrowright'].includes(k)) S.keys.right = true;
      if (k === 'r') S.keys.repair = true;
      if (k === 'c' || k === ' ') { e.preventDefault(); capturePhoto(); }
      if (k === 'p' && uiRef.current.phase === 'playing') togglePause();
    };
    const up = (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'arrowup'].includes(k)) S.keys.up = false;
      if (['s', 'arrowdown'].includes(k)) S.keys.down = false;
      if (['a', 'arrowleft'].includes(k)) S.keys.left = false;
      if (['d', 'arrowright'].includes(k)) S.keys.right = false;
      if (k === 'r') S.keys.repair = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturePhoto]);

  function togglePause() {
    if (S.running) {
      S.running = false;
      S.animating = false;
      cancelAnimationFrame(S.raf);
      setUi((u) => ({ ...u, phase: 'paused' }));
    } else if (uiRef.current.phase === 'paused') {
      S.running = true;
      S.animating = true;
      S.lastTime = performance.now();
      setUi((u) => ({ ...u, phase: 'playing' }));
      S.raf = requestAnimationFrame(loop);
    }
  }

  const toggleMute = () => {
    setMuted(m => {
      const next = !m;
      if (audioRef.current) audioRef.current.setMuted(next);
      return next;
    });
  };

  const setKey = (name, val) => () => { S.keys[name] = val; };

  return (
    <div style={styles.wrap}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Space+Mono:wght@400;700&display=swap');
        .vp-btn { font-family: 'Space Mono', monospace; cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; }
        .vp-btn:focus-visible { outline: 2px solid #29e6c9; outline-offset: 2px; }
        .vp-pad-btn:active { background: rgba(41,230,201,0.28) !important; }
        @keyframes vpShipLostIn { 0% { opacity: 0; transform: scale(0.8); letter-spacing: 0.3em; } 100% { opacity: 1; transform: scale(1); letter-spacing: 0.14em; } }
        .vp-shiplost { animation: vpShipLostIn 0.6s cubic-bezier(0.2,0.8,0.2,1) 0.25s both; }
      `}</style>

      <div ref={mountRef} style={styles.canvasMount} />

      {ui.flash === 'hit' && <div style={styles.hitFlash} />}
      {ui.flash === true && <div style={styles.photoFlash} />}
      {ui.flash === 'explode' && <div style={styles.explodeFlash} />}
      {ui.flash === 'emerge' && <div style={styles.emergeFlash} />}

      {ui.phase === 'exploding' && (
        <div style={styles.shipLostWrap}>
          <div className="vp-shiplost" style={styles.shipLostText}>SHIP LOST</div>
        </div>
      )}

      {ui.phase === 'dissolving' && (
        <div style={styles.shipLostWrap}>
          <div className="vp-shiplost" style={styles.emergeText}>EMERGING</div>
        </div>
      )}

      {ui.phase === 'freeflight' && (
        <>
          <div style={styles.topBar}>
            <div style={styles.stageTag}>MADRAM MILSAN VOYAGER — STAGE 8 · FREE FLIGHT</div>
            <div style={styles.readoutRow}>
              <Readout label="SCORE" value={ui.score} />
              <Readout label="ATTEMPTS" value={ui.attemptsUsed} />
              <Readout label="DISTANCE" value={ui.distance} unit="u" />
            </div>
          </div>
          {ui.toast && <div style={styles.toast}>{ui.toast}</div>}
          <div style={styles.freeFlightHint}>
            {ui.candidatesLeft > 0
              ? `${ui.candidatesLeft} candidate worlds remain — find it in 2 attempts for the warp drive`
              : 'Searching…'}
          </div>
          <TouchControls setKey={setKey} onCapture={capturePhoto} repairUnlocked={false} repairing={false} />
        </>
      )}

      {ui.phase === 'touchdown' && (
        <div style={styles.shipLostWrap}>
          <div className="vp-shiplost" style={styles.emergeText}>TOUCHDOWN</div>
        </div>
      )}

      {ui.phase === 'landing' && (
        <>
          <div style={styles.topBar}>
            <div style={styles.stageTag}>MADRAM MILSAN VOYAGER — STAGE 9 · GATHER THE BLUEPRINT</div>
            <div style={styles.readoutRow}>
              <Readout label="BLUEPRINTS" value={`${ui.blueprintsCollected}/${BLUEPRINT_TARGET}`} />
              <Readout label="CRYSTALS" value={`${ui.crystalsCollected}/${CRYSTAL_TARGET}`} />
            </div>
          </div>
          {ui.toast && <div style={styles.toast}>{ui.toast}</div>}
          <div style={styles.freeFlightHint}>Explore the surface — gather what the warp drive needs</div>
          <TouchControls setKey={setKey} onCapture={capturePhoto} repairUnlocked={false} repairing={false} />
        </>
      )}

      {ui.phase === 'playing' && (
        <>
          <div style={styles.topBar}>
            <div style={styles.stageTag}>
              MADRAM MILSAN VOYAGER — STAGE {ui.stage} {ui.stage === 1 ? '· OPEN SPACE' : ui.stage === 2 ? '· DEBRIS GAUNTLET' : ui.stage === 3 ? '· IN-FLIGHT RECONSTRUCTION' : ui.stage === 4 ? '· STAR APPROACH' : ui.stage === 5 ? '· NEUTRON STAR' : ui.stage === 6 ? '· BLACK HOLE' : '· SINGULARITY PASSAGE'}
            </div>
            <div style={styles.readoutRow}>
              <Readout label="VELOCITY" value={`${ui.speed}`} unit="u/s" />
              <Readout label="SCORE" value={ui.score} />
              <Readout label="DISTANCE" value={ui.distance} unit="u" />
            </div>
          </div>

          {ui.toast && <div style={styles.toast}>{ui.toast}</div>}

          <HullGauge hull={ui.hull} />
          {ui.stage === 4 && <HeatGauge heat={ui.heat} />}
          {(ui.stage === 5 || ui.stage === 6) && <GravityGauge gravity={ui.gravity} />}
          {(ui.stage === 4 || ui.stage === 5 || ui.stage === 6) && ui.pickupHint && <div style={styles.pickupHint}>{ui.pickupHint}</div>}
          {ui.stage === 7 && (
            <div style={styles.tunnelWrap}>
              <div style={styles.tunnelLabel}>SINGULARITY {Math.round(ui.tunnelT * 100)}%</div>
              <div style={styles.tunnelTrack}>
                <div style={{ ...styles.tunnelFill, width: `${ui.tunnelT * 100}%` }} />
              </div>
            </div>
          )}
          {ui.stage >= 3 && (
            <div style={{ ...styles.repairHint, color: ui.repairing ? '#29e6c9' : ui.hull >= 100 ? '#6c8b94' : '#ffb020' }}>
              {ui.repairing ? 'RECONSTRUCTING HULL…' : ui.hull >= 100 ? 'HULL AT FULL INTEGRITY' : 'HOLD R TO RECONSTRUCT'}
            </div>
          )}

          <div style={styles.reticle} aria-hidden>
            <div style={styles.reticleRing} />
            <div style={styles.reticleCross} />
          </div>

          <button
            className="vp-btn"
            onClick={() => setUi((u) => ({ ...u, showLog: !u.showLog }))}
            style={styles.logToggle}
          >
            PHOTO LOG ({ui.photos.length})
          </button>

          <button className="vp-btn" onClick={togglePause} style={styles.pauseBtn} aria-label="Pause">II</button>

          {ui.showLog && <PhotoLog photos={ui.photos} onClose={() => setUi((u) => ({ ...u, showLog: false }))} />}

          <TouchControls setKey={setKey} onCapture={capturePhoto} repairUnlocked={ui.stage >= 3} repairing={ui.repairing} />
        </>
      )}

      {ui.phase === 'paused' && (
        <Overlay>
          <h2 style={styles.h2}>PAUSED</h2>
          <button className="vp-btn" style={styles.primaryBtn} onClick={togglePause}>Resume flight</button>
        </Overlay>
      )}

      {ui.phase === 'start' && (
        <Overlay>
          <div style={styles.eyebrow}>MADRAM MILSAN VOYAGER</div>
          <h1 style={styles.h1}>Navigation Trial</h1>
          <p style={styles.bodyText}>
            Steer with <b>WASD</b> or arrow keys. Dodge debris, capture photos with <b>C</b>,
            and survive as the run pushes deeper — a star, a neutron star, a black hole,
            then a singularity passage. Clear that and you'll drift free searching for a
            habitable world, land to build a warp drive, and fly home through a wormhole.
            Each stage reveals what it needs as you reach it.
          </p>
          {highScore.score > 0 && (
            <div style={styles.hsBanner}>
              <span style={styles.hsLabel}>BEST RUN</span>
              <span style={styles.hsValue}>{highScore.score.toLocaleString()}</span>
              <span style={styles.hsMeta}>Stage {highScore.stage} · {highScore.distance}u · {highScore.photos} photos · {highScore.date}</span>
            </div>
          )}
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginTop:4}}>
            <button className="vp-btn" style={styles.primaryBtn} onClick={startGame}>Begin Launch</button>
            <button className="vp-btn" style={styles.muteBtn} onClick={toggleMute} title="Toggle sound">{muted?'🔇':'🔊'}</button>
          </div>
          <div style={styles.mmaiLink}>
            <a href="https://madrammilsanai.regovix.com" target="_blank" rel="noopener noreferrer" style={styles.mmaiAnchor}>
              🌍 Plan a real trip with Madram Milsan AI →
            </a>
          </div>
        </Overlay>
      )}

      {ui.phase === 'over' && ui.over && (
        <Overlay>
          <div style={styles.eyebrow} data-danger>HULL BREACH</div>
          <h2 style={styles.h2}>{ui.over.reason}</h2>
          <div style={styles.statsGrid}>
            <StatBlock label="Distance" value={ui.over.distance} />
            <StatBlock label="Score" value={ui.over.score} />
            <StatBlock label="Photos Captured" value={ui.over.photos} />
          </div>
          {newRecord && <div style={styles.newRecord}>🏆 NEW PERSONAL BEST!</div>}
          {highScore.score > 0 && !newRecord && (
            <div style={styles.hsBanner}>
              <span style={styles.hsLabel}>BEST</span>
              <span style={styles.hsValue}>{highScore.score.toLocaleString()}</span>
            </div>
          )}
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginTop:8}}>
            <button className="vp-btn" style={styles.primaryBtn} onClick={startGame}>Relaunch</button>
            <button className="vp-btn" style={styles.muteBtn} onClick={toggleMute}>{muted?'🔇':'🔊'}</button>
          </div>
          <div style={styles.mmaiLink}>
            <a href="https://madrammilsanai.regovix.com" target="_blank" rel="noopener noreferrer" style={styles.mmaiAnchor}>
              🌍 Explore real destinations with Madram Milsan AI →
            </a>
          </div>
        </Overlay>
      )}

      {ui.phase === 'warpassembled' && ui.over && (
        <Overlay>
          <div style={styles.eyebrowSuccess}>WARP DRIVE ASSEMBLED</div>
          <h2 style={styles.h2}>Every piece found. It's built.</h2>
          <p style={styles.bodyText}>
            Five blueprint fragments, three warp crystals, and the drive stands assembled
            on the grass where you crashed. One flight left: home, through the wormhole.
          </p>
          <div style={styles.statsGrid}>
            <StatBlock label="Distance" value={ui.over.distance} />
            <StatBlock label="Score" value={ui.over.score} />
            <StatBlock label="Photos Captured" value={ui.over.photos} />
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginTop:8}}>
            <button className="vp-btn" style={styles.primaryBtn} onClick={departForEarth}>Depart for Earth</button>
            <button className="vp-btn" style={styles.muteBtn} onClick={toggleMute}>{muted?'🔇':'🔊'}</button>
          </div>
        </Overlay>
      )}

      {ui.phase === 'departing' && (
        <div style={styles.shipLostWrap}>
          <div className="vp-shiplost" style={styles.emergeText}>DEPARTING</div>
        </div>
      )}

      {ui.phase === 'wormhole' && (
        <>
          <div style={styles.topBar}>
            <div style={styles.stageTag}>MADRAM MILSAN VOYAGER — STAGE 10 · FLIGHT HOME</div>
            <div style={styles.readoutRow}>
              <Readout label="DISTANCE" value={ui.distance} unit="u" />
            </div>
          </div>
          <div style={styles.tunnelWrap}>
            <div style={styles.tunnelLabel}>WORMHOLE {Math.round(ui.wormholeT * 100)}%</div>
            <div style={styles.tunnelTrack}>
              <div style={{ ...styles.tunnelFill, width: `${ui.wormholeT * 100}%` }} />
            </div>
          </div>
          <TouchControls setKey={setKey} onCapture={capturePhoto} repairUnlocked={false} repairing={false} />
        </>
      )}

      {ui.phase === 'victory' && ui.over && (
        <Overlay>
          <div style={styles.eyebrowSuccess}>WELCOME HOME</div>
          <h2 style={styles.h2}>Earth. You made it back.</h2>
          <p style={styles.bodyText}>
            Debris fields, a star, a neutron star, a black hole, a singularity, a stranger's
            sky, and a long walk on foreign grass — all of it behind you now. The full
            journey, start to finish.
          </p>
          <div style={styles.statsGrid}>
            <StatBlock label="Distance" value={ui.over.distance} />
            <StatBlock label="Score" value={ui.over.score} />
            <StatBlock label="Photos Captured" value={ui.over.photos} />
          </div>
          {newRecord && <div style={styles.newRecord}>🏆 NEW PERSONAL BEST!</div>}
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginTop:8}}>
            <button className="vp-btn" style={styles.primaryBtn} onClick={startGame}>Play again</button>
            <button className="vp-btn" style={styles.muteBtn} onClick={toggleMute}>{muted?'🔇':'🔊'}</button>
          </div>
          <div style={styles.mmaiLink}>
            <a href="https://madrammilsanai.regovix.com" target="_blank" rel="noopener noreferrer" style={styles.mmaiAnchor}>
              🌍 Now plan a real trip — Madram Milsan AI is free →
            </a>
          </div>
        </Overlay>
      )}

      {ui.phase === 'settled' && ui.over && (
        <Overlay>
          <div style={styles.eyebrow}>TOO MANY ATTEMPTS</div>
          <h2 style={styles.h2}>You found it. Too late for the drive.</h2>
          <p style={styles.bodyText}>
            The city lights were real — this is the one. But it took {ui.over.attempts} attempts
            to get here, and whatever it would have taken to build a warp drive got lost
            in the wrong worlds along the way. You'll live here, breathe the air, watch
            the lights at night. There's just no way back to Earth from this one.
          </p>
          <div style={styles.statsGrid}>
            <StatBlock label="Distance" value={ui.over.distance} />
            <StatBlock label="Score" value={ui.over.score} />
            <StatBlock label="Photos Captured" value={ui.over.photos} />
          </div>
          {newRecord && <div style={styles.newRecord}>🏆 NEW PERSONAL BEST!</div>}
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginTop:8}}>
            <button className="vp-btn" style={styles.primaryBtn} onClick={startGame}>Fly again</button>
            <button className="vp-btn" style={styles.muteBtn} onClick={toggleMute}>{muted?'🔇':'🔊'}</button>
          </div>
          <div style={styles.mmaiLink}>
            <a href="https://madrammilsanai.regovix.com" target="_blank" rel="noopener noreferrer" style={styles.mmaiAnchor}>
              🌍 Find your real habitable world — Madram Milsan AI →
            </a>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Readout({ label, value, unit }) {
  return (
    <div style={styles.readout}>
      <div style={styles.readoutLabel}>{label}</div>
      <div style={styles.readoutValue}>{value}{unit ? <span style={styles.readoutUnit}> {unit}</span> : null}</div>
    </div>
  );
}

function HeatGauge({ heat }) {
  const r = 42, circ = 2 * Math.PI * r;
  const pct = clamp(heat, 0, 100) / 100;
  const color = heat < 55 ? '#ffb020' : heat < 85 ? '#ff8a3d' : '#ff4b4b';
  return (
    <div style={styles.heatGaugeWrap}>
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="rgba(255,176,32,0.14)" strokeWidth="7" />
        <circle
          cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          transform="rotate(-90 52 52)" style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.25s' }}
        />
      </svg>
      <div style={styles.gaugeCenter}>
        <div style={{ ...styles.gaugeValue, color }}>{Math.round(heat)}</div>
        <div style={styles.gaugeLabel}>HEAT</div>
      </div>
    </div>
  );
}

function GravityGauge({ gravity }) {
  const r = 42, circ = 2 * Math.PI * r;
  const pct = clamp(gravity, 0, 100) / 100;
  const color = gravity < 45 ? '#9d6fff' : gravity < 75 ? '#b388ff' : '#e0a3ff';
  return (
    <div style={styles.heatGaugeWrap}>
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="rgba(157,111,255,0.14)" strokeWidth="7" />
        <circle
          cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          transform="rotate(-90 52 52)" style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.25s' }}
        />
      </svg>
      <div style={styles.gaugeCenter}>
        <div style={{ ...styles.gaugeValue, color }}>{Math.round(gravity)}</div>
        <div style={styles.gaugeLabel}>PULL</div>
      </div>
    </div>
  );
}

function HullGauge({ hull }) {
  const r = 42, circ = 2 * Math.PI * r;
  const pct = clamp(hull, 0, 100) / 100;
  const color = hull > 55 ? '#29e6c9' : hull > 25 ? '#ffb020' : '#ff4b4b';
  return (
    <div style={styles.gaugeWrap}>
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="rgba(41,230,201,0.14)" strokeWidth="7" />
        <circle
          cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          transform="rotate(-90 52 52)" style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.25s' }}
        />
      </svg>
      <div style={styles.gaugeCenter}>
        <div style={{ ...styles.gaugeValue, color }}>{Math.round(hull)}</div>
        <div style={styles.gaugeLabel}>HULL</div>
      </div>
    </div>
  );
}

function PhotoLog({ photos, onClose }) {
  const dotColor = { debris: '#8a7a6a', landmark: '#4ac8ff', pickup: '#ffb020', none: '#5c6672' };
  return (
    <div style={styles.logPanel}>
      <div style={styles.logHeader}>
        <span>PHOTO LOG</span>
        <button className="vp-btn" onClick={onClose} style={styles.logClose} aria-label="Close photo log">×</button>
      </div>
      <div style={styles.logList}>
        {photos.length === 0 && <div style={styles.logEmpty}>No captures yet. Press C to shoot.</div>}
        {photos.map((p) => (
          <div key={p.id} style={styles.logItem}>
            <span style={{ ...styles.logDot, background: dotColor[p.kind] || '#5c6672' }} />
            <div style={{ flex: 1 }}>
              <div style={styles.logLabel}>{p.label}</div>
              <div style={styles.logMeta}>{p.quality} · {p.dist}u out</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TouchControls({ setKey, onCapture, repairUnlocked, repairing }) {
  const padBtn = (name, glyph, style) => (
    <button
      className="vp-btn vp-pad-btn"
      style={{ ...styles.padBtn, ...style }}
      onPointerDown={setKey(name, true)}
      onPointerUp={setKey(name, false)}
      onPointerLeave={setKey(name, false)}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={name}
    >{glyph}</button>
  );
  return (
    <>
      <div style={styles.padWrap}>
        {padBtn('up', '▲', { gridColumn: '2', gridRow: '1' })}
        {padBtn('left', '◀', { gridColumn: '1', gridRow: '2' })}
        {padBtn('down', '▼', { gridColumn: '2', gridRow: '3' })}
        {padBtn('right', '▶', { gridColumn: '3', gridRow: '2' })}
      </div>
      <button className="vp-btn" style={styles.shutterBtn} onClick={onCapture} aria-label="Capture photo">●</button>
      {repairUnlocked && (
        <button
          className="vp-btn"
          style={{ ...styles.repairBtn, borderColor: repairing ? '#29e6c9' : 'rgba(41,230,201,0.4)', color: repairing ? '#29e6c9' : '#7fd8cd' }}
          onPointerDown={setKey('repair', true)}
          onPointerUp={setKey('repair', false)}
          onPointerLeave={setKey('repair', false)}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Hold to reconstruct hull"
        >⚙</button>
      )}
    </>
  );
}

function Overlay({ children }) {
  return <div style={styles.overlayWrap}><div style={styles.overlayPanel}>{children}</div></div>;
}
function StatBlock({ label, value }) {
  return <div style={styles.statBlock}><div style={styles.statValue}>{value}</div><div style={styles.statLabel}>{label}</div></div>;
}

const styles = {
  wrap: { position: 'relative', width: '100%', height: '640px', maxHeight: '86vh', background: 'radial-gradient(ellipse at 50% 30%, #0a0e17 0%, #05070c 70%)', overflow: 'hidden', borderRadius: 10, fontFamily: "'Space Mono', ui-monospace, 'Courier New', monospace", color: '#e8f4f2' },
  canvasMount: { position: 'absolute', inset: 0 },
  hitFlash: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(255,75,75,0) 40%, rgba(255,75,75,0.35) 100%)', pointerEvents: 'none' },
  photoFlash: { position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', pointerEvents: 'none' },
  explodeFlash: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,176,32,0.85) 35%, rgba(255,75,20,0.4) 65%, rgba(0,0,0,0) 100%)', pointerEvents: 'none' },
  emergeFlash: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(191,227,255,0.85) 35%, rgba(111,242,255,0.4) 65%, rgba(0,0,0,0) 100%)', pointerEvents: 'none' },
  shipLostWrap: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  shipLostText: { fontFamily: "'Orbitron', sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '0.14em', color: '#ff5a4a', textShadow: '0 0 18px rgba(255,90,74,0.85), 0 0 46px rgba(255,90,74,0.5)' },
  emergeText: { fontFamily: "'Orbitron', sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '0.14em', color: '#6ff2ff', textShadow: '0 0 18px rgba(111,242,255,0.85), 0 0 46px rgba(111,242,255,0.5)' },
  freeFlightHint: { position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', fontSize: 12, letterSpacing: '0.08em', color: '#a9bdc2', fontFamily: "'Space Mono', monospace" },
  topBar: { position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' },
  stageTag: { fontFamily: "'Orbitron', sans-serif", fontSize: 11, letterSpacing: '0.08em', color: '#7fd8cd', background: 'rgba(10,14,23,0.6)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(41,230,201,0.22)' },
  readoutRow: { display: 'flex', gap: 8 },
  readout: { background: 'rgba(10,14,23,0.68)', border: '1px solid rgba(41,230,201,0.22)', borderRadius: 6, padding: '5px 10px', minWidth: 74, textAlign: 'right', backdropFilter: 'blur(6px)' },
  readoutLabel: { fontSize: 9, letterSpacing: '0.1em', color: '#6c8b94' },
  readoutValue: { fontSize: 16, fontWeight: 700, color: '#e8f4f2' },
  readoutUnit: { fontSize: 10, color: '#6c8b94' },
  gaugeWrap: { position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)' },
  heatGaugeWrap: { position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-160px) scale(0.72)', transformOrigin: 'bottom center' },
  toast: { position: 'absolute', top: 54, left: '50%', transform: 'translateX(-50%)', fontFamily: "'Orbitron', sans-serif", fontSize: 11, letterSpacing: '0.1em', color: '#ffb020', background: 'rgba(10,14,23,0.75)', border: '1px solid rgba(255,176,32,0.4)', borderRadius: 6, padding: '6px 12px' },
  gaugeCenter: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  gaugeValue: { fontSize: 24, fontWeight: 800, fontFamily: "'Orbitron', sans-serif", lineHeight: 1 },
  gaugeLabel: { fontSize: 9, color: '#6c8b94', letterSpacing: '0.12em', marginTop: 2 },
  repairHint: { position: 'absolute', bottom: 128, left: '50%', transform: 'translateX(-50%)', fontSize: 10, letterSpacing: '0.08em', whiteSpace: 'nowrap', fontFamily: "'Space Mono', monospace" },
  pickupHint: { position: 'absolute', bottom: 148, left: '50%', transform: 'translateX(-50%)', fontSize: 11, letterSpacing: '0.06em', whiteSpace: 'nowrap', fontFamily: "'Space Mono', monospace", color: '#6ff2ff', textShadow: '0 0 8px rgba(111,242,255,0.6)' },
  tunnelWrap: { position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: 220, textAlign: 'center' },
  tunnelLabel: { fontSize: 10, letterSpacing: '0.1em', color: '#e8f4f2', marginBottom: 5 },
  tunnelTrack: { width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  tunnelFill: { height: '100%', background: 'linear-gradient(90deg, #6ff2ff, #ffffff)', transition: 'width 0.2s linear' },
  reticle: { position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, pointerEvents: 'none' },
  reticleRing: { position: 'absolute', width: 26, height: 26, border: '1px solid rgba(255,176,32,0.35)', borderRadius: '50%', transform: 'translate(-50%,-50%)' },
  reticleCross: { position: 'absolute', width: 3, height: 3, background: 'rgba(255,176,32,0.6)', borderRadius: '50%', transform: 'translate(-50%,-50%)' },
  logToggle: { position: 'absolute', top: 14, right: 14, marginTop: 44, background: 'rgba(10,14,23,0.68)', color: '#7fd8cd', border: '1px solid rgba(41,230,201,0.25)', borderRadius: 6, padding: '6px 10px', fontSize: 11 },
  pauseBtn: { position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,14,23,0.68)', color: '#e8f4f2', border: '1px solid rgba(41,230,201,0.22)', borderRadius: 6, width: 30, height: 26, fontSize: 11 },
  logPanel: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 230, background: 'rgba(6,9,15,0.92)', borderLeft: '1px solid rgba(41,230,201,0.2)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column' },
  logHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', fontFamily: "'Orbitron', sans-serif", fontSize: 11, letterSpacing: '0.08em', color: '#7fd8cd', borderBottom: '1px solid rgba(41,230,201,0.15)' },
  logClose: { background: 'none', border: 'none', color: '#e8f4f2', fontSize: 18, lineHeight: 1, cursor: 'pointer' },
  logList: { overflowY: 'auto', padding: '8px 10px', flex: 1 },
  logEmpty: { color: '#6c8b94', fontSize: 12, padding: '10px 4px' },
  logItem: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  logDot: { width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0 },
  logLabel: { fontSize: 12, color: '#e8f4f2' },
  logMeta: { fontSize: 10, color: '#6c8b94' },
  padWrap: { position: 'absolute', left: 16, bottom: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 46px)', gridTemplateRows: 'repeat(3, 46px)', gap: 4 },
  padBtn: { background: 'rgba(10,14,23,0.68)', border: '1px solid rgba(41,230,201,0.25)', borderRadius: 8, color: '#7fd8cd', fontSize: 15, touchAction: 'none' },
  shutterBtn: { position: 'absolute', right: 22, bottom: 22, width: 62, height: 62, borderRadius: '50%', background: 'rgba(255,176,32,0.16)', border: '2px solid #ffb020', color: '#ffb020', fontSize: 22 },
  repairBtn: { position: 'absolute', right: 96, bottom: 32, width: 50, height: 50, borderRadius: '50%', background: 'rgba(41,230,201,0.1)', border: '2px solid rgba(41,230,201,0.4)', fontSize: 20, touchAction: 'none' },
  overlayWrap: { position: 'absolute', inset: 0, background: 'rgba(4,6,10,0.72)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  overlayPanel: { maxWidth: 420, maxHeight: '92%', overflowY: 'auto', textAlign: 'center', background: 'rgba(10,14,23,0.85)', border: '1px solid rgba(41,230,201,0.22)', borderRadius: 12, padding: '30px 28px' },
  eyebrow: { fontFamily: "'Orbitron', sans-serif", fontSize: 11, letterSpacing: '0.18em', color: '#ffb020', marginBottom: 6 },
  eyebrowSuccess: { fontFamily: "'Orbitron', sans-serif", fontSize: 11, letterSpacing: '0.18em', color: '#6ff2ff', marginBottom: 6 },
  h1: { fontFamily: "'Orbitron', sans-serif", fontSize: 28, margin: '0 0 14px', color: '#e8f4f2' },
  h2: { fontFamily: "'Orbitron', sans-serif", fontSize: 20, margin: '0 0 16px', color: '#e8f4f2' },
  bodyText: { fontSize: 13, lineHeight: 1.6, color: '#a9bdc2', marginBottom: 22 },
  bodyTextDim: { fontSize: 11, letterSpacing: '0.04em', color: '#6c8b94' },
  primaryBtn: { background: '#29e6c9', color: '#04120f', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer' },
  muteBtn: { background: 'rgba(41,230,201,0.1)', color: '#7fd8cd', border: '1px solid rgba(41,230,201,0.3)', borderRadius: 8, padding: '11px 14px', fontSize: 16, cursor: 'pointer' },
  hsBanner: { display:'flex', alignItems:'center', gap:10, justifyContent:'center', background:'rgba(41,230,201,0.08)', border:'1px solid rgba(41,230,201,0.2)', borderRadius:8, padding:'8px 16px', margin:'12px 0' },
  hsLabel: { fontFamily:"'Orbitron',sans-serif", fontSize:9, letterSpacing:'0.14em', color:'#6c8b94' },
  hsValue: { fontFamily:"'Orbitron',sans-serif", fontSize:20, fontWeight:800, color:'#29e6c9' },
  hsMeta: { fontSize:10, color:'#6c8b94' },
  newRecord: { fontFamily:"'Orbitron',sans-serif", fontSize:14, fontWeight:800, color:'#ffb020', letterSpacing:'0.1em', margin:'10px 0', textShadow:'0 0 12px rgba(255,176,32,0.6)' },
  mmaiLink: { marginTop:16, paddingTop:14, borderTop:'1px solid rgba(41,230,201,0.12)' },
  mmaiAnchor: { color:'#29e6c9', fontSize:12, textDecoration:'none', letterSpacing:'0.04em', fontFamily:"'Space Mono',monospace" },
  statsGrid: { display: 'flex', gap: 18, justifyContent: 'center', margin: '18px 0 24px' },
  statBlock: { minWidth: 70 },
  statValue: { fontSize: 22, fontWeight: 800, fontFamily: "'Orbitron', sans-serif", color: '#7fd8cd' },
  statLabel: { fontSize: 9, color: '#6c8b94', letterSpacing: '0.08em', marginTop: 4 },
};
