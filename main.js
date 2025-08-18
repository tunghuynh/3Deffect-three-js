import WindowManager from './WindowManager.js'



const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let sun;
let sunGlow;
let sunCorona;
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
			opacity: 1,
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
		
		// Add ambient light for overall illumination
		const ambientLight = new t.AmbientLight(0x404040, 0.5);
		scene.add(ambientLight);
		
		// Add point light at sun position (will be updated with sun)
		const sunLight = new t.PointLight(0xFFFFFF, 2, 1000);
		sunLight.position.set(0, 0, 0);
		scene.add(sunLight);
		scene.userData.sunLight = sunLight;

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
			radius: 5,
			color: 0x8B7355,
			emissive: 0x4A3A28,
			semiMajorAxis: 100,
			eccentricity: 0.206,
			orbitalPeriod: 0.24, // Earth years
			rotationPeriod: 58.6, // Earth days
			axialTilt: 0.03,
			hasRings: false
		},
		{
			name: "Venus",
			radius: 10,
			color: 0xFDB462,
			emissive: 0x8B6239,
			semiMajorAxis: 140,
			eccentricity: 0.007,
			orbitalPeriod: 0.62,
			rotationPeriod: -243, // Negative = retrograde rotation
			axialTilt: 177.4,
			hasRings: false
		},
		{
			name: "Earth",
			radius: 10,
			color: 0x4A90E2,
			emissive: 0x1A5490,
			semiMajorAxis: 180,
			eccentricity: 0.017,
			orbitalPeriod: 1.0,
			rotationPeriod: 1.0,
			axialTilt: 23.5,
			hasRings: false,
			hasMoon: true
		},
		{
			name: "Mars",
			radius: 6,
			color: 0xCD5C5C,
			emissive: 0x8B3030,
			semiMajorAxis: 220,
			eccentricity: 0.093,
			orbitalPeriod: 1.88,
			rotationPeriod: 1.03,
			axialTilt: 25.2,
			hasRings: false
		},
		{
			name: "Jupiter",
			radius: 25,
			color: 0xC88B3A,
			emissive: 0x644520,
			semiMajorAxis: 300,
			eccentricity: 0.048,
			orbitalPeriod: 11.86,
			rotationPeriod: 0.41,
			axialTilt: 3.1,
			hasRings: false,
			hasGreatRedSpot: true
		},
		{
			name: "Saturn",
			radius: 22,
			color: 0xFAD5A5,
			emissive: 0x7A6A52,
			semiMajorAxis: 380,
			eccentricity: 0.054,
			orbitalPeriod: 29.46,
			rotationPeriod: 0.44,
			axialTilt: 26.7,
			hasRings: true,
			ringInnerRadius: 26,
			ringOuterRadius: 40,
			ringColor: 0xBBAA88
		},
		{
			name: "Uranus",
			radius: 15,
			color: 0x4FD0E7,
			emissive: 0x2B6B73,
			semiMajorAxis: 450,
			eccentricity: 0.047,
			orbitalPeriod: 84.01,
			rotationPeriod: -0.72, // Negative = retrograde
			axialTilt: 82.2,
			hasRings: true,
			ringInnerRadius: 17,
			ringOuterRadius: 22,
			ringColor: 0x88AACC
		},
		{
			name: "Neptune",
			radius: 14,
			color: 0x3F54BA,
			emissive: 0x1F2A5D,
			semiMajorAxis: 520,
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
			opacity: 1
		});
		
		return new t.Line(geometry, material);
	}

	function createPlanet(planetInfo) {
		const planetGroup = new t.Group();
		
		// Create planet sphere with more detail
		const geometry = new t.SphereGeometry(planetInfo.radius, 64, 64);
		
		// Create custom material based on planet type
		let material;
		
		if (planetInfo.name === "Earth") {
			// Create Earth texture with continents and oceans
			const earthCanvas = document.createElement('canvas');
			earthCanvas.width = 512;
			earthCanvas.height = 256;
			const ctx = earthCanvas.getContext('2d');
			
			// Fill with ocean blue
			ctx.fillStyle = '#1E4F8B';
			ctx.fillRect(0, 0, earthCanvas.width, earthCanvas.height);
			
			// Add some ocean variation
			for (let i = 0; i < 100; i++) {
				ctx.fillStyle = `rgba(30, 79, ${139 + Math.random() * 20}, 0.3)`;
				ctx.beginPath();
				ctx.arc(Math.random() * earthCanvas.width, Math.random() * earthCanvas.height, 
					Math.random() * 30 + 10, 0, Math.PI * 2);
				ctx.fill();
			}
			
			// Draw continents (simplified representation)
			ctx.fillStyle = '#654321'; // Brown for land
			
			// Africa and Europe
			ctx.beginPath();
			ctx.ellipse(earthCanvas.width * 0.5, earthCanvas.height * 0.5, 40, 60, 0, 0, Math.PI * 2);
			ctx.fill();
			
			// Asia
			ctx.beginPath();
			ctx.ellipse(earthCanvas.width * 0.65, earthCanvas.height * 0.35, 60, 40, 0.3, 0, Math.PI * 2);
			ctx.fill();
			
			// Americas
			ctx.beginPath();
			ctx.ellipse(earthCanvas.width * 0.25, earthCanvas.height * 0.5, 30, 70, -0.2, 0, Math.PI * 2);
			ctx.fill();
			
			// Australia
			ctx.beginPath();
			ctx.ellipse(earthCanvas.width * 0.75, earthCanvas.height * 0.7, 25, 15, 0, 0, Math.PI * 2);
			ctx.fill();
			
			// Add green areas for forests
			ctx.fillStyle = '#228B22';
			for (let i = 0; i < 50; i++) {
				const x = Math.random() * earthCanvas.width;
				const y = Math.random() * earthCanvas.height;
				// Check if we're on land (brown pixels)
				const pixelData = ctx.getImageData(x, y, 1, 1).data;
				if (pixelData[0] > 50 && pixelData[1] < 100) { // Brownish color
					ctx.beginPath();
					ctx.arc(x, y, Math.random() * 5 + 2, 0, Math.PI * 2);
					ctx.fill();
				}
			}
			
			// Add ice caps
			ctx.fillStyle = '#FFFFFF';
			// North pole
			ctx.fillRect(0, 0, earthCanvas.width, 15);
			// South pole
			ctx.fillRect(0, earthCanvas.height - 15, earthCanvas.width, 15);
			
			const earthTexture = new t.CanvasTexture(earthCanvas);
			
			material = new t.MeshPhongMaterial({
				map: earthTexture,
				emissive: 0x112244,
				emissiveIntensity: 0.05,
				shininess: 20
			});
		} else if (planetInfo.name === "Mars") {
			// Mars with rust red color and darker regions
			material = new t.MeshPhongMaterial({
				color: 0xCD5C5C,
				emissive: 0x551111,
				emissiveIntensity: 0.1,
				roughness: 0.8
			});
		} else if (planetInfo.name === "Jupiter") {
			// Jupiter with banded appearance
			material = new t.MeshPhongMaterial({
				color: 0xC88B3A,
				emissive: 0x443322,
				emissiveIntensity: 0.05,
				shininess: 5
			});
		} else if (planetInfo.name === "Saturn") {
			// Saturn with pale gold color
			material = new t.MeshPhongMaterial({
				color: 0xFAD5A5,
				emissive: 0x554422,
				emissiveIntensity: 0.05,
				shininess: 5
			});
		} else {
			// Default material for other planets
			material = new t.MeshPhongMaterial({
				color: planetInfo.color,
				emissive: planetInfo.emissive,
				emissiveIntensity: 0.1,
				shininess: planetInfo.name === "Venus" ? 20 : 5
			});
		}
		
		const planet = new t.Mesh(geometry, material);
		planetGroup.add(planet);
		
		// Add thick atmosphere for Venus
		if (planetInfo.name === "Venus") {
			const atmosphereGeometry = new t.SphereGeometry(planetInfo.radius * 1.1, 32, 32);
			const atmosphereMaterial = new t.MeshPhongMaterial({
				color: 0xFFDD88,
				transparent: true,
				opacity: 1,
				side: t.BackSide
			});
			const atmosphere = new t.Mesh(atmosphereGeometry, atmosphereMaterial);
			planetGroup.add(atmosphere);
		}
		
		// Add ice caps for Mars
		if (planetInfo.name === "Mars") {
			// North pole ice cap
			const northCapGeometry = new t.SphereGeometry(planetInfo.radius * 1.01, 16, 16);
			const iceMaterial = new t.MeshPhongMaterial({
				color: 0xFFFFFF,
				emissive: 0xEEEEEE,
				emissiveIntensity: 0.1,
				transparent: true,
				opacity: 1
			});
			const northCap = new t.Mesh(northCapGeometry, iceMaterial);
			northCap.scale.set(0.3, 0.2, 0.3);
			northCap.position.set(0, planetInfo.radius * 0.8, 0);
			planetGroup.add(northCap);
			
			// South pole ice cap
			const southCap = new t.Mesh(northCapGeometry, iceMaterial);
			southCap.scale.set(0.25, 0.15, 0.25);
			southCap.position.set(0, planetInfo.radius * -0.85, 0);
			planetGroup.add(southCap);
		}
		
		// Add thin atmosphere for Earth
		if (planetInfo.name === "Earth") {
			const atmosphereGeometry = new t.SphereGeometry(planetInfo.radius * 1.05, 32, 32);
			const atmosphereMaterial = new t.MeshPhongMaterial({
				color: 0x88CCFF,
				transparent: true,
				opacity: 1,
				side: t.BackSide
			});
			const atmosphere = new t.Mesh(atmosphereGeometry, atmosphereMaterial);
			planetGroup.add(atmosphere);
		}
		
		// Add rings if the planet has them
		if (planetInfo.hasRings) {
			// Create multiple ring layers for more realistic appearance
			const ringLayers = planetInfo.name === "Saturn" ? 3 : 2;
			
			for (let i = 0; i < ringLayers; i++) {
				const innerRadius = planetInfo.ringInnerRadius + (i * 2);
				const outerRadius = innerRadius + (planetInfo.ringOuterRadius - planetInfo.ringInnerRadius) / ringLayers - 0.5;
				
				const ringGeometry = new t.RingGeometry(
					innerRadius,
					outerRadius,
					128
				);
				
				// Vary opacity and color for each ring layer
				const opacity = 1;
				const ringMaterial = new t.MeshPhongMaterial({
					color: planetInfo.ringColor,
					side: t.DoubleSide,
					transparent: true,
					opacity: opacity,
					emissive: planetInfo.ringColor,
					emissiveIntensity: 0.05
				});
				
				const ring = new t.Mesh(ringGeometry, ringMaterial);
				ring.rotation.x = Math.PI / 2; // Rotate to horizontal
				
				// Slight tilt variation for each ring
				ring.rotation.z = (Math.random() - 0.5) * 0.02;
				
				planetGroup.add(ring);
			}
		}
		
		// Add Great Red Spot for Jupiter
		if (planetInfo.hasGreatRedSpot) {
			// Create an elliptical spot
			const spotGeometry = new t.SphereGeometry(planetInfo.radius * 1.01, 32, 32);
			const spotMaterial = new t.MeshPhongMaterial({
				color: 0xCC4422,
				emissive: 0x661111,
				emissiveIntensity: 0.2,
				transparent: true,
				opacity: 1
			});
			const spot = new t.Mesh(spotGeometry, spotMaterial);
			spot.scale.set(0.4, 0.25, 0.4); // Elliptical shape
			spot.position.set(planetInfo.radius * 0.6, planetInfo.radius * -0.2, 0);
			planetGroup.add(spot);
			
			// Add swirling clouds around the spot
			for (let i = 0; i < 3; i++) {
				const cloudGeometry = new t.SphereGeometry(planetInfo.radius * 1.005, 16, 16);
				const cloudMaterial = new t.MeshPhongMaterial({
					color: 0xEEBB88,
					transparent: true,
					opacity: 1
				});
				const cloud = new t.Mesh(cloudGeometry, cloudMaterial);
				cloud.scale.set(0.2 + i * 0.1, 0.15 + i * 0.05, 0.2 + i * 0.1);
				cloud.position.set(
					planetInfo.radius * (0.6 + i * 0.1),
					planetInfo.radius * (-0.2 + (Math.random() - 0.5) * 0.2),
					0
				);
				planetGroup.add(cloud);
			}
		}
		
		// Store planet data for animation
		planetGroup.userData = {
			...planetInfo,
			angle: 0, // Will be set based on time for sync
			rotationAngle: 0
		};
		
		// Add moon for Earth
		if (planetInfo.hasMoon) {
			const moonGeometry = new t.SphereGeometry(2, 16, 16);
			const moonMaterial = new t.MeshBasicMaterial({
				color: 0xAAAAAA,
				emissive: 0x222222
			});
			const moon = new t.Mesh(moonGeometry, moonMaterial);
			moon.position.set(15, 0, 0);
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
		const sunGeometry = new t.SphereGeometry(40, 32, 32);
		const sunMaterial = new t.MeshBasicMaterial({
			color: 0xFFD700,
			emissive: 0xFFAA00,
			emissiveIntensity: 1
		});
		sun = new t.Mesh(sunGeometry, sunMaterial);
		// Position will be set in updateSolarSystem
		
		// Create sun glow
		const glowGeometry = new t.SphereGeometry(55, 32, 32);
		const glowMaterial = new t.MeshBasicMaterial({
			color: 0xFFAA00,
			transparent: true,
			opacity: 1,
			side: t.BackSide
		});
		sunGlow = new t.Mesh(glowGeometry, glowMaterial);
		// Position will be set in updateSolarSystem
		
		// Create corona effect
		const coronaGeometry = new t.SphereGeometry(70, 32, 32);
		const coronaMaterial = new t.MeshBasicMaterial({
			color: 0xFF6600,
			transparent: true,
			opacity: 1,
			side: t.BackSide
		});
		sunCorona = new t.Mesh(coronaGeometry, coronaMaterial);
		// Position will be set in updateSolarSystem
		
		// Solar flares removed for cleaner visual
		
		// Add all to world
		world.add(sunCorona);
		world.add(sunGlow);
		world.add(sun);
	}

	function updateSolarSystem ()
	{
		let wins = windowManager.getWindows();

		// Clear previous solar system objects
		if (sun) {
			world.remove(sun);
			world.remove(sunGlow);
			world.remove(sunCorona);
			sun = null;
			sunGlow = null;
			sunCorona = null;
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
			
			// Initial position sun at the center of the first window's viewport
			let firstWin = wins[0];
			let sunX = firstWin.shape.x + (firstWin.shape.w * .5);
			let sunY = firstWin.shape.y + (firstWin.shape.h * .5);
			
			sun.position.x = sunX;
			sun.position.y = sunY;
			sunGlow.position.x = sunX;
			sunGlow.position.y = sunY;
			sunCorona.position.x = sunX;
			sunCorona.position.y = sunY;
			
			// Update sun light position
			if (scene.userData.sunLight) {
				scene.userData.sunLight.position.x = sunX;
				scene.userData.sunLight.position.y = sunY;
			}
			
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
				const baseAngle = (getTime() * 0.03) / planetInfo.orbitalPeriod;
				planet.userData.angle = baseAngle % (Math.PI * 2);
				
				const angle = planet.userData.angle;
				const semiMajorAxis = planetInfo.semiMajorAxis;
				const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - planetInfo.eccentricity * planetInfo.eccentricity);
				
				planet.position.x = sunX + semiMajorAxis * Math.cos(angle);
				planet.position.y = sunY + semiMinorAxis * Math.sin(angle);
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
			// Always update sun position based on first window center
			let firstWin = wins[0];
			let sunTargetX = firstWin.shape.x + (firstWin.shape.w * .5);
			let sunTargetY = firstWin.shape.y + (firstWin.shape.h * .5);
			
			// Update sun position smoothly to follow first window
			sun.position.x = sun.position.x + (sunTargetX - sun.position.x) * falloff;
			sun.position.y = sun.position.y + (sunTargetY - sun.position.y) * falloff;
			
			// Update all sun-related objects to follow
			sunGlow.position.x = sun.position.x;
			sunGlow.position.y = sun.position.y;
			sunCorona.position.x = sun.position.x;
			sunCorona.position.y = sun.position.y;
			
			// Update sun light position
			if (scene.userData.sunLight) {
				scene.userData.sunLight.position.x = sun.position.x;
				scene.userData.sunLight.position.y = sun.position.y;
			}
			
			// Animate sun rotation
			sun.rotation.y = t * 0.05;
			
			// Pulse effects
			let pulse = Math.sin(t * 2) * 0.05 + 1;
			sun.scale.set(pulse, pulse, pulse);
			
			let glowPulse = Math.sin(t * 3) * 0.1 + 1.1;
			sunGlow.scale.set(glowPulse, glowPulse, glowPulse);
			sunGlow.material.opacity = 1;
			
			let coronaPulse = Math.sin(t * 2.5) * 0.15 + 1.15;
			sunCorona.scale.set(coronaPulse, coronaPulse, coronaPulse);
			sunCorona.material.opacity = 1;
			
			// Update orbit positions to follow sun's current position
			orbits.forEach((orbit) => {
				orbit.position.x = sun.position.x;
				orbit.position.y = sun.position.y;
			});
			
			// Update planet positions with orbital motion
			planets.forEach((planet, index) => {
				const planetInfo = planetData[index];
				
				// Use time-based angle for perfect sync across windows
				const baseAngle = (getTime() * 0.03) / planetInfo.orbitalPeriod;
				planet.userData.angle = baseAngle % (Math.PI * 2);

				
				const angle = planet.userData.angle;
				const semiMajorAxis = planetInfo.semiMajorAxis;
				const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - planetInfo.eccentricity * planetInfo.eccentricity);
				
				// Calculate position on elliptical orbit based on sun's current position
				planet.position.x = sun.position.x + semiMajorAxis * Math.cos(angle);
				planet.position.y = sun.position.y + semiMinorAxis * Math.sin(angle);
				
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
					planet.userData.moon.position.x = 15 * Math.cos(moonAngle);
					planet.userData.moon.position.z = 15 * Math.sin(moonAngle);
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