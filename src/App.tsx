/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  CloudRain, 
  Sun, 
  Compass, 
  Battery, 
  Signal, 
  RefreshCw,
  ArrowUpRight,
  Navigation,
  Gauge,
  Moon,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WeatherData {
  id: string;
  estacion: string;
  fecha: string;
  "Alerta de heladas": number;
  "Batería": number;
  "Delta T": number;
  "Delta T - Recomendación": number;
  "Dirección de Viento": number;
  "Fase Lunar, Amanecer y Ocaso": number;
  "Humedad": number;
  "ITH": number;
  "Panel Solar": number;
  "Presión": number;
  "Punto de rocío": number;
  "Radiación Solar": number;
  "Registro de lluvia": number;
  "Ráfaga de Viento": number;
  "Señal": number;
  "Temperatura": number;
  "Temperatura Interna": number;
  "Temperatura de suelo": number;
  "Velocidad de Viento": number;
}

const API_URL = '/api/weather';
const STATION_ID = '30536';
/** Shown as the main title; station metadata (ID + REM name) stays in the header row above. */
const DISPLAY_LOCATION = 'Villa de las Rosas';
const DISPLAY_REGION = 'Córdoba';

export default function App() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch weather data');
      const json = await response.json();
      const stationData = json.find((item: any) => item.id === STATION_ID);
      if (!stationData) throw new Error('Station data not found');
      setData(stationData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000 * 60 * 5); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCFB]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-[#FF8A65]"
        >
          <RefreshCw size={48} />
        </motion.div>
        <p className="mt-4 font-medium text-[#8D8D8D]">Waking up the station...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCFB] p-6 text-center">
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 max-w-md">
          <p className="text-red-600 font-semibold mb-2">Oops! Something went wrong</p>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="px-6 py-2 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2"
          >
            <span className="px-3 py-1 bg-[#FF8A65]/10 text-[#FF8A65] text-xs font-bold rounded-full uppercase tracking-wider">
              Live Station
            </span>
            <span className="text-[#8D8D8D] text-xs font-medium">
              ID: {data?.id}
              {data?.estacion != null && data.estacion !== '' ? (
                <span className="text-[#6B6B6B]"> · {data.estacion}</span>
              ) : null}
            </span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-semibold tracking-tight text-[#2D2D2D]"
          >
            {DISPLAY_LOCATION}
            <span className="text-[#FF8A65] font-light block md:inline md:ml-3">
              , {DISPLAY_REGION}
            </span>
          </motion.h1>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-end"
        >
          <div className="flex items-center gap-4 mb-1">
            <div className="flex items-center gap-1.5 text-[#8D8D8D]">
              <Signal size={14} className={data?.Señal && data.Señal > 10 ? 'text-green-500' : 'text-orange-400'} />
              <span className="text-xs font-mono">{data?.Señal}dB</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#8D8D8D]">
              <Battery size={14} className={data?.Batería && data.Batería > 12 ? 'text-green-500' : 'text-orange-400'} />
              <span className="text-xs font-mono">{data?.Batería.toFixed(1)}V</span>
            </div>
          </div>
          <p className="text-xs text-[#8D8D8D] font-medium">
            Last sync: {lastUpdated?.toLocaleTimeString()}
          </p>
        </motion.div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Main Temperature Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 lg:row-span-2 glass rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 text-[#FF8A65]/10 group-hover:text-[#FF8A65]/20 transition-colors">
            <Sun size={200} strokeWidth={1} />
          </div>
          
          <div>
            <div className="flex items-center gap-2 text-[#FF8A65] mb-4">
              <Thermometer size={20} />
              <span className="font-semibold uppercase tracking-widest text-sm">Temperature</span>
            </div>
            <div className="flex items-start">
              <span className="text-8xl md:text-9xl font-semibold tracking-tighter text-[#2D2D2D]">
                {data?.Temperatura.toFixed(1)}
              </span>
              <span className="text-4xl md:text-5xl font-light text-[#FF8A65] mt-4">°C</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-12">
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#8D8D8D] uppercase tracking-wider">Soil Temp</p>
              <p className="text-2xl font-semibold text-[#2D2D2D]">{data?.["Temperatura de suelo"].toFixed(1)}°C</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#8D8D8D] uppercase tracking-wider">Internal</p>
              <p className="text-2xl font-semibold text-[#2D2D2D]">{data?.["Temperatura Interna"].toFixed(1)}°C</p>
            </div>
          </div>
        </motion.div>

        {/* Humidity & Dew Point */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-[2.5rem] p-8 flex flex-col justify-between card-hover"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
              <Droplets size={24} />
            </div>
            <span className="text-xs font-bold text-[#8D8D8D] uppercase tracking-wider">Humidity</span>
          </div>
          <div>
            <p className="text-5xl font-semibold text-[#2D2D2D] mb-2">
              {data?.Humedad.toFixed(0)}<span className="text-2xl font-light text-blue-400">%</span>
            </p>
            <p className="text-sm text-[#8D8D8D] font-medium">
              Dew point: <span className="text-[#2D2D2D]">{data?.["Punto de rocío"].toFixed(1)}°C</span>
            </p>
          </div>
        </motion.div>

        {/* Wind Speed */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-[2.5rem] p-8 flex flex-col justify-between card-hover"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="p-3 bg-teal-50 text-teal-500 rounded-2xl">
              <Wind size={24} />
            </div>
            <span className="text-xs font-bold text-[#8D8D8D] uppercase tracking-wider">Wind</span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-5xl font-semibold text-[#2D2D2D]">
                {data?.["Velocidad de Viento"].toFixed(1)}
              </p>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-teal-600">KM/H</span>
                <div className="flex items-center gap-1 text-[#8D8D8D]">
                  <Navigation 
                    size={12} 
                    style={{ transform: `rotate(${data?.["Dirección de Viento"]}deg)` }} 
                    className="text-teal-400"
                  />
                  <span className="text-[10px] font-mono">{data?.["Dirección de Viento"]}°</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-[#8D8D8D] font-medium">
              Gusts up to <span className="text-[#2D2D2D]">{data?.["Ráfaga de Viento"].toFixed(1)} km/h</span>
            </p>
          </div>
        </motion.div>

        {/* Rain & Pressure */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-[2.5rem] p-8 flex flex-col justify-between card-hover"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl">
              <CloudRain size={24} />
            </div>
            <span className="text-xs font-bold text-[#8D8D8D] uppercase tracking-wider">Precipitation</span>
          </div>
          <div>
            <p className="text-5xl font-semibold text-[#2D2D2D] mb-2">
              {data?.["Registro de lluvia"].toFixed(1)}<span className="text-2xl font-light text-indigo-400">mm</span>
            </p>
            <div className="flex items-center gap-2 text-[#8D8D8D]">
              <Gauge size={14} />
              <span className="text-sm font-medium">{data?.Presión.toFixed(1)} hPa</span>
            </div>
          </div>
        </motion.div>

        {/* Solar & Energy */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-[2.5rem] p-8 flex flex-col justify-between card-hover"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
              <Zap size={24} />
            </div>
            <span className="text-xs font-bold text-[#8D8D8D] uppercase tracking-wider">Solar</span>
          </div>
          <div>
            <p className="text-5xl font-semibold text-[#2D2D2D] mb-2">
              {data?.["Radiación Solar"].toFixed(0)}<span className="text-2xl font-light text-amber-400">W/m²</span>
            </p>
            <p className="text-sm text-[#8D8D8D] font-medium">
              Panel: <span className="text-[#2D2D2D]">{data?.["Panel Solar"].toFixed(1)}V</span>
            </p>
          </div>
        </motion.div>

      </main>

      {/* Secondary Stats Footer */}
      <footer className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Frost Alert', value: data?.["Alerta de heladas"] === 257 ? 'None' : 'Active', icon: <RefreshCw size={14} /> },
          { label: 'ITH Index', value: data?.ITH.toFixed(1), icon: <Thermometer size={14} /> },
          { label: 'Delta T', value: `${data?.["Delta T"].toFixed(1)}°`, icon: <ArrowUpRight size={14} /> },
          { label: 'Lunar Phase', value: 'Waxing', icon: <Moon size={14} /> },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white/20 border border-white/10"
          >
            <div className="text-[#8D8D8D]">{stat.icon}</div>
            <div>
              <p className="text-[10px] font-bold text-[#8D8D8D] uppercase tracking-widest">{stat.label}</p>
              <p className="text-sm font-semibold text-[#2D2D2D]">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </footer>

      <div className="mt-12 text-center">
        <p className="text-[10px] font-bold text-[#8D8D8D] uppercase tracking-[0.2em]">
          Data provided by Red de Estaciones Meteorológicas de Córdoba
        </p>
      </div>
    </div>
  );
}
