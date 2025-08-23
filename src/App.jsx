import React, { useEffect, useState } from 'react';

const API_KEY = import.meta.env.VITE_OPENWEATHER_KEY; // put your key in .env

// Utility conversions
const cToF = (c) => Math.round((c * 9) / 5 + 32 * 100) / 100; // we'll use a safer conversion below
const round = (v, dp = 1) => Math.round(v * Math.pow(10, dp)) / Math.pow(10, dp);
const cToF_precise = (c) => round((c * 9) / 5 + 32, 1);
const msToMph = (m) => round(m * 2.2369362920544, 1);

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch (e) {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {}
  }, [key, state]);
  return [state, setState];
}

export default function App() {
  // persisted states
  const [favorites, setFavorites] = useLocalStorage('wa_favorites', []); // array of city names
  const [darkMode, setDarkMode] = useLocalStorage('wa_dark', false);
  const [unit, setUnit] = useLocalStorage('wa_unit', 'metric'); // 'metric' or 'imperial'

  // runtime states
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(null); // fetched data in metric
  const [forecastList, setForecastList] = useState([]); // raw list (3-hr) in metric
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // initialize dark mode on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', !!darkMode);
  }, [darkMode]);

  // Fetch helpers - always fetch metric and convert when displaying
  async function fetchWeatherByCity(cityName) {
    if (!cityName) return;
    setLoading(true);
    setError('');
    try {
      const wRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&appid=${API_KEY}`
      );
      if (!wRes.ok) throw new Error('city not found');
      const wData = await wRes.json();

      const { coord } = wData;
      const fRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${coord.lat}&lon=${coord.lon}&units=metric&appid=${API_KEY}`
      );
      const fData = await fRes.json();

      setCurrent(wData);
      setForecastList(fData.list || []);
      setQuery(wData.name);
    } catch (err) {
      console.error(err);
      setError('City not found or API error');
      setCurrent(null);
      setForecastList([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeatherByCoords(lat, lon) {
    setLoading(true);
    setError('');
    try {
      const wRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
      );
      const wData = await wRes.json();

      const fRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
      );
      const fData = await fRes.json();

      setCurrent(wData);
      setForecastList(fData.list || []);
      setQuery(wData.name);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch location weather');
    } finally {
      setLoading(false);
    }
  }

  // geolocation on first load
  useEffect(() => {
    // try cached city first
    if (favorites && favorites.length > 0 && !current) {
      // do nothing automatic; user can click favorite
    }
    // try geolocation
    if (navigator.geolocation && !current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          // ignore permission denied
          console.log('geolocation error', err);
        }
      );
    }
  }, []); // run once

  // Utility: convert metric data to chosen unit for display
  function displayTemp(c) {
    if (unit === 'metric') return `${round(c, 1)}°C`;
    return `${cToF_precise(c)}°F`;
  }
  function displayWind(ms) {
    if (unit === 'metric') return `${round(ms, 1)} m/s`;
    return `${msToMph(ms)} mph`;
  }

  // hourly forecast (next ~12 hours) - take first 4 entries (3-hour intervals -> 12 hours)
  const hourly = forecastList.slice(0, 4).map((it) => ({
    dt: it.dt,
    dt_txt: it.dt_txt,
    temp: it.main.temp,
    icon: it.weather[0].icon,
    desc: it.weather[0].description,
  }));

  // daily forecast - take items at 12:00:00
  const daily = forecastList.filter((it) => it.dt_txt.includes('12:00:00')).slice(0, 5);

  // Favorites handlers
  function saveFavorite() {
    if (!current) return;
    const name = current.name;
    if (!favorites.includes(name)) {
      const updated = [...favorites, name];
      setFavorites(updated);
    }
  }
  function removeFavorite(name) {
    setFavorites(favorites.filter((f) => f !== name));
  }

  function handleUnitToggle() {
    const next = unit === 'metric' ? 'imperial' : 'metric';
    setUnit(next);
  }

  // helper to format time
  function fmtTime(ts) {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className={`min-h-screen p-6 flex flex-col items-center transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400'}`}>
      {/* Container */}
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow">Weather Studio 🌤️</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUnitToggle}
              className="px-3 py-2 rounded-lg text-white bg-white/90 dark:bg-gray-800/80 shadow hover:scale-105 transition text-sm"
              aria-label="toggle unit"
            >
              {unit === 'metric' ? 'Show °F' : 'Show °C'}
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-3 py-2 rounded-lg text-white bg-white/90 dark:bg-gray-800/80 shadow hover:scale-105 transition text-sm"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>

        {/* Search area */}
        <div className="flex gap-3 mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city (e.g., London)"
            className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 shadow"
            onKeyDown={(e) => { if (e.key === 'Enter') fetchWeatherByCity(query); }}
          />
          <button
            onClick={() => fetchWeatherByCity(query)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white shadow hover:bg-blue-700 transition"
          >
            Search
          </button>
          <button
            onClick={saveFavorite}
            className="px-4 py-2 rounded-xl text-white bg-yellow-400  shadow hover:bg-yellow-500 transition"
            title="Save current city to favorites"
          >
            ⭐ Save
          </button>
        </div>

        {/* Favorites */}
        {favorites && favorites.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {favorites.map((f) => (
              <div key={f} className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/60 px-3 py-1 rounded-full shadow">
                <button className="text-sm font-medium" onClick={() => fetchWeatherByCity(f)}>{f}</button>
                <button className="text-red-500 text-xs" onClick={() => removeFavorite(f)}>✖</button>
              </div>
            ))}
          </div>
        )}

        {/* error */}
        {error && (<div className="mb-4 text-red-500 font-medium">{error}</div>)}

        {/* Main content: current + hourly + daily */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Weather Card */}
          <div className="lg:col-span-1 bg-white/90 dark:bg-gray-800/70 rounded-2xl p-6 shadow backdrop-blur">
            {loading && <div className="text-center mb-4">Loading...</div>}
            {!current && !loading && (
              <div className="text-center text-gray-700 dark:text-gray-300">Search a city or allow location access.</div>
            )}

            {current && (
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-1 text-gray-900 dark:text-white">{current.name}, {current.sys?.country}</h2>
                <p className="capitalize text-gray-700 dark:text-gray-300">{current.weather[0].description}</p>
                <img src={`https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`} alt="icon" className="mx-auto" />
                <div className="text-4xl font-bold my-2 text-gray-900 dark:text-white">{displayTemp(current.main.temp)}</div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300 mt-3">
                  <div>💧 Humidity: <span className="font-medium">{current.main.humidity}%</span></div>
                  <div>🌬️ Wind: <span className="font-medium">{displayWind(current.wind.speed)}</span></div>
                  <div>🌡️ Feels: <span className="font-medium">{displayTemp(current.main.feels_like)}</span></div>
                  <div>⬆/⬇: <span className="font-medium">{displayTemp(current.main.temp_max)} / {displayTemp(current.main.temp_min)}</span></div>
                  <div>🌅 Sunrise: <span className="font-medium">{fmtTime(current.sys.sunrise)}</span></div>
                  <div>🌇 Sunset: <span className="font-medium">{fmtTime(current.sys.sunset)}</span></div>
                </div>

                <div className="mt-4 flex gap-2 justify-center">
                  <button onClick={() => navigator.geolocation && navigator.geolocation.getCurrentPosition(p => fetchWeatherByCoords(p.coords.latitude, p.coords.longitude))}
                    className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm shadow hover:bg-blue-600 transition"
                  >Use my location</button>

                </div>

              </div>
            )}
          </div>

          {/* Hourly forecast (middle column) */}
          <div className="lg:col-span-1 bg-white/90 dark:bg-gray-800/70 rounded-2xl p-4 shadow backdrop-blur">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Next ~12 hours</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {hourly.length === 0 && <div className="text-sm text-gray-600 dark:text-gray-300">No hourly data</div>}
              {hourly.map((h) => (
                <div key={h.dt} className="min-w-[120px] text-white bg-white/80 dark:bg-gray-800/60 rounded-2xl p-3 text-center">
                  <div className="text-sm text-gray-700 dark:text-gray-300">{new Date(h.dt_txt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  <img src={`https://openweathermap.org/img/wn/${h.icon}.png`} alt="i" className="mx-auto" />
                  <div className="font-semibold mt-1">{displayTemp(h.temp)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 capitalize">{h.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily forecast (right column) */}
          <div className="lg:col-span-1 bg-white/90 dark:bg-gray-800/70 rounded-2xl p-4 shadow backdrop-blur">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">5-Day Forecast</h3>
            <div className="flex flex-col gap-3">
              {daily.length === 0 && <div className="text-sm text-gray-600 dark:text-gray-300">No daily data</div>}
              {daily.map((d) => (
                <div key={d.dt} className="flex items-center justify-between bg-white/80 dark:bg-gray-800/60 p-3 rounded-xl">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{new Date(d.dt_txt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 capitalize">{d.weather[0].description}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <img src={`https://openweathermap.org/img/wn/${d.weather[0].icon}.png`} alt="icon" />
                    <div className="text-right">
                      <div className="font-semibold text-white">{displayTemp(d.main.temp)}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">min {displayTemp(d.main.temp_min)} / max {displayTemp(d.main.temp_max)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}