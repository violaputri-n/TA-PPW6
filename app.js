const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const METEO_BASE = "https://api.open-meteo.com/v1/forecast";

let unit = "metric";
let theme = localStorage.getItem("theme") || "light";
let city = "Jakarta";
let coords = null;

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

const WEATHER_MAP = {
  0: { text: "Cerah", icon: "☀️" },
  1: { text: "Cerah sebagian", icon: "🌤️" },
  2: { text: "Berawan sebagian", icon: "⛅" },
  3: { text: "Mendung", icon: "☁️" },
  45: { text: "Berkabut", icon: "🌫️" },
  48: { text: "Berkabut", icon: "🌫️" },
  51: { text: "Gerimis ringan", icon: "🌦️" },
  53: { text: "Gerimis", icon: "🌦️" },
  55: { text: "Gerimis lebat", icon: "🌧️" },
  61: { text: "Hujan ringan", icon: "🌧️" },
  63: { text: "Hujan", icon: "🌧️" },
  65: { text: "Hujan lebat", icon: "⛈️" },
  71: { text: "Salju ringan", icon: "🌨️" },
  73: { text: "Salju", icon: "❄️" },
  75: { text: "Salju lebat", icon: "❄️" },
  77: { text: "Salju berbentuk butir", icon: "❄️" },
  80: { text: "Hujan ringan", icon: "🌦️" },
  81: { text: "Hujan sedang", icon: "🌧️" },
  82: { text: "Hujan deras", icon: "⛈️" },
  85: { text: "Salju ringan", icon: "🌨️" },
  86: { text: "Salju lebat", icon: "❄️" },
  95: { text: "Badai petir", icon: "⛈️" },
  96: { text: "Badai petir dengan hujan es", icon: "⛈️" },
  99: { text: "Badai petir dengan hujan es lebat", icon: "⛈️" },
};

function cToF(c) { return (c * 9) / 5 + 32; }
function msToMph(ms) { return ms * 2.23694; }

function displayTemp(c) {
  return unit === "metric" ? `${Math.round(c)}°C` : `${Math.round(cToF(c))}°F`;
}

function displayWind(ms) {
  return unit === "metric" ? `${ms.toFixed(1)} m/s` : `${msToMph(ms).toFixed(1)} mph`;
}

const el = {
  cityName: document.getElementById("cityName"),
  coords: document.getElementById("coords"),
  timestamp: document.getElementById("timestamp"),
  temp: document.getElementById("temp"),
  condition: document.getElementById("condition"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  error: document.getElementById("error"),
  forecastList: document.getElementById("forecastList"),
  searchInput: document.getElementById("searchInput"),
  suggestions: document.getElementById("suggestions"),
  favoriteList: document.getElementById("favoriteList"),
  mainWeatherIcon: document.getElementById("mainWeatherIcon"),
};

document.body.classList.toggle("dark", theme === "dark");

let map = L.map("map").setView([-6.2, 106.8], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);
let marker = null;

function updateMap(lat, lon) {
  map.setView([lat, lon], 11);

  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);
}

async function fetchCity() {
  const res = await fetch(
    `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=id`
  );
  const data = await res.json();
  if (!data.results) {
    el.error.innerText = "Kota tidak ditemukan";
    return;
  }

  const c = data.results[0];
  coords = { lat: c.latitude, lon: c.longitude, name: c.name, country: c.country || "Indonesia" };

  el.cityName.innerText = `${c.name}, ${coords.country}`;
  el.coords.innerText = `${c.latitude.toFixed(2)}, ${c.longitude.toFixed(2)}`;

  updateMap(c.latitude, c.longitude);

  fetchWeather();
}

async function fetchWeather() {
  el.error.innerText = "";

  try {
    const url = `${METEO_BASE}?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&current=relative_humidity_2m`;

    const res = await fetch(url);
    const data = await res.json();
    const w = data.current_weather;

    el.timestamp.innerText = new Date(w.time).toLocaleString('id-ID');
    el.temp.innerText = displayTemp(w.temperature);
    el.wind.innerText = displayWind(w.windspeed);
    
    const humidity = data.current?.relative_humidity_2m;
    el.humidity.innerText = humidity ? `${humidity}%` : "-";

    const wm = WEATHER_MAP[w.weathercode] || { text: "Unknown", icon: "❔" };
    el.condition.innerText = wm.text;
    el.mainWeatherIcon.innerText = wm.icon;

    el.forecastList.innerHTML = "";

    const today = new Date().toDateString();

    data.daily.time.slice(0, 5).forEach((date, i) => {
      const dateObj = new Date(date);
      const isToday = dateObj.toDateString() === today;
      
      const dayName = isToday 
        ? "Hari ini" 
        : dateObj.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });

      const code = data.daily.weathercode[i];
      const wm = WEATHER_MAP[code] || { icon: "❔", text: "Unknown" };

      const max = displayTemp(data.daily.temperature_2m_max[i]);
      const min = displayTemp(data.daily.temperature_2m_min[i]);

      const div = document.createElement("div");
      div.className = "forecast-day" + (isToday ? " today" : "");

      div.innerHTML = `
        <div class="day-label">${dayName}</div>
        <div class="icon">${wm.icon}</div>
        <div class="temp-minmax">
          <span class="temp-high">${max}</span>
          <span class="temp-low">${min}</span>
        </div>
      `;

      el.forecastList.appendChild(div);
    });

  } catch (e) {
    el.error.innerText = "Gagal memuat cuaca.";
    console.error(e);
  }
}

function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function renderFavorites() {
  el.favoriteList.innerHTML = "";
  
  if (favorites.length === 0) {
    el.favoriteList.innerHTML = '<p style="opacity: 0.6; text-align: center;">Belum ada kota favorit</p>';
    return;
  }
  
  favorites.forEach((fav) => {
    const div = document.createElement("div");
    div.className = "favorite-item";
    div.innerHTML = `
      <span>⭐ ${fav.name}</span>
      <span>
        <button data-city="${fav.name}" class="loadFav">Lihat</button>
        <button data-city="${fav.name}" class="delFav">❌</button>
      </span>
    `;
    el.favoriteList.appendChild(div);
  });

  document.querySelectorAll(".loadFav").forEach((btn) =>
    btn.onclick = () => {
      city = btn.dataset.city;
      fetchCity();
    }
  );

  document.querySelectorAll(".delFav").forEach((btn) =>
    btn.onclick = () => {
      favorites = favorites.filter((x) => x.name !== btn.dataset.city);
      saveFavorites();
      renderFavorites();
    }
  );
}

function addFavorite() {
  if (!coords) return;
  
  if (!favorites.some((f) => f.name === coords.name)) {
    favorites.push({ name: coords.name, lat: coords.lat, lon: coords.lon });
    saveFavorites();
    renderFavorites();
  }
}

document.getElementById("favBtn").onclick = addFavorite;

el.searchInput.addEventListener("input", async () => {
  const q = el.searchInput.value;
  if (q.length < 2) return (el.suggestions.innerHTML = "");

  const res = await fetch(`${GEOCODING_URL}?name=${q}&count=5&language=id`);
  const data = await res.json();

  el.suggestions.innerHTML = "";
  (data.results || []).forEach((s) => {
    const li = document.createElement("li");
    li.innerText = `${s.name}, ${s.country || 'Indonesia'}`;
    li.onclick = () => {
      city = s.name;
      el.searchInput.value = "";
      el.suggestions.innerHTML = "";
      fetchCity();
    };
    el.suggestions.appendChild(li);
  });
});

document.getElementById("searchBtn").onclick = () => {
  const val = el.searchInput.value.trim();
  if (val) {
    city = val;
    el.searchInput.value = "";
    el.suggestions.innerHTML = "";
    fetchCity();
  }
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    el.suggestions.innerHTML = "";
  }
});

document.getElementById("unitBtn").onclick = () => {
  unit = unit === "metric" ? "imperial" : "metric";
  fetchWeather();
};

document.getElementById("themeBtn").onclick = () => {
  theme = theme === "light" ? "dark" : "light";
  localStorage.setItem("theme", theme);
  document.body.classList.toggle("dark", theme === "dark");
};

document.getElementById("refreshBtn").onclick = fetchWeather;

setInterval(fetchWeather, 5 * 60 * 1000);

fetchCity();
renderFavorites();
