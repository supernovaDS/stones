import { useEffect, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { blockMatchesSearch } from "../../utils/helpers";
import { BlockCard } from "../blocks";

function WeatherWidget() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: null, desc: "Locating...", icon: "" });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
            if (!res.ok) throw new Error("Network response was not ok");
            const data = await res.json();
            const temp = Math.round(data.current.temperature_2m);
            const code = data.current.weather_code;
            let desc = "Clear";
            let icon = "☀️";
            if (code >= 1 && code <= 3) { desc = "Cloudy"; icon = "☁️"; }
            else if (code >= 45 && code <= 48) { desc = "Fog"; icon = "🌫️"; }
            else if (code >= 51 && code <= 67) { desc = "Rain"; icon = "🌧️"; }
            else if (code >= 71 && code <= 77) { desc = "Snow"; icon = "❄️"; }
            else if (code >= 80 && code <= 82) { desc = "Showers"; icon = "🚿"; }
            else if (code >= 95 && code <= 99) { desc = "Storm"; icon = "⛈️"; }
            
            setWeather({ temp, desc, icon });
          } catch (e) {
            setWeather({ temp: null, desc: "Unavailable", icon: "⚠️" });
          }
        },
        () => {
          setWeather({ temp: null, desc: "No location", icon: "📍" });
        }
      );
    } else {
      setWeather({ temp: null, desc: "No geolocation", icon: "🚫" });
    }
  }, []);

  return (
    <section className="bento-card span-4 bg-[#21caff] p-5 dark:bg-[#001a25] flex flex-col justify-center">
      <div className="weather-layout flex h-full items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="weather-time text-5xl font-black tracking-tight">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h2>
          <p className="text-sm font-black text-black/70 dark:text-[#7a7670] mt-1 uppercase tracking-wide">
            {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="weather-meta flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-4xl leading-none">{weather.icon}</span>
          <div className="min-w-0 text-right">
            <p className="weather-temp text-4xl font-black">{weather.temp !== null ? `${weather.temp}°C` : "--"}</p>
            <p className="text-sm font-black text-black/70 dark:text-[#7a7670] uppercase tracking-wide">
              {weather.desc}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WorkspaceView({ pageId, searchQuery }) {
  const { blocks, pages, renamePage } = useAppStore();
  const page = pages.find((item) => item.id === pageId);
  const pageBlocks = blocks
    .filter((block) => block.pageId === pageId)
    .filter((block) => blockMatchesSearch(block, searchQuery))
    .sort((a, b) => a.order - b.order);

  return (
    <div className="bento-grid">
      <section className="bento-card span-8 bg-[#ffdc4a] p-5 dark:bg-[#1a1500]">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/70 dark:text-[#7a7670]">Active page</p>
        <input
          className="hero-title w-full bg-transparent outline-none"
          onChange={(event) => page && void renamePage(page.id, event.target.value)}
          value={page?.title ?? ""}
        />
        <p className="mt-4 max-w-xl text-sm font-bold text-black/70">

        </p>
      </section>
      <WeatherWidget />
      <section className="span-12 flex flex-col gap-8">
        {pageBlocks.length ? (
          pageBlocks.map((block) => (
            <div key={block.id}>
              <BlockCard block={block} />
            </div>
          ))
        ) : (
          <div className="bento-card bg-[#2ef2a6] p-8 text-center dark:bg-[#0a3d28]">
            <p className="text-2xl font-black">No blocks match this search.</p>
          </div>
        )}
      </section>
    </div>
  );
}
