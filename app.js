const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const METEO_BASE = "https://api.open-meteo.com/v1/forecast";

let unit = "metric";
let theme = localStorage.getItem("theme") || "light";
let city = "Jakarta";
let coords = null;

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

const WEATHER_MAP = {
  0: { text: "Clear", icon: "☀️" },
  1: { text: "Mainly clear", icon: "🌤️" },
  2: { text: "Partly cloudy", icon: "⛅" },
  3: { text: "Overcast", icon: "☁️" },
  45: { text: "Fog", icon: "🌫️" },
  48: { text: "Fog", icon: "🌫️" },
  51: { text: "Drizzle", icon: "🌦️" },
  61: { text: "Rain", icon: "🌧️" },
  71: { text: "Snow", icon: "❄️" },
  95: { text: "Storm", icon: "⛈️" },
};

function cToF(c) { return (c * 9) / 5 + 32; }
function msToMph(ms) { return ms * 2.23694; }

function displayTemp(c) {
  return unit === "metric" ? `${Math.round(c)}°C` : `${Math.round(cToF(c))}°F`;
}

function displayWind(ms) {
  return unit === "metric" ? `${ms} m/s` : `${msToMph(ms).toFixed(1)} mph`;
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
    `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&country=ID`
  );
  const data = await res.json();
  if (!data.results) return;

  const c = data.results[0];
  coords = { lat: c.latitude, lon: c.longitude, name: c.name, country: c.country };

  el.cityName.innerText = `${c.name}, ${c.country}`;
  el.coords.innerText = `${c.latitude.toFixed(2)}, ${c.longitude.toFixed(2)}`;

  updateMap(c.latitude, c.longitude);

  fetchWeather();
}

async function fetchWeather() {
  el.error.innerText = "";

  try {
    const url = `${METEO_BASE}?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;

    const res = await fetch(url);
    const data = await res.json();
    const w = data.current_weather;

    el.timestamp.innerText = w.time;
    el.temp.innerText = displayTemp(w.temperature);
    el.wind.innerText = displayWind(w.windspeed);
    el.humidity.innerText = w.relative_humidity ?? "-";

    const wm = WEATHER_MAP[w.weathercode] || { text: "Unknown", icon: "❔" };
    el.condition.innerText = `${wm.icon} ${wm.text}`;

    el.forecastList.innerHTML = "";
    data.daily.time.slice(0, 5).forEach((date, i) => {
      const d = document.createElement("div");
      d.className = "forecast-day";
      d.innerHTML = `
        <div><strong>${new Date(date).toLocaleDateString("id-ID")}</strong></div>
        <div>${WEATHER_MAP[data.daily.weathercode[i]]?.icon || "❔"} 
        ${WEATHER_MAP[data.daily.weathercode[i]]?.text || ""}</div>
        <div>Max: ${displayTemp(data.daily.temperature_2m_max[i])}</div>
        <div>Min: ${displayTemp(data.daily.temperature_2m_min[i])}</div>
      `;
      el.forecastList.appendChild(d);
    });
  } catch (e) {
    el.error.innerText = "Gagal memuat cuaca.";
  }
}

function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function renderFavorites() {
  el.favoriteList.innerHTML = "";
  favorites.forEach((fav) => {
    const div = document.createElement("div");
    div.className = "favorite-item";
    div.innerHTML = `
      ⭐ ${fav.name}
      <span>
        <button data-city="${fav.name}" class="loadFav">Load</button>
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

  const res = await fetch(`${GEOCODING_URL}?name=${q}&count=5&country=ID`);
  const data = await res.json();

  el.suggestions.innerHTML = "";
  (data.results || []).forEach((s) => {
    const li = document.createElement("li");
    li.innerText = `${s.name}, Indonesia`;
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
    fetchCity();
  }
};

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
