/**
 * ==========================================================================
 * WEATHER APP - 3D METEOROLOGICAL ENGINE & LOCOMOTIVE SCROLL ARCHITECTURE
 * Clean Monochrome Black & White Aesthetic + Photorealistic 3D Earth Globe
 * ==========================================================================
 */

const STORAGE_KEY = "weather_app_saved_location_v1";

// Application Global State
const state = {
  currentLat: 40.7128,
  currentLng: -74.0060,
  currentCity: "New York",
  currentCountry: "United States",
  currentCountryCode: "US",
  currentTimezone: "America/New_York",
  currentElevation: 10,
  weatherData: null,
  unit: "C", // 'C' or 'F'
  activeTileLayerKey: "voyager",
  viewMode: "3d", // '3d' (Three.js Globe Default) or '2d' (Leaflet)
  isAudioActive: false,
  liveClockInterval: null,
  marker: null,
  searchDebounceTimer: null,
  activeSearchIndex: -1,
  searchResults: [],
  autoRotateGlobe: true
};

// Storage Helpers
function saveSavedLocation(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

function getSavedLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Tile Layer Configurations for 2D Map
const TILE_LAYERS = {
  voyager: {
    name: "Clean Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19
    }
  },
  dark: {
    name: "Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19
    }
  },
  satellite: {
    name: "Satellite Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18
    }
  }
};

// Weather Code Interpretation Map (WMO Standard)
const WEATHER_CODES = {
  0: { label: "Clear Sky", icon: "sun", status: "Clear & Sunny", category: "clear" },
  1: { label: "Mainly Clear", icon: "sun-cloud", status: "Optimal Outdoor Conditions", category: "clear" },
  2: { label: "Partly Cloudy", icon: "partly-cloudy", status: "Scattered Clouds", category: "clouds" },
  3: { label: "Overcast", icon: "cloudy", status: "Full Cloud Cover", category: "clouds" },
  45: { label: "Foggy", icon: "fog", status: "Reduced Visibility", category: "clouds" },
  48: { label: "Depositing Rime Fog", icon: "fog", status: "Icy Fog Hazard", category: "clouds" },
  51: { label: "Light Drizzle", icon: "drizzle", status: "Light Precipitation", category: "rain" },
  53: { label: "Moderate Drizzle", icon: "drizzle", status: "Passing Drizzle", category: "rain" },
  55: { label: "Dense Drizzle", icon: "drizzle", status: "Continuous Wet Mist", category: "rain" },
  56: { label: "Light Freezing Drizzle", icon: "rain-light", status: "Icy Mist", category: "rain" },
  57: { label: "Dense Freezing Drizzle", icon: "rain", status: "Slick Road Warning", category: "rain" },
  61: { label: "Slight Rain", icon: "rain-light", status: "Light Rain Expected", category: "rain" },
  63: { label: "Moderate Rain", icon: "rain", status: "Umbrella Recommended", category: "rain" },
  65: { label: "Heavy Rain", icon: "rain-heavy", status: "Heavy Downpour", category: "rain" },
  66: { label: "Light Freezing Rain", icon: "rain-light", status: "Freezing Rain Hazard", category: "rain" },
  67: { label: "Heavy Freezing Rain", icon: "rain-heavy", status: "Severe Ice Formation", category: "rain" },
  71: { label: "Slight Snow Fall", icon: "snow-light", status: "Light Flurries", category: "snow" },
  73: { label: "Moderate Snow Fall", icon: "snow", status: "Snow Accumulation", category: "snow" },
  75: { label: "Heavy Snow Fall", icon: "snow-heavy", status: "Heavy Snowfall Warning", category: "snow" },
  77: { label: "Snow Grains", icon: "snow", status: "Frozen Grains", category: "snow" },
  80: { label: "Slight Showers", icon: "rain-light", status: "Scattered Rain Showers", category: "rain" },
  81: { label: "Moderate Showers", icon: "rain", status: "Passing Rain Cells", category: "rain" },
  82: { label: "Violent Rain Showers", icon: "rain-heavy", status: "Torrential Showers", category: "rain" },
  85: { label: "Slight Snow Showers", icon: "snow", status: "Passing Snow Bands", category: "snow" },
  86: { label: "Heavy Snow Showers", icon: "snow-heavy", status: "Blizzard Conditions", category: "snow" },
  95: { label: "Thunderstorm", icon: "thunderstorm", status: "Lightning Activity", category: "thunderstorm" },
  96: { label: "Thunderstorm + Hail", icon: "thunderstorm", status: "Severe Storm with Hail", category: "thunderstorm" },
  99: { label: "Heavy Thunderstorm", icon: "thunderstorm", status: "Severe Storm Warning", category: "thunderstorm" }
};

// DOM References
let mapInstance = null;
let activeTileLayer = null;

const dom = {
  map: document.getElementById("map"),
  globeContainer: document.getElementById("globe-container"),
  globeCanvas: document.getElementById("globe-canvas"),
  weatherFxCanvas: document.getElementById("weather-fx-canvas"),
  viewModeBtn: document.getElementById("view-mode-btn"),
  viewModeLabel: document.getElementById("view-mode-label"),
  audioFxBtn: document.getElementById("audio-fx-btn"),
  audioBtnLabel: document.getElementById("audio-btn-label"),
  globeAutoRotateBtn: document.getElementById("globe-autorotate-btn"),
  globeResetBtn: document.getElementById("globe-reset-btn"),
  globeCoordsHud: document.getElementById("globe-coords-hud"),
  
  searchInput: document.getElementById("search-input"),
  searchResults: document.getElementById("search-results"),
  searchClearBtn: document.getElementById("search-clear-btn"),
  locateMeBtn: document.getElementById("locate-me-btn"),
  unitToggleBtn: document.getElementById("unit-toggle-btn"),
  unitDisplayText: document.getElementById("unit-display-text"),
  layerBtn: document.getElementById("layer-btn"),
  layerPicker: document.getElementById("layer-picker"),
  mainDashboard: document.getElementById("main-dashboard"),
  weatherCardScrollBody: document.getElementById("weather-card-scroll-body"),
  minimizeBtn: document.getElementById("minimize-btn"),
  reopenBtn: document.getElementById("reopen-dashboard-btn"),
  brandHomeBtn: document.getElementById("brand-home-btn"),
  toastContainer: document.getElementById("toast-container"),

  // Location & Clock
  locationFlag: document.getElementById("location-flag"),
  locationCity: document.getElementById("location-city"),
  locationCountry: document.getElementById("location-country"),
  locationElevationBadge: document.getElementById("location-elevation-badge"),
  liveTime: document.getElementById("live-time"),
  liveDate: document.getElementById("live-date"),
  timezonePill: document.getElementById("timezone-pill"),

  // Weather Primary
  tempValue: document.getElementById("temp-value"),
  tempUnitSymbol: document.getElementById("temp-unit-symbol"),
  tempFeelsLike: document.getElementById("temp-feels-like"),
  weatherHeroIcon: document.getElementById("weather-hero-icon"),
  weatherConditionText: document.getElementById("weather-condition-text"),
  weatherStatusTag: document.getElementById("weather-status-tag"),
  tempHighVal: document.getElementById("temp-high-val"),
  tempLowVal: document.getElementById("temp-low-val"),

  // Telemetry Gauges
  metricHumidity: document.getElementById("metric-humidity"),
  humidityBarFill: document.getElementById("humidity-bar-fill"),
  humidityStatus: document.getElementById("humidity-status"),

  metricWind: document.getElementById("metric-wind"),
  windBarFill: document.getElementById("wind-bar-fill"),
  windDirectionSub: document.getElementById("wind-direction-sub"),
  windCompassCanvas: document.getElementById("wind-3d-compass-canvas"),

  metricUv: document.getElementById("metric-uv"),
  uvBarFill: document.getElementById("uv-bar-fill"),
  uvStatus: document.getElementById("uv-status"),

  metricPrecip: document.getElementById("metric-precip"),
  precipBarFill: document.getElementById("precip-bar-fill"),
  precipStatus: document.getElementById("precip-status"),

  // Forecasts & Solar Cycle
  hourlyForecastContainer: document.getElementById("hourly-forecast-container"),
  dailyForecastContainer: document.getElementById("daily-forecast-container"),
  daylightDurationBadge: document.getElementById("daylight-duration-badge"),
  sunSunriseTime: document.getElementById("sun-sunrise-time"),
  sunSunsetTime: document.getElementById("sun-sunset-time"),
  solarSunDot: document.getElementById("solar-sun-dot"),
  solar3dCanvas: document.getElementById("solar-3d-canvas"),

  // Atmospheric Details Grid
  detailWindFull: document.getElementById("detail-wind-full"),
  detailWindGusts: document.getElementById("detail-wind-gusts"),
  detailPressure: document.getElementById("detail-pressure"),
  detailPressureStatus: document.getElementById("detail-pressure-status"),
  detailClouds: document.getElementById("detail-clouds"),
  detailCloudsStatus: document.getElementById("detail-clouds-status"),
  detailCoords: document.getElementById("detail-coords"),
  detailElevation: document.getElementById("detail-elevation")
};

/**
 * ==========================================================================
 * 1. THREE.JS 3D ATMOSPHERIC WEATHER FX ENGINE (RAIN, SNOW, LIGHTNING, SUN)
 * ==========================================================================
 */
const ThreeWeatherFX = (function() {
  let scene, camera, renderer;
  let rainGeo, rainPoints, rainMaterial;
  let snowGeo, snowPoints, snowMaterial;
  let blizzardGeo, blizzardPoints, blizzardMaterial;
  let heatGeo, heatPoints, heatMaterial;
  let frostGeo, frostPoints, frostMaterial;
  let fogGeo, fogPoints, fogMaterial;
  let sunbeamGeo, sunbeamPoints, sunbeamMaterial;
  let lightningLight, lightningTimer = 0;

  // Active atmospheric mode triggers
  let isRain = false;
  let isSnow = false;
  let isBlizzard = false;
  let isStorm = false;
  let isFog = false;

  let windTilt = 0;
  let windSpeedScalar = 1;
  let isInitialized = false;

  function init() {
    const canvas = dom.weatherFxCanvas;
    if (!canvas || typeof THREE === "undefined") return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 100;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lightning Flash Point Light
    lightningLight = new THREE.PointLight(0xffffff, 0, 800);
    lightningLight.position.set(0, 100, 50);
    scene.add(lightningLight);

    // Setup Atmospheric Particle Systems (Strictly weather only)
    createRainSystem();
    createSnowSystem();
    createBlizzardSystem();
    createFogSystem();

    window.addEventListener("resize", onResize);
    isInitialized = true;
    animate();
  }

  // 1. RAIN SYSTEM
  function createRainSystem() {
    const count = 2200;
    rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 320;
      positions[i * 3 + 1] = Math.random() * 200 - 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
      velocities[i] = 2.8 + Math.random() * 3.5;
    }

    rainGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    rainGeo.setAttribute("velocity", new THREE.BufferAttribute(velocities, 1));

    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(8, 0, 8, 32);
    grad.addColorStop(0, "rgba(255, 255, 255, 0)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0.9)");
    ctx.fillStyle = grad;
    ctx.fillRect(6, 0, 4, 32);
    const rainTex = new THREE.CanvasTexture(canvas);

    rainMaterial = new THREE.PointsMaterial({
      size: 3.5,
      map: rainTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    rainPoints = new THREE.Points(rainGeo, rainMaterial);
    scene.add(rainPoints);
  }

  // 2. REALISTIC CIRCULAR SNOWFLAKE SYSTEM
  function createSnowSystem() {
    const count = 2200;
    snowGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const wander = new Float32Array(count);
    const fallSpeeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 320;
      positions[i * 3 + 1] = Math.random() * 200 - 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
      wander[i] = Math.random() * Math.PI * 2;
      fallSpeeds[i] = 0.55 + Math.random() * 0.65;
    }

    snowGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    snowGeo.setAttribute("wander", new THREE.BufferAttribute(wander, 1));
    snowGeo.setAttribute("fallSpeed", new THREE.BufferAttribute(fallSpeeds, 1));

    // High-Definition Soft Circular Snowflake Texture
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const rad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    rad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    rad.addColorStop(0.5, "rgba(255, 255, 255, 0.9)");
    rad.addColorStop(0.8, "rgba(255, 255, 255, 0.35)");
    rad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();

    const snowTex = new THREE.CanvasTexture(canvas);

    snowMaterial = new THREE.PointsMaterial({
      size: 4.8,
      map: snowTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    snowPoints = new THREE.Points(snowGeo, snowMaterial);
    scene.add(snowPoints);
  }

  // 3. REALISTIC BLIZZARD & ICE NEEDLE GALE SYSTEM
  function createBlizzardSystem() {
    const count = 2600;
    blizzardGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 360;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 220;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;
      speeds[i] = 5.5 + Math.random() * 7.0;
    }

    blizzardGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    blizzardGeo.setAttribute("speed", new THREE.BufferAttribute(speeds, 1));

    // Fine aerodynamic wind flurry streak
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 8, 64, 8);
    grad.addColorStop(0, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.3, "rgba(255, 255, 255, 0.5)");
    grad.addColorStop(0.5, "rgba(255, 255, 255, 1.0)");
    grad.addColorStop(0.7, "rgba(255, 255, 255, 0.5)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 5, 64, 6);
    const blizTex = new THREE.CanvasTexture(canvas);

    blizzardMaterial = new THREE.PointsMaterial({
      size: 5.2,
      map: blizTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    blizzardPoints = new THREE.Points(blizzardGeo, blizzardMaterial);
    scene.add(blizzardPoints);
  }

  // 4. FOG & MIST WISPS
  function createFogSystem() {
    const count = 260;
    fogGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 340;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 180;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      speeds[i] = 0.15 + Math.random() * 0.25;
    }

    fogGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    fogGeo.setAttribute("speed", new THREE.BufferAttribute(speeds, 1));

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const rad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    rad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
    rad.addColorStop(0.6, "rgba(255, 255, 255, 0.15)");
    rad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 64, 64);
    const fogTex = new THREE.CanvasTexture(canvas);

    fogMaterial = new THREE.PointsMaterial({
      size: 22.0,
      map: fogTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    fogPoints = new THREE.Points(fogGeo, fogMaterial);
    scene.add(fogPoints);
  }

  function updateWeather(code, isDay, windSpeed, windDeg, cloudCover, temperature) {
    if (!isInitialized) return;

    const info = WEATHER_CODES[code] || { category: "clear" };
    const temp = (temperature !== undefined && temperature !== null) ? temperature : 20;

    // Reset atmospheric mode triggers
    isRain = false;
    isSnow = false;
    isBlizzard = false;
    isStorm = false;
    isFog = false;

    // 1. FREEZING COLD & SNOW CONDITIONS (Cold temp <= 3°C or any Snow/Freezing WMO codes)
    const isFreezingOrSnow = temp <= 3 || 
                             info.category === "snow" || 
                             code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86 ||
                             code === 56 || code === 57 || code === 66 || code === 67;

    if (isFreezingOrSnow) {
      if (code === 75 || code === 86 || (windSpeed || 0) > 26) {
        isBlizzard = true;
      } else {
        isSnow = true;
      }
    } 
    // 2. RAIN & STORMS (Above Freezing > 3°C)
    else if (info.category === "rain") {
      isRain = true;
    } else if (info.category === "thunderstorm") {
      isRain = true;
      isStorm = true;
    } 
    // 3. FOG & MIST
    else if (info.category === "clouds" && (code === 45 || code === 48)) {
      isFog = true;
    }
    // 4. WARM / SUNNY / SUMMER (temp > 3°C and clear/dry) -> All particle systems remain inactive (0 opacity)

    // Wind tilt calculation
    const rad = ((windDeg || 0) * Math.PI) / 180;
    windTilt = Math.sin(rad) * 0.8;
    windSpeedScalar = Math.max(0.5, (windSpeed || 15) / 15);
  }

  function animate() {
    requestAnimationFrame(animate);

    // Target Opacity Interpolations
    const targetRainOp = isRain ? (isStorm ? 0.9 : 0.75) : 0;
    const targetSnowOp = isSnow ? 0.85 : 0;
    const targetBlizzardOp = isBlizzard ? 0.95 : 0;
    const targetFogOp = isFog ? 0.6 : 0;

    rainMaterial.opacity += (targetRainOp - rainMaterial.opacity) * 0.05;
    snowMaterial.opacity += (targetSnowOp - snowMaterial.opacity) * 0.05;
    blizzardMaterial.opacity += (targetBlizzardOp - blizzardMaterial.opacity) * 0.05;
    fogMaterial.opacity += (targetFogOp - fogMaterial.opacity) * 0.05;

    // 1. Rain Physics
    if (rainMaterial.opacity > 0.01) {
      const pos = rainGeo.attributes.position.array;
      const vel = rainGeo.attributes.velocity.array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 1] -= vel[i] * windSpeedScalar;
        pos[i * 3] += windTilt * 1.6;
        if (pos[i * 3 + 1] < -100) {
          pos[i * 3 + 1] = 100;
          pos[i * 3] = (Math.random() - 0.5) * 320;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    // 2. Snow Physics (Gentle peaceful downward floating)
    if (snowMaterial.opacity > 0.01) {
      const pos = snowGeo.attributes.position.array;
      const wander = snowGeo.attributes.wander.array;
      const fallSpeeds = snowGeo.attributes.fallSpeed.array;
      for (let i = 0; i < pos.length / 3; i++) {
        wander[i] += 0.015;
        pos[i * 3 + 1] -= fallSpeeds[i] * windSpeedScalar;
        pos[i * 3] += Math.sin(wander[i]) * 0.35 + windTilt * 0.6;
        pos[i * 3 + 2] += Math.cos(wander[i]) * 0.25;
        if (pos[i * 3 + 1] < -100) {
          pos[i * 3 + 1] = 100;
          pos[i * 3] = (Math.random() - 0.5) * 320;
        }
      }
      snowGeo.attributes.position.needsUpdate = true;
    }

    // 3. Blizzard Gale Vortex Physics (Intense fast horizontal wind flurry streaks)
    if (blizzardMaterial.opacity > 0.01) {
      const pos = blizzardGeo.attributes.position.array;
      const spd = blizzardGeo.attributes.speed.array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += spd[i] * 1.6 * (windTilt >= 0 ? 1.4 : -1.4);
        pos[i * 3 + 1] -= 2.0 * windSpeedScalar;
        pos[i * 3 + 2] += (Math.sin(pos[i * 3] * 0.04) - 0.5) * 0.4;
        if (pos[i * 3] > 180) pos[i * 3] = -180;
        if (pos[i * 3] < -180) pos[i * 3] = 180;
        if (pos[i * 3 + 1] < -110) pos[i * 3 + 1] = 110;
      }
      blizzardGeo.attributes.position.needsUpdate = true;
    }

    // 4. Fog & Mist Drift Physics
    if (fogMaterial.opacity > 0.01) {
      const pos = fogGeo.attributes.position.array;
      const spd = fogGeo.attributes.speed.array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3] += spd[i];
        if (pos[i * 3] > 180) pos[i * 3] = -180;
      }
      fogGeo.attributes.position.needsUpdate = true;
    }

    // 7. Thunderstorm Lightning Flash
    if (isStorm) {
      lightningTimer++;
      if (lightningTimer > 160 && Math.random() < 0.045) {
        lightningLight.intensity = 25 + Math.random() * 20;
        if (state.isAudioActive) ProceduralAudio.triggerThunder();
        lightningTimer = 0;
      } else {
        lightningLight.intensity *= 0.82;
      }
    } else {
      lightningLight.intensity = 0;
    }

    renderer.render(scene, camera);
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  return { init, updateWeather };
})();

/**
 * ==========================================================================
 * 2. THREE.JS REALISTIC 3D EARTH GLOBE ENGINE
 * ==========================================================================
 */
const ThreeGlobe = (function() {
  let scene, camera, renderer, controls;
  let earthMesh, cloudMesh, atmosphereMesh;
  let cityPinGroup, pinPulseRing;
  let isInitialized = false;
  let isFlying = false;
  let raycaster, mouse;

  function init() {
    const canvas = dom.globeCanvas;
    if (!canvas || typeof THREE === "undefined") return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // OrbitControls
    if (typeof THREE.OrbitControls !== "undefined") {
      controls = new THREE.OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 7.0;
      controls.maxDistance = 32;
      controls.rotateSpeed = 0.6;
      controls.autoRotate = state.autoRotateGlobe;
      controls.autoRotateSpeed = 0.6;
    }

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Natural Photorealistic Lighting
    const ambientLight = new THREE.AmbientLight(0x334455, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(25, 10, 20);
    scene.add(sunLight);

    // Starfield
    createStarfield();

    // Photorealistic Earth Sphere
    createRealisticEarth();

    // City Pin Beacon
    createCityPin();

    // Single Click vs Drag Detection
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    canvas.addEventListener("pointerdown", (e) => {
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
    });

    canvas.addEventListener("pointermove", (e) => {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) {
        isDragging = true;
      }
    });

    canvas.addEventListener("pointerup", (e) => {
      if (isDragging || isFlying || !camera || !renderer) return;
      onGlobeSelect(e);
    });

    window.addEventListener("resize", onResize);

    isInitialized = true;
    animate();
  }

  function createStarfield() {
    // Deep space clean backdrop - no floating dots near globe
  }

  function createRealisticEarth() {
    // Initial Procedural Canvas texture as fast-fallback
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Real ocean colors
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    oceanGrad.addColorStop(0, "#0a192f");
    oceanGrad.addColorStop(0.5, "#0d2b45");
    oceanGrad.addColorStop(1, "#0a192f");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Realistic Continental Shapes
    ctx.fillStyle = "#2d5a27"; // Natural terrain green
    // North America
    ctx.beginPath();
    ctx.ellipse(460, 310, 220, 140, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // South America
    ctx.beginPath();
    ctx.ellipse(630, 650, 130, 200, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Eurasia
    ctx.beginPath();
    ctx.ellipse(1360, 320, 380, 180, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // Africa
    ctx.fillStyle = "#8a7d53"; // Sahara desert hues
    ctx.beginPath();
    ctx.ellipse(1120, 560, 160, 200, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Australia
    ctx.fillStyle = "#a26a42";
    ctx.beginPath();
    ctx.ellipse(1660, 720, 130, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    const fallbackTexture = new THREE.CanvasTexture(canvas);

    // Earth Sphere Material
    const earthGeo = new THREE.SphereGeometry(5, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: fallbackTexture,
      roughness: 0.6,
      metalness: 0.1
    });
    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // Realistic NASA Satellite Texture Loader (CORS anonymous)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin("anonymous");

    // NASA Blue Marble high-res earth day map
    const earthMapUrl = "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg";
    const earthBumpUrl = "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png";
    const earthCloudsUrl = "https://unpkg.com/three-globe@2.31.1/example/img/earth-clouds.png";

    textureLoader.load(
      earthMapUrl,
      (tex) => {
        earthMat.map = tex;
        earthMat.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn("Satellite map fallback active");
      }
    );

    textureLoader.load(earthBumpUrl, (bumpTex) => {
      earthMat.bumpMap = bumpTex;
      earthMat.bumpScale = 0.08;
      earthMat.needsUpdate = true;
    });

    // Cloud Sphere Layer
    const cloudGeo = new THREE.SphereGeometry(5.08, 64, 64);
    const cloudMat = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(cloudMesh);

    textureLoader.load(earthCloudsUrl, (cloudTex) => {
      cloudMat.map = cloudTex;
      cloudMat.needsUpdate = true;
    });

    // Realistic Atmospheric Fresnel Glow Halo
    const atmosGeo = new THREE.SphereGeometry(5.25, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
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
          float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.8);
          gl_FragColor = vec4(0.3, 0.65, 0.95, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosphereMesh);
  }

  function createCityPin() {
    cityPinGroup = new THREE.Group();

    // 1. Sleek Crimson/Metallic Conical Pin Needle Stem pointing into Earth's surface
    const needleGeo = new THREE.ConeGeometry(0.045, 0.28, 16);
    const needleMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.7,
      roughness: 0.2
    });
    const needle = new THREE.Mesh(needleGeo, needleMat);
    needle.rotation.x = Math.PI; // Point sharp cone tip down to surface at (0, 0, 0)
    needle.position.y = 0.14;
    cityPinGroup.add(needle);

    // 2. Vibrant Red Spherical Map Pin Head
    const headGeo = new THREE.SphereGeometry(0.085, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0x550000,
      metalness: 0.3,
      roughness: 0.2
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.31;
    cityPinGroup.add(head);

    // 3. Inner White Contrast Pin Core Dot
    const dotGeo = new THREE.SphereGeometry(0.038, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.y = 0.31;
    dot.position.z = 0.06;
    cityPinGroup.add(dot);

    // 4. Subtle Red Ground Surface Pulse Ring
    const ringGeo = new THREE.RingGeometry(0.05, 0.14, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff3b30,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    pinPulseRing = new THREE.Mesh(ringGeo, ringMat);
    pinPulseRing.rotation.x = Math.PI / 2;
    cityPinGroup.add(pinPulseRing);

    scene.add(cityPinGroup);
    updatePinLocation(state.currentLat, state.currentLng);
  }

  function latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  }

  function vector3ToLatLng(vector) {
    const norm = vector.clone().normalize();
    const phi = Math.acos(Math.max(-1, Math.min(1, norm.y)));
    const lat = 90 - (phi * 180) / Math.PI;

    let theta = Math.atan2(norm.z, -norm.x);
    if (theta < 0) theta += Math.PI * 2;

    let lng = (theta * 180) / Math.PI - 180;
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;

    return { lat, lng };
  }

  function updatePinLocation(lat, lng) {
    if (!cityPinGroup) return;
    const pos = latLngToVector3(lat, lng, 5.04);
    cityPinGroup.position.copy(pos);
    cityPinGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());

    if (dom.globeCoordsHud) {
      const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
      const lngStr = `${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
      dom.globeCoordsHud.textContent = `${latStr}, ${lngStr}`;
    }
  }

  function flyTo(lat, lng) {
    if (!controls || !camera) return;
    isFlying = true;
    updatePinLocation(lat, lng);

    const targetPos = latLngToVector3(lat, lng, 14.0);
    const startPos = camera.position.clone();
    const startTime = performance.now();
    const duration = 1000;

    function step(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      camera.position.lerpVectors(startPos, targetPos, ease);
      controls.target.set(0, 0, 0);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        isFlying = false;
      }
    }
    requestAnimationFrame(step);
  }

  function onGlobeSelect(event) {
    if (isFlying || !camera || !renderer) return;

    const rect = dom.globeCanvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(earthMesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const { lat, lng } = vector3ToLatLng(point);
      showToast(`3D Globe: Loading ${lat.toFixed(2)}°, ${lng.toFixed(2)}°...`);
      fetchLocationAndWeather(lat, lng, { reverseGeocode: true });
    }
  }

  function toggleAutoRotate() {
    state.autoRotateGlobe = !state.autoRotateGlobe;
    if (controls) controls.autoRotate = state.autoRotateGlobe;
    if (dom.globeAutoRotateBtn) {
      dom.globeAutoRotateBtn.classList.toggle("active", state.autoRotateGlobe);
    }
    showToast(`3D Globe Auto-Spin: ${state.autoRotateGlobe ? "Enabled" : "Paused"}`);
  }

  function animate() {
    requestAnimationFrame(animate);

    if (cloudMesh) cloudMesh.rotation.y += 0.0004;

    if (pinPulseRing) {
      const scale = 1 + (Math.sin(performance.now() * 0.005) + 1) * 0.5;
      pinPulseRing.scale.set(scale, scale, scale);
    }

    if (controls) controls.update();
    renderer.render(scene, camera);
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  return { init, updatePinLocation, flyTo, toggleAutoRotate };
})();

/**
 * ==========================================================================
 * 3. THREE.JS 3D MICRO-WIDGETS (MONOCHROME WIND GYROSCOPE & SOLAR ARC)
 * ==========================================================================
 */
const ThreeWidgets = (function() {
  let windScene, windCamera, windRenderer, windNeedle;
  let solarScene, solarCamera, solarRenderer, solarSun, solarMoon;

  function init() {
    initWindGyro();
    initSolarArc();
  }

  function initWindGyro() {
    const canvas = dom.windCompassCanvas;
    if (!canvas || typeof THREE === "undefined") return;

    windScene = new THREE.Scene();
    windCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    windCamera.position.set(0, 0, 5);

    windRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    windRenderer.setSize(52, 52);
    windRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Outer Ring Bezel (Monochrome White)
    const ringGeo = new THREE.RingGeometry(1.6, 1.85, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    windScene.add(ring);

    // 3D Compass Magnetic Needle
    const needleGroup = new THREE.Group();

    const northGeo = new THREE.ConeGeometry(0.35, 1.4, 16);
    const northMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const north = new THREE.Mesh(northGeo, northMat);
    north.position.y = 0.7;
    needleGroup.add(north);

    const southGeo = new THREE.ConeGeometry(0.35, 1.4, 16);
    const southMat = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const south = new THREE.Mesh(southGeo, southMat);
    south.position.y = -0.7;
    south.rotation.x = Math.PI;
    needleGroup.add(south);

    windNeedle = needleGroup;
    windScene.add(windNeedle);

    animateWind();
  }

  function animateWind() {
    requestAnimationFrame(animateWind);
    if (windRenderer && windScene && windCamera) {
      windRenderer.render(windScene, windCamera);
    }
  }

  function updateWindDirection(deg) {
    if (!windNeedle) return;
    const rad = -((deg || 0) * Math.PI) / 180;
    windNeedle.rotation.z = rad;
  }

  function initSolarArc() {
    const canvas = dom.solar3dCanvas;
    if (!canvas || typeof THREE === "undefined") return;

    solarScene = new THREE.Scene();
    solarCamera = new THREE.PerspectiveCamera(50, 100 / 36, 0.1, 100);
    solarCamera.position.set(0, 0, 6);

    solarRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    solarRenderer.setSize(100, 36);
    solarRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 3D Sun (Crisp White)
    const sunGeo = new THREE.SphereGeometry(0.38, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    solarSun = new THREE.Mesh(sunGeo, sunMat);
    solarScene.add(solarSun);

    // 3D Moon
    const moonGeo = new THREE.SphereGeometry(0.32, 24, 24);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    solarMoon = new THREE.Mesh(moonGeo, moonMat);
    solarMoon.position.set(0, -10, 0);
    solarScene.add(solarMoon);

    animateSolar();
  }

  function animateSolar() {
    requestAnimationFrame(animateSolar);
    if (solarRenderer && solarScene && solarCamera) {
      solarRenderer.render(solarScene, solarCamera);
    }
  }

  function updateSolarPosition(progress, isDayTime) {
    if (!solarSun || !solarMoon) return;
    const clampedProg = Math.max(0, Math.min(1, progress));
    const x = (clampedProg - 0.5) * 4.4;
    const y = Math.sin(clampedProg * Math.PI) * 1.5 - 0.2;

    if (isDayTime) {
      solarSun.position.set(x, y, 0);
      solarMoon.position.set(0, -10, 0);
    } else {
      solarMoon.position.set(x, y, 0);
      solarSun.position.set(0, -10, 0);
    }
  }

  return { init, updateWindDirection, updateSolarPosition };
})();

/**
 * ==========================================================================
 * 4. PROCEDURAL WEB AUDIO ENGINE
 * ==========================================================================
 */
const ProceduralAudio = (function() {
  let audioCtx = null;
  let masterGain = null;
  let activeNodes = [];
  let windNodes = [];

  function init() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.32, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  function toggle() {
    init();
    if (!audioCtx) return;

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    state.isAudioActive = !state.isAudioActive;
    if (dom.audioFxBtn) {
      dom.audioFxBtn.classList.toggle("active", state.isAudioActive);
    }

    if (state.isAudioActive) {
      updateSoundscape();
      showToast("🔊 Atmospheric Audio: Enabled");
    } else {
      stopAll();
      showToast("🔇 Atmospheric Audio: Muted");
    }
  }

  function updateSoundscape() {
    if (!state.isAudioActive || !audioCtx || !state.weatherData) return;
    stopAll();

    const current = state.weatherData.current || {};
    const code = current.weather_code || 0;
    const windSpeed = current.wind_speed_10m || 10;
    const temp = current.temperature_2m || 20;
    const isDay = current.is_day === 1;
    const info = WEATHER_CODES[code] || { category: "clear" };

    // 1. Dynamic Wind Audio (Present everywhere based on local wind velocity)
    if (windSpeed > 2) {
      startDynamicWindSound(windSpeed);
    }

    // 2. Weather & Temperature Specific Audio Synthesis
    const isFreezingOrSnow = temp <= 3 || 
                             info.category === "snow" || 
                             code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86 ||
                             code === 56 || code === 57 || code === 66 || code === 67;

    if (isFreezingOrSnow) {
      if (code === 75 || code === 86 || windSpeed > 26) {
        startBlizzardSound();
      } else {
        startSnowSound();
      }
    } else if (info.category === "rain") {
      startRainSound(code);
    } else if (info.category === "thunderstorm") {
      startRainSound(code);
      startStormAmbience();
    } else if (info.category === "clear" || code === 0 || code === 1) {
      if (temp >= 30) {
        startHeatAmbience();
      } else if (isDay) {
        startSunnyAmbience();
      } else {
        startNightAmbience();
      }
    } else if (info.category === "clouds") {
      startCloudAmbience();
    }
  }

  // 1. REALISTIC PROCEDURAL WIND (MODULATED GUSTS)
  function startDynamicWindSound(speedKmH) {
    if (!audioCtx) return;
    const speed = Math.max(3, speedKmH);
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink / Brownian Noise Synthesis
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.12;
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    // Resonant Bandpass Filter tuned to wind speed
    const centerFreq = Math.min(1200, 260 + speed * 14);
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(centerFreq, audioCtx.currentTime);
    filter.Q.setValueAtTime(2.2, audioCtx.currentTime);

    // LFO for natural gust undulations
    const lfo = audioCtx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.18 + Math.min(0.4, speed * 0.005), audioCtx.currentTime);

    const lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(centerFreq * 0.45, audioCtx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = audioCtx.createGain();
    const windVol = Math.min(0.28, 0.04 + (speed / 60) * 0.18);
    gain.gain.setValueAtTime(windVol, audioCtx.currentTime);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    noiseSource.start();
    lfo.start();
    windNodes.push(noiseSource, lfo);
  }

  // 2. RAIN SOUND SYNTHESIZER
  function startRainSound(code) {
    if (!audioCtx) return;
    const isHeavy = code === 65 || code === 82 || code === 95 || code === 99;
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.025 * white) / 1.025;
      lastOut = data[i];
      data[i] *= 3.8;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isHeavy ? 1400 : 750, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(isHeavy ? 0.22 : 0.12, audioCtx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start();
    activeNodes.push(noise);
  }

  // 3. SNOW & WINTER HUSH SOUND
  function startSnowSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    activeNodes.push(osc);
  }

  // 4. BLIZZARD & HOWLING GALE
  function startBlizzardSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, audioCtx.currentTime);

    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(620, audioCtx.currentTime);
    filter.Q.setValueAtTime(5.0, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.16, audioCtx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();
    activeNodes.push(osc);
  }

  // 5. SUNNY & WARM AMBIENT HARMONIC SHIMMER
  function startSunnyAmbience() {
    if (!audioCtx) return;
    const frequencies = [220, 277.18, 329.63]; // Warm A Major Chord
    frequencies.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.02 - idx * 0.005, audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      activeNodes.push(osc);
    });
  }

  // 6. HEAT WAVE AMBIENCE
  function startHeatAmbience() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    activeNodes.push(osc);
  }

  // 7. CLOUD & OVERCAST AMBIENCE
  function startCloudAmbience() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.025, audioCtx.currentTime);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    activeNodes.push(osc);
  }

  // 8. NIGHT CLEAR AMBIENCE
  function startNightAmbience() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    activeNodes.push(osc);
  }

  // 9. THUNDERSTORM RUMBLE TRIGGER
  function triggerThunder() {
    if (!audioCtx || !state.isAudioActive) return;
    const osc = audioCtx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(55, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(18, audioCtx.currentTime + 1.4);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.38, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.8);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.9);
  }

  function startStormAmbience() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60, audioCtx.currentTime);

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();
    activeNodes.push(osc);
  }

  function stopAll() {
    activeNodes.forEach((node) => {
      try { node.stop(); } catch (e) {}
    });
    activeNodes = [];

    windNodes.forEach((node) => {
      try { node.stop(); } catch (e) {}
    });
    windNodes = [];
  }

  return { init, toggle, updateSoundscape, triggerThunder };
})();

/**
 * ==========================================================================
 * 5. LOCOMOTIVE SCROLL INERTIA CONTROLLER
 * ==========================================================================
 */
const LocomotiveController = (function() {
  function init() {
    const scrollContainer = dom.weatherCardScrollBody;
    if (!scrollContainer) return;
    scrollContainer.style.scrollBehavior = "smooth";
  }

  function update() {
    // Container naturally handles updates
  }

  return { init, update };
})();

/**
 * ==========================================================================
 * 6. INITIALIZATION & CONTROLLER
 * ==========================================================================
 */
function init() {
  // Check if a location was previously loaded
  const saved = getSavedLocation();
  if (saved && saved.lat !== undefined && saved.lng !== undefined) {
    state.currentLat = saved.lat;
    state.currentLng = saved.lng;
    state.currentCity = saved.city || "Selected Location";
    state.currentCountry = saved.country || "";
    state.currentCountryCode = saved.countryCode || "";
  }

  document.body.classList.add("view-3d-mode");
  document.body.classList.remove("view-2d-mode");
  if (dom.viewModeLabel) {
    dom.viewModeLabel.textContent = "2D Map";
  }

  initMap();
  ThreeWeatherFX.init();
  ThreeGlobe.init();
  ThreeWidgets.init();
  LocomotiveController.init();

  setupEventListeners();
  setupKeyboardShortcuts();

  if (saved) {
    // Restore exact saved location
    fetchLocationAndWeather(saved.lat, saved.lng, {
      city: saved.city,
      country: saved.country,
      countryCode: saved.countryCode,
      zoom: 6
    });
  } else {
    // First visit: try GPS geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchLocationAndWeather(pos.coords.latitude, pos.coords.longitude, {
            reverseGeocode: true,
            zoom: 8
          });
        },
        () => {
          // Fallback to New York if GPS not granted
          fetchLocationAndWeather(40.7128, -74.0060, {
            city: "New York",
            country: "United States",
            countryCode: "US",
            zoom: 6
          });
        },
        { timeout: 5000 }
      );
    } else {
      fetchLocationAndWeather(40.7128, -74.0060, {
        city: "New York",
        country: "United States",
        countryCode: "US",
        zoom: 6
      });
    }
  }
}

/**
 * Initialize Leaflet Map
 */
function initMap() {
  mapInstance = L.map("map", {
    center: [state.currentLat, state.currentLng],
    zoom: 4,
    minZoom: 2,
    maxZoom: 18,
    zoomControl: true,
    worldCopyJump: true
  });

  setTileLayer("voyager");

  const customIcon = L.divIcon({
    className: "custom-pin-marker",
    html: `
      <div class="pin-pulse"></div>
      <div class="pin-pulse pin-pulse-delay"></div>
      <div class="pin-core"></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  state.marker = L.marker([state.currentLat, state.currentLng], { icon: customIcon }).addTo(mapInstance);

  mapInstance.on("click", (e) => {
    const { lat, lng } = e.latlng;
    state.marker.setLatLng([lat, lng]);
    showToast(`2D Map: Loading ${lat.toFixed(2)}°, ${lng.toFixed(2)}°...`);
    fetchLocationAndWeather(lat, lng, { reverseGeocode: true });
  });
}

function setTileLayer(key) {
  if (!TILE_LAYERS[key]) return;
  if (activeTileLayer) mapInstance.removeLayer(activeTileLayer);

  const layerConfig = TILE_LAYERS[key];
  activeTileLayer = L.tileLayer(layerConfig.url, layerConfig.options);
  activeTileLayer.addTo(mapInstance);
  state.activeTileLayerKey = key;

  document.querySelectorAll(".layer-option-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.layer === key);
  });
}

function toggleViewMode() {
  state.viewMode = state.viewMode === "2d" ? "3d" : "2d";
  document.body.classList.toggle("view-3d-mode", state.viewMode === "3d");
  document.body.classList.toggle("view-2d-mode", state.viewMode === "2d");

  if (dom.viewModeLabel) {
    dom.viewModeLabel.textContent = state.viewMode === "3d" ? "2D Map" : "3D Globe";
  }

  if (state.viewMode === "3d") {
    ThreeGlobe.flyTo(state.currentLat, state.currentLng);
    showToast("Switched to Interactive Realistic 3D Earth Globe");
  } else {
    mapInstance.invalidateSize();
    mapInstance.flyTo([state.currentLat, state.currentLng], 6, { duration: 1.2 });
    showToast("Switched to 2D Cartographic Map");
  }
}

/**
 * Data Fetching
 */
async function fetchLocationAndWeather(lat, lng, options = {}) {
  try {
    setLoadingState(true);

    if (options.reverseGeocode || (!options.city && !options.country)) {
      const geoInfo = await reverseGeocode(lat, lng);
      state.currentCity = geoInfo.city;
      state.currentCountry = geoInfo.country;
      state.currentCountryCode = geoInfo.countryCode;
    } else {
      if (options.city) state.currentCity = options.city;
      if (options.country) state.currentCountry = options.country;
      if (options.countryCode !== undefined) state.currentCountryCode = options.countryCode;
    }

    state.currentLat = lat;
    state.currentLng = lng;

    // Save location to localStorage so reload stays on this location
    saveSavedLocation({
      lat: state.currentLat,
      lng: state.currentLng,
      city: state.currentCity,
      country: state.currentCountry,
      countryCode: state.currentCountryCode
    });

    if (state.marker) state.marker.setLatLng([lat, lng]);

    // Sync 2D Map & 3D Globe
    if (options.zoom && mapInstance) {
      mapInstance.flyTo([lat, lng], options.zoom, { duration: 1.4 });
    }
    ThreeGlobe.flyTo(lat, lng);

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`;

    const res = await fetch(weatherUrl);
    if (!res.ok) throw new Error("Failed to retrieve weather data from Open-Meteo.");

    const data = await res.json();
    state.weatherData = data;
    state.currentTimezone = data.timezone || "UTC";
    state.currentElevation = data.elevation || 0;

    if (document.activeElement !== dom.searchInput) {
      dom.searchInput.value = state.currentCity || "";
      dom.searchClearBtn.style.display = dom.searchInput.value ? "flex" : "none";
    }

    renderWeatherDashboard();
    startLiveClock();

    // Update 3D Engines & Audio
    const current = data.current;
    if (current) {
      ThreeWeatherFX.updateWeather(
        current.weather_code,
        current.is_day === 1,
        current.wind_speed_10m,
        current.wind_direction_10m,
        current.cloud_cover,
        current.temperature_2m
      );
      ThreeWidgets.updateWindDirection(current.wind_direction_10m);
    }
    ProceduralAudio.updateSoundscape();
    LocomotiveController.update();

    setLoadingState(false);
    dom.mainDashboard.classList.remove("collapsed");

  } catch (err) {
    console.error("Weather fetch error:", err);
    showToast("⚠️ Could not load weather telemetry for this location.");
    setLoadingState(false);
  }
}

/**
 * Reverse Geocoding
 */
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || "Location";
      const country = data.countryName || (data.localityInfo?.informative?.[0]?.name) || "Global Region";
      const countryCode = data.countryCode || "";
      return { city, country, countryCode };
    }
  } catch (e) {
    console.warn("Reverse geocode fallback:", e);
  }

  return {
    city: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
    country: "World Coordinates",
    countryCode: ""
  };
}

/**
 * Search Autocomplete
 */
async function searchLocations(query) {
  if (!query || query.trim().length < 2) {
    dom.searchResults.innerHTML = "";
    dom.searchResults.classList.remove("active");
    state.searchResults = [];
    return;
  }

  dom.searchResults.innerHTML = `
    <div class="search-loading-state">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
      </svg>
      Searching places & coordinates...
    </div>
  `;
  dom.searchResults.classList.add("active");

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Search failed");
    
    const data = await res.json();
    state.searchResults = data.results || [];
    state.activeSearchIndex = -1;

    renderSearchResults();
  } catch (err) {
    console.error("Geocoding search error:", err);
    dom.searchResults.innerHTML = `<div class="search-empty-state">No matching places found</div>`;
  }
}

function renderSearchResults() {
  if (!state.searchResults || state.searchResults.length === 0) {
    dom.searchResults.innerHTML = `<div class="search-empty-state">No matching places found</div>`;
    dom.searchResults.classList.add("active");
    return;
  }

  dom.searchResults.innerHTML = state.searchResults.map((item, idx) => {
    const flag = getFlagEmoji(item.country_code);
    const region = [item.admin1, item.country].filter(Boolean).join(", ");
    return `
      <div class="search-result-item" data-index="${idx}">
        <div class="search-result-info">
          <span class="result-flag">${flag}</span>
          <div class="result-text">
            <span class="result-name">${escapeHtml(item.name)}</span>
            <span class="result-country">${escapeHtml(region)}</span>
          </div>
        </div>
        <span class="result-coords">${item.latitude.toFixed(2)}°, ${item.longitude.toFixed(2)}°</span>
      </div>
    `;
  }).join("");

  dom.searchResults.classList.add("active");

  dom.searchResults.querySelectorAll(".search-result-item").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.dataset.index, 10);
      selectSearchResult(idx);
    });
  });
}

function selectSearchResult(index) {
  const item = state.searchResults[index];
  if (!item) return;

  dom.searchInput.value = item.name;
  dom.searchResults.classList.remove("active");
  dom.searchClearBtn.style.display = "flex";

  fetchLocationAndWeather(item.latitude, item.longitude, {
    city: item.name,
    country: item.country || "",
    countryCode: item.country_code || "",
    zoom: 9
  });
}

/**
 * Rendering Dashboard (Monochrome Black & White)
 */
function renderWeatherDashboard() {
  const data = state.weatherData;
  if (!data || !data.current) return;

  const current = data.current;
  const daily = data.daily || {};
  const isDay = current.is_day === 1;
  const codeInfo = WEATHER_CODES[current.weather_code] || { label: "Clear", icon: "sun", status: "Real-Time Telemetry" };

  // 1. Location Meta
  dom.locationFlag.textContent = getFlagEmoji(state.currentCountryCode) || "📍";
  dom.locationCity.textContent = state.currentCity || "Selected Location";
  dom.locationCountry.textContent = state.currentCountry || "Global Coordinates";
  if (dom.locationElevationBadge) {
    dom.locationElevationBadge.textContent = `Elev: ${Math.round(state.currentElevation)}m`;
  }
  dom.timezonePill.textContent = state.currentTimezone.replace(/_/g, " ");

  // 2. Hero Temperature & Badges (Monochrome)
  const tempVal = formatTemp(current.temperature_2m);
  const feelsLikeVal = formatTemp(current.apparent_temperature);
  const tempUnit = `°${state.unit}`;

  dom.tempValue.textContent = tempVal;
  dom.tempUnitSymbol.textContent = tempUnit;
  dom.tempFeelsLike.textContent = `Feels like ${feelsLikeVal}${tempUnit}`;
  dom.weatherConditionText.textContent = codeInfo.label;
  if (dom.weatherStatusTag) {
    dom.weatherStatusTag.textContent = codeInfo.status || "Real-Time Telemetry";
  }
  dom.weatherHeroIcon.innerHTML = getWeatherSvgIcon(codeInfo.icon, isDay);

  // Daily High / Low
  if (daily.temperature_2m_max?.[0] !== undefined && daily.temperature_2m_min?.[0] !== undefined) {
    dom.tempHighVal.textContent = `${formatTemp(daily.temperature_2m_max[0])}°`;
    dom.tempLowVal.textContent = `${formatTemp(daily.temperature_2m_min[0])}°`;
  }

  // 3. Telemetry Gauges
  const humidity = current.relative_humidity_2m ?? 0;
  dom.metricHumidity.textContent = `${humidity}%`;
  dom.humidityBarFill.style.width = `${Math.min(100, Math.max(5, humidity))}%`;
  dom.humidityStatus.textContent = humidity > 70 ? "Humid / Muggy" : (humidity < 30 ? "Dry Air" : "Optimal Comfort");

  const windCompass = getWindDirectionCompass(current.wind_direction_10m);
  dom.metricWind.textContent = formatWindSpeed(current.wind_speed_10m);
  const windKmh = current.wind_speed_10m ?? 0;
  dom.windBarFill.style.width = `${Math.min(100, Math.max(8, (windKmh / 60) * 100))}%`;
  dom.windDirectionSub.textContent = `${windCompass} (${current.wind_direction_10m}°)`;

  const uv = current.uv_index !== undefined ? current.uv_index : 0;
  dom.metricUv.textContent = uv.toFixed(1);
  dom.uvBarFill.style.width = `${Math.min(100, Math.max(5, (uv / 12) * 100))}%`;
  let uvLabel = "Low Risk (0-2)";
  if (uv >= 11) uvLabel = "Extreme Warning (11+)";
  else if (uv >= 8) uvLabel = "Very High Risk (8-10)";
  else if (uv >= 6) uvLabel = "High Risk (6-7)";
  else if (uv >= 3) uvLabel = "Moderate Exposure (3-5)";
  dom.uvStatus.textContent = uvLabel;

  const pop = daily.precipitation_probability_max?.[0] ?? current.precipitation ?? 0;
  dom.metricPrecip.textContent = `${pop}%`;
  dom.precipBarFill.style.width = `${Math.min(100, Math.max(5, pop))}%`;
  dom.precipStatus.textContent = pop > 60 ? "Precipitation Likely" : (pop > 20 ? "Possible Showers" : "Dry Conditions");

  // 4. Hourly Forecast
  renderHourlyForecast(data.hourly);

  // 5. 7-Day Extended Outlook
  renderDailyForecast(data.daily);

  // 6. Solar Cycle & Arc
  if (daily.sunrise?.[0] && daily.sunset?.[0]) {
    dom.sunSunriseTime.textContent = formatIsoTimeToLocal(daily.sunrise[0], state.currentTimezone);
    dom.sunSunsetTime.textContent = formatIsoTimeToLocal(daily.sunset[0], state.currentTimezone);

    try {
      const riseDate = new Date(daily.sunrise[0]);
      const setDate = new Date(daily.sunset[0]);
      const now = new Date();
      const diffMs = setDate - riseDate;
      if (diffMs > 0) {
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (dom.daylightDurationBadge) {
          dom.daylightDurationBadge.textContent = `${hrs}h ${mins}m daylight`;
        }

        const currentProgress = (now - riseDate) / diffMs;
        ThreeWidgets.updateSolarPosition(currentProgress, isDay);
      }
    } catch (e) {
      console.warn("Solar calculation issue:", e);
    }
  }

  // 7. Atmospheric Telemetry Details Grid
  dom.detailWindFull.textContent = `${formatWindSpeed(current.wind_speed_10m)} • ${windCompass}`;
  dom.detailWindGusts.textContent = `Peak Gusts: ${formatWindSpeed(current.wind_gusts_10m)}`;

  const pressure = Math.round(current.surface_pressure);
  dom.detailPressure.textContent = `${pressure} hPa`;
  if (dom.detailPressureStatus) {
    dom.detailPressureStatus.textContent = pressure > 1020 ? "High Pressure System" : (pressure < 1005 ? "Low Pressure System" : "Stable Pressure");
  }

  dom.detailClouds.textContent = `${current.cloud_cover}%`;
  dom.detailCloudsStatus.textContent = current.cloud_cover > 75 ? "Heavy Cloud Deck" : (current.cloud_cover > 35 ? "Scattered Cloudiness" : "Clear Skies");

  dom.detailCoords.textContent = `${state.currentLat.toFixed(3)}°, ${state.currentLng.toFixed(3)}°`;
  dom.detailElevation.textContent = `Elevation: ${Math.round(state.currentElevation)} m MSL`;
}

function renderHourlyForecast(hourly) {
  if (!hourly || !hourly.time) return;

  const now = new Date();
  const currentIsoHour = now.toISOString().slice(0, 13);
  let startIdx = hourly.time.findIndex(t => t.startsWith(currentIsoHour));
  if (startIdx === -1) startIdx = 0;

  const next24 = [];
  for (let i = startIdx; i < Math.min(startIdx + 24, hourly.time.length); i++) {
    next24.push({
      time: hourly.time[i],
      temp: hourly.temperature_2m[i],
      code: hourly.weather_code[i],
      pop: hourly.precipitation_probability ? hourly.precipitation_probability[i] : 0,
      isNow: i === startIdx
    });
  }

  dom.hourlyForecastContainer.innerHTML = next24.map((item) => {
    const timeLabel = formatHourlyTimeLabel(item.time, item.isNow, state.currentTimezone);
    const codeInfo = WEATHER_CODES[item.code] || { icon: "sun" };
    const hourNum = new Date(item.time).getHours();
    const isDayTime = hourNum >= 6 && hourNum < 19;

    return `
      <div class="hourly-card ${item.isNow ? 'active' : ''}">
        <span class="hourly-time">${timeLabel}</span>
        <div class="hourly-icon">${getWeatherSvgIcon(codeInfo.icon, isDayTime, 24)}</div>
        <span class="hourly-temp">${formatTemp(item.temp)}°</span>
        <span class="hourly-pop">💧 ${item.pop}%</span>
      </div>
    `;
  }).join("");
}

function renderDailyForecast(daily) {
  if (!daily || !daily.time) return;

  const allMins = daily.temperature_2m_min || [];
  const allMaxs = daily.temperature_2m_max || [];
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const tempSpan = (globalMax - globalMin) || 1;

  dom.dailyForecastContainer.innerHTML = daily.time.map((timeStr, idx) => {
    const dayName = formatDayName(timeStr, idx === 0, state.currentTimezone);
    const code = daily.weather_code[idx];
    const codeInfo = WEATHER_CODES[code] || { icon: "sun" };
    const minTemp = daily.temperature_2m_min[idx];
    const maxTemp = daily.temperature_2m_max[idx];

    const leftPct = Math.max(0, Math.round(((minTemp - globalMin) / tempSpan) * 100));
    const widthPct = Math.max(15, Math.min(100 - leftPct, Math.round(((maxTemp - minTemp) / tempSpan) * 100)));

    return `
      <div class="daily-item">
        <span class="daily-day">${dayName}</span>
        <div class="daily-icon">${getWeatherSvgIcon(codeInfo.icon, true, 22)}</div>
        <div class="daily-temp-bar-container">
          <div class="temp-bar-track">
            <div class="temp-bar-fill" style="left: ${leftPct}%; width: ${widthPct}%;"></div>
          </div>
        </div>
        <div class="daily-temp-extremes">
          <span class="min">${formatTemp(minTemp)}°</span>
          <span class="max">${formatTemp(maxTemp)}°</span>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Live Clock
 */
function startLiveClock() {
  if (state.liveClockInterval) clearInterval(state.liveClockInterval);
  updateLiveClock();
  state.liveClockInterval = setInterval(updateLiveClock, 1000);
}

function updateLiveClock() {
  try {
    const now = new Date();
    const timeOptions = {
      timeZone: state.currentTimezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    };
    
    const dateOptions = {
      timeZone: state.currentTimezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    };

    const timeFormatter = new Intl.DateTimeFormat("en-US", timeOptions);
    const dateFormatter = new Intl.DateTimeFormat("en-US", dateOptions);

    dom.liveTime.textContent = timeFormatter.format(now);
    dom.liveDate.textContent = dateFormatter.format(now);
  } catch (e) {
    const now = new Date();
    dom.liveTime.textContent = now.toLocaleTimeString();
    dom.liveDate.textContent = now.toLocaleDateString();
  }
}

/**
 * Event Listeners
 */
function setupEventListeners() {
  // 1. Search Input Debounce
  dom.searchInput.addEventListener("input", (e) => {
    const query = e.target.value;
    dom.searchClearBtn.style.display = query.length > 0 ? "flex" : "none";

    clearTimeout(state.searchDebounceTimer);
    state.searchDebounceTimer = setTimeout(() => {
      searchLocations(query);
    }, 280);
  });

  // 2. Search Clear Button
  dom.searchClearBtn.addEventListener("click", () => {
    dom.searchInput.value = "";
    dom.searchClearBtn.style.display = "none";
    dom.searchResults.classList.remove("active");
    dom.searchInput.focus();
  });

  // 3. Search Keyboard Navigation
  dom.searchInput.addEventListener("keydown", (e) => {
    const items = dom.searchResults.querySelectorAll(".search-result-item");
    if (!items || items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.activeSearchIndex = (state.activeSearchIndex + 1) % items.length;
      updateHighlightedSearchResult(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.activeSearchIndex = (state.activeSearchIndex - 1 + items.length) % items.length;
      updateHighlightedSearchResult(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (state.activeSearchIndex >= 0 && state.activeSearchIndex < items.length) {
        selectSearchResult(state.activeSearchIndex);
      } else if (state.searchResults.length > 0) {
        selectSearchResult(0);
      }
    } else if (e.key === "Escape") {
      dom.searchResults.classList.remove("active");
    }
  });

  document.addEventListener("click", (e) => {
    if (!dom.searchInput.contains(e.target) && !dom.searchResults.contains(e.target)) {
      dom.searchResults.classList.remove("active");
    }
    if (!dom.layerBtn.contains(e.target) && !dom.layerPicker.contains(e.target)) {
      dom.layerPicker.classList.remove("active");
    }
  });

  // 4. View Mode Button (2D Map <-> 3D Globe)
  dom.viewModeBtn.addEventListener("click", toggleViewMode);

  // 5. Audio FX Toggle Button
  dom.audioFxBtn.addEventListener("click", () => {
    ProceduralAudio.toggle();
  });

  // 6. Globe HUD Buttons
  if (dom.globeAutoRotateBtn) {
    dom.globeAutoRotateBtn.addEventListener("click", () => {
      ThreeGlobe.toggleAutoRotate();
    });
  }

  if (dom.globeResetBtn) {
    dom.globeResetBtn.addEventListener("click", () => {
      ThreeGlobe.flyTo(state.currentLat, state.currentLng);
      showToast(`Camera focused on ${state.currentCity}`);
    });
  }

  // 7. Geolocation Button
  dom.locateMeBtn.addEventListener("click", handleGeolocation);

  // 8. Unit Toggle (°C / °F)
  dom.unitToggleBtn.addEventListener("click", () => {
    state.unit = state.unit === "C" ? "F" : "C";
    dom.unitDisplayText.textContent = `°${state.unit}`;
    showToast(`Units switched to °${state.unit}`);
    renderWeatherDashboard();
  });

  // 9. Layer Switcher
  dom.layerBtn.addEventListener("click", () => {
    dom.layerPicker.classList.toggle("active");
  });

  dom.layerPicker.querySelectorAll(".layer-option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const layerKey = btn.dataset.layer;
      setTileLayer(layerKey);
      dom.layerPicker.classList.remove("active");
      showToast(`Map layer: ${TILE_LAYERS[layerKey].name}`);
    });
  });

  // 10. City Chips Click Handlers
  document.querySelectorAll(".city-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const lat = parseFloat(chip.dataset.lat);
      const lng = parseFloat(chip.dataset.lng);
      const name = chip.dataset.name;
      const country = chip.dataset.country;
      const code = chip.dataset.code || "";

      fetchLocationAndWeather(lat, lng, {
        city: name,
        country: country,
        countryCode: code,
        zoom: 7
      });
    });
  });

  // 11. Minimize / Restore Dashboard
  dom.minimizeBtn.addEventListener("click", () => {
    dom.mainDashboard.classList.add("collapsed");
  });

  dom.reopenBtn.addEventListener("click", () => {
    dom.mainDashboard.classList.remove("collapsed");
    LocomotiveController.update();
  });

  // 12. Brand Click -> Global View
  dom.brandHomeBtn.addEventListener("click", () => {
    if (state.viewMode === "3d") {
      ThreeGlobe.flyTo(20, 0);
    } else {
      mapInstance.flyTo([20, 0], 2.5, { duration: 1.5 });
    }
    showToast("Reset view to world overview");
  });
}

function updateHighlightedSearchResult(items) {
  items.forEach((item, idx) => {
    item.classList.toggle("highlighted", idx === state.activeSearchIndex);
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== dom.searchInput) {
      e.preventDefault();
      dom.searchInput.focus();
    }
  });
}

function handleGeolocation() {
  if (!navigator.geolocation) {
    showToast("Geolocation is not supported by your browser");
    return;
  }
  showToast("Detecting GPS coordinates...");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      showToast("Position acquired! Loading weather...");
      fetchLocationAndWeather(latitude, longitude, {
        reverseGeocode: true,
        zoom: 9
      });
    },
    (err) => {
      console.warn("Geolocation denied or failed:", err);
      showToast("Could not access location. Please check browser permissions.");
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

/**
 * Utilities
 */
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "📍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function formatTemp(celsiusVal) {
  if (celsiusVal === undefined || celsiusVal === null) return "--";
  if (state.unit === "F") {
    return Math.round((celsiusVal * 9) / 5 + 32);
  }
  return Math.round(celsiusVal);
}

function formatWindSpeed(kmh) {
  if (kmh === undefined || kmh === null) return "--";
  if (state.unit === "F") {
    const mph = Math.round(kmh * 0.621371);
    return `${mph} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

function getWindDirectionCompass(deg) {
  if (deg === undefined || deg === null) return "--";
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

function formatIsoTimeToLocal(isoStr, timezone) {
  try {
    const date = new Date(isoStr);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  } catch (e) {
    return isoStr.slice(11, 16);
  }
}

function formatHourlyTimeLabel(isoStr, isNow, timezone) {
  if (isNow) return "Now";
  try {
    const date = new Date(isoStr);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: true
    }).format(date);
  } catch (e) {
    return isoStr.slice(11, 13) + ":00";
  }
}

function formatDayName(isoDateStr, isToday, timezone) {
  if (isToday) return "Today";
  try {
    const date = new Date(isoDateStr + "T12:00:00Z");
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short"
    }).format(date);
  } catch (e) {
    return isoDateStr.slice(5);
  }
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast-msg";
  toast.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
    <span>${escapeHtml(message)}</span>
  `;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3100);
}

function setLoadingState(isLoading) {
  if (isLoading) {
    dom.weatherConditionText.textContent = "Updating telemetry...";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, function(m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m];
  });
}

function getWeatherSvgIcon(type, isDay = true, size = 64) {
  const white = "#ffffff";
  const muted = "#a3a3a3";

  switch (type) {
    case "sun":
      if (!isDay) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${white}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      }
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${white}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

    case "sun-cloud":
    case "partly-cloudy":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2" stroke="${white}"></path><path d="m4.93 4.93 1.41 1.41" stroke="${white}"></path><path d="M20 12h2" stroke="${white}"></path><path d="m19.07 4.93-1.41 1.41" stroke="${white}"></path><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="${muted}" fill="rgba(255,255,255,0.06)"></path></svg>`;

    case "cloudy":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="rgba(255,255,255,0.06)"></path></svg>`;

    case "drizzle":
    case "rain-light":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="${muted}"></path><line x1="8" y1="19" x2="8" y2="21" stroke="${white}"></line><line x1="12" y1="19" x2="12" y2="21" stroke="${white}"></line><line x1="16" y1="19" x2="16" y2="21" stroke="${white}"></line></svg>`;

    case "rain":
    case "rain-heavy":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="${muted}"></path><line x1="8" y1="19" x2="6" y2="23" stroke="${white}"></line><line x1="12" y1="19" x2="10" y2="23" stroke="${white}"></line><line x1="16" y1="19" x2="14" y2="23" stroke="${white}"></line></svg>`;

    case "snow":
    case "snow-light":
    case "snow-heavy":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="${muted}"></path><circle cx="8" cy="21" r="1" fill="${white}" stroke="${white}"></circle><circle cx="12" cy="21" r="1" fill="${white}" stroke="${white}"></circle><circle cx="16" cy="21" r="1" fill="${white}" stroke="${white}"></circle></svg>`;

    case "thunderstorm":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="${muted}"></path><polygon points="13 13 9 19 13 19 11 23 17 16 13 16 15 13" fill="${white}" stroke="${white}"></polygon></svg>`;

    case "fog":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="14" x2="20" y2="14"></line><line x1="4" y1="18" x2="20" y2="18"></line><line x1="6" y1="10" x2="18" y2="10"></line><line x1="8" y1="6" x2="16" y2="6"></line></svg>`;

    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${white}" stroke-width="2"><circle cx="12" cy="12" r="5"></circle></svg>`;
  }
}

document.addEventListener("DOMContentLoaded", init);