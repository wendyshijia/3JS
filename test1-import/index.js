import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';
// import { RGBELoader } from 'jsm/loaders/RGBELoader.js';
import {GUI} from 'jsm/libs/lil-gui.module.min.js'

const model = 'assets/grid-8e.glb'
// const hdr = 'assets/royal_esplanade_1k.hdr'

const loader = new GLTFLoader();
// const env = new RGBELoader();

// 3 things: renderer, camera, scene
//renderer
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ 
	antialias: true
});
renderer.setSize(w, h);
renderer.setClearColor(0xFECDAC);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
document.body.appendChild(renderer.domElement); 

//setup camera
const fov = 40;
const aspect = w / h;
const near = 1;
const far = 900;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
// const camera = new THREE.OrthographicCamera(fov, aspect, near, far)
camera.position.set (60,90,60);

// //setup scene
const scene = new THREE.Scene();
scene.fog = new THREE.Fog( 0xFECDAC, 500, 640 );

// controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.update();


// //add light!
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xaa5500,0.5);
scene.add(hemiLight)
//Create a DirectionalLight and turn on shadows for the light
const light = new THREE.DirectionalLight( 0xffffff,  );
light.position.set( 1, 1, 1 ); //default; light shining from top
light.castShadow = true; // default false
scene.add( light );
// Set up shadow properties for the light
light.shadow.mapSize.width = 512; // default
light.shadow.mapSize.height = 512; // default
light.shadow.camera.near = 0.5; // default
light.shadow.camera.far = 500; // default

// env.load( hdr, function ( texture ) {

// 	texture.mapping = THREE.EquirectangularReflectionMapping;

// 	// scene.background = texture;
// 	scene.environment = texture;
// 	texture.dispose();
// })

loader.load(
	// resource URL
	model,
	// called when the resource is loaded
	function ( gltf ) {
		var modelgl = gltf.scene;

		modelgl.scale.set(20,20,20)

		console.log(modelgl);

		scene.add(modelgl);
	
	},
	// called while loading is progressing
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	// called when loading has errors
	function ( error ) {
		console.log( 'An error happened' );
	}
);


const gui = new GUI();
const params = { exposure: 1 };

gui.add(params, 'exposure', 0, 3, 0.1).onChange((value) => {
    renderer.toneMappingExposure = value;
});


function animate(t = 0){
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
}

animate();

