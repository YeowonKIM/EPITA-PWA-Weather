import React, { useState, useEffect } from "react";
import { fetchWeather } from "./api/fetchWeather";

const App = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [cityName, setCityName] = useState("");
  const [error, setError] = useState(null);
  const [isCelsius, setIsCelsius] = useState(true);;
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    const savedSearches =
      JSON.parse(localStorage.getItem("recentSearches")) || [];
    setRecentSearches(savedSearches);

    // Weather load automatically based on location
    if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              fetchWeatherByCoords(latitude, longitude); 
            },
            (err) => {
              console.warn("Location not found", err);
            }
          );
        }
    // Request ush Notification permission 
    if ("Notification" in window && "serviceWorker" in navigator) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("Notification permission granted");
        }
      });
    }

    // Service Worker 
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
      .register("/pwa/serviceWorker.js")
      .then((registration) => {
        console.log("Service Worker registered:", registration);
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
    }
  }, []);

  const queueRequest = async (city) => {
  const current = JSON.parse(localStorage.getItem("queuedCities") || "[]");

  if (!current.includes(city)) {
    localStorage.setItem("queuedCities", JSON.stringify([...current, city]));
  }

  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register("sync-weather");
      console.log("Queued for background sync:", city);
    } catch (err) {
      console.error("Failed to register sync:", err);
    }
  } else {
    console.warn("Background sync not supported");
  }
};

const fetchData = async (city) => {
  if (!navigator.onLine) {
    await queueRequest(city);
    setError("You're offline. Request queued!");
    return;
  }

  setLoading(true);
  setError(null);
  try {
    const data = await fetchWeather(city);
    setWeatherData(data);
    setCityName("");
    updateRecentSearches(data.location.name);
  } catch (error) {
    setError("City not found");
    setWeatherData(null);
  } finally {
    setLoading(false);
    }
  };

  // wheather based on lat, lon
  const fetchWeatherByCoords = async (lat, lon) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather({ lat, lon }); 
      setWeatherData(data);
      updateRecentSearches(data.location.name);
    } catch (err) {
      setError("Failed to fetch weather for the current location");
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      fetchData(cityName);
    }
  };

  const updateRecentSearches = (city) => {
    const updatedSearches = [
      city,
      ...recentSearches.filter((c) => c !== city),
    ].slice(0, 5);
    setRecentSearches(updatedSearches);
    localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
  };

  const handleRecentSearch = (city) => {
    setCityName(city);
    fetchData(city);
  };

  const toggleTemperatureUnit = (city) => {
    setIsCelsius(!isCelsius);
  };

  const getTemperature = () => {
    if (!weatherData) return "";
    return isCelsius
      ? `${weatherData.current.temp_c} °C`
      : `${weatherData.current.temp_f} °F`;
  };

  // Push notification test
  const sendTestNotification = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification("Today's weather", {
          body: "☀️ Warn and sunny day!",
          icon: "/icon-192x192.png",
        });
      });
    }
  };


  return (
    <div>
      <div className="app">
        <h1>Weather App</h1>
        <div className="search">
          <input
            type="text"
            placeholder="Enter city name..."
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            onKeyDown={handleKeyPress}
          />
        </div>
        <div className="unit-toggle">
          <span>°C</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={!isCelsius}
              onChange={toggleTemperatureUnit}
            />
            <span className="slider round"></span>
          </label>
          <span>°F</span>
        </div>
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">{error}</div>}
        {weatherData && (
          <div className="weather-info">
            <h2>
              {weatherData.location.name}, {weatherData.location.region},{" "}
              {weatherData.location.country}
            </h2>
            <p>Temperature: {getTemperature()}</p>
            <p>Condition: {weatherData.current.condition.text}</p>
            <img
              src={weatherData.current.condition.icon}
              alt={weatherData.current.condition.text}
            />
            <p>Humidity: {weatherData.current.humidity}%</p>
            <p>Pressure: {weatherData.current.pressure_mb} mb</p>
            <p>Visibility: {weatherData.current.vis_km} km</p>
          </div>
        )}
        {recentSearches.length > 0 && (
          <div className="recent-searches">
            <h3>Recent Searches</h3>
            <ul>
              {recentSearches.map((city, index) => (
                <li key={index} onClick={() => handleRecentSearch(city)}>
                  {city}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
