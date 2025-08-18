import WindowManager from './WindowManager.js'



const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let sun;
let sunGlow;
let sunCorona;
let solarFlares;
let planets = [];
let orbits = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};
let starField;

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

	function createStarField() {
		const starCount = 5000;
		const starGeometry = new t.BufferGeometry();
		const positions = new Float32Array(starCount * 3);
		const colors = new Float32Array(starCount * 3);
		const sizes = new Float32Array(starCount);
		
		for (let i = 0; i < starCount; i++) {
			// Random position in a large sphere
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			const radius = 500 + Math.random() * 2000;
			
			positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
			positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
			positions[i * 3 + 2] = radius * Math.cos(phi);
			
			// Random color (white to blue-ish)
			const intensity = 0.5 + Math.random() * 0.5;
			colors[i * 3] = intensity * (0.8 + Math.random() * 0.2);
			colors[i * 3 + 1] = intensity * (0.8 + Math.random() * 0.2);
			colors[i * 3 + 2] = intensity * (0.9 + Math.random() * 0.1);
			
			// Random size
			sizes[i] = Math.random() * 2 + 0.5;
		}
		
		starGeometry.setAttribute('position', new t.BufferAttribute(positions, 3));
		starGeometry.setAttribute('color', new t.BufferAttribute(colors, 3));
		starGeometry.setAttribute('size', new t.BufferAttribute(sizes, 1));
		
		const starMaterial = new t.PointsMaterial({
			vertexColors: true,
			size: 2,
			sizeAttenuation: true,
			transparent: true,
			opacity: 0.8,
			blending: t.AdditiveBlending
		});
		
		return new t.Points(starGeometry, starMaterial);
	}

	function setupScene ()
	{
		camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
		
		camera.position.z = 2.5;
		near = camera.position.z - .5;
		far = camera.position.z + 0.5;

		scene = new t.Scene();
		
		// Create gradient background for galaxy effect
		const canvas = document.createElement('canvas');
		canvas.width = 2048;
		canvas.height = 2048;
		const context = canvas.getContext('2d');
		
		// Create radial gradient
		const gradient = context.createRadialGradient(
			canvas.width / 2, canvas.height / 2, 0,
			canvas.width / 2, canvas.height / 2, canvas.width / 2
		);
		gradient.addColorStop(0, '#1a0033'); // Deep purple center
		gradient.addColorStop(0.4, '#0d001a'); // Dark blue
		gradient.addColorStop(0.7, '#000011'); // Very dark blue
		gradient.addColorStop(1, '#000000'); // Black edges
		
		context.fillStyle = gradient;
		context.fillRect(0, 0, canvas.width, canvas.height);
		
		// Add some nebula colors
		for (let i = 0; i < 10; i++) {
			const x = Math.random() * canvas.width;
			const y = Math.random() * canvas.height;
			const radius = Math.random() * 200 + 100;
			
			const nebula = context.createRadialGradient(x, y, 0, x, y, radius);
			nebula.addColorStop(0, `rgba(138, 43, 226, ${Math.random() * 0.1})`); // Purple
			nebula.addColorStop(0.5, `rgba(75, 0, 130, ${Math.random() * 0.05})`); // Indigo
			nebula.addColorStop(1, 'transparent');
			
			context.fillStyle = nebula;
			context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
		}
		
		const texture = new t.CanvasTexture(canvas);
		scene.background = texture;
		
		scene.add( camera );

		// Add star field
		starField = createStarField();
		scene.add(starField);

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
		updateSolarSystem();
	}

	// Orbit data for 8 planets
	const orbitData = [
		{ name: "Mercury", semiMajorAxis: 150, eccentricity: 0.206, color: 0x666666 },
		{ name: "Venus", semiMajorAxis: 200, eccentricity: 0.007, color: 0x777777 },
		{ name: "Earth", semiMajorAxis: 250, eccentricity: 0.017, color: 0x4444ff },
		{ name: "Mars", semiMajorAxis: 300, eccentricity: 0.093, color: 0xff4444 },
		{ name: "Jupiter", semiMajorAxis: 400, eccentricity: 0.048, color: 0xaa8844 },
		{ name: "Saturn", semiMajorAxis: 500, eccentricity: 0.054, color: 0xaaaa66 },
		{ name: "Uranus", semiMajorAxis: 600, eccentricity: 0.047, color: 0x44aaaa },
		{ name: "Neptune", semiMajorAxis: 700, eccentricity: 0.009, color: 0x4444aa }
	];

	function createOrbitLine(semiMajorAxis, eccentricity, color) {
		const points = [];
		const segments = 128;
		const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
		
		for (let i = 0; i <= segments; i++) {
			const angle = (i / segments) * Math.PI * 2;
			const x = semiMajorAxis * Math.cos(angle);
			const y = semiMinorAxis * Math.sin(angle);
			points.push(new t.Vector3(x, y, 0));
		}
		
		const geometry = new t.BufferGeometry().setFromPoints(points);
		const material = new t.LineBasicMaterial({
			color: color,
			transparent: true,
			opacity: 0.3
		});
		
		return new t.Line(geometry, material);
	}

	function createOrbits() {
		// Clear existing orbits
		orbits.forEach((orbit) => {
			world.remove(orbit);
		});
		orbits = [];
		
		// Create new orbits
		orbitData.forEach((data) => {
			const orbit = createOrbitLine(data.semiMajorAxis, data.eccentricity, data.color);
			orbits.push(orbit);
			world.add(orbit);
		});
	}

	function createSun() {
		// Create sun sphere
		const sunGeometry = new t.SphereGeometry(60, 32, 32);
		const sunMaterial = new t.MeshBasicMaterial({
			color: 0xFFD700,
			emissive: 0xFFAA00,
			emissiveIntensity: 1
		});
		sun = new t.Mesh(sunGeometry, sunMaterial);
		sun.position.set(0, 0, 0);
		
		// Create sun glow
		const glowGeometry = new t.SphereGeometry(80, 32, 32);
		const glowMaterial = new t.MeshBasicMaterial({
			color: 0xFFAA00,
			transparent: true,
			opacity: 0.4,
			side: t.BackSide
		});
		sunGlow = new t.Mesh(glowGeometry, glowMaterial);
		sunGlow.position.copy(sun.position);
		
		// Create corona effect
		const coronaGeometry = new t.SphereGeometry(100, 32, 32);
		const coronaMaterial = new t.MeshBasicMaterial({
			color: 0xFF6600,
			transparent: true,
			opacity: 0.2,
			side: t.BackSide
		});
		sunCorona = new t.Mesh(coronaGeometry, coronaMaterial);
		sunCorona.position.copy(sun.position);
		
		// Create solar flares particle system
		const flareCount = 1000;
		const flareGeometry = new t.BufferGeometry();
		const flarePositions = new Float32Array(flareCount * 3);
		const flareVelocities = new Float32Array(flareCount * 3);
		const flareLifetimes = new Float32Array(flareCount);
		
		for (let i = 0; i < flareCount; i++) {
			// Start at sun surface
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			const r = 60;
			
			flarePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
			flarePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
			flarePositions[i * 3 + 2] = r * Math.cos(phi);
			
			// Outward velocity
			flareVelocities[i * 3] = flarePositions[i * 3] / r * (10 + Math.random() * 20);
			flareVelocities[i * 3 + 1] = flarePositions[i * 3 + 1] / r * (10 + Math.random() * 20);
			flareVelocities[i * 3 + 2] = flarePositions[i * 3 + 2] / r * (10 + Math.random() * 20);
			
			flareLifetimes[i] = Math.random();
		}
		
		flareGeometry.setAttribute('position', new t.BufferAttribute(flarePositions, 3));
		flareGeometry.setAttribute('velocity', new t.BufferAttribute(flareVelocities, 3));
		flareGeometry.setAttribute('lifetime', new t.BufferAttribute(flareLifetimes, 1));
		
		const flareMaterial = new t.PointsMaterial({
			color: 0xFFEE00,
			size: 3,
			transparent: true,
			opacity: 0.8,
			blending: t.AdditiveBlending,
			vertexColors: false
		});
		
		solarFlares = new t.Points(flareGeometry, flareMaterial);
		solarFlares.position.copy(sun.position);
		
		// Add all to world
		world.add(sunCorona);
		world.add(sunGlow);
		world.add(sun);
		world.add(solarFlares);
	}

	function updateSolarSystem ()
	{
		let wins = windowManager.getWindows();

		// Clear previous solar system objects
		if (sun) {
			world.remove(sun);
			world.remove(sunGlow);
			world.remove(sunCorona);
			world.remove(solarFlares);
			sun = null;
			sunGlow = null;
			sunCorona = null;
			solarFlares = null;
		}
		
		// Remove all planets
		planets.forEach((planet) => {
			world.remove(planet);
		});
		planets = [];
		
		// Remove all orbits
		orbits.forEach((orbit) => {
			world.remove(orbit);
		});
		orbits = [];

		// Create sun and orbits if at least one window is open
		if (wins.length > 0) {
			createSun();
			createOrbits();
			
			// Position sun at the center of the first window
			let firstWin = wins[0];
			let sunX = firstWin.shape.x + (firstWin.shape.w * .5);
			let sunY = firstWin.shape.y + (firstWin.shape.h * .5);
			
			sun.position.x = sunX;
			sun.position.y = sunY;
			sunGlow.position.x = sunX;
			sunGlow.position.y = sunY;
			sunCorona.position.x = sunX;
			sunCorona.position.y = sunY;
			solarFlares.position.x = sunX;
			solarFlares.position.y = sunY;
			
			// Position orbits at sun position
			orbits.forEach((orbit) => {
				orbit.position.x = sunX;
				orbit.position.y = sunY;
			});
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

		// Animate star field slowly
		if (starField) {
			starField.rotation.y = t * 0.01;
			starField.rotation.x = t * 0.005;
		}

		// Update sun position and animations if it exists
		if (sun && wins.length > 0) {
			let firstWin = wins[0];
			let sunTargetX = firstWin.shape.x + (firstWin.shape.w * .5);
			let sunTargetY = firstWin.shape.y + (firstWin.shape.h * .5);
			
			// Smooth position update for sun
			sun.position.x = sun.position.x + (sunTargetX - sun.position.x) * falloff;
			sun.position.y = sun.position.y + (sunTargetY - sun.position.y) * falloff;
			sunGlow.position.x = sun.position.x;
			sunGlow.position.y = sun.position.y;
			sunCorona.position.x = sun.position.x;
			sunCorona.position.y = sun.position.y;
			solarFlares.position.x = sun.position.x;
			solarFlares.position.y = sun.position.y;
			
			// Animate sun rotation
			sun.rotation.y = t * 0.05;
			
			// Pulse effects
			let pulse = Math.sin(t * 2) * 0.05 + 1;
			sun.scale.set(pulse, pulse, pulse);
			
			let glowPulse = Math.sin(t * 3) * 0.1 + 1.1;
			sunGlow.scale.set(glowPulse, glowPulse, glowPulse);
			sunGlow.material.opacity = 0.4 + Math.sin(t * 4) * 0.1;
			
			let coronaPulse = Math.sin(t * 2.5) * 0.15 + 1.15;
			sunCorona.scale.set(coronaPulse, coronaPulse, coronaPulse);
			sunCorona.material.opacity = 0.2 + Math.sin(t * 3.5) * 0.05;
			
			// Animate solar flares
			let flarePositions = solarFlares.geometry.attributes.position.array;
			let flareVelocities = solarFlares.geometry.attributes.velocity.array;
			let flareLifetimes = solarFlares.geometry.attributes.lifetime.array;
			
			for (let i = 0; i < flarePositions.length / 3; i++) {
				let idx = i * 3;
				
				// Update positions
				flarePositions[idx] += flareVelocities[idx] * 0.5;
				flarePositions[idx + 1] += flareVelocities[idx + 1] * 0.5;
				flarePositions[idx + 2] += flareVelocities[idx + 2] * 0.5;
				
				// Update lifetime
				flareLifetimes[i] -= 0.01;
				
				// Reset if lifetime expired or too far from sun
				let dx = flarePositions[idx] - sun.position.x;
				let dy = flarePositions[idx + 1] - sun.position.y;
				let dz = flarePositions[idx + 2];
				let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
				
				if (flareLifetimes[i] <= 0 || distance > 200) {
					// Reset to sun surface
					let theta = Math.random() * Math.PI * 2;
					let phi = Math.acos(2 * Math.random() - 1);
					let r = 60;
					
					flarePositions[idx] = r * Math.sin(phi) * Math.cos(theta) + sun.position.x;
					flarePositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta) + sun.position.y;
					flarePositions[idx + 2] = r * Math.cos(phi);
					
					// New velocity
					flareVelocities[idx] = (flarePositions[idx] - sun.position.x) / r * (10 + Math.random() * 20);
					flareVelocities[idx + 1] = (flarePositions[idx + 1] - sun.position.y) / r * (10 + Math.random() * 20);
					flareVelocities[idx + 2] = flarePositions[idx + 2] / r * (10 + Math.random() * 20);
					
					flareLifetimes[i] = 1.0;
				}
			}
			
			solarFlares.geometry.attributes.position.needsUpdate = true;
			solarFlares.geometry.attributes.lifetime.needsUpdate = true;
			
			// Rotate flares system
			solarFlares.rotation.y = t * 0.02;
			
			// Update orbit positions to follow sun
			orbits.forEach((orbit) => {
				orbit.position.x = sun.position.x;
				orbit.position.y = sun.position.y;
			});
		}

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