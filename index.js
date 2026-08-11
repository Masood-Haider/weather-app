/**
 * ==========================================================================
 * WEATHER APP - MAXIMALIST REAL-TIME WORLD WEATHER ENGINE
 * ==========================================================================
 */

// Application Global State
const state = {
  currentLat: 35.6762,
  currentLng: 139.6503,
  currentCity: "Tokyo",
  currentCountry: "Japan",
  currentCountryCode: "JP",
  currentTimezone: "Asia/Tokyo",
  currentElevation: 44,
  weatherData: null,
  unit: "C", // 'C' or 'F'
  activeTileLayerKey: "voyager", // Clean Voyager as default
  liveClockInterval: null,
  marker: null,
  searchDebounceTimer: null,
  activeSearchIndex: -1,
  searchResults: []
};

// Tile Layer Configurations
const TILE_LAYERS = {
  voyager: {
    name: "Clean Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19
    }
  },
  dark: {
    name: "Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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
  0: { label: "Clear Sky", icon: "sun", glow: "rgba(245, 158, 11, 0.35)", status: "Clear & Sunny" },
  1: { label: "Mainly Clear", icon: "sun-cloud", glow: "rgba(52, 211, 153, 0.35)", status: "Optimal Outdoor Conditions" },
  2: { label: "Partly Cloudy", icon: "partly-cloudy", glow: "rgba(148, 163, 184, 0.3)", status: "Scattered Clouds" },
  3: { label: "Overcast", icon: "cloudy", glow: "rgba(100, 116, 139, 0.35)", status: "Full Cloud Cover" },
  45: { label: "Foggy", icon: "fog", glow: "rgba(148, 163, 184, 0.25)", status: "Reduced Visibility" },
  48: { label: "Depositing Rime Fog", icon: "fog", glow: "rgba(148, 163, 184, 0.25)", status: "Icy Fog Hazard" },
  51: { label: "Light Drizzle", icon: "drizzle", glow: "rgba(52, 211, 153, 0.35)", status: "Light Precipitation" },
  53: { label: "Moderate Drizzle", icon: "drizzle", glow: "rgba(52, 211, 153, 0.4)", status: "Passing Drizzle" },
  55: { label: "Dense Drizzle", icon: "drizzle", glow: "rgba(52, 211, 153, 0.45)", status: "Continuous Wet Mist" },
  56: { label: "Light Freezing Drizzle", icon: "snow", glow: "rgba(186, 230, 253, 0.4)", status: "Icy Mist" },
  57: { label: "Dense Freezing Drizzle", icon: "snow", glow: "rgba(186, 230, 253, 0.45)", status: "Slick Road Warning" },
  61: { label: "Slight Rain", icon: "rain-light", glow: "rgba(52, 211, 153, 0.4)", status: "Light Rain Expected" },
  63: { label: "Moderate Rain", icon: "rain", glow: "rgba(16, 185, 129, 0.45)", status: "Umbrella Recommended" },
  65: { label: "Heavy Rain", icon: "rain-heavy", glow: "rgba(5, 150, 105, 0.55)", status: "Heavy Downpour" },
  66: { label: "Light Freezing Rain", icon: "snow", glow: "rgba(147, 197, 253, 0.45)", status: "Freezing Rain Hazard" },
  67: { label: "Heavy Freezing Rain", icon: "snow", glow: "rgba(147, 197, 253, 0.55)", status: "Severe Ice Formation" },
  71: { label: "Slight Snow Fall", icon: "snow-light", glow: "rgba(224, 242, 254, 0.4)", status: "Light Flurries" },
  73: { label: "Moderate Snow Fall", icon: "snow", glow: "rgba(224, 242, 254, 0.5)", status: "Snow Accumulation" },
  75: { label: "Heavy Snow Fall", icon: "snow-heavy", glow: "rgba(255, 255, 255, 0.6)", status: "Heavy Snowfall Warning" },
  77: { label: "Snow Grains", icon: "snow", glow: "rgba(224, 242, 254, 0.4)", status: "Frozen Grains" },
  80: { label: "Slight Showers", icon: "rain-light", glow: "rgba(52, 211, 153, 0.4)", status: "Scattered Rain Showers" },
  81: { label: "Moderate Showers", icon: "rain", glow: "rgba(16, 185, 129, 0.45)", status: "Passing Rain Cells" },
  82: { label: "Violent Rain Showers", icon: "rain-heavy", glow: "rgba(5, 150, 105, 0.6)", status: "Torrential Showers" },
  85: { label: "Slight Snow Showers", icon: "snow", glow: "rgba(224, 242, 254, 0.45)", status: "Passing Snow Bands" },
  86: { label: "Heavy Snow Showers", icon: "snow-heavy", glow: "rgba(255, 255, 255, 0.6)", status: "Blizzard Conditions" },
  95: { label: "Thunderstorm", icon: "thunderstorm", glow: "rgba(168, 85, 247, 0.5)", status: "Lightning Activity" },
  96: { label: "Thunderstorm + Hail", icon: "thunderstorm", glow: "rgba(168, 85, 247, 0.55)", status: "Severe Storm with Hail" },
  99: { label: "Heavy Thunderstorm", icon: "thunderstorm", glow: "rgba(244, 63, 94, 0.55)", status: "Severe Storm Warning" }
};

// DOM References
let mapInstance = null;
let activeTileLayer = null;

const dom = {
  map: document.getElementById("map"),
  searchInput: document.getElementById("search-input"),
  searchResults: document.getElementById("search-results"),
  searchClearBtn: document.getElementById("search-clear-btn"),
  locateMeBtn: document.getElementById("locate-me-btn"),
  unitToggleBtn: document.getElementById("unit-toggle-btn"),
  unitDisplayText: document.getElementById("unit-display-text"),
  layerBtn: document.getElementById("layer-btn"),
  layerPicker: document.getElementById("layer-picker"),
  mainDashboard: document.getElementById("main-dashboard"),
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

  // Maximalist Telemetry Gauges
  metricHumidity: document.getElementById("metric-humidity"),
  humidityBarFill: document.getElementById("humidity-bar-fill"),
  humidityStatus: document.getElementById("humidity-status"),

  metricWind: document.getElementById("metric-wind"),
  windBarFill: document.getElementById("wind-bar-fill"),
  windDirectionSub: document.getElementById("wind-direction-sub"),

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
 * INITIALIZATION
 * ==========================================================================
 */
function init() {
  initMap();
  setupEventListeners();
  setupKeyboardShortcuts();

  // Load Initial Default City (Tokyo)
  fetchLocationAndWeather(state.currentLat, state.currentLng, {
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    zoom: 6
  });
}

/**
 * Initialize Leaflet Map with Clean Voyager as default
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

  // Default to Clean Voyager layer
  setTileLayer("voyager");

  // Custom Animated Pulse Marker
  const customIcon = L.divIcon({
    className: "custom-pin-marker",
    html: `
      <div class="pin-pulse"></div>
      <div class="pin-pulse pin-pulse-delay"></div>
      <div class="pin-core"></div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });

  state.marker = L.marker([state.currentLat, state.currentLng], { icon: customIcon }).addTo(mapInstance);

  // Map Click Listener -> Reverse Geocode & Fetch Weather
  mapInstance.on("click", (e) => {
    const { lat, lng } = e.latlng;
    state.marker.setLatLng([lat, lng]);
    showToast(`Telemetry loading for ${lat.toFixed(2)}°, ${lng.toFixed(2)}°...`);
    fetchLocationAndWeather(lat, lng, { reverseGeocode: true });
  });
}

/**
 * Switch Map Tile Layers
 */
function setTileLayer(key) {
  if (!TILE_LAYERS[key]) return;
  
  if (activeTileLayer) {
    mapInstance.removeLayer(activeTileLayer);
  }

  const layerConfig = TILE_LAYERS[key];
  activeTileLayer = L.tileLayer(layerConfig.url, layerConfig.options);
  activeTileLayer.addTo(mapInstance);
  state.activeTileLayerKey = key;

  // Update UI active buttons
  document.querySelectorAll(".layer-option-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.layer === key);
  });
}

/**
 * ==========================================================================
 * DATA FETCHING & CONTROLLER
 * ==========================================================================
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

    if (state.marker) {
      state.marker.setLatLng([lat, lng]);
    }

    if (options.zoom) {
      mapInstance.flyTo([lat, lng], options.zoom, { duration: 1.5 });
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`;

    const res = await fetch(weatherUrl);
    if (!res.ok) throw new Error("Failed to retrieve weather data from Open-Meteo.");

    const data = await res.json();
    state.weatherData = data;
    state.currentTimezone = data.timezone || "UTC";
    state.currentElevation = data.elevation || 0;

    // Update search bar text if not currently focused
    if (document.activeElement !== dom.searchInput) {
      dom.searchInput.value = state.currentCity || "";
      dom.searchClearBtn.style.display = dom.searchInput.value ? "flex" : "none";
    }

    renderWeatherDashboard();
    startLiveClock();
    setLoadingState(false);

    dom.mainDashboard.classList.remove("collapsed");

  } catch (err) {
    console.error("Weather fetch error:", err);
    showToast("⚠️ Could not load weather for this location.");
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
 * ==========================================================================
 * MAXIMALIST RENDERING
 * ==========================================================================
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

  // 2. Hero Temperature & Badges
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

  // 3. Maximalist Telemetry Gauges (4 Pillars)
  // Humidity
  const humidity = current.relative_humidity_2m ?? 0;
  dom.metricHumidity.textContent = `${humidity}%`;
  dom.humidityBarFill.style.width = `${Math.min(100, Math.max(5, humidity))}%`;
  dom.humidityStatus.textContent = humidity > 70 ? "Humid / Muggy" : (humidity < 30 ? "Dry Air" : "Optimal Comfort");

  // Wind
  const windCompass = getWindDirectionCompass(current.wind_direction_10m);
  dom.metricWind.textContent = formatWindSpeed(current.wind_speed_10m);
  const windKmh = current.wind_speed_10m ?? 0;
  dom.windBarFill.style.width = `${Math.min(100, Math.max(8, (windKmh / 60) * 100))}%`;
  dom.windDirectionSub.textContent = `Blowing ${windCompass} (${current.wind_direction_10m}°)`;

  // UV Index
  const uv = current.uv_index !== undefined ? current.uv_index : 0;
  dom.metricUv.textContent = uv.toFixed(1);
  dom.uvBarFill.style.width = `${Math.min(100, Math.max(5, (uv / 12) * 100))}%`;
  let uvLabel = "Low Risk (0-2)";
  if (uv >= 11) uvLabel = "Extreme Warning (11+)";
  else if (uv >= 8) uvLabel = "Very High Risk (8-10)";
  else if (uv >= 6) uvLabel = "High Risk (6-7)";
  else if (uv >= 3) uvLabel = "Moderate Exposure (3-5)";
  dom.uvStatus.textContent = uvLabel;

  // Precipitation
  const pop = daily.precipitation_probability_max?.[0] ?? current.precipitation ?? 0;
  dom.metricPrecip.textContent = `${pop}%`;
  dom.precipBarFill.style.width = `${Math.min(100, Math.max(5, pop))}%`;
  dom.precipStatus.textContent = pop > 60 ? "Precipitation Likely" : (pop > 20 ? "Possible Showers" : "Dry Conditions");

  // 4. Hourly Forecast (Next 24h)
  renderHourlyForecast(data.hourly);

  // 5. 7-Day Extended Outlook
  renderDailyForecast(data.daily);

  // 6. Solar Cycle & Daylight Duration
  if (daily.sunrise?.[0] && daily.sunset?.[0]) {
    dom.sunSunriseTime.textContent = formatIsoTimeToLocal(daily.sunrise[0], state.currentTimezone);
    dom.sunSunsetTime.textContent = formatIsoTimeToLocal(daily.sunset[0], state.currentTimezone);

    // Calculate daylight duration in hours/minutes
    try {
      const riseDate = new Date(daily.sunrise[0]);
      const setDate = new Date(daily.sunset[0]);
      const diffMs = setDate - riseDate;
      if (diffMs > 0) {
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (dom.daylightDurationBadge) {
          dom.daylightDurationBadge.textContent = `${hrs}h ${mins}m daylight`;
        }
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
 * ==========================================================================
 * LIVE CLOCK
 * ==========================================================================
 */
function startLiveClock() {
  if (state.liveClockInterval) {
    clearInterval(state.liveClockInterval);
  }
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
 * ==========================================================================
 * EVENT LISTENERS
 * ==========================================================================
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

  // 4. Geolocation Button
  dom.locateMeBtn.addEventListener("click", handleGeolocation);

  // 5. Unit Toggle (°C / °F)
  dom.unitToggleBtn.addEventListener("click", () => {
    state.unit = state.unit === "C" ? "F" : "C";
    dom.unitDisplayText.textContent = `°${state.unit}`;
    showToast(`Units switched to °${state.unit}`);
    renderWeatherDashboard();
  });

  // 6. Layer Switcher
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

  // 7. City Chips Click Handlers
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

  // 8. Minimize / Restore Dashboard
  dom.minimizeBtn.addEventListener("click", () => {
    dom.mainDashboard.classList.add("collapsed");
  });

  dom.reopenBtn.addEventListener("click", () => {
    dom.mainDashboard.classList.remove("collapsed");
  });

  // 9. Brand Click -> Global View
  dom.brandHomeBtn.addEventListener("click", () => {
    mapInstance.flyTo([20, 0], 2.5, { duration: 1.5 });
    showToast("Reset map to global view");
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
 * ==========================================================================
 * UTILITY HELPERS
 * ==========================================================================
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-mint)" stroke-width="2.5">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
    <span>${escapeHtml(message)}</span>
  `;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
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
  const sunColor = "#fbbf24";
  const moonColor = "#a7f3d0";
  const cloudColor = "#cbd5e1";
  const rainColor = "#34d399";
  const snowColor = "#e0f2fe";
  const thunderColor = "#c084fc";

  switch (type) {
    case "sun":
      if (!isDay) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${moonColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      }
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${sunColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

    case "sun-cloud":
    case "partly-cloudy":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2" stroke="${sunColor}"></path><path d="m4.93 4.93 1.41 1.41" stroke="${sunColor}"></path><path d="M20 12h2" stroke="${sunColor}"></path><path d="m19.07 4.93-1.41 1.41" stroke="${sunColor}"></path><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="${cloudColor}" fill="rgba(255,255,255,0.06)"></path></svg>`;

    case "cloudy":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${cloudColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="rgba(255,255,255,0.06)"></path></svg>`;

    case "drizzle":
    case "rain-light":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="${cloudColor}"></path><line x1="8" y1="19" x2="8" y2="21" stroke="${rainColor}"></line><line x1="12" y1="19" x2="12" y2="21" stroke="${rainColor}"></line><line x1="16" y1="19" x2="16" y2="21" stroke="${rainColor}"></line></svg>`;

    case "rain":
    case "rain-heavy":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="${cloudColor}"></path><line x1="8" y1="19" x2="6" y2="23" stroke="${rainColor}"></line><line x1="12" y1="19" x2="10" y2="23" stroke="${rainColor}"></line><line x1="16" y1="19" x2="14" y2="23" stroke="${rainColor}"></line></svg>`;

    case "snow":
    case "snow-light":
    case "snow-heavy":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="${cloudColor}"></path><circle cx="8" cy="21" r="1" fill="${snowColor}" stroke="${snowColor}"></circle><circle cx="12" cy="21" r="1" fill="${snowColor}" stroke="${snowColor}"></circle><circle cx="16" cy="21" r="1" fill="${snowColor}" stroke="${snowColor}"></circle></svg>`;

    case "thunderstorm":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="${cloudColor}"></path><polygon points="13 13 9 19 13 19 11 23 17 16 13 16 15 13" fill="${thunderColor}" stroke="${thunderColor}"></polygon></svg>`;

    case "fog":
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${cloudColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="14" x2="20" y2="14"></line><line x1="4" y1="18" x2="20" y2="18"></line><line x1="6" y1="10" x2="18" y2="10"></line><line x1="8" y1="6" x2="16" y2="6"></line></svg>`;

    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${sunColor}" stroke-width="2"><circle cx="12" cy="12" r="5"></circle></svg>`;
  }
}

document.addEventListener("DOMContentLoaded", init);