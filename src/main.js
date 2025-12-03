import * as THREE from 'https://unpkg.com/three@0.153.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.153.0/examples/jsm/controls/OrbitControls.js';

// Basic scene + renderer
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 6, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,1,0);
controls.update();

window.addEventListener('resize', onWindowResize);
function onWindowResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5,10,7);
scene.add(dir);

// Lab bench (simple plane + box)
const floorGeo = new THREE.PlaneGeometry(40,40);
const floorMat = new THREE.MeshStandardMaterial({ color:0x222222, metalness:0.2, roughness:0.8 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI/2;
scene.add(floor);

const benchGeo = new THREE.BoxGeometry(6,0.6,2);
const benchMat = new THREE.MeshStandardMaterial({ color:0x3a3a3a });
const bench = new THREE.Mesh(benchGeo, benchMat);
bench.position.set(0,0.35,0);
scene.add(bench);

// Source object
const source = new THREE.Mesh(new THREE.SphereGeometry(0.25,16,12), new THREE.MeshStandardMaterial({emissive:0xff8800, color:0x222222}));
source.position.set(-2,1.0,0);
scene.add(source);

// Draggable shielding boxes (simple)
const shieldMaterials = {
  paper: {color:0xfff3d7, thickness:0.05, coeff:100},
  aluminum: {color:0xbfc9d6, thickness:0.2, coeff:6},
  lead: {color:0x4d4d4d, thickness:0.6, coeff:0.6}
};

const shields = [];
function addShield(type, x){
  const m = shieldMaterials[type];
  const geo = new THREE.BoxGeometry(m.thickness, 1.0, 1.2);
  const mat = new THREE.MeshStandardMaterial({ color: m.color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x,0.8,1.1);
  mesh.userData = { type, coeff: m.coeff };
  scene.add(mesh);
  shields.push(mesh);
}
addShield('paper', 0.5);
addShield('aluminum', 2.2);
addShield('lead', 4.2);

// Simple detector (Geiger counter) - a small box on the bench
const detector = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.4,0.4), new THREE.MeshStandardMaterial({color:0x2233aa}));
detector.position.set(3.2,0.6,0);
scene.add(detector);

// Holographic projector (microscope) - a small group with a pedestal and projection area
const projectorGroup = new THREE.Group();
projectorGroup.position.set(0, 1.4, -3.0);
projectorGroup.visible = false; // off by default

const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,0.3,16), new THREE.MeshStandardMaterial({ color:0x222255 }));
pedestal.position.set(0,0.15,0);
projectorGroup.add(pedestal);

const projectorSurface = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.8,0.02,20,1,true), new THREE.MeshStandardMaterial({ color: 0x0e6aef, opacity:0.08, transparent:true, side:THREE.DoubleSide }));
projectorSurface.position.set(0,0.5,0);
projectorSurface.rotation.x = -Math.PI/2.3;
projectorGroup.add(projectorSurface);

// holographic screen for nucleus visuals
const projScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.0), new THREE.MeshBasicMaterial({ color:0x002244, transparent:true, opacity:0.06 }));
projScreen.position.set(0,0.8,0.05);
projectorGroup.add(projScreen);

scene.add(projectorGroup);
// Projector simulation state and helpers
const projectorState = {
  type: 'alpha',
  speed: 1.0,
  playing: false,
  timer: 0,
  step: 0
};

// Build nucleus model inside projector
let nucleusGroup = null;
function createNucleus(protons=6, neutrons=6){
  if(nucleusGroup) { scene.remove(nucleusGroup); }
  nucleusGroup = new THREE.Group();
  const radius = 0.18;
  // create nucleons in a small cluster
  const nTotal = protons + neutrons;
  let i = 0;
  const protonMeshes = [];
  const neutronMeshes = [];
  for(let p=0;p<protons;p++){
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.06,12,8), new THREE.MeshStandardMaterial({ color:0xff4444 }));
    const ang = i * 2.0 * Math.PI / nTotal + Math.random()*0.12;
    const r = 0.06 + Math.random()*0.04;
    s.position.set(Math.cos(ang)*r, (Math.random()-0.5)*0.04, Math.sin(ang)*r);
    protonMeshes.push(s); nucleusGroup.add(s); i++;
  }
  for(let n=0;n<neutrons;n++){
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.06,12,8), new THREE.MeshStandardMaterial({ color:0x999999 }));
    const ang = i * 2.0 * Math.PI / nTotal + Math.random()*0.12;
    const r = 0.06 + Math.random()*0.04;
    s.position.set(Math.cos(ang)*r, (Math.random()-0.5)*0.04, Math.sin(ang)*r);
    neutronMeshes.push(s); nucleusGroup.add(s); i++;
  }
  nucleusGroup.userData = { protons: protonMeshes, neutrons: neutronMeshes };
  // place nucleus inside projector screen
  nucleusGroup.position.set(0,0.82,0.06);
  projectorGroup.add(nucleusGroup);
  return nucleusGroup;
}

createNucleus(6,6);

// Add a few atoms to show electron shells for ionization demo
const nearbyAtoms = [];
function createNearbyAtoms(){
  // remove old
  nearbyAtoms.forEach(a => scene.remove(a.group)); nearbyAtoms.length=0;
  // create some simple atoms arranged around the projection
  const base = new THREE.Group();
  const positions = [ [0.6,0.82,0], [-0.6,0.82,0], [0,0.82,0.5], [0,0.82,-0.5] ];
  positions.forEach(pos => {
    const g = new THREE.Group();
    g.position.set(...pos);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.055,10,8), new THREE.MeshStandardMaterial({ color:0xffaa33 }));
    g.add(core);
    // electrons as small spheres in 1 or 2 shells
    const electrons = [];
    const shell1 = 2; const shell2 = 4;
    for(let e=0;e<shell1;e++){
      const ell = new THREE.Mesh(new THREE.SphereGeometry(0.01,8,6), new THREE.MeshStandardMaterial({ color:0x88ccff }));
      const ang = e/(shell1) * Math.PI*2;
      ell.position.set(0.09*Math.cos(ang), 0.05*Math.sin(ang)+0.01, 0.09*Math.sin(ang)); g.add(ell); electrons.push(ell);
    }
    for(let e=0;e<shell2;e++){
      const ell = new THREE.Mesh(new THREE.SphereGeometry(0.01,8,6), new THREE.MeshStandardMaterial({ color:0x88ccff }));
      const ang = e/(shell2) * Math.PI*2;
      ell.position.set(0.15*Math.cos(ang), -0.03 + 0.03*Math.sin(ang), 0.15*Math.sin(ang)); g.add(ell); electrons.push(ell);
    }
    base.add(g);
    nearbyAtoms.push({group:g, electrons});
    projectorGroup.add(g);
  });
}
createNearbyAtoms();

// Projector animation helpers and basic state machine
let activeAnimations = [];
function startDecayAnimation(type='alpha'){
  // reset any running animations for a clean start
  pauseDecayAnimation(); projectorState.type = type; projectorState.playing = true; projectorState.step=0;
  if(type === 'alpha') runAlphaAnimation();
  else if(type === 'beta') runBetaAnimation();
  else if(type === 'gamma') runGammaAnimation();
}
function pauseDecayAnimation(){ projectorState.playing = false; activeAnimations.forEach(a=>a.paused=true);} 
function resumeDecayAnimation(){ projectorState.playing = true; activeAnimations.forEach(a=> a.paused=false); }
function stepDecay(){ projectorState.playing=false; // single step behavior for demonstration
  // execute next step based on projectorState.type and projectorState.step
  if(projectorState.type === 'alpha') runAlphaStep(projectorState.step++);
  if(projectorState.type === 'beta') runBetaStep(projectorState.step++);
  if(projectorState.type === 'gamma') runGammaStep(projectorState.step++);
}
function resetProjector(){
  // Remove any active particles or meshes created by animations first
  activeAnimations.forEach(a=> { if(a.object) projectorGroup.remove(a.object); }); activeAnimations.length=0;
  // recreate nucleus
  createNucleus(6,6);
  // recreate atoms and restore electrons
  createNearbyAtoms();
  projectorState.timer = 0; projectorState.step = 0; projectorState.playing=false;
}

// animation utilities
function animateObject(obj, start, end, duration, onDone){
  const startTime = performance.now();
  const anim = {object: obj, start, end, duration, startTime, paused:false, done:false};
  activeAnimations.push(anim);
  return anim;
}

// Run each animation frame for active animations
function updateProjectorAnimations(){
  const now = performance.now();
  for(let i = activeAnimations.length - 1; i >= 0; i--){
    const a = activeAnimations[i];
    if(a.paused) continue;
    const t = (now - a.startTime) / (a.duration * 1000 / projectorState.speed);
    const tt = Math.min(1, t);
    // interpolate position and scale
    if(a.start && a.end){
      if(a.object.position && a.end.position){
        a.object.position.lerpVectors(a.start.position, a.end.position, tt);
      }
      if(a.object.scale && a.end.scale) a.object.scale.setScalar(a.start.scale + (a.end.scale - a.start.scale) * tt);
    }
    if(tt >= 1){ if(!a.done){ a.done=true; if(a.onDone) a.onDone(); } activeAnimations.splice(i,1); }
  }
}

// Alpha decay animation (simplified): create alpha particle from nucleus, ejected outwards,
function runAlphaAnimation(){ runAlphaStep(0); }
function runAlphaStep(stepIndex){
  if(stepIndex === 0){
    // create the alpha particle by cloning two protons and two neutrons
    const nucleons = nucleusGroup.userData.protons.concat(nucleusGroup.userData.neutrons);
    // pick 4 nucleons (simpler approach: take first two protons and first two neutrons if present)
    const taken = [];
    const protons = nucleusGroup.userData.protons; const neutrons = nucleusGroup.userData.neutrons;
    if(protons.length >= 2 && neutrons.length >= 2){
      const pieces = protons.slice(0,2).concat(neutrons.slice(0,2));
      // remove from nucleus visually
      pieces.forEach(p => nucleusGroup.remove(p));
      // create alpha visual
      const alpha = new THREE.Group();
      pieces.forEach((orig,i)=>{
        const copy = orig.clone(); copy.position.copy(orig.position);
        alpha.add(copy);
      });
      alpha.position.copy(nucleusGroup.position);
      projectorGroup.add(alpha);
      const worldTarget = new THREE.Vector3(0,1.6, -1.6); // ejection outwards
      // animate outward
      animateObject(alpha, {position: alpha.position.clone(), scale:1.0}, {position: worldTarget.clone(), scale: 1.0}, 1.6, ()=>{ /* done */ });
      // ionization: knock off an electron from nearby atoms as alpha passes
      setTimeout(()=>{
        // remove an electron from a nearby atom if present
        if(nearbyAtoms.length>0){
          const a = nearbyAtoms[0]; if(a.electrons.length>0){ const e = a.electrons.pop(); a.group.remove(e); }
        }
      }, 900 / projectorState.speed);
    }
  }
}

// Beta decay animation: neutron -> proton and electron emission
function runBetaAnimation(){ runBetaStep(0); }
function runBetaStep(stepIndex){
  if(stepIndex === 0){
    // find a neutron to convert
    if(nucleusGroup.userData.neutrons.length > 0){
      const n = nucleusGroup.userData.neutrons.shift(); nucleusGroup.remove(n);
      // create a new proton sphere and animate it spot-creation
      const newProton = new THREE.Mesh(new THREE.SphereGeometry(0.06,12,8), new THREE.MeshStandardMaterial({ color:0xff4444 }));
      newProton.position.copy(n.position); nucleusGroup.userData.protons.push(newProton); nucleusGroup.add(newProton);
      // create an electron emitted
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.02,8,6), new THREE.MeshBasicMaterial({ color:0x99ddff }));
      e.position.copy(n.position); projectorGroup.add(e);
      // animate electron ejection in a random direction and curve if magnetic field present
      const direction = new THREE.Vector3((Math.random()-0.5), (Math.random()-0.2), (Math.random()-0.5)).normalize();
      const target = e.position.clone().add(direction.multiplyScalar(1.5));
      animateObject(e, {position: e.position.clone(), scale:0.2}, {position: target, scale:0.2}, 1.1, ()=>{ projectorGroup.remove(e); });
      // Ionize a nearby atom's electron probabilistically
      setTimeout(()=>{
        if(nearbyAtoms.length>0){
          const idx = Math.floor(Math.random()*nearbyAtoms.length); const atom=nearbyAtoms[idx];
          if(atom.electrons.length>0){ const ee = atom.electrons.pop(); atom.group.remove(ee); }
        }
      }, 400 / projectorState.speed);
    }
  }
}

// Gamma decay: nucleus emits a photon and becomes less excited
function runGammaAnimation(){ runGammaStep(0); }
function runGammaStep(stepIndex){
  if(stepIndex === 0){
    // brief flash wave outward
    const photon = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.16, 32), new THREE.MeshBasicMaterial({ color:0x66ccff, side:THREE.DoubleSide, transparent:true, opacity:0.8 }));
    photon.position.copy(nucleusGroup.position); photon.rotation.x = -Math.PI/2.3; photon.scale.setScalar(0.2);
    projectorGroup.add(photon);
    animateObject(photon, {position: photon.position.clone(), scale:0.2}, {position: photon.position.clone(), scale: 3.0}, 0.8, ()=>{ projectorGroup.remove(photon); });
    // possible small ionization
    setTimeout(()=>{
      if(nearbyAtoms.length>0){ const a = nearbyAtoms[Math.floor(Math.random()*nearbyAtoms.length)]; if(a.electrons.length>0){ const ee = a.electrons.pop(); a.group.remove(ee); } }
    }, 350 / projectorState.speed);
  }
}


// UI references
const sourceTypeEl = document.getElementById('sourceType');
const energyEl = document.getElementById('energy');
const intensityEl = document.getElementById('intensity');
const mediumEl = document.getElementById('medium');
const toggleCloudBtn = document.getElementById('toggleCloud');
const magFieldEl = document.getElementById('magField');
const toggleProjectorEl = document.getElementById('toggleProjector');
const projectorControlsEl = document.getElementById('projectorControls');
const decayTypeEl = document.getElementById('decayType');
const decaySpeedEl = document.getElementById('decaySpeed');
const playDecayBtn = document.getElementById('playDecay');
const pauseDecayBtn = document.getElementById('pauseDecay');
const stepDecayBtn = document.getElementById('stepDecay');
const resetDecayBtn = document.getElementById('resetDecay');
const resetDoseBtn = document.getElementById('resetDose');
const countsEl = document.getElementById('counts');
const doseRateEl = document.getElementById('doserate');
const accumEl = document.getElementById('accum');

// Basic simulation parameters
let sim = {
  type: 'alpha',
  energy: 5,
  intensity: 8,
  medium: 'air',
  cloud: false
};
let magFieldStrength = Number(magFieldEl?.value || 1.0);

sourceTypeEl.addEventListener('change', e => sim.type = e.target.value);
energyEl.addEventListener('input', e => sim.energy = Number(e.target.value));
intensityEl.addEventListener('input', e => sim.intensity = Number(e.target.value));
mediumEl.addEventListener('change', e => sim.medium = e.target.value);
toggleCloudBtn.addEventListener('click', ()=> sim.cloud = !sim.cloud);
magFieldEl?.addEventListener('input', (e)=> magFieldStrength = Number(e.target.value));
toggleProjectorEl?.addEventListener('change', (e)=>{
  if(e.target.checked){ projectorControlsEl.style.display = 'block'; projectorGroup.visible = true; }
  else { projectorControlsEl.style.display = 'none'; projectorGroup.visible = false; }
});

decayTypeEl?.addEventListener('change', (e)=> { projectorState.type = e.target.value; });
decaySpeedEl?.addEventListener('input', (e)=> { projectorState.speed = Number(e.target.value); });
playDecayBtn?.addEventListener('click', ()=> startDecayAnimation(projectorState.type));
pauseDecayBtn?.addEventListener('click', ()=> pauseDecayAnimation());
stepDecayBtn?.addEventListener('click', ()=> stepDecay());
resetDecayBtn?.addEventListener('click', ()=> resetProjector());
resetDoseBtn.addEventListener('click', ()=> {counts = 0; accumDose = 0;});

// Simple Geiger audio (WebAudio click)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function geigerClick(){
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = 1200;
  g.gain.value = 0.03;
  o.connect(g); g.connect(audioCtx.destination);
  o.start();
  setTimeout(()=>{ o.stop(); }, 60);
}

// Particle pools
const particles = [];
// For cloud chamber trails we'll keep a separate trail structure

function emitParticle(){
  const dir = new THREE.Vector3(1, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2).normalize();
  const p = {
    pos: source.position.clone(),
    vel: dir.multiplyScalar(0.05 + sim.energy*0.02*(sim.type==='alpha'?0.2: sim.type==='beta'?0.6:1.0)),
    life: sim.type==='alpha'? 40 + sim.energy*6 : sim.type==='beta'? 100 + sim.energy*10 : 220,
    type: sim.type,
    intensity: sim.intensity
  };
  // visual object
  const isCloud = sim.cloud;
  if(sim.type==='gamma'){
    // gamma: visualize as thin line
    const mat = new THREE.LineBasicMaterial({ color: 0x66ccff, linewidth: 1, transparent:true, opacity:0.9 });
    const points = [p.pos.clone(), p.pos.clone().add(p.vel.clone().multiplyScalar(200))];
    const g = new THREE.BufferGeometry().setFromPoints(points);
    p.mesh = new THREE.Line(g, mat);
    if(isCloud) p.trail = null; // gamma won't have continuous trail, only secondary electrons
  } else {
    const color = sim.type==='alpha'?0xff6600:0x99ff99;
    if(isCloud){
      // create a curved line trail for cloud chamber
      const pts = [];
      for(let j=0;j<24;j++) pts.push(p.pos.clone());
      const trailGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const trailMat = new THREE.LineBasicMaterial({ color, linewidth: sim.type==='alpha'?4:2, transparent:true, opacity:0.85 });
      p.trail = new THREE.Line(trailGeo, trailMat);
      scene.add(p.trail);
      // also create a head for the visible condensation
      const geo = new THREE.SphereGeometry(sim.type==='alpha'?0.06:0.03,8,6);
      const mat = new THREE.MeshBasicMaterial({color});
      p.mesh = new THREE.Mesh(geo, mat);
    } else {
      const geo = new THREE.SphereGeometry(sim.type==='alpha'?0.06:0.03,8,6);
      const mat = new THREE.MeshBasicMaterial({color});
      p.mesh = new THREE.Mesh(geo, mat);
    }
  }
  scene.add(p.mesh);
  particles.push(p);
}

// Simple attenuation: for gamma, reduce intensity by shield coeff; for alpha/beta, stop earlier
function applyShielding(p, fromPos, toPos){
  // Raycast between fromPos and toPos to check shields intersected
  const ray = new THREE.Raycaster(fromPos, toPos.clone().sub(fromPos).normalize(), 0, fromPos.distanceTo(toPos));
  const intersects = ray.intersectObjects(shields);
  let remaining = p.intensity;
  intersects.forEach(i => {
    const coeff = i.object.userData.coeff || 1;
    // simple exponential attenuation approximation for gamma
    if(p.type==='gamma') remaining *= Math.exp(- (1/coeff) );
    else {
      // alpha/beta: higher coeff stops them
      remaining -= coeff * 0.8;
    }
  });
  return Math.max(0, remaining);
}

// Geiger detection region
const detectorBox = new THREE.Box3().setFromObject(detector);

let counts = 0;
let accumDose = 0;
let lastDoseUpdate = performance.now();

function updateParticles(){
  // emit based on intensity
  if(Math.random() < sim.intensity * 0.02) emitParticle();

  for(let i = particles.length -1; i>=0; i--){
    const p = particles[i];
    // movement with cloud chamber magnetic deflection for betas
    if(sim.cloud && p.type === 'beta'){
      // simplest Lorentz-style curvature: v = v + a_perp dt, a_perp = q/m (v x B). We'll fake signs and values.
      const B = new THREE.Vector3(0, magFieldStrength * 0.002, 0); // vertical field for nice curvature
      const v = p.vel.clone();
      const a = new THREE.Vector3().crossVectors(v, B).multiplyScalar(0.01 * (sim.energy / 5));
      p.vel.add(a);
    }
    p.pos.add(p.vel);
    // medium attenuation: water reduces more, vacuum none
    if(sim.medium === 'water') p.life -= 2;
    if(sim.medium === 'air') p.life -= 1;
    if(sim.medium === 'vacuum') p.life -= 0.3;

    // shielding between previous and new pos
    const prev = p.mesh.position ? p.mesh.position.clone() : p.pos.clone().sub(p.vel);
    const remaining = applyShielding(p, prev, p.pos);
    // for gamma, adjust mesh visibility length
    if(p.type==='gamma'){
      const pts = [p.pos.clone(), p.pos.clone().add(p.vel.clone().multiplyScalar(100))];
      p.mesh.geometry.setFromPoints(pts);
      p.mesh.material.opacity = Math.min(1, remaining / sim.intensity + 0.05);
      if(remaining < 0.05) p.life = 0;
    } else {
      p.mesh.position.copy(p.pos);
      if(sim.cloud){
        // update trail (line) points: shift points left and append current pos
        if(p.trail){
          const positions = p.trail.geometry.attributes.position.array;
          // positions is flattened array of vec3s, length 3*count
          // shift points: from end to start
          for(let ii=0; ii<positions.length-3; ii+=3){
            positions[ii] = positions[ii+3]; positions[ii+1] = positions[ii+4]; positions[ii+2] = positions[ii+5];
          }
          const l = positions.length; positions[l-3] = p.pos.x; positions[l-2] = p.pos.y; positions[l-1] = p.pos.z;
          p.trail.geometry.attributes.position.needsUpdate = true;
        }
      }
      if(remaining <= 0) p.life = 0;
    }

    // detect intersection with detector box
    if(p.type !== 'gamma'){
      if(detectorBox.containsPoint(p.pos)){
        // detection probability depends on remaining intensity and type
        const prob = Math.min(1, (remaining/ sim.intensity) * (p.type==='alpha'?0.3:0.6));
        if(Math.random() < prob){
          counts += 1; geigerClick();
          // dose increment simplified
          accumDose += (p.type==='alpha'?0.002: p.type==='beta'?0.005: 0.02) * (p.intensity/10);
        }
        p.life = 0;
      }
    } else {
      // gamma: do a ray intersection with detector box
      const ray = new THREE.Raycaster(p.pos, p.vel.clone().normalize(), 0, 1.5);
      const ints = ray.intersectObject(detector);
      if(ints.length > 0){
        const prob = Math.min(1, (remaining / sim.intensity) * 0.9);
        if(Math.random() < prob){ counts++; geigerClick(); accumDose += 0.02 * (p.intensity/10); }
      }
    }

    // Cloud chamber: gamma occasionally produces secondary electron which becomes a track
    if(sim.cloud && p.type === 'gamma'){
      // small chance to create a secondary electron track when gamma passes through gas
      if(Math.random() < 0.005 * (sim.energy / 5)){
        const e = {
          pos: p.pos.clone(),
          vel: p.vel.clone().multiplyScalar(0.18).add(new THREE.Vector3((Math.random()-0.5)*0.08, (Math.random()-0.5)*0.08, (Math.random()-0.5)*0.08)),
          life: 150,
          type: 'beta',
          intensity: 2,
          trail: null,
          mesh: null
        };
        // create a cloud trail for this secondary electron
        const pts = [];
        for(let j=0;j<24;j++) pts.push(e.pos.clone());
        const trailGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const trailMat = new THREE.LineBasicMaterial({ color: 0x99ff99, linewidth: 1.8, transparent: true, opacity: 0.9 });
        e.trail = new THREE.Line(trailGeo, trailMat);
        scene.add(e.trail);
        const geo = new THREE.SphereGeometry(0.02,6,5);
        const mat = new THREE.MeshBasicMaterial({ color: 0x99ff99 });
        e.mesh = new THREE.Mesh(geo, mat);
        scene.add(e.mesh);
        particles.push(e);
      }
    }

    p.life -= 1;
    if(p.life <= 0){
      scene.remove(p.mesh);
      if(p.trail) scene.remove(p.trail);
      particles.splice(i,1);
    }
  }
}

// Basic render loop
function animate(){
  requestAnimationFrame(animate);
  updateParticles();
  // update projector animations
  updateProjectorAnimations();
  // update HUD
  countsEl.textContent = counts;
  const now = performance.now();
  // approximate dose rate µSv/h from accumulated over short window
  const dt = (now - lastDoseUpdate)/1000; // s
  // convert accumDose (unitless) to µSv roughly
  const doseRate = (accumDose / Math.max(0.001, dt)) * 3600; // µSv/h approx
  doseRateEl.textContent = doseRate.toFixed(2);
  accumEl.textContent = accumDose.toFixed(3);
  lastDoseUpdate = now;

  renderer.render(scene, camera);
}
animate();

// Basic interaction: click to move the source to click point
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (ev)=>{
  mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(floor);
  if(hits.length>0){
    source.position.copy(hits[0].point).add(new THREE.Vector3(0,1.0,0));
  }
});

// Simple drag for shields: pick on pointerdown, move along plane
let dragging = null;
renderer.domElement.addEventListener('pointerdown', (ev)=>{
  mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(shields);
  if(intersects.length>0){ dragging = intersects[0].object; controls.enabled = false; }
});
window.addEventListener('pointermove', (ev)=>{
  if(!dragging) return;
  mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(floor);
  if(hits.length>0){ dragging.position.x = hits[0].point.x; dragging.position.z = hits[0].point.z + 1.1; }
});
window.addEventListener('pointerup', ()=>{ dragging = null; controls.enabled = true; });

// mark first todo completed
// (The manage_todo_list tool tracks progress separately.)
// debug: expose some functions for console usage
window.radlab = { startDecayAnimation, pauseDecayAnimation, resetProjector, createNucleus };
