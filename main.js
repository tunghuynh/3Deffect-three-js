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
let sunAbsolutePosition = null; // Absolute position of sun in screen coordinates

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

		// Load sun absolute position from localStorage if exists
		const savedPosition = localStorage.getItem('sunAbsolutePosition');
		if (savedPosition) {
			sunAbsolutePosition = JSON.parse(savedPosition);
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
		const ambientLight = new t.AmbientLight(0xffffff, 0.65); // Medium ambient light
		scene.add(ambientLight);
		
		const directionalLight = new t.DirectionalLight(0xffffff, 1.25);
		directionalLight.position.set(100, 100, 50);
		scene.add(directionalLight);
		
		// Add another directional light from opposite side for better illumination
		const directionalLight2 = new t.DirectionalLight(0xffffff, 0.6);
		directionalLight2.position.set(-100, -100, -50);
		scene.add(directionalLight2);
		
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
		// Listen for storage changes to sync sun position between windows
		window.addEventListener('storage', (event) => {
			if (event.key === 'sunAbsolutePosition' && event.newValue) {
				sunAbsolutePosition = JSON.parse(event.newValue);
			}
		});

		// Click to move solar system center
		renderer.domElement.addEventListener('click', (e) => {
			if (!sun) return;
			
			// Get click position in screen coordinates (absolute position)
			const clickX = e.clientX + window.screenX;
			const clickY = e.clientY + window.screenY;
			
			// Update absolute position
			sunAbsolutePosition = {
				x: clickX,
				y: clickY
			};
			
			// Save to localStorage to sync with other windows
			localStorage.setItem('sunAbsolutePosition', JSON.stringify(sunAbsolutePosition));
		});

		// Change cursor to pointer on hover
		renderer.domElement.addEventListener('mousemove', (e) => {
			renderer.domElement.style.cursor = 'pointer';
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
			ringInnerRadius: 55,  // Tăng kích thước vành đai
			ringOuterRadius: 90,  // Tăng kích thước vành đai
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
			ringInnerRadius: 38,  // Nhỏ hơn Saturn nhiều
			ringOuterRadius: 48,  // Nhỏ hơn Saturn nhiều
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
				// Gray rocky surface with detailed craters
				// Base gray color with variations
				const mercuryGradient = ctx.createRadialGradient(
					canvas.width/2, canvas.height/2, 0,
					canvas.width/2, canvas.height/2, canvas.width/2
				);
				mercuryGradient.addColorStop(0, '#9C9C9C');
				mercuryGradient.addColorStop(0.5, '#8C7853');
				mercuryGradient.addColorStop(1, '#6C6C6C');
				ctx.fillStyle = mercuryGradient;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				// Add texture noise
				for(let i = 0; i < 1000; i++) {
					ctx.fillStyle = `rgba(${Math.random()*100+100},${Math.random()*100+100},${Math.random()*100+100},0.1)`;
					ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
				}
				
				// Add large craters with rim details
				for(let i = 0; i < 20; i++) {
					const x = Math.random() * canvas.width;
					const y = Math.random() * canvas.height;
					const radius = Math.random() * 25 + 10;
					
					// Crater shadow
					const craterGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
					craterGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
					craterGrad.addColorStop(0.7, 'rgba(0,0,0,0.3)');
					craterGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
					ctx.fillStyle = craterGrad;
					ctx.beginPath();
					ctx.arc(x, y, radius, 0, Math.PI * 2);
					ctx.fill();
					
					// Crater rim highlight
					ctx.strokeStyle = 'rgba(200,200,200,0.2)';
					ctx.lineWidth = 2;
					ctx.stroke();
				}
				
				// Small craters
				for(let i = 0; i < 50; i++) {
					ctx.beginPath();
					ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 
						Math.random() * 5 + 2, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.4 + 0.2})`;
					ctx.fill();
				}
				break;
				
			case 'Venus':
				// Yellowish atmosphere with thick cloud layers
				// Base yellow-orange gradient
				const venusBase = ctx.createRadialGradient(
					canvas.width/2, canvas.height/2, 0,
					canvas.width/2, canvas.height/2, canvas.width/2
				);
				venusBase.addColorStop(0, '#FFE5B4');
				venusBase.addColorStop(0.4, '#FFD873');
				venusBase.addColorStop(0.7, '#FFC649');
				venusBase.addColorStop(1, '#FFAA33');
				ctx.fillStyle = venusBase;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				// Swirling cloud patterns
				ctx.globalCompositeOperation = 'multiply';
				for(let i = 0; i < 15; i++) {
					const y = Math.random() * canvas.height;
					const height = Math.random() * 40 + 20;
					const cloudGrad = ctx.createLinearGradient(0, y, 0, y + height);
					cloudGrad.addColorStop(0, 'rgba(255,220,180,0.3)');
					cloudGrad.addColorStop(0.5, 'rgba(255,200,150,0.5)');
					cloudGrad.addColorStop(1, 'rgba(255,220,180,0.3)');
					ctx.fillStyle = cloudGrad;
					
					// Create wavy cloud bands
					ctx.beginPath();
					ctx.moveTo(0, y);
					for(let x = 0; x <= canvas.width; x += 10) {
						ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 10);
					}
					ctx.lineTo(canvas.width, y + height);
					for(let x = canvas.width; x >= 0; x -= 10) {
						ctx.lineTo(x, y + height + Math.sin(x * 0.02 + i) * 10);
					}
					ctx.closePath();
					ctx.fill();
				}
				ctx.globalCompositeOperation = 'source-over';
				
				// Add atmospheric haze
				const haze = ctx.createRadialGradient(
					canvas.width/2, canvas.height/2, canvas.width/4,
					canvas.width/2, canvas.height/2, canvas.width/2
				);
				haze.addColorStop(0, 'rgba(255,255,200,0)');
				haze.addColorStop(1, 'rgba(255,200,100,0.3)');
				ctx.fillStyle = haze;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				break;
				
			case 'Earth':
				// Ocean blue gradient
				const oceanGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
				oceanGrad.addColorStop(0, '#001a4d');
				oceanGrad.addColorStop(0.5, '#0066cc');
				oceanGrad.addColorStop(1, '#004080');
				ctx.fillStyle = oceanGrad;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				// Add ocean texture
				for(let i = 0; i < 200; i++) {
					ctx.fillStyle = `rgba(0,${Math.random()*50+50},${Math.random()*100+155},0.1)`;
					ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 3, 3);
				}
				
				// Africa and Europe
				ctx.fillStyle = '#2d5016';
				ctx.beginPath();
				ctx.moveTo(200, 40);
				ctx.lineTo(240, 35);
				ctx.lineTo(260, 50);
				ctx.lineTo(280, 90);
				ctx.lineTo(270, 130);
				ctx.lineTo(240, 140);
				ctx.lineTo(220, 120);
				ctx.lineTo(200, 80);
				ctx.closePath();
				ctx.fill();
				
				// Asia
				ctx.beginPath();
				ctx.moveTo(280, 40);
				ctx.lineTo(380, 30);
				ctx.lineTo(420, 50);
				ctx.lineTo(440, 80);
				ctx.lineTo(400, 100);
				ctx.lineTo(350, 90);
				ctx.lineTo(300, 70);
				ctx.closePath();
				ctx.fill();
				
				// Americas (wrapped around)
				ctx.beginPath();
				ctx.moveTo(50, 60);
				ctx.lineTo(100, 50);
				ctx.lineTo(120, 90);
				ctx.lineTo(110, 130);
				ctx.lineTo(80, 140);
				ctx.lineTo(60, 100);
				ctx.closePath();
				ctx.fill();
				
				// Add green variations to continents
				ctx.globalCompositeOperation = 'multiply';
				for(let i = 0; i < 50; i++) {
					ctx.fillStyle = `rgba(${Math.random()*50+100},${Math.random()*50+150},${Math.random()*50},0.3)`;
					ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 10, 10);
				}
				ctx.globalCompositeOperation = 'source-over';
				
				// Ice caps
				const iceGrad1 = ctx.createLinearGradient(0, 0, canvas.width, 20);
				iceGrad1.addColorStop(0, 'rgba(255,255,255,0.9)');
				iceGrad1.addColorStop(1, 'rgba(200,230,255,0.7)');
				ctx.fillStyle = iceGrad1;
				ctx.fillRect(0, 0, canvas.width, 15);
				ctx.fillRect(0, canvas.height - 15, canvas.width, 15);
				
				// Cloud layer
				for(let i = 0; i < 8; i++) {
					const cloudX = Math.random() * canvas.width;
					const cloudY = Math.random() * canvas.height;
					const cloudWidth = Math.random() * 80 + 40;
					const cloudHeight = Math.random() * 20 + 10;
					
					const cloudGrad = ctx.createRadialGradient(
						cloudX + cloudWidth/2, cloudY + cloudHeight/2, 0,
						cloudX + cloudWidth/2, cloudY + cloudHeight/2, cloudWidth/2
					);
					cloudGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
					cloudGrad.addColorStop(1, 'rgba(255,255,255,0)');
					ctx.fillStyle = cloudGrad;
					ctx.fillRect(cloudX, cloudY, cloudWidth, cloudHeight);
				}
				break;
				
			case 'Mars':
				// Rusty red base with variations
				const marsBase = ctx.createRadialGradient(
					canvas.width/2, canvas.height/2, 0,
					canvas.width/2, canvas.height/2, canvas.width/2
				);
				marsBase.addColorStop(0, '#E27B58');
				marsBase.addColorStop(0.5, '#CD5C5C');
				marsBase.addColorStop(1, '#8B3626');
				ctx.fillStyle = marsBase;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				// Add surface texture
				for(let i = 0; i < 500; i++) {
					ctx.fillStyle = `rgba(${Math.random()*100+155},${Math.random()*50+50},${Math.random()*50},0.1)`;
					ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
				}
				
				// Dark regions (like Syrtis Major)
				for(let i = 0; i < 8; i++) {
					const darkX = Math.random() * canvas.width;
					const darkY = Math.random() * canvas.height;
					const darkGrad = ctx.createRadialGradient(
						darkX, darkY, 0,
						darkX, darkY, Math.random() * 50 + 30
					);
					darkGrad.addColorStop(0, 'rgba(80,40,30,0.6)');
					darkGrad.addColorStop(1, 'rgba(100,50,40,0)');
					ctx.fillStyle = darkGrad;
					ctx.fillRect(darkX - 50, darkY - 50, 100, 100);
				}
				
				// Valles Marineris (canyon)
				ctx.strokeStyle = 'rgba(60,30,20,0.5)';
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(100, canvas.height/2);
				ctx.bezierCurveTo(200, canvas.height/2 + 10, 300, canvas.height/2 - 10, 400, canvas.height/2);
				ctx.stroke();
				
				// Polar ice caps with texture
				const polarGrad = ctx.createLinearGradient(0, 0, canvas.width, 30);
				polarGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
				polarGrad.addColorStop(0.5, 'rgba(230,240,255,0.8)');
				polarGrad.addColorStop(1, 'rgba(255,255,255,0.4)');
				ctx.fillStyle = polarGrad;
				ctx.fillRect(0, 0, canvas.width, 25);
				
				const polarGrad2 = ctx.createLinearGradient(0, canvas.height-25, canvas.width, canvas.height);
				polarGrad2.addColorStop(0, 'rgba(255,255,255,0.4)');
				polarGrad2.addColorStop(0.5, 'rgba(230,240,255,0.8)');
				polarGrad2.addColorStop(1, 'rgba(255,255,255,0.9)');
				ctx.fillStyle = polarGrad2;
				ctx.fillRect(0, canvas.height - 25, canvas.width, 25);
				break;
				
			case 'Jupiter':
				// Complex banded structure
				// Base gradient
				const jupiterBase = ctx.createLinearGradient(0, 0, 0, canvas.height);
				jupiterBase.addColorStop(0, '#F5DEB3');
				jupiterBase.addColorStop(0.15, '#D2691E');
				jupiterBase.addColorStop(0.3, '#F5DEB3');
				jupiterBase.addColorStop(0.45, '#CD853F');
				jupiterBase.addColorStop(0.6, '#FAEBD7');
				jupiterBase.addColorStop(0.75, '#DEB887');
				jupiterBase.addColorStop(0.9, '#F5DEB3');
				jupiterBase.addColorStop(1, '#D2691E');
				ctx.fillStyle = jupiterBase;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				// Add turbulent bands
				for(let y = 0; y < canvas.height; y += 15) {
					const bandGrad = ctx.createLinearGradient(0, y, canvas.width, y + 15);
					if(Math.random() > 0.5) {
						bandGrad.addColorStop(0, 'rgba(255,228,196,0.3)');
						bandGrad.addColorStop(0.5, 'rgba(255,218,185,0.5)');
						bandGrad.addColorStop(1, 'rgba(255,228,196,0.3)');
					} else {
						bandGrad.addColorStop(0, 'rgba(210,105,30,0.2)');
						bandGrad.addColorStop(0.5, 'rgba(184,134,11,0.4)');
						bandGrad.addColorStop(1, 'rgba(210,105,30,0.2)');
					}
					ctx.fillStyle = bandGrad;
					
					// Wavy bands
					ctx.beginPath();
					ctx.moveTo(0, y);
					for(let x = 0; x <= canvas.width; x += 5) {
						ctx.lineTo(x, y + Math.sin(x * 0.01 + y * 0.1) * 3);
					}
					ctx.lineTo(canvas.width, y + 15);
					ctx.lineTo(0, y + 15);
					ctx.closePath();
					ctx.fill();
				}
				
				// Add storm swirls
				for(let i = 0; i < 20; i++) {
					const x = Math.random() * canvas.width;
					const y = Math.random() * canvas.height;
					const size = Math.random() * 15 + 5;
					ctx.save();
					ctx.translate(x, y);
					ctx.rotate(Math.random() * Math.PI);
					const swirlGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
					swirlGrad.addColorStop(0, 'rgba(255,228,196,0.4)');
					swirlGrad.addColorStop(1, 'rgba(255,228,196,0)');
					ctx.fillStyle = swirlGrad;
					ctx.fillRect(-size, -size, size * 2, size * 2);
					ctx.restore();
				}
				
				// Great Red Spot with detail
				const jupiterSpotX = canvas.width * 0.7;
				const jupiterSpotY = canvas.height * 0.6;
				const spotGrad = ctx.createRadialGradient(jupiterSpotX, jupiterSpotY, 0, jupiterSpotX, jupiterSpotY, 50);
				spotGrad.addColorStop(0, '#B22222');
				spotGrad.addColorStop(0.3, '#CD5C5C');
				spotGrad.addColorStop(0.6, '#DC143C');
				spotGrad.addColorStop(1, 'rgba(178,34,34,0.3)');
				ctx.fillStyle = spotGrad;
				ctx.save();
				ctx.translate(jupiterSpotX, jupiterSpotY);
				ctx.rotate(Math.PI / 6);
				ctx.beginPath();
				ctx.ellipse(0, 0, 50, 30, 0, 0, Math.PI * 2);
				ctx.fill();
				
				// Add swirl detail to red spot
				ctx.strokeStyle = 'rgba(139,0,0,0.3)';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(0, 0, 20, 0, Math.PI * 1.5);
				ctx.stroke();
				ctx.restore();
				break;
				
			case 'Saturn':
				// Pale golden bands
				const saturnBase = ctx.createLinearGradient(0, 0, 0, canvas.height);
				saturnBase.addColorStop(0, '#FFF8DC');
				saturnBase.addColorStop(0.2, '#F0E68C');
				saturnBase.addColorStop(0.4, '#FAFAD2');
				saturnBase.addColorStop(0.6, '#EEE8AA');
				saturnBase.addColorStop(0.8, '#F0E68C');
				saturnBase.addColorStop(1, '#FFF8DC');
				ctx.fillStyle = saturnBase;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				// Add subtle texture
				for(let i = 0; i < 300; i++) {
					ctx.fillStyle = `rgba(${Math.random()*50+200},${Math.random()*50+200},${Math.random()*50+150},0.05)`;
					ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
				}
				
				// Subtle bands with variation
				for(let y = 0; y < canvas.height; y += 25) {
					const bandHeight = Math.random() * 15 + 10;
					const bandGrad = ctx.createLinearGradient(0, y, 0, y + bandHeight);
					const baseColor = Math.random() > 0.5;
					if(baseColor) {
						bandGrad.addColorStop(0, 'rgba(255,248,220,0.3)');
						bandGrad.addColorStop(0.5, 'rgba(250,250,210,0.5)');
						bandGrad.addColorStop(1, 'rgba(255,248,220,0.3)');
					} else {
						bandGrad.addColorStop(0, 'rgba(238,232,170,0.2)');
						bandGrad.addColorStop(0.5, 'rgba(240,230,140,0.4)');
						bandGrad.addColorStop(1, 'rgba(238,232,170,0.2)');
					}
					ctx.fillStyle = bandGrad;
					ctx.fillRect(0, y, canvas.width, bandHeight);
				}
				
				// Hexagonal storm at north pole (subtle)
				ctx.save();
				ctx.translate(canvas.width/2, 30);
				ctx.beginPath();
				for(let i = 0; i < 6; i++) {
					const angle = (Math.PI / 3) * i;
					const x = Math.cos(angle) * 20;
					const y = Math.sin(angle) * 20;
					if(i === 0) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
				}
				ctx.closePath();
				ctx.fillStyle = 'rgba(220,200,160,0.3)';
				ctx.fill();
				ctx.restore();
				break;
				
			case 'Uranus':
				// Pale cyan-blue with subtle features
				const uranusBase = ctx.createRadialGradient(
					canvas.width/2, canvas.height/2, 0,
					canvas.width/2, canvas.height/2, canvas.width/2
				);
				uranusBase.addColorStop(0, '#7FFFD4');
				uranusBase.addColorStop(0.3, '#4FD0E7');
				uranusBase.addColorStop(0.7, '#00CED1');
				uranusBase.addColorStop(1, '#5F9EA0');
				ctx.fillStyle = uranusBase;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				// Methane atmosphere effect
				ctx.globalCompositeOperation = 'screen';
				const methaneGrad = ctx.createRadialGradient(
					canvas.width/2, canvas.height/2, canvas.width/4,
					canvas.width/2, canvas.height/2, canvas.width/2
				);
				methaneGrad.addColorStop(0, 'rgba(127,255,212,0)');
				methaneGrad.addColorStop(0.7, 'rgba(64,224,208,0.2)');
				methaneGrad.addColorStop(1, 'rgba(72,209,204,0.4)');
				ctx.fillStyle = methaneGrad;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.globalCompositeOperation = 'source-over';
				
				// Very subtle cloud bands
				for(let i = 0; i < 5; i++) {
					const y = Math.random() * canvas.height;
					const bandGrad = ctx.createLinearGradient(0, y, canvas.width, y + 20);
					bandGrad.addColorStop(0, 'rgba(175,238,238,0.1)');
					bandGrad.addColorStop(0.5, 'rgba(176,224,230,0.2)');
					bandGrad.addColorStop(1, 'rgba(175,238,238,0.1)');
					ctx.fillStyle = bandGrad;
					ctx.fillRect(0, y, canvas.width, 20);
				}
				break;
				
			case 'Neptune':
				// Deep blue with dynamic atmosphere
				const neptuneBase = ctx.createRadialGradient(
					canvas.width/2, canvas.height/2, 0,
					canvas.width/2, canvas.height/2, canvas.width/2
				);
				neptuneBase.addColorStop(0, '#4169E1');
				neptuneBase.addColorStop(0.4, '#4B70DD');
				neptuneBase.addColorStop(0.7, '#0000CD');
				neptuneBase.addColorStop(1, '#191970');
				ctx.fillStyle = neptuneBase;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				
				// Add atmosphere texture
				for(let i = 0; i < 200; i++) {
					ctx.fillStyle = `rgba(${Math.random()*50},${Math.random()*50+50},${Math.random()*100+155},0.1)`;
					ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 3, 3);
				}
				
				// Storm bands with motion
				for(let i = 0; i < 6; i++) {
					const y = Math.random() * canvas.height;
					const bandHeight = Math.random() * 30 + 20;
					const bandGrad = ctx.createLinearGradient(0, y, canvas.width, y);
					bandGrad.addColorStop(0, 'rgba(30,144,255,0.3)');
					bandGrad.addColorStop(0.3, 'rgba(0,0,205,0.5)');
					bandGrad.addColorStop(0.7, 'rgba(0,0,139,0.5)');
					bandGrad.addColorStop(1, 'rgba(25,25,112,0.3)');
					ctx.fillStyle = bandGrad;
					
					// Curved storm bands
					ctx.beginPath();
					ctx.moveTo(0, y);
					for(let x = 0; x <= canvas.width; x += 10) {
						ctx.lineTo(x, y + Math.sin(x * 0.02) * 10);
					}
					ctx.lineTo(canvas.width, y + bandHeight);
					ctx.lineTo(0, y + bandHeight);
					ctx.closePath();
					ctx.fill();
				}
				
				// Great Dark Spot
				const neptuneSpotX = canvas.width * 0.3;
				const neptuneSpotY = canvas.height * 0.4;
				const darkSpotGrad = ctx.createRadialGradient(neptuneSpotX, neptuneSpotY, 0, neptuneSpotX, neptuneSpotY, 40);
				darkSpotGrad.addColorStop(0, 'rgba(0,0,80,0.8)');
				darkSpotGrad.addColorStop(0.5, 'rgba(25,25,112,0.6)');
				darkSpotGrad.addColorStop(1, 'rgba(0,0,139,0.2)');
				ctx.fillStyle = darkSpotGrad;
				ctx.save();
				ctx.translate(neptuneSpotX, neptuneSpotY);
				ctx.rotate(Math.PI / 8);
				ctx.beginPath();
				ctx.ellipse(0, 0, 40, 25, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
				
				// Small bright clouds
				for(let i = 0; i < 5; i++) {
					const cloudX = Math.random() * canvas.width;
					const cloudY = Math.random() * canvas.height;
					const cloudGrad = ctx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, 10);
					cloudGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
					cloudGrad.addColorStop(1, 'rgba(255,255,255,0)');
					ctx.fillStyle = cloudGrad;
					ctx.fillRect(cloudX - 10, cloudY - 10, 20, 20);
				}
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
		
		// Complex sun surface gradient
		const gradient = ctx.createRadialGradient(
			canvas.width/2, canvas.height/2, 0,
			canvas.width/2, canvas.height/2, canvas.width/2
		);
		gradient.addColorStop(0, '#FFFF00');
		gradient.addColorStop(0.2, '#FFD700');
		gradient.addColorStop(0.4, '#FFA500');
		gradient.addColorStop(0.6, '#FF8C00');
		gradient.addColorStop(0.8, '#FF6347');
		gradient.addColorStop(1, '#FF4500');
		
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		// Add photosphere granulation texture
		for(let i = 0; i < 500; i++) {
			const x = Math.random() * canvas.width;
			const y = Math.random() * canvas.height;
			const size = Math.random() * 8 + 4;
			const granuleGrad = ctx.createRadialGradient(x, y, 0, x, y, size);
			granuleGrad.addColorStop(0, `rgba(255,255,0,${Math.random() * 0.5 + 0.3})`);
			granuleGrad.addColorStop(1, `rgba(255,200,0,0)`);
			ctx.fillStyle = granuleGrad;
			ctx.fillRect(x - size, y - size, size * 2, size * 2);
		}
		
		// Add dark sunspots with penumbra
		for(let i = 0; i < 8; i++) {
			const spotX = Math.random() * canvas.width;
			const spotY = Math.random() * canvas.height;
			const spotSize = Math.random() * 20 + 10;
			
			// Penumbra (lighter outer region)
			const penumbraGrad = ctx.createRadialGradient(spotX, spotY, spotSize/2, spotX, spotY, spotSize);
			penumbraGrad.addColorStop(0, 'rgba(100,50,0,0.8)');
			penumbraGrad.addColorStop(0.5, 'rgba(150,75,0,0.5)');
			penumbraGrad.addColorStop(1, 'rgba(200,100,0,0)');
			ctx.fillStyle = penumbraGrad;
			ctx.beginPath();
			ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
			ctx.fill();
			
			// Umbra (darker center)
			ctx.fillStyle = 'rgba(50,25,0,0.9)';
			ctx.beginPath();
			ctx.arc(spotX, spotY, spotSize/2, 0, Math.PI * 2);
			ctx.fill();
		}
		
		// Add bright active regions
		for(let i = 0; i < 12; i++) {
			const brightX = Math.random() * canvas.width;
			const brightY = Math.random() * canvas.height;
			const brightSize = Math.random() * 15 + 5;
			const brightGrad = ctx.createRadialGradient(brightX, brightY, 0, brightX, brightY, brightSize);
			brightGrad.addColorStop(0, 'rgba(255,255,200,0.6)');
			brightGrad.addColorStop(0.5, 'rgba(255,255,150,0.3)');
			brightGrad.addColorStop(1, 'rgba(255,255,100,0)');
			ctx.fillStyle = brightGrad;
			ctx.fillRect(brightX - brightSize, brightY - brightSize, brightSize * 2, brightSize * 2);
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
			shininess: planetInfo.name === 'Earth' || planetInfo.name === 'Neptune' || planetInfo.name === 'Uranus' ? 50 : 20,
			emissive: planetInfo.emissive,
			emissiveIntensity: 0.1,
			specular: new t.Color(0x222222)
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
		label.position.y = planetInfo.radius + 30; // Position above planet
		label.position.z = 10; // Slightly forward to avoid clipping
		planetGroup.add(label);
		planetGroup.userData.label = label;
		
		return planetGroup;
	}
	
	// Create label for planet names
	function createLabel(text) {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = 512;
		canvas.height = 128;
		
		// Clear canvas with transparent background
		context.clearRect(0, 0, canvas.width, canvas.height);
		
		// Set text properties
		context.font = 'Bold 48px Arial';
		context.fillStyle = 'white';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		
		// Add text shadow for better visibility
		context.shadowColor = 'rgba(0,0,0,0.8)';
		context.shadowBlur = 8;
		context.shadowOffsetX = 3;
		context.shadowOffsetY = 3;
		
		// Draw text
		context.fillText(text, canvas.width / 2, canvas.height / 2);
		
		// Create texture from canvas
		const texture = new t.CanvasTexture(canvas);
		texture.needsUpdate = true;
		
		// Create sprite material
		const spriteMaterial = new t.SpriteMaterial({ 
			map: texture,
			transparent: true,
			sizeAttenuation: false  // Label size doesn't change with distance
		});
		
		// Create sprite
		const sprite = new t.Sprite(spriteMaterial);
		sprite.scale.set(0.5, 0.25, 1);  // Adjusted scale for better visibility
		
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
		sunLabel.position.y = 90; // Position above sun
		sunLabel.position.z = 10; // Slightly forward
		sun.userData.label = sunLabel;
		
		/* Đã bỏ hiệu ứng solar flares theo yêu cầu
		// Create solar flares particle system with limited range
		const windowCount = windowManager ? windowManager.getWindows().length : 1;
		const flareCount = Math.max(100, 500 - (windowCount * 50)); // Reduced count
		const flareGeometry = new t.BufferGeometry();
		const flarePositions = new Float32Array(flareCount * 3);
		const flareVelocities = new Float32Array(flareCount * 3);
		const flareLifetimes = new Float32Array(flareCount);
		const flareSizes = new Float32Array(flareCount);
		
		for (let i = 0; i < flareCount; i++) {
			// Start at sun surface
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			const r = 60;
			
			flarePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
			flarePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
			flarePositions[i * 3 + 2] = r * Math.cos(phi);
			
			// Reduced outward velocity for smaller flares
			flareVelocities[i * 3] = flarePositions[i * 3] / r * (5 + Math.random() * 10);
			flareVelocities[i * 3 + 1] = flarePositions[i * 3 + 1] / r * (5 + Math.random() * 10);
			flareVelocities[i * 3 + 2] = flarePositions[i * 3 + 2] / r * (5 + Math.random() * 10);
			
			flareLifetimes[i] = Math.random();
			flareSizes[i] = Math.random() * 4 + 2; // Random sizes
		}
		
		flareGeometry.setAttribute('position', new t.BufferAttribute(flarePositions, 3));
		flareGeometry.setAttribute('velocity', new t.BufferAttribute(flareVelocities, 3));
		flareGeometry.setAttribute('lifetime', new t.BufferAttribute(flareLifetimes, 1));
		flareGeometry.setAttribute('size', new t.BufferAttribute(flareSizes, 1));
		
		// Create gradient texture for flame colors
		const flareCanvas = document.createElement('canvas');
		flareCanvas.width = 64;
		flareCanvas.height = 64;
		const flareCtx = flareCanvas.getContext('2d');
		const flareGradient = flareCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
		flareGradient.addColorStop(0, 'rgba(255,255,255,1)');
		flareGradient.addColorStop(0.2, 'rgba(255,255,0,1)');
		flareGradient.addColorStop(0.4, 'rgba(255,200,0,0.8)');
		flareGradient.addColorStop(0.7, 'rgba(255,100,0,0.4)');
		flareGradient.addColorStop(1, 'rgba(255,0,0,0)');
		flareCtx.fillStyle = flareGradient;
		flareCtx.fillRect(0, 0, 64, 64);
		const flareTexture = new t.CanvasTexture(flareCanvas);
		
		const flareMaterial = new t.PointsMaterial({
			map: flareTexture,
			size: 6,
			transparent: true,
			opacity: 0.9,
			blending: t.AdditiveBlending,
			depthWrite: false,
			sizeAttenuation: true
		});
		
		solarFlares = new t.Points(flareGeometry, flareMaterial);
		solarFlares.position.copy(sun.position);
		*/
		
		// Add all to world
		// Bỏ vòng sáng xung quanh mặt trời theo yêu cầu
		// world.add(sunCorona);
		// world.add(sunGlow);
		world.add(sun);
		world.add(sunLabel);
		// world.add(solarFlares); // Đã bỏ hiệu ứng flare theo yêu cầu
	}

	function updateSolarSystem ()
	{
		let wins = windowManager.getWindows();

		// Clear previous solar system objects
		if (sun) {
			world.remove(sun);
			// world.remove(sunGlow);
			// world.remove(sunCorona);
			if (sun.userData.label) {
				world.remove(sun.userData.label);
			}
			// world.remove(solarFlares); // Đã bỏ hiệu ứng flare
			sun = null;
			// sunGlow = null;
			// sunCorona = null;
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
			
			// Position sun - if absolute position is set, use it
			let sunX, sunY;
			if (sunAbsolutePosition) {
				// Use absolute position
				sunX = sunAbsolutePosition.x;
				sunY = sunAbsolutePosition.y;
			} else {
				// Default to center of first window
				let firstWin = wins[0];
				sunX = firstWin.shape.x + (firstWin.shape.w * .5);
				sunY = firstWin.shape.y + (firstWin.shape.h * .5);
			}
			
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
			let sunTargetX, sunTargetY;
			
			if (sunAbsolutePosition) {
				// Use absolute position
				sunTargetX = sunAbsolutePosition.x;
				sunTargetY = sunAbsolutePosition.y;
			} else {
				// Default to center of first window
				let firstWin = wins[0];
				sunTargetX = firstWin.shape.x + (firstWin.shape.w * .5);
				sunTargetY = firstWin.shape.y + (firstWin.shape.h * .5);
			}
			
			// Smooth position update for sun
			sun.position.x = sun.position.x + (sunTargetX - sun.position.x) * falloff;
			sun.position.y = sun.position.y + (sunTargetY - sun.position.y) * falloff;
			// sunGlow.position.x = sun.position.x;
			// sunGlow.position.y = sun.position.y;
			// sunCorona.position.x = sun.position.x;
			// sunCorona.position.y = sun.position.y;
			// solarFlares.position.x = sun.position.x; // Đã bỏ hiệu ứng flare
			// solarFlares.position.y = sun.position.y; // Đã bỏ hiệu ứng flare
			
			// Update sun label position
			if (sun.userData.label) {
				sun.userData.label.position.x = sun.position.x;
				sun.userData.label.position.y = sun.position.y + 90;
				sun.userData.label.position.z = 10;
			}
			
			// Animate sun rotation
			sun.rotation.y = t * 0.05;
			
			// Pulse effects
			let pulse = Math.sin(t * 2) * 0.05 + 1;
			sun.scale.set(pulse, pulse, pulse);
			
			// Đã bỏ hiệu ứng glow và corona theo yêu cầu
			// let glowPulse = Math.sin(t * 3) * 0.1 + 1.1;
			// sunGlow.scale.set(glowPulse, glowPulse, glowPulse);
			// sunGlow.material.opacity = 0.4 + Math.sin(t * 4) * 0.1;
			
			// let coronaPulse = Math.sin(t * 2.5) * 0.15 + 1.15;
			// sunCorona.scale.set(coronaPulse, coronaPulse, coronaPulse);
			// sunCorona.material.opacity = 0.2 + Math.sin(t * 3.5) * 0.05;
			
			/* Đã bỏ hiệu ứng solar flares theo yêu cầu
			// Animate solar flares with limited range
			let flarePositions = solarFlares.geometry.attributes.position.array;
			let flareVelocities = solarFlares.geometry.attributes.velocity.array;
			let flareLifetimes = solarFlares.geometry.attributes.lifetime.array;
			
			for (let i = 0; i < flarePositions.length / 3; i++) {
				let idx = i * 3;
				
				// Update positions with slower speed
				flarePositions[idx] += flareVelocities[idx] * 0.3;
				flarePositions[idx + 1] += flareVelocities[idx + 1] * 0.3;
				flarePositions[idx + 2] += flareVelocities[idx + 2] * 0.3;
				
				// Update lifetime
				flareLifetimes[i] -= 0.015;
				
				// Reset if lifetime expired or too far from sun (limited to 80 to stay within Mercury orbit)
				let dx = flarePositions[idx] - sun.position.x;
				let dy = flarePositions[idx + 1] - sun.position.y;
				let dz = flarePositions[idx + 2];
				let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
				
				if (flareLifetimes[i] <= 0 || distance > 80) {
					// Reset to sun surface
					let theta = Math.random() * Math.PI * 2;
					let phi = Math.acos(2 * Math.random() - 1);
					let r = 60;
					
					flarePositions[idx] = r * Math.sin(phi) * Math.cos(theta) + sun.position.x;
					flarePositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta) + sun.position.y;
					flarePositions[idx + 2] = r * Math.cos(phi);
					
					// New velocity (reduced speed)
					flareVelocities[idx] = (flarePositions[idx] - sun.position.x) / r * (5 + Math.random() * 10);
					flareVelocities[idx + 1] = (flarePositions[idx + 1] - sun.position.y) / r * (5 + Math.random() * 10);
					flareVelocities[idx + 2] = flarePositions[idx + 2] / r * (5 + Math.random() * 10);
					
					flareLifetimes[i] = 1.0;
				}
			}
			
			solarFlares.geometry.attributes.position.needsUpdate = true;
			solarFlares.geometry.attributes.lifetime.needsUpdate = true;
			
			// Rotate flares system slowly
			solarFlares.rotation.y = t * 0.01;
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