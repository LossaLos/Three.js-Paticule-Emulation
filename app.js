import * as THREE from 'https://cdn.skypack.dev/three@0.130.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.130.1/examples/jsm/controls/OrbitControls.js';
import dat from 'https://cdn.skypack.dev/dat.gui';

/*---------------------------------------------------INIT VAR---------------------------------------------------*/

let scene, camera, renderer, stars, controls, clock;
let rotationSpeed = { x: 0.0005, y: 0.0005 };
let starColor = { color: 0xffffff };
let NbofStar = { nb: 10000 };

let xx = { x: 300 };
let yy = { y: 300 };
let zz = { z: 200 };
let ssize = { size: 0.7 };

let CenterSzie = { size: 150 };
let bz = { z: 200 };

let vradius = { radius: 2 };
let SpirEffect = { power: 0.1 };
let Angle = { thiht: 0.3 };

let Amplitude = { Ampl: 20 };
let Frequency = { Freq: 0.05 };

let currentPattern = 'StarsSea';
let gui = new dat.GUI();

const parameters = {
  count: 30000,
  size: 200,
  radius: 15,
  branches: 3,
  spin: 1.5,
  randomness: 0.13,
  randomnessPower: 7.5,
  insideColor: '#b5f28d',
  outsideColor: '#1b3984',
  
};

let geometry = null;
let particles = null;
let material = null;

const vertexShader = `
uniform float uTime;
attribute float aScale;
attribute vec3 aRandomness;
varying vec3 vColor;
void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  modelPosition.xyz += aRandomness;
  float angle = uTime * 0.5;
  modelPosition.x = cos(angle) * modelPosition.x - sin(angle) * modelPosition.z;
  modelPosition.z = sin(angle) * modelPosition.x + cos(angle) * modelPosition.z;
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;
  gl_Position = projectedPosition;
  gl_PointSize = aScale * (300.0 / - viewPosition.z);
  vColor = color;
}`;

const fragmentShader = `
uniform float uStrengthPower;
varying vec3 vColor;
void main() {
  float strength = distance(gl_PointCoord, vec2(0.5));
  strength = 1.0 - strength;
  strength = pow(strength, uStrengthPower);
  vec3 color = mix(vec3(0.0), vColor, strength);
  gl_FragColor = vec4(color, 1.0);
}`;

const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('/textures/particles/8.png');

/*---------------------------------------------------INIT AND LAUNCH---------------------------------------------------*/

function init() 
{
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 400;
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  clock = new THREE.Clock();
  createStars();
  updateGUI(currentPattern);
  animate();
}

/*---------------------------------------------------GUI---------------------------------------------------*/

function updateGUI(pattern) 
{
  gui.destroy();
  gui = new dat.GUI();

  const patterns = {
    StarsSea: () => { currentPattern = 'StarsSea'; createStars(); updateGUI(currentPattern); },
    CenterAttract: () => { currentPattern = 'CenterAttract'; createStarsBlckHole(); updateGUI(currentPattern); },
    SpiralPattern: () => { currentPattern = 'SpiralPattern'; createVortexStars(); updateGUI(currentPattern); },
    WavePattern: () => { currentPattern = 'WavePattern'; createWavePattern(); updateGUI(currentPattern); },
    GalaxyPattern: () => { currentPattern = 'GalaxyPattern'; generateGalaxy(); updateGUI(currentPattern); },
  };

  gui.add(patterns, 'StarsSea').name('Basic Pattern');
  gui.add(patterns, 'CenterAttract').name('Center Pattern');
  gui.add(patterns, 'SpiralPattern').name('Spiral Pattern');
  gui.add(patterns, 'WavePattern').name('Wave Pattern');
  gui.add(patterns, 'GalaxyPattern').name('Galaxy Pattern');

  gui.add(NbofStar, 'nb', 100, 400000).name('Number of stars').onChange(() => {
    if (pattern === 'StarsSea') createStars();
    if (pattern === 'CenterAttract') createStarsBlckHole();
    if (pattern === 'SpiralPattern') createVortexStars();
    if (pattern === 'WavePattern') createWavePattern();
    if (pattern === 'GalaxyPattern') generateGalaxy();
  });
  gui.add(ssize, 'size', 0.2, 5).name('Size of stars').onChange(() => { stars.material.size = ssize.size; });
  gui.add(rotationSpeed, 'x', 0, 0.01).name('Rotation Speed X');
  gui.add(rotationSpeed, 'y', 0, 0.01).name('Rotation Speed Y');
  gui.addColor(starColor, 'color').name('Star Color').onChange((value) => { stars.material.color.set(value); });
  gui.add({ randomize: randomizeColors }, 'randomize').name('Randomize Colors');

  if (pattern === 'StarsSea') 
  {
    gui.add({ regenerate: createStars }, 'regenerate').name('Basic Pattern');
    gui.add(xx, 'x', 10, 4000).name('Change X').onChange(createStars);
    gui.add(yy, 'y', 10, 4000).name('Change Y').onChange(createStars);
    gui.add(zz, 'z', 10, 4000).name('Change Z').onChange(createStars);
  } 
  else if (pattern === 'CenterAttract') 
  {
    gui.add({ regenerate: createStarsBlckHole }, 'regenerate').name('Center Pattern');
    gui.add(bz, 'z', 10, 1200).name('Change Z').onChange(createStarsBlckHole);
    gui.add(CenterSzie, 'size', 10, 700).name('Change Size').onChange(createStarsBlckHole);
  } 
  else if (pattern === 'SpiralPattern') 
  {
    gui.add({ regenerate: createVortexStars }, 'regenerate').name('Spiral Pattern');
    gui.add(vradius, 'radius', 0.5, 5).name('Radius').onChange(createVortexStars);
    gui.add(SpirEffect, 'power', 0.05, 1).name('Spiral Effect').onChange(createVortexStars);
    gui.add(Angle, 'thiht', 0.1, 5).name('Spiral Tightness').onChange(createVortexStars);
  } 
  else if (pattern === 'WavePattern') 
  {
    gui.add({ regenerate: createWavePattern }, 'regenerate').name('Wave Pattern');
    gui.add(xx, 'x', 10, 4000).name('Change X').onChange(createWavePattern);
    gui.add(zz, 'z', 10, 4000).name('Change Z').onChange(createWavePattern);  
    gui.add(Frequency, 'Freq', 0.01, 0.2).name('Frequency').onChange(createWavePattern);
    gui.add(Amplitude, 'Ampl', 5, 100).name('Amplitude').onChange(createWavePattern);
  } 
  else if (pattern === 'GalaxyPattern')
  {
    gui.add(material.uniforms.uStrengthPower, 'value', 7, 100 ).name('Shader Power');
    gui.add(parameters, 'count', 100, 100000).onChange(generateGalaxy).name('Particle Count');
    gui.add(parameters, 'size', 1, 100 ).onChange(generateGalaxy).name('Size');
    gui.add(parameters, 'radius',  6, 60).onChange(generateGalaxy).name('Radius');
    gui.add(parameters, 'branches',  2, 20 ).onChange(generateGalaxy).name('Arm Count');
    gui.add(parameters, 'spin',  -5,  5 ).onChange(generateGalaxy).name('Spin');
    gui.add(parameters, 'randomnessPower',  1, 20 ).onChange(generateGalaxy).name('Randomness');
    gui.addColor(parameters, 'insideColor').onChange(generateGalaxy).name('Wave Pattern');
    gui.addColor(parameters, 'outsideColor').onChange(generateGalaxy).name('Wave Pattern');
  }
}

/*---------------------------------------------------BASIC PATERN---------------------------------------------------*/

function createStars() 
{
  if (particles !== null)
  {
    geometry.dispose();
    material.dispose();
    scene.remove(particles);
  }
  if (stars)
    scene.remove(stars);

  camera.position.z = 400;
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({ size: ssize.size, vertexColors: false });

  const starVertices = [];
  const colors = [];
  for (let i = 0; i < NbofStar.nb; i++)
  {
    const x = (Math.random() - 0.5) * xx.x;
    const y = (Math.random() - 0.5) * yy.y;
    const z = (Math.random() - 0.5) * zz.z;
    starVertices.push(x, y, z);

    colors.push(Math.random(), Math.random(), Math.random());
  }

  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

/*---------------------------------------------------CENTER PATERN---------------------------------------------------*/

function createStarsBlckHole()
{
  if (particles !== null)
  {
    geometry.dispose();
    material.dispose();
    scene.remove(particles);
  }
  if (stars)
    scene.remove(stars);

  camera.position.z = 400;
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({ size: ssize.size, vertexColors: false });

  const starVertices = [];
  const colors = [];
  for (let i = 0; i < NbofStar.nb; i++)
  {
    const angle = i * 0.1;
    const radius = Math.random() * CenterSzie.size;
    const distance = Math.pow(Math.random(), 0.5) * radius;
    const x = Math.cos(angle + 2) * distance;
    const y = Math.sin(angle + 2) * distance;
    const z = (Math.random() - 0.5) * bz.z;
    starVertices.push(x, y, z);

    colors.push(Math.random(), Math.random(), Math.random());
  }

  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

/*---------------------------------------------------SPIRAL PATERN---------------------------------------------------*/

function createVortexStars() {
  if (particles !== null)
  {
    geometry.dispose();
    material.dispose();
    scene.remove(particles);
  }
  if (stars)
    scene.remove(stars);

  camera.position.z = 400;

  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({ size: ssize.size, vertexColors: false });

  const starVertices = [];
  const colors = [];
  for (let i = 0; i < NbofStar.nb; i++) 
  {
    const angle = i * Angle.thiht;
    const radius = Math.sqrt(i) * vradius.radius;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    const z = i * SpirEffect.power;
    starVertices.push(x, y, z);
    colors.push(Math.random(), Math.random(), Math.random());
  }

  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

/*---------------------------------------------------WAVE PATERN---------------------------------------------------*/

let waveObjects = [];
let initialPositions = [];

function createWavePattern() {
  if (particles !== null) {
    geometry.dispose();
    material.dispose();
    scene.remove(particles);
  }
  if (stars)
    scene.remove(stars);

  camera.position.z = 400;
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({ size: ssize.size, vertexColors: false });
  const starVertices = [];
  const colors = [];
  const amplitude = Amplitude.Ampl;
  const frequency = Frequency.Freq;

  waveObjects = [];
  initialPositions = [];

  for (let i = 0; i < NbofStar.nb; i++) {
    const x = (Math.random() - 0.5) * xx.x;
    const z = (Math.random() - 0.5) * zz.z;
    const y = Math.sin(x * frequency) * amplitude + (Math.random() - 0.5) * 20;
    starVertices.push(x, y, z);
    colors.push(Math.random(), Math.random(), Math.random());

    waveObjects.push({ x, z });
    initialPositions.push({ x, y, z });
  }

  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}


/*---------------------------------------------------GALAXY PATERN---------------------------------------------------*/
/*--------------------------------------------BASED ON BRUNO SIMON GALAXY--------------------------------------------*/

function generateGalaxy() 
{
  if (stars)
    scene.remove(stars);
  if (particles !== null) 
  {
    geometry.dispose();
    material.dispose();
    scene.remove(particles);
  }
  camera.position.z = 5;
  camera.position.y = 10;
  geometry = new THREE.BufferGeometry();

  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);

  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);
  const scales = new Float32Array(parameters.count);
  const randomness = new Float32Array(parameters.count * 3);

  for (let i = 0; i < parameters.count; i++) 
  {
    const i3 = i * 3;

    const radius = Math.random() * parameters.radius;
    const spinAngle = radius * parameters.spin;
    const branchAngle = ((i % parameters.branches) * Math.PI * 2) / parameters.branches;

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius;
    positions[i3 + 1] = 0;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius;

    const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? -1 : 1);
    const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? -1 : 1);
    const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? -1 : 1);

    randomness[i3] = randomX;
    randomness[i3 + 1] = randomY;
    randomness[i3 + 2] = randomZ;

    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);

    colors[i3 + 0] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;

    scales[i] = Math.random();
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 3));

  material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: parameters.size * renderer.getPixelRatio() },
      uStrengthPower: { value: 35.0 },
    },
  });
  particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

/*---------------------------------------------------COLOR RANDOMIZER---------------------------------------------------*/

function randomizeColors() {
  if (!stars) 
    return;
  const colors = [];
  for (let i = 0; i < NbofStar.nb; i++)
    colors.push(Math.random(), Math.random(), Math.random());
  const starGeometry = stars.geometry;
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  stars.material.vertexColors = true;
  stars.material.needsUpdate = true;
}

/*---------------------------------------------------ANIMATE---------------------------------------------------*/

function animate() 
{
  requestAnimationFrame(animate);

  if (currentPattern === 'WavePattern' && stars)
  {
    const positions = stars.geometry.attributes.position.array;
    const elapsed = clock.getElapsedTime();
    const waveHeight = Amplitude.Ampl;
    const waveWidth = Frequency.Freq * 300;
    const waveSpeed = 0.5;

    for (let i = 0; i < waveObjects.length; i++)
    {
      const index = i * 3;
      const { x, z } = waveObjects[i];
      positions[index + 1] = Math.sin((elapsed + (x / waveWidth) + (z / waveWidth)) * waveSpeed) * waveHeight;
    }
    stars.geometry.attributes.position.needsUpdate = true;
  }
  else if (particles)
  {
    particles.rotation.y += rotationSpeed.y;
  }
  else
  {
    stars.rotation.x += rotationSpeed.x;
    stars.rotation.y += rotationSpeed.y;
  }

  controls.update();
  renderer.render(scene, camera);
}


window.addEventListener('resize', () => {
  var width = window.innerWidth;
  var height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

init();
