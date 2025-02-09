import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';
// import { RGBELoader } from 'jsm/loaders/RGBELoader.js';
import {GUI} from 'jsm/libs/lil-gui.module.min.js'
import { EffectComposer } from 'jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'jsm/postprocessing/RenderPass.js';
// import { OutlinePass } from 'jsm/postprocessing/OutlinePass.js';
// import { OutputPass } from 'jsm/postprocessing/OutputPass.js';


const model = 'assets/valley-7.glb'
// const hdr = 'assets/royal_esplanade_1k.hdr'

// Scene, Camera, Renderer
// //setup scene
const scene = new THREE.Scene();
// scene.fog = new THREE.Fog( 0xFECDAC, 500, 640 );

//renderer
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ 
	antialias: true,
	stencil: true  // Add this line
});
renderer.setSize(w, h);
renderer.setClearColor(0xffffff);
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
        // const outlineMeshes = [];  // Array to collect meshes

		// const scale = 10;
		// model.scale.set(scale, scale, scale)

        //toon shader
        // model.traverse((child) => {
        //     if (child.isMesh) {
        //         child.material = new THREE.MeshToonMaterial({
        //             color: 0xffffff,
        //             gradientMap: null // You can load a gradient map for better toon shading
        //         });
        //         // outlineMeshes.push(child);  // Collect mesh
        //     }
        // });

        const toonShader = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                void main() {
                    float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0));
                    float levels = 4.0;
                    float quantized = floor(intensity * levels) / levels;
                    vec3 toonColor = vec3(quantized); // Greyscale effect
                    gl_FragColor = vec4(toonColor, 1.0);
                }
            `
        });

        model.traverse((child) => {
            if (child.isMesh) {
                child.material = toonShader;
            }
        });
    
        scene.add(model);
        // outlinePass.selectedObjects = [model];


		// create text label
		// Define label positions relative to the model
		// const labels = [
		// 	{ text: "Label 1", position: new THREE.Vector3(0, 1, 0) },
		// 	{ text: "Label 2", position: new THREE.Vector3(2.1, 1, 2.1) },
		// 	{ text: "Label 3", position: new THREE.Vector3(1, 1, 1) },
		// ];

		// labels.forEach(labelInfo => {
		// 	const label = createTextLabel(labelInfo.text);
		// 	label.position.copy(labelInfo.position);

		// 	model.add(label); // Attach label to model

		// 	//raycast to get y 
		// 	const x = label.position.x;
		// 	const z = label.position.z;
		// 	const y = getYFromXZ(x, z, model);
		// 	console.log(`Height at (${x}, ${z}) is: ${y}`);

		// 	// Create vertical line connecting model to label
		// 	const line = createConnectingLine(new THREE.Vector3(label.position.x, label.position.y - 0.1, label.position.z), new THREE.Vector3(x, y, z));
		// 	model.add(line); // Attach line to model
		// });

		

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



const gui = new GUI();
const params = { exposure: 1 };

gui.add(params, 'exposure', 0, 3, 0.1).onChange((value) => {
    renderer.toneMappingExposure = value;
});


// lighting
// const hemiLight = new THREE.HemisphereLight(0xffffff, 0xaa5500,0.5);
// scene.add(hemiLight)

//Create a DirectionalLight and turn on shadows for the light
// ✅ Lights (Directional + Ambient for soft shadows)
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// const ambientLight = new THREE.AmbientLight(0xffffff);
// scene.add(ambientLight);



function animate(){
    requestAnimationFrame(animate);

    // composer.render();

    renderer.render(scene, camera);
    controls.update();
}


animate();

