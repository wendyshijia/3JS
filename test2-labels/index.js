import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';
// import { RGBELoader } from 'jsm/loaders/RGBELoader.js';
import {GUI} from 'jsm/libs/lil-gui.module.min.js'

const model = 'assets/grid-8d.glb'
// const hdr = 'assets/royal_esplanade_1k.hdr'

// Scene, Camera, Renderer
// //setup scene
const scene = new THREE.Scene();
// scene.fog = new THREE.Fog( 0xFECDAC, 500, 640 );

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
camera.position.set (40,40,40);



const loader = new GLTFLoader();
loader.load(
	// resource URL
	model,
	// called when the resource is loaded
	function ( gltf ) {
		const model = gltf.scene;
		const scale = 10;
		model.scale.set(scale, scale, scale)
		scene.add(model);

		// create text label
		
		// Define label positions relative to the model
		const labels = [
			{ text: "Label 1", position: new THREE.Vector3(0, 1, 0) },
			{ text: "Label 2", position: new THREE.Vector3(2.1, 1, 2.1) },
			{ text: "Label 3", position: new THREE.Vector3(1, 1, 1) },
		];

		labels.forEach(labelInfo => {
			const label = createTextLabel(labelInfo.text);
			label.position.copy(labelInfo.position);
			// label.position.set(
			// 	labelInfo.position.x * model.scale.x,
			// 	labelInfo.position.y * model.scale.y,
			// 	labelInfo.position.z * model.scale.z
			// );

			model.add(label); // Attach label to model

			//raycast to get y 
			const x = label.position.x;
			const z = label.position.z;
			const y = getYFromXZ(x, z, model);
			console.log(`Height at (${x}, ${z}) is: ${y}`);

			// Create vertical line connecting model to label
			const line = createConnectingLine(new THREE.Vector3(label.position.x, label.position.y - 0.1, label.position.z), new THREE.Vector3(x, y, z));
			model.add(line); // Attach line to model
		});

		

	},
	// called while loading is progressing
	function ( xhr ) {
		// console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	// called when loading has errors
	function ( error ) {
		console.log( 'An error happened' );
	}
);

// const bbox = new THREE.Box3().setFromObject(model);
// console.log("Bounding Box Min:", bbox.min);
// console.log("Bounding Box Max:", bbox.max);
// const bboxHelper = new THREE.Box3Helper(bbox, 0xff0000); // Red bounding box
// scene.add(bboxHelper);
// const env = new RGBELoader();
// env.load( hdr, function ( texture ) {
// 	texture.mapping = THREE.EquirectangularReflectionMapping;
// 	// scene.background = texture;
// 	scene.environment = texture;
// 	texture.dispose();
// })


// Create Text Label Function
function createTextLabel(text) {
    const fontSize = 16;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });

    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 1, 1); // Adjust scale
    sprite.position.set(10, 2, 10); // Position label above the model

    return sprite;
}

// Function to create a vertical line between the model and the label
function createConnectingLine(startPos, endPos) {
    const material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const geometry = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
    return new THREE.Line(geometry, material);
}

function getYFromXZ(x, z, model) {
    const raycaster = new THREE.Raycaster();
    const downDirection = new THREE.Vector3(0, -1, 0); // Ray goes downward
    // const origin = new THREE.Vector3(x, 10, z); // Start above the model
	const startY = 1 * model.scale.y; // Scale the ray's height
    const origin = new THREE.Vector3(x, startY, z);
	
    raycaster.set(origin, downDirection);

    // Get only Mesh objects, ignoring Sprites
    const meshes = [];
    model.traverse((child) => {
        if (child.isMesh) {
            meshes.push(child);
        }
    });
	

	if (meshes.length === 0) {
        console.warn("No meshes found in the model!");
        return null;
    }
   
    // Perform raycasting only on mesh objects
    const intersects = raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
        return intersects[0].point.y; // Return the Y value of the first hit
    } else {
        console.warn("No intersection found for (X, Z):", x, z);
        return null; // No intersection means the point is outside the model
    }
}

// controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.update();


// lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xaa5500,0.5);
scene.add(hemiLight)

//Create a DirectionalLight and turn on shadows for the light
const light = new THREE.DirectionalLight( 0xffffff,  );
light.position.set( 1, 1, 1 ); //default; light shining from top
light.castShadow = true; // default false
scene.add( light );

// Set up shadow properties for the light
// light.shadow.mapSize.width = 512; // default
// light.shadow.mapSize.height = 512; // default
// light.shadow.camera.near = 0.5; // default
// light.shadow.camera.far = 500; // default



const gui = new GUI();
const params = { exposure: 1 };

gui.add(params, 'exposure', 0, 3, 0.1).onChange((value) => {
    renderer.toneMappingExposure = value;
});


function animate(t = 0){
    requestAnimationFrame(animate);
	// Make sure labels always face the camera
    // scene.traverse((object) => {
    //     if (object.isSprite) {
    //         object.quaternion.copy(camera.quaternion);
    //     }
    // });

    renderer.render(scene, camera);
    controls.update();
}

animate();

