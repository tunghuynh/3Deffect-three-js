// WindowManager is loaded from WindowManager.js script tag



const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let sun;
let sunGlow;
let sunCorona;
// let solarFlares; // Đã bỏ hiệu ứng flare
let planets = [];
let orbits = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};
let starField;

// Drag functionality variables
let isDragging = false;
let dragOffset = {x: 0, y: 0};
let sunUserOffset = {x: 0, y: 0}; // User-defined offset from drag
let mouseStart = {x: 0, y: 0};

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

		// Load sun offset from localStorage if exists
		const savedOffset = localStorage.getItem('sunUserOffset');
		if (savedOffset) {
			sunUserOffset = JSON.parse(savedOffset);
		}

		// add a short timeout because window.offsetX reports wrong values before a short period 
		setTimeout(() => {
			setupScene();
			setupWindowManager();
			setupMouseEvents();
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
		
		// Add lighting for 3D effect
		const ambientLight = new t.AmbientLight(0x404040, 0.5); // Soft ambient light
		scene.add(ambientLight);
		
		const directionalLight = new t.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(100, 100, 50);
		scene.add(directionalLight);
		
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

	function setupMouseEvents() {
		// Listen for storage changes to sync sun offset between windows
		window.addEventListener('storage', (event) => {
			if (event.key === 'sunUserOffset' && event.newValue) {
				sunUserOffset = JSON.parse(event.newValue);
			}
		});

		// Mouse down - check if clicking on sun
		renderer.domElement.addEventListener('mousedown', (e) => {
			if (!sun) return;
			
			const mouseX = e.clientX;
			const mouseY = window.innerHeight - e.clientY; // Flip Y coordinate
			
			// Calculate distance from mouse to sun center
			const dx = mouseX - sun.position.x;
			const dy = mouseY - sun.position.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			
			// Check if clicking within sun radius (60 + some margin)
			if (distance < 80) {
				isDragging = true;
				mouseStart.x = mouseX;
				mouseStart.y = mouseY;
				dragOffset.x = sunUserOffset.x;
				dragOffset.y = sunUserOffset.y;
				
				// Change cursor to grabbing
				renderer.domElement.style.cursor = 'grabbing';
				
				// Prevent text selection while dragging
				e.preventDefault();
			}
		});

		// Mouse move - update sun position if dragging
		window.addEventListener('mousemove', (e) => {
			const mouseX = e.clientX;
			const mouseY = window.innerHeight - e.clientY; // Flip Y coordinate
			
			if (isDragging && sun) {
				// Calculate new offset
				sunUserOffset.x = dragOffset.x + (mouseX - mouseStart.x);
				sunUserOffset.y = dragOffset.y + (mouseY - mouseStart.y);
				
				// Save to localStorage to sync with other windows
				localStorage.setItem('sunUserOffset', JSON.stringify(sunUserOffset));
			} else if (sun) {
				// Check if hovering over sun to show grab cursor
				const dx = mouseX - sun.position.x;
				const dy = mouseY - sun.position.y;
				const distance = Math.sqrt(dx * dx + dy * dy);
				
				if (distance < 80) {
					renderer.domElement.style.cursor = 'grab';
				} else {
					renderer.domElement.style.cursor = 'default';
				}
			}
		});

		// Mouse up - stop dragging
		window.addEventListener('mouseup', (e) => {
			if (isDragging) {
				isDragging = false;
				
				// Check if still hovering over sun after release
				if (sun) {
					const mouseX = e.clientX;
					const mouseY = window.innerHeight - e.clientY;
					const dx = mouseX - sun.position.x;
					const dy = mouseY - sun.position.y;
					const distance = Math.sqrt(dx * dx + dy * dy);
					
					if (distance < 80) {
						renderer.domElement.style.cursor = 'grab';
					} else {
						renderer.domElement.style.cursor = 'default';
					}
				}
			}
		});

		// Also stop dragging if mouse leaves window
		window.addEventListener('mouseleave', () => {
			isDragging = false;
		});
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
			radius: 12,  // 8 * 1.5
			color: 0x8C7853,
			emissive: 0x4C3813,
			semiMajorAxis: 90,  // 60% of 150
			eccentricity: 0.206,
			orbitalPeriod: 0.24, // Earth years
			rotationPeriod: 58.6, // Earth days
			axialTilt: 0.03,
			hasRings: false
		},
		{
			name: "Venus",
			radius: 22.5, // 15 * 1.5
			color: 0xFFC649,
			emissive: 0x8F6629,
			semiMajorAxis: 120, // 60% of 200
			eccentricity: 0.007,
			orbitalPeriod: 0.62,
			rotationPeriod: -243, // Negative = retrograde rotation
			axialTilt: 177.4,
			hasRings: false
		},
		{
			name: "Earth",
			radius: 24,  // 16 * 1.5
			color: 0x2233FF,
			emissive: 0x112288,
			semiMajorAxis: 150, // 60% of 250
			eccentricity: 0.017,
			orbitalPeriod: 1.0,
			rotationPeriod: 1.0,
			axialTilt: 23.5,
			hasRings: false,
			hasMoon: true
		},
		{
			name: "Mars",
			radius: 15,  // 10 * 1.5
			color: 0xFF4500,
			emissive: 0x882200,
			semiMajorAxis: 180, // 60% of 300
			eccentricity: 0.093,
			orbitalPeriod: 1.88,
			rotationPeriod: 1.03,
			axialTilt: 25.2,
			hasRings: false
		},
		{
			name: "Jupiter",
			radius: 52.5, // 35 * 1.5
			color: 0xC88B3A,
			emissive: 0x644520,
			semiMajorAxis: 240, // 60% of 400
			eccentricity: 0.048,
			orbitalPeriod: 11.86,
			rotationPeriod: 0.41,
			axialTilt: 3.1,
			hasRings: false,
			hasGreatRedSpot: true
		},
		{
			name: "Saturn",
			radius: 45,  // 30 * 1.5
			color: 0xFAD5A5,
			emissive: 0x7A6A52,
			semiMajorAxis: 300, // 60% of 500
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
			radius: 33,  // 22 * 1.5
			color: 0x4FD0E7,
			emissive: 0x276873,
			semiMajorAxis: 360, // 60% of 600
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
			radius: 30,  // 20 * 1.5
			color: 0x4B70DD,
			emissive: 0x25386E,
			semiMajorAxis: 420, // 60% of 700
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
	
	// Create procedural texture for planets
	function createPlanetTexture(planetName) {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 256;
		const ctx = canvas.getContext('2d');
		
		switch(planetName) {
			case 'Mercury':
				// Gray rocky surface with craters
				ctx.fillStyle = '#8C7853';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				// Add some darker spots for craters
				for(let i = 0; i < 30; i++) {
					ctx.beginPath();
					ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 
						Math.random() * 20 + 5, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.3 + 0.1})`;
					ctx.fill();
				}
				break;
				
			case 'Venus':
				// Yellowish with cloud patterns
				const venusGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
				venusGradient.addColorStop(0, '#FFC649');
				venusGradient.addColorStop(0.5, '#FFD873');
				venusGradient.addColorStop(1, '#FFC649');
				ctx.fillStyle = venusGradient;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				// Add cloud bands
				for(let i = 0; i < canvas.height; i += 20) {
					ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.2})`;
					ctx.fillRect(0, i, canvas.width, 10);
				}
				break;
				
			case 'Earth':
				// Blue with green landmasses
				ctx.fillStyle = '#2233FF';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				// Add continents
				ctx.fillStyle = '#2d5016';
				// Simple continent shapes
				ctx.fillRect(100, 50, 80, 60);
				ctx.fillRect(250, 80, 100, 80);
				ctx.fillRect(400, 100, 60, 40);
				// Add clouds
				ctx.fillStyle = 'rgba(255,255,255,0.3)';
				for(let i = 0; i < 5; i++) {
					ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 
						Math.random() * 100 + 50, 20);
				}
				break;
				
			case 'Mars':
				// Reddish with darker regions
				ctx.fillStyle = '#CD5C5C';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				// Add darker regions
				ctx.fillStyle = '#8B4513';
				for(let i = 0; i < 10; i++) {
					ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height,
						Math.random() * 80 + 20, Math.random() * 40 + 10);
				}
				// Add polar ice caps
				ctx.fillStyle = '#FFFFFF';
				ctx.fillRect(0, 0, canvas.width, 20);
				ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
				break;
				
			case 'Jupiter':
				// Banded gas giant
				const jupiterGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
				jupiterGradient.addColorStop(0, '#D4A373');
				jupiterGradient.addColorStop(0.2, '#C88B3A');
				jupiterGradient.addColorStop(0.4, '#E6C49D');
				jupiterGradient.addColorStop(0.6, '#C88B3A');
				jupiterGradient.addColorStop(0.8, '#D4A373');
				jupiterGradient.addColorStop(1, '#C88B3A');
				ctx.fillStyle = jupiterGradient;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				// Add Great Red Spot
				ctx.fillStyle = '#CD5C5C';
				ctx.beginPath();
				ctx.ellipse(canvas.width * 0.7, canvas.height * 0.6, 40, 25, 0, 0, Math.PI * 2);
				ctx.fill();
				break;
				
			case 'Saturn':
				// Pale yellow banded
				const saturnGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
				saturnGradient.addColorStop(0, '#FAD5A5');
				saturnGradient.addColorStop(0.5, '#F4E4C1');
				saturnGradient.addColorStop(1, '#FAD5A5');
				ctx.fillStyle = saturnGradient;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				// Add subtle bands
				for(let i = 0; i < canvas.height; i += 30) {
					ctx.fillStyle = `rgba(200,180,140,${Math.random() * 0.3})`;
					ctx.fillRect(0, i, canvas.width, 15);
				}
				break;
				
			case 'Uranus':
				// Pale blue-green
				ctx.fillStyle = '#4FD0E7';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				// Add subtle methane haze
				const uranusGradient = ctx.createRadialGradient(
					canvas.width/2, canvas.height/2, 0,
					canvas.width/2, canvas.height/2, canvas.width/2
				);
				uranusGradient.addColorStop(0, 'rgba(79, 208, 231, 0)');
				uranusGradient.addColorStop(1, 'rgba(100, 220, 240, 0.3)');
				ctx.fillStyle = uranusGradient;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				break;
				
			case 'Neptune':
				// Deep blue with storm features
				ctx.fillStyle = '#4B70DD';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				// Add storm bands
				ctx.fillStyle = '#3B60CD';
				for(let i = 0; i < 3; i++) {
					ctx.fillRect(0, Math.random() * canvas.height, canvas.width, 30);
				}
				// Add dark spot
				ctx.fillStyle = '#2B4099';
				ctx.beginPath();
				ctx.ellipse(canvas.width * 0.3, canvas.height * 0.4, 30, 20, 0, 0, Math.PI * 2);
				ctx.fill();
				break;
				
			default:
				// Default gray texture
				ctx.fillStyle = '#808080';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
		
		const texture = new t.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}
	
	// Create moon texture
	function createMoonTexture() {
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 128;
		const ctx = canvas.getContext('2d');
		
		// Gray base
		ctx.fillStyle = '#C0C0C0';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		// Add craters
		for(let i = 0; i < 20; i++) {
			ctx.beginPath();
			ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 
				Math.random() * 10 + 2, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.4 + 0.1})`;
			ctx.fill();
		}
		
		const texture = new t.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}
	
	// Create sun texture
	function createSunTexture() {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 256;
		const ctx = canvas.getContext('2d');
		
		// Create radial gradient for sun surface
		const gradient = ctx.createRadialGradient(
			canvas.width/2, canvas.height/2, 0,
			canvas.width/2, canvas.height/2, canvas.width/2
		);
		gradient.addColorStop(0, '#FFEE00');
		gradient.addColorStop(0.3, '#FFD700');
		gradient.addColorStop(0.6, '#FFAA00');
		gradient.addColorStop(1, '#FF8800');
		
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		// Add sun spots
		for(let i = 0; i < 15; i++) {
			ctx.beginPath();
			ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height,
				Math.random() * 20 + 5, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(255,100,0,${Math.random() * 0.4 + 0.3})`;
			ctx.fill();
		}
		
		// Add bright spots
		for(let i = 0; i < 10; i++) {
			ctx.beginPath();
			ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height,
				Math.random() * 15 + 3, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(255,255,200,${Math.random() * 0.3 + 0.2})`;
			ctx.fill();
		}
		
		const texture = new t.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}

	function createPlanet(planetInfo) {
		const planetGroup = new t.Group();
		
		// Create planet sphere
		const geometry = new t.SphereGeometry(planetInfo.radius, 32, 32);
		
		// Create texture for the planet
		const texture = createPlanetTexture(planetInfo.name);
		
		// Use Phong material for better lighting
		const material = new t.MeshPhongMaterial({
			map: texture,
			shininess: planetInfo.name === 'Earth' || planetInfo.name === 'Neptune' || planetInfo.name === 'Uranus' ? 30 : 10,
			emissive: planetInfo.emissive,
			emissiveIntensity: planetInfo.name === 'Sun' ? 1 : 0.05,
			bumpScale: 0.05
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
			const ringMaterial = new t.MeshPhongMaterial({
				color: planetInfo.ringColor,
				side: t.DoubleSide,
				transparent: true,
				opacity: 0.7,
				shininess: 50,
				emissive: planetInfo.ringColor,
				emissiveIntensity: 0.1
			});
			const ring = new t.Mesh(ringGeometry, ringMaterial);
			ring.rotation.x = Math.PI / 2; // Rotate to horizontal
			planetGroup.add(ring);
		}
		
		// Add Great Red Spot for Jupiter
		if (planetInfo.hasGreatRedSpot) {
			const spotGeometry = new t.SphereGeometry(planetInfo.radius * 1.01, 16, 16);
			const spotMaterial = new t.MeshPhongMaterial({
				color: 0xFF0000,
				transparent: true,
				opacity: 0.3,
				emissive: 0xFF0000,
				emissiveIntensity: 0.2
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
			const moonGeometry = new t.SphereGeometry(4.5, 16, 16); // 3 * 1.5
			const moonTexture = createMoonTexture();
			const moonMaterial = new t.MeshPhongMaterial({
				map: moonTexture,
				shininess: 5,
				emissive: 0x222222,
				emissiveIntensity: 0.1
			});
			const moon = new t.Mesh(moonGeometry, moonMaterial);
			moon.position.set(25, 0, 0);
			planetGroup.add(moon);
			planetGroup.userData.moon = moon;
		}
		
		// Add label for planet name
		const label = createLabel(planetInfo.name);
		label.position.y = planetInfo.radius + 20; // Position above planet
		planetGroup.add(label);
		planetGroup.userData.label = label;
		
		return planetGroup;
	}
	
	// Create label for planet names
	function createLabel(text) {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = 256;
		canvas.height = 64;
		
		// Clear canvas
		context.clearRect(0, 0, canvas.width, canvas.height);
		
		// Set text properties
		context.font = 'Bold 24px Arial';
		context.fillStyle = 'white';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		
		// Add text shadow for better visibility
		context.shadowColor = 'black';
		context.shadowBlur = 4;
		context.shadowOffsetX = 2;
		context.shadowOffsetY = 2;
		
		// Draw text
		context.fillText(text, canvas.width / 2, canvas.height / 2);
		
		// Create texture from canvas
		const texture = new t.CanvasTexture(canvas);
		texture.needsUpdate = true;
		
		// Create sprite material
		const spriteMaterial = new t.SpriteMaterial({ 
			map: texture,
			transparent: true
		});
		
		// Create sprite
		const sprite = new t.Sprite(spriteMaterial);
		sprite.scale.set(40, 10, 1);
		
		return sprite;
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
		// Create sun group
		const sunGroup = new t.Group();
		
		// Create sun sphere
		const sunGeometry = new t.SphereGeometry(60, 32, 32);
		const sunTexture = createSunTexture();
		const sunMaterial = new t.MeshBasicMaterial({
			map: sunTexture,
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
		
		// Add label for sun
		const sunLabel = createLabel('Sun');
		sunLabel.position.y = 80; // Position above sun
		sun.userData.label = sunLabel;
		
		/* Đã bỏ hiệu ứng solar flares
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
		*/
		
		// Add all to world
		world.add(sunCorona);
		world.add(sunGlow);
		world.add(sun);
		world.add(sunLabel);
		// world.add(solarFlares); // Đã bỏ hiệu ứng flare
	}

	function updateSolarSystem ()
	{
		let wins = windowManager.getWindows();

		// Clear previous solar system objects
		if (sun) {
			world.remove(sun);
			world.remove(sunGlow);
			world.remove(sunCorona);
			if (sun.userData.label) {
				world.remove(sun.userData.label);
			}
			// world.remove(solarFlares); // Đã bỏ hiệu ứng flare
			sun = null;
			sunGlow = null;
			sunCorona = null;
			// solarFlares = null; // Đã bỏ hiệu ứng flare
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
			let sunX = firstWin.shape.x + (firstWin.shape.w * .5) + sunUserOffset.x;
			let sunY = firstWin.shape.y + (firstWin.shape.h * .5) + sunUserOffset.y;
			
			sun.position.x = sunX;
			sun.position.y = sunY;
			sunGlow.position.x = sunX;
			sunGlow.position.y = sunY;
			sunCorona.position.x = sunX;
			sunCorona.position.y = sunY;
			// solarFlares.position.x = sunX; // Đã bỏ hiệu ứng flare
			// solarFlares.position.y = sunY; // Đã bỏ hiệu ứng flare
			
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
				const baseAngle = (getTime() * 0.1) / planetInfo.orbitalPeriod;
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
			let firstWin = wins[0];
			let sunTargetX = firstWin.shape.x + (firstWin.shape.w * .5) + sunUserOffset.x;
			let sunTargetY = firstWin.shape.y + (firstWin.shape.h * .5) + sunUserOffset.y;
			
			// Smooth position update for sun
			sun.position.x = sun.position.x + (sunTargetX - sun.position.x) * falloff;
			sun.position.y = sun.position.y + (sunTargetY - sun.position.y) * falloff;
			sunGlow.position.x = sun.position.x;
			sunGlow.position.y = sun.position.y;
			sunCorona.position.x = sun.position.x;
			sunCorona.position.y = sun.position.y;
			// solarFlares.position.x = sun.position.x; // Đã bỏ hiệu ứng flare
			// solarFlares.position.y = sun.position.y; // Đã bỏ hiệu ứng flare
			
			// Update sun label position
			if (sun.userData.label) {
				sun.userData.label.position.x = sun.position.x;
				sun.userData.label.position.y = sun.position.y + 80;
			}
			
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
			
			/* Đã bỏ hiệu ứng solar flares
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
			*/
			
			// Update orbit positions to follow sun
			orbits.forEach((orbit) => {
				orbit.position.x = sun.position.x;
				orbit.position.y = sun.position.y;
			});
			
			// Update planet positions with orbital motion
			planets.forEach((planet, index) => {
				const planetInfo = planetData[index];
				
				// Update orbital angle based on orbital period
				// Speed is scaled for visible motion (real periods would be too slow)
				const orbitalSpeed = (1 / planetInfo.orbitalPeriod) * 0.01;
				planet.userData.angle += orbitalSpeed;
				
				const angle = planet.userData.angle;
				const semiMajorAxis = planetInfo.semiMajorAxis;
				const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - planetInfo.eccentricity * planetInfo.eccentricity);
				
				// Calculate position on elliptical orbit
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
