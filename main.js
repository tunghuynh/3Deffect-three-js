import WindowManager from './WindowManager.js'



const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let spheres = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};
let particleSystems = [];
let glowMeshes = [];
let innerCores = [];

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTime ()
{
	return (new Date().getTime() - today) / 1000.0;
}


if (new URLSearchParams(window.location.search).get("clear"))
{
	localStorage.clear();
}
else
{	
	// this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the url
	document.addEventListener("visibilitychange", () => 
	{
		if (document.visibilityState != 'hidden' && !initialized)
		{
			init();
		}
	});

	window.onload = () => {
		if (document.visibilityState != 'hidden')
		{
			init();
		}
	};

	function init ()
	{
		initialized = true;

		// add a short timeout because window.offsetX reports wrong values before a short period 
		setTimeout(() => {
			setupScene();
			setupWindowManager();
			resize();
			updateWindowShape(false);
			render();
			window.addEventListener('resize', resize);
		}, 500)	
	}

	function setupScene ()
	{
		camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
		
		camera.position.z = 2.5;
		near = camera.position.z - .5;
		far = camera.position.z + 0.5;

		scene = new t.Scene();
		scene.background = new t.Color(0x0a0a0a); // Dark background for better energy effect visibility
		scene.add( camera );

		renderer = new t.WebGLRenderer({antialias: true, depthBuffer: true});
		renderer.setPixelRatio(pixR);
	    
	  	world = new t.Object3D();
		scene.add(world);

		renderer.domElement.setAttribute("id", "scene");
		document.body.appendChild( renderer.domElement );
	}

	function setupWindowManager ()
	{
		windowManager = new WindowManager();
		windowManager.setWinShapeChangeCallback(updateWindowShape);
		windowManager.setWinChangeCallback(windowsUpdated);

		// here you can add your custom metadata to each windows instance
		let metaData = {foo: "bar"};

		// this will init the windowmanager and add this window to the centralised pool of windows
		windowManager.init(metaData);

		// call update windows initially (it will later be called by the win change callback)
		windowsUpdated();
	}

	function windowsUpdated ()
	{
		updateNumberOfCubes();
	}

	function updateNumberOfCubes ()
	{
		let wins = windowManager.getWindows();

		// remove all spheres and effects
		spheres.forEach((s) => {
			world.remove(s);
		})
		particleSystems.forEach((p) => {
			world.remove(p);
		})
		glowMeshes.forEach((g) => {
			world.remove(g);
		})
		innerCores.forEach((i) => {
			world.remove(i);
		})

		spheres = [];
		particleSystems = [];
		glowMeshes = [];
		innerCores = [];

		// add new energy spheres based on the current window setup
		for (let i = 0; i < wins.length; i++)
		{
			let win = wins[i];

			let c = new t.Color();
			c.setHSL(i * .1, 1.0, .6);

			let radius = 50 + i * 25;
			
			// Create main sphere with energy core
			let sphereGeometry = new t.SphereGeometry(radius, 32, 32);
			let sphereMaterial = new t.MeshBasicMaterial({
				color: c,
				transparent: true,
				opacity: 0.4,
				wireframe: true
			});
			let sphere = new t.Mesh(sphereGeometry, sphereMaterial);
			sphere.position.x = win.shape.x + (win.shape.w * .5);
			sphere.position.y = win.shape.y + (win.shape.h * .5);

			// Create inner energy core
			let coreGeometry = new t.SphereGeometry(radius * 0.3, 16, 16);
			let coreMaterial = new t.MeshBasicMaterial({
				color: c,
				transparent: true,
				opacity: 1.0
			});
			let innerCore = new t.Mesh(coreGeometry, coreMaterial);
			innerCore.position.copy(sphere.position);

			// Create glow effect
			let glowGeometry = new t.SphereGeometry(radius * 1.5, 32, 32);
			let glowMaterial = new t.MeshBasicMaterial({
				color: c,
				transparent: true,
				opacity: 0.2,
				side: t.BackSide
			});
			let glowMesh = new t.Mesh(glowGeometry, glowMaterial);
			glowMesh.position.copy(sphere.position);

			// Create particle system for energy effect
			let particleCount = 500;
			let particles = new t.BufferGeometry();
			let positions = new Float32Array(particleCount * 3);
			let velocities = new Float32Array(particleCount * 3);
			
			for (let j = 0; j < particleCount; j++) {
				// Random position on sphere surface
				let theta = Math.random() * Math.PI * 2;
				let phi = Math.acos(2 * Math.random() - 1);
				let r = radius;
				
				positions[j * 3] = r * Math.sin(phi) * Math.cos(theta) + sphere.position.x;
				positions[j * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + sphere.position.y;
				positions[j * 3 + 2] = r * Math.cos(phi);
				
				// Outward velocity
				velocities[j * 3] = (positions[j * 3] - sphere.position.x) / r * 20;
				velocities[j * 3 + 1] = (positions[j * 3 + 1] - sphere.position.y) / r * 20;
				velocities[j * 3 + 2] = positions[j * 3 + 2] / r * 20;
			}
			
			particles.setAttribute('position', new t.BufferAttribute(positions, 3));
			particles.setAttribute('velocity', new t.BufferAttribute(velocities, 3));
			
			let particleMaterial = new t.PointsMaterial({
				color: c,
				size: 2,
				transparent: true,
				opacity: 0.6,
				blending: t.AdditiveBlending
			});
			
			let particleSystem = new t.Points(particles, particleMaterial);
			particleSystem.userData = { 
				originalPosition: sphere.position.clone(),
				radius: radius
			};

			world.add(innerCore);
			world.add(sphere);
			world.add(glowMesh);
			world.add(particleSystem);
			
			innerCores.push(innerCore);
			spheres.push(sphere);
			glowMeshes.push(glowMesh);
			particleSystems.push(particleSystem);
		}
	}

	function updateWindowShape (easing = true)
	{
		// storing the actual offset in a proxy that we update against in the render function
		sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};
		if (!easing) sceneOffset = sceneOffsetTarget;
	}


	function render ()
	{
		let t = getTime();

		windowManager.update();


		// calculate the new position based on the delta between current offset and new offset times a falloff value (to create the nice smoothing effect)
		let falloff = .05;
		sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
		sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);

		// set the world position to the offset
		world.position.x = sceneOffset.x;
		world.position.y = sceneOffset.y;

		let wins = windowManager.getWindows();


		// loop through all our spheres and update their positions and effects
		for (let i = 0; i < spheres.length; i++)
		{
			let sphere = spheres[i];
			let innerCore = innerCores[i];
			let glowMesh = glowMeshes[i];
			let particleSystem = particleSystems[i];
			let win = wins[i];
			let _t = t + i * .2;

			let posTarget = {x: win.shape.x + (win.shape.w * .5), y: win.shape.y + (win.shape.h * .5)}

			// Smooth position update
			sphere.position.x = sphere.position.x + (posTarget.x - sphere.position.x) * falloff;
			sphere.position.y = sphere.position.y + (posTarget.y - sphere.position.y) * falloff;
			
			// Update inner core position and animation
			innerCore.position.copy(sphere.position);
			let corePulse = Math.sin(_t * 4) * 0.3 + 1;
			innerCore.scale.set(corePulse, corePulse, corePulse);
			innerCore.rotation.x = _t * 2;
			innerCore.rotation.y = _t * 3;
			
			// Update glow mesh position
			glowMesh.position.copy(sphere.position);
			
			// Pulsing effect
			let pulse = Math.sin(_t * 2) * 0.1 + 1;
			sphere.scale.set(pulse, pulse, pulse);
			
			// Glow pulsing
			let glowPulse = Math.sin(_t * 3) * 0.2 + 1.2;
			glowMesh.scale.set(glowPulse, glowPulse, glowPulse);
			glowMesh.material.opacity = 0.2 + Math.sin(_t * 4) * 0.1;
			
			// Update sphere opacity for breathing effect
			sphere.material.opacity = 0.4 + Math.sin(_t * 2.5) * 0.3;
			
			// Animate particles
			let positions = particleSystem.geometry.attributes.position.array;
			let velocities = particleSystem.geometry.attributes.velocity.array;
			let originalPos = particleSystem.userData.originalPosition;
			let radius = particleSystem.userData.radius;
			
			for (let j = 0; j < positions.length / 3; j++) {
				let idx = j * 3;
				
				// Update particle positions
				positions[idx] += velocities[idx] * 0.5;
				positions[idx + 1] += velocities[idx + 1] * 0.5;
				positions[idx + 2] += velocities[idx + 2] * 0.5;
				
				// Calculate distance from center
				let dx = positions[idx] - sphere.position.x;
				let dy = positions[idx + 1] - sphere.position.y;
				let dz = positions[idx + 2];
				let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
				
				// Reset particles that have traveled too far
				if (distance > radius * 3) {
					// Reset to sphere surface
					let theta = Math.random() * Math.PI * 2;
					let phi = Math.acos(2 * Math.random() - 1);
					
					positions[idx] = radius * Math.sin(phi) * Math.cos(theta) + sphere.position.x;
					positions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta) + sphere.position.y;
					positions[idx + 2] = radius * Math.cos(phi);
					
					// Reset velocity
					velocities[idx] = (positions[idx] - sphere.position.x) / radius * 20;
					velocities[idx + 1] = (positions[idx + 1] - sphere.position.y) / radius * 20;
					velocities[idx + 2] = positions[idx + 2] / radius * 20;
				}
			}
			
			particleSystem.geometry.attributes.position.needsUpdate = true;
			
			// Rotate particle system for extra effect
			particleSystem.rotation.y = _t * 0.1;
			particleSystem.rotation.z = _t * 0.05;
		};

		renderer.render(scene, camera);
		requestAnimationFrame(render);
	}


	// resize the renderer to fit the window size
	function resize ()
	{
		let width = window.innerWidth;
		let height = window.innerHeight
		
		camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
	}
}