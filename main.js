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
		// Optimize star count based on device performance
		const starCount = window.devicePixelRatio > 1 ? 3000 : 5000;
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

	// Planet data with realistic properties
	const planetData = [
		{
			name: "Mercury",
			radius: 8,
			color: 0x8C7853,
			emissive: 0x4C3813,
			semiMajorAxis: 150,
			eccentricity: 0.206,
			orbitalPeriod: 0.24, // Earth years
			rotationPeriod: 58.6, // Earth days
			axialTilt: 0.03,
			hasRings: false
		},
		{
			name: "Venus",
			radius: 15,
			color: 0xFFC649,
			emissive: 0x8F6629,
			semiMajorAxis: 200,
			eccentricity: 0.007,
			orbitalPeriod: 0.62,
			rotationPeriod: -243, // Negative = retrograde rotation
			axialTilt: 177.4,
			hasRings: false
		},
		{
			name: "Earth",
			radius: 16,
			color: 0x2233FF,
			emissive: 0x112288,
			semiMajorAxis: 250,
			eccentricity: 0.017,
			orbitalPeriod: 1.0,
			rotationPeriod: 1.0,
			axialTilt: 23.5,
			hasRings: false,
			hasMoon: true
		},
		{
			name: "Mars",
			radius: 10,
			color: 0xFF4500,
			emissive: 0x882200,
			semiMajorAxis: 300,
			eccentricity: 0.093,
			orbitalPeriod: 1.88,
			rotationPeriod: 1.03,
			axialTilt: 25.2,
			hasRings: false
		},
		{
			name: "Jupiter",
			radius: 35,
			color: 0xC88B3A,
			emissive: 0x644520,
			semiMajorAxis: 400,
			eccentricity: 0.048,
			orbitalPeriod: 11.86,
			rotationPeriod: 0.41,
			axialTilt: 3.1,
			hasRings: false,
			hasGreatRedSpot: true
		},
		{
			name: "Saturn",
			radius: 30,
			color: 0xFAD5A5,
			emissive: 0x7A6A52,
			semiMajorAxis: 500,
			eccentricity: 0.054,
			orbitalPeriod: 29.46,
			rotationPeriod: 0.44,
			axialTilt: 26.7,
			hasRings: true,
			ringInnerRadius: 35,
			ringOuterRadius: 55,
			ringColor: 0xBBAA88
		},
		{
			name: "Uranus",
			radius: 22,
			color: 0x4FD0E7,
			emissive: 0x276873,
			semiMajorAxis: 600,
			eccentricity: 0.047,
			orbitalPeriod: 84.01,
			rotationPeriod: -0.72, // Negative = retrograde
			axialTilt: 82.2,
			hasRings: true,
			ringInnerRadius: 24,
			ringOuterRadius: 30,
			ringColor: 0x668899
		},
		{
			name: "Neptune",
			radius: 20,
			color: 0x4B70DD,
			emissive: 0x25386E,
			semiMajorAxis: 700,
			eccentricity: 0.009,
			orbitalPeriod: 164.79,
			rotationPeriod: 0.67,
			axialTilt: 28.3,
			hasRings: false
		}
	];

	// Use planet data for orbits too
	const orbitData = planetData.map(planet => ({
		name: planet.name,
		semiMajorAxis: planet.semiMajorAxis,
		eccentricity: planet.eccentricity,
		color: planet.color
	}));

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

	function createPlanet(planetInfo) {
		const planetGroup = new t.Group();
		
		// Create planet sphere
		const geometry = new t.SphereGeometry(planetInfo.radius, 32, 32);
		const material = new t.MeshBasicMaterial({
			color: planetInfo.color,
			emissive: planetInfo.emissive,
			emissiveIntensity: 0.2
		});
		const planet = new t.Mesh(geometry, material);
		planetGroup.add(planet);
		
		// Add rings if the planet has them
		if (planetInfo.hasRings) {
			const ringGeometry = new t.RingGeometry(
				planetInfo.ringInnerRadius,
				planetInfo.ringOuterRadius,
				64
			);
			const ringMaterial = new t.MeshBasicMaterial({
				color: planetInfo.ringColor,
				side: t.DoubleSide,
				transparent: true,
				opacity: 0.7
			});
			const ring = new t.Mesh(ringGeometry, ringMaterial);
			ring.rotation.x = Math.PI / 2; // Rotate to horizontal
			planetGroup.add(ring);
		}
		
		// Add Great Red Spot for Jupiter
		if (planetInfo.hasGreatRedSpot) {
			const spotGeometry = new t.SphereGeometry(planetInfo.radius * 1.01, 16, 16);
			const spotMaterial = new t.MeshBasicMaterial({
				color: 0xFF0000,
				transparent: true,
				opacity: 0.3
			});
			const spot = new t.Mesh(spotGeometry, spotMaterial);
			spot.scale.set(0.3, 0.2, 0.3);
			spot.position.set(planetInfo.radius * 0.7, 0, 0);
			planetGroup.add(spot);
		}
		
		// Store planet data for animation
		planetGroup.userData = {
			...planetInfo,
			angle: 0, // Will be set based on time for sync
			rotationAngle: 0
		};
		
		// Add moon for Earth
		if (planetInfo.hasMoon) {
			const moonGeometry = new t.SphereGeometry(3, 16, 16);
			const moonMaterial = new t.MeshBasicMaterial({
				color: 0xAAAAAA,
				emissive: 0x222222
			});
			const moon = new t.Mesh(moonGeometry, moonMaterial);
			moon.position.set(25, 0, 0);
			planetGroup.add(moon);
			planetGroup.userData.moon = moon;
		}
		
		return planetGroup;
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
		// Position will be set in updateSolarSystem
		
		// Create sun glow
		const glowGeometry = new t.SphereGeometry(80, 32, 32);
		const glowMaterial = new t.MeshBasicMaterial({
			color: 0xFFAA00,
			transparent: true,
			opacity: 0.4,
			side: t.BackSide
		});
		sunGlow = new t.Mesh(glowGeometry, glowMaterial);
		// Position will be set in updateSolarSystem
		
		// Create corona effect
		const coronaGeometry = new t.SphereGeometry(100, 32, 32);
		const coronaMaterial = new t.MeshBasicMaterial({
			color: 0xFF6600,
			transparent: true,
			opacity: 0.2,
			side: t.BackSide
		});
		sunCorona = new t.Mesh(coronaGeometry, coronaMaterial);
		// Position will be set in updateSolarSystem
		
		// Create solar flares particle system
		// Reduce particle count based on number of windows for performance
		const windowCount = windowManager ? windowManager.getWindows().length : 1;
		const flareCount = Math.max(200, 1000 - (windowCount * 100));
		const flareGeometry = new t.BufferGeometry();
		const flarePositions = new Float32Array(flareCount * 3);
		const flareVelocities = new Float32Array(flareCount * 3);
		const flareLifetimes = new Float32Array(flareCount);
		
		for (let i = 0; i < flareCount; i++) {
			// Start at sun surface
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			const r = 60;
			
			// Use fixed sun position
			const fixedSunX = window.screen.width / 2;
			const fixedSunY = window.screen.height / 2;
			
			flarePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta) + fixedSunX;
			flarePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + fixedSunY;
			flarePositions[i * 3 + 2] = r * Math.cos(phi);
			
			// Outward velocity
			flareVelocities[i * 3] = (flarePositions[i * 3] - fixedSunX) / r * (10 + Math.random() * 20);
			flareVelocities[i * 3 + 1] = (flarePositions[i * 3 + 1] - fixedSunY) / r * (10 + Math.random() * 20);
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
		// Solar flares positions are already set in the vertex data
		
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
			
			// Use a fixed absolute position for sun that's consistent across all windows
			// Position at the center of the screen
			let sunX = window.screen.width / 2;
			let sunY = window.screen.height / 2;
			
			sun.position.x = sunX;
			sun.position.y = sunY;
			sunGlow.position.x = sunX;
			sunGlow.position.y = sunY;
			sunCorona.position.x = sunX;
			sunCorona.position.y = sunY;
			// solarFlares positions are in vertex data, no need to set position
			
			// Position orbits at sun position
			orbits.forEach((orbit) => {
				orbit.position.x = sunX;
				orbit.position.y = sunY;
			});
			
			// Add planets based on number of windows (window 2 = Mercury, window 3 = Venus, etc.)
			for (let i = 1; i < wins.length && i <= 8; i++) {
				const planetInfo = planetData[i - 1]; // i-1 because array is 0-indexed
				const planet = createPlanet(planetInfo);
				
				// Calculate initial position on orbit
				// Use a consistent starting angle based on current time for sync across windows
				const baseAngle = (getTime() * 0.002) / planetInfo.orbitalPeriod;
				planet.userData.angle = baseAngle % (Math.PI * 2);
				
				const angle = planet.userData.angle;
				const semiMajorAxis = planetInfo.semiMajorAxis;
				const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - planetInfo.eccentricity * planetInfo.eccentricity);
				
				// Use fixed sun position
				const fixedSunX = window.screen.width / 2;
				const fixedSunY = window.screen.height / 2;
				
				planet.position.x = fixedSunX + semiMajorAxis * Math.cos(angle);
				planet.position.y = fixedSunY + semiMinorAxis * Math.sin(angle);
				planet.position.z = 0;
				
				planets.push(planet);
				world.add(planet);
			}
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
			// Sun stays at fixed screen center position
			let sunX = window.screen.width / 2;
			let sunY = window.screen.height / 2;
			
			// Keep sun at fixed position
			sun.position.x = sunX;
			sun.position.y = sunY;
			sunGlow.position.x = sunX;
			sunGlow.position.y = sunY;
			sunCorona.position.x = sunX;
			sunCorona.position.y = sunY;
			// solarFlares positions are in vertex data, no need to set position
			
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
				let dx = flarePositions[idx] - sunX;
				let dy = flarePositions[idx + 1] - sunY;
				let dz = flarePositions[idx + 2];
				let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
				
				if (flareLifetimes[i] <= 0 || distance > 200) {
					// Reset to sun surface
					let theta = Math.random() * Math.PI * 2;
					let phi = Math.acos(2 * Math.random() - 1);
					let r = 60;
					
					flarePositions[idx] = r * Math.sin(phi) * Math.cos(theta) + sunX;
					flarePositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta) + sunY;
					flarePositions[idx + 2] = r * Math.cos(phi);
					
					// New velocity
					flareVelocities[idx] = (flarePositions[idx] - sunX) / r * (10 + Math.random() * 20);
					flareVelocities[idx + 1] = (flarePositions[idx + 1] - sunY) / r * (10 + Math.random() * 20);
					flareVelocities[idx + 2] = flarePositions[idx + 2] / r * (10 + Math.random() * 20);
					
					flareLifetimes[i] = 1.0;
				}
			}
			
			solarFlares.geometry.attributes.position.needsUpdate = true;
			solarFlares.geometry.attributes.lifetime.needsUpdate = true;
			
			// Rotate flares system
			solarFlares.rotation.y = t * 0.02;
			
			// Update orbit positions to fixed sun position
			const fixedSunX = window.screen.width / 2;
			const fixedSunY = window.screen.height / 2;
			
			orbits.forEach((orbit) => {
				orbit.position.x = fixedSunX;
				orbit.position.y = fixedSunY;
			});
			
			// Update planet positions with orbital motion
			planets.forEach((planet, index) => {
				const planetInfo = planetData[index];
				
				// Use time-based angle for perfect sync across windows
				const baseAngle = (getTime() * 0.002) / planetInfo.orbitalPeriod;
				planet.userData.angle = baseAngle % (Math.PI * 2);
				
				const angle = planet.userData.angle;
				const semiMajorAxis = planetInfo.semiMajorAxis;
				const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - planetInfo.eccentricity * planetInfo.eccentricity);
				
				// Use fixed sun position
				const fixedSunX = window.screen.width / 2;
				const fixedSunY = window.screen.height / 2;
				
				// Calculate position on elliptical orbit
				planet.position.x = fixedSunX + semiMajorAxis * Math.cos(angle);
				planet.position.y = fixedSunY + semiMinorAxis * Math.sin(angle);
				
				// Rotate planet on its axis
				const rotationSpeed = Math.abs(planetInfo.rotationPeriod) > 1 
					? 0.01 / Math.abs(planetInfo.rotationPeriod)
					: 0.01 * Math.abs(planetInfo.rotationPeriod);
				
				// Handle retrograde rotation
				if (planetInfo.rotationPeriod < 0) {
					planet.userData.rotationAngle -= rotationSpeed;
				} else {
					planet.userData.rotationAngle += rotationSpeed;
				}
				
				planet.rotation.y = planet.userData.rotationAngle;
				
				// Apply axial tilt
				planet.rotation.z = (planetInfo.axialTilt * Math.PI) / 180;
				
				// Update moon position for Earth
				if (planet.userData.moon) {
					const moonAngle = t * 0.1; // Moon orbits faster
					planet.userData.moon.position.x = 25 * Math.cos(moonAngle);
					planet.userData.moon.position.z = 25 * Math.sin(moonAngle);
				}
				
				// Rotate rings with planet
				planet.children.forEach((child) => {
					if (child.geometry && child.geometry.type === 'RingGeometry') {
						child.rotation.z = -planet.rotation.z; // Keep rings horizontal relative to orbit
					}
				});
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