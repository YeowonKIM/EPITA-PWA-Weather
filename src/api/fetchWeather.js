import axios from "axios";

const URL = "https://api.weatherapi.com/v1/current.json";
const API_KEY = "b0a7bad410d5400c8c3145734251107";

export const fetchWeather = async (input) => {
  try {
    let query;

    if (typeof input === "string") {
      query = input;
    } else if (input.lat && input.lon) {
      query = `${input.lat},${input.lon}`;
    } else {
      throw new Error("Invalid input: the location must be city name or { lat, lon }");
    }

    const { data } = await axios.get(URL, {
      params: {
        key: API_KEY,
        q: query,
      },
    });

    return data;
  } catch (error) {
    console.error("fetchWeather error:", error.message);
    throw error;
  }
};