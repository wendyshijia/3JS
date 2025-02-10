import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';
// import { RGBELoader } from 'jsm/loaders/RGBELoader.js';
import {GUI} from 'jsm/libs/lil-gui.module.min.js'
import { EffectComposer } from 'jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'jsm/postprocessing/RenderPass.js';


const model = 'assets/red crater-threeJS-2.glb'

// const BGcolor = 0xFECDAC
const BGcolor = 0xFEE7C2
const BGcolor2 = 0x273117

// Scene, Camera, Renderer
// //setup scene
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(BGcolor , 10, 125 );


//renderer
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ 
	antialias: true,
    alpha: true
});
renderer.setSize(w, h);
// renderer.setClearColor(BGcolor);
renderer.toneMappingExposure = 30;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement); 

//setup camera
const fov = 28;
const aspect = w / h;
const near = 1;
const far = 900;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
camera.position.set (70,6,-4);

// const lookAtTarget = new THREE.Vector3(10,100,0);
// camera.lookAt(lookAtTarget);


const loader = new GLTFLoader();
loader.load(
	// resource URL
	model,
	function ( gltf ) {
		const model = gltf.scene;

		// const scale = 10;
		// model.scale.set(scale, scale, scale)

        scene.add(model);

		// create text label
        const labelY = 6
		const labels = [
			{ text: "Half Dome", position: new THREE.Vector3(-19.7, labelY, -2.8) },
			// { text: "5,5", position: new THREE.Vector3(1, labelY, 1) },
			// { text: "-5,-5", position: new THREE.Vector3(-5, labelY, -5) },
            { text: "El Capitan", position: new THREE.Vector3(14.1, labelY, 1.4) },
            { text: "Glacier Point", position: new THREE.Vector3(-5.1, labelY, -5.2) },
            { text: "Yosemite Falls", position: new THREE.Vector3(-0.8, labelY, 7.4) },
		];

		setTimeout(() => {
            labels.forEach(labelInfo => {
                const label = createTextLabel(labelInfo.text);
                label.position.copy(labelInfo.position);
        
                model.add(label); // Attach label to model
        
                const x = label.position.x;
                const z = label.position.z;
                const y = getYFromXZ(x, z, model);
                console.log(`Height at (${x}, ${z}) is: ${y}`);
        
                const line = createConnectingLine(new THREE.Vector3(label.position.x, label.position.y - 0.3, label.position.z), new THREE.Vector3(x, y || 0, z));
                line.computeLineDistances();  
                model.add(line);
            });
        }, 100); // Delay by 100ms

		

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
// Function to Create a Shader Material with Noise
function createNoiseMaterial(originalMaterial) {
    return new THREE.ShaderMaterial({
        uniforms: {
            baseTexture: { value: originalMaterial.map || null }, // Keep original texture
            time: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D baseTexture;
            uniform float time;
            varying vec2 vUv;

            // Random noise function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
            }

            void main() {
                vec3 baseColor = texture2D(baseTexture, vUv).rgb;

                // Generate animated noise
                float noise = random(vUv + time * 0.1) * 0.1; // Adjust intensity

                gl_FragColor = vec4(baseColor + noise, 1.0);
            }
        `,
        transparent: false
    });
}


// Create Text Label Function
function createTextLabel(text) {
    // Create a high-res canvas for better text clarity
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;  
    canvas.height = 512;

    // Background (Optional)
    // ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Text settings
    ctx.font = "bold 60px Helvetica";  
    ctx.fillStyle = "#FEE7C2ee";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;

    // Create material and sprite
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(5, 2.5, 1); // Adjust scale for readability

    // Billboard effect: Always face the camera
    sprite.onBeforeRender = function () {
        sprite.quaternion.copy(camera.quaternion);
    };

    return sprite;
}


// Function to create a vertical line between the model and the label
function createConnectingLine(startPos, endPos) {
    // const material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 10 });
    const material = new THREE.LineDashedMaterial({
        color: 0x000000,
        dashSize: 0.05, // Length of each dash
        gapSize: 0.05,  // Space between dashes
        linewidth: 1 // Optional (may not work in all environments)
      });
    const geometry = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
    // Required for dashed lines
      
    return new THREE.Line(geometry, material);
}

function getYFromXZ(x, z, model) {
    const raycaster = new THREE.Raycaster();
    const downDirection = new THREE.Vector3(0, -1, 0); // Ray goes downward
    // const origin = new THREE.Vector3(x, 10, z); // Start above the model
	const startY = 50; // Scale the ray's height
    const origin = new THREE.Vector3(x, startY, z);
	
    raycaster.set(origin, downDirection);

    // Get only Mesh objects, ignoring Sprites
    const meshes = [];
    model.traverse((child) => {
        if (child.isMesh) {
            
            child.castShadow = true;
            child.receiveShadow = true;
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

//Create a DirectionalLight and turn on shadows for the light
const dirLight = new THREE.DirectionalLight(0xffffff, 4);
dirLight.position.set(8, 7, 20);
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0xFECDAC, 1); // Slight red ambient
scene.add(ambientLight);

function animate(){
    requestAnimationFrame(animate);
    scene.traverse((obj) => {
        if (obj.isMesh && obj.material.isShaderMaterial) {
            obj.material.uniforms.time.value += 0.01; // Animate noise over time
        }
    });
    renderer.render(scene, camera);
    controls.update();
}

animate();


// const gui = new GUI();
// const params = { exposure: 1 };

// gui.add(params, 'exposure', 0, 3, 0.1).onChange((value) => {
//     renderer.toneMappingExposure = value;
// });
// const lightSettings = {
//     x: dirLight.position.x,
//     y: dirLight.position.y,
//     z: dirLight.position.z
// };

// gui.add(lightSettings, 'x', -50, 50, 0.1).onChange(value => dirLight.position.x = value);
// gui.add(lightSettings, 'y', -50, 50, 0.1).onChange(value => dirLight.position.y = value);
// gui.add(lightSettings, 'z', -50, 50, 0.1).onChange(value => dirLight.position.z = value);

window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Update camera
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Prevents excessive rendering load

    console.log(`Window resized: ${w}x${h}`);
});