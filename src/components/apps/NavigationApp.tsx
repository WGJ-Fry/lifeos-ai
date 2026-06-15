import React, { useState } from "react";
import { Navigation, MapPin, Navigation2, Car, Train, Bike, ExternalLink, Clock, Plus, Trash2, Heart } from "lucide-react";
import { useSyncedClientState } from "../../hooks/useSyncedClientState";

interface RouteHistory {
  id: string;
  start: string;
  end: string;
  mode: "drive" | "transit" | "bike";
}

type NavigationProvider = "system" | "apple" | "google" | "amap";

type NavigationAppProps = {
  initialRoute?: Record<string, unknown>;
};

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/.test(navigator.userAgent);

function normalizeTravelMode(value: unknown): RouteHistory["mode"] {
  return value === "transit" || value === "bike" ? value : "drive";
}

function buildMapUrl(provider: NavigationProvider, start: string, destination: string, mode: RouteHistory["mode"]) {
  const encodedStart = encodeURIComponent(start.trim());
  const encodedDestination = encodeURIComponent(destination.trim());
  const appleMode = mode === "transit" ? "r" : mode === "bike" ? "w" : "d";
  const googleMode = mode === "transit" ? "transit" : mode === "bike" ? "bicycling" : "driving";
  const amapMode = mode === "transit" ? "bus" : mode === "bike" ? "bike" : "car";

  if (provider === "apple") {
    return `https://maps.apple.com/?saddr=${encodedStart}&daddr=${encodedDestination}&dirflg=${appleMode}`;
  }

  if (provider === "google") {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodedStart}&destination=${encodedDestination}&travelmode=${googleMode}`;
  }

  if (provider === "amap") {
    if (isIOS()) {
      return `iosamap://path?sourceApplication=LifeOS&sid=BGVIS1&slat=&slon=&sname=${encodedStart}&did=BGVIS2&dlat=&dlon=&dname=${encodedDestination}&dev=0&t=${amapMode === "bus" ? 1 : amapMode === "bike" ? 3 : 0}`;
    }
    if (isAndroid()) {
      return `androidamap://route?sourceApplication=LifeOS&sname=${encodedStart}&dname=${encodedDestination}&dev=0&t=${amapMode === "bus" ? 1 : amapMode === "bike" ? 3 : 0}`;
    }
    return `https://uri.amap.com/search?keyword=${encodedDestination}&src=lifeos&coordinate=gaode&callnative=1`;
  }

  if (isAndroid()) {
    return `geo:0,0?q=${encodedDestination}`;
  }

  if (isIOS()) {
    return `https://maps.apple.com/?saddr=${encodedStart}&daddr=${encodedDestination}&dirflg=${appleMode}`;
  }

  return `https://www.google.com/maps/dir/?api=1&origin=${encodedStart}&destination=${encodedDestination}&travelmode=${googleMode}`;
}

export default function NavigationApp({ initialRoute }: NavigationAppProps) {
  const [startLoc, setStartLoc] = useState(() => {
    const initialStart = initialRoute?.start;
    return typeof initialStart === "string" && initialStart.trim() ? initialStart : "我的位置";
  });
  const [endLoc, setEndLoc] = useState(() => {
    const initialDestination = initialRoute?.destination;
    return typeof initialDestination === "string" && initialDestination.trim() ? initialDestination : "虹桥国际机场 T2";
  });
  const [travelMode, setTravelMode] = useState<"drive" | "transit" | "bike">(() => normalizeTravelMode(initialRoute?.travelMode));
  
  const [favorites, setFavorites] = useSyncedClientState<RouteHistory[]>("lifeos_navigation_favs", [
    { id: "fav-1", start: "当前位置", end: "南京西路110号星巴克", mode: "bike" },
    { id: "fav-2", start: "静安寺", end: "浦东国际机场", mode: "drive" }
  ]);

  // Compute dynamic stats based on input values to simulate real router
  const computeStats = () => {
    const startLen = startLoc.trim().length || 1;
    const endLen = endLoc.trim().length || 1;
    const combinedFactor = (startLen + endLen * 2.5) % 30;
    
    let baseTime = Math.max(10, Math.floor(combinedFactor + 15));
    let baseDistance = Math.max(2, Math.floor((combinedFactor / 1.5) + 5));

    if (travelMode === "transit") {
      baseTime = Math.floor(baseTime * 1.6);
    } else if (travelMode === "bike") {
      baseTime = Math.floor(baseTime * 2.8);
      baseDistance = Math.max(1, Math.floor(baseDistance * 0.7));
    }

    // Format current arrival time
    const arrivalTime = new Date();
    arrivalTime.setMinutes(arrivalTime.getMinutes() + baseTime);
    const arrivalHour = String(arrivalTime.getHours()).padStart(2, "0");
    const arrivalMinute = String(arrivalTime.getMinutes()).padStart(2, "0");

    return {
      minutes: baseTime,
      distance: baseDistance,
      eta: `预计 ${arrivalHour}:${arrivalMinute} 到达`
    };
  };

  const { minutes, distance, eta } = computeStats();

  const handleAddFavorite = () => {
    if (!startLoc.trim() || !endLoc.trim()) return;
    // Avoid duplicates
    if (favorites.some((f) => f.start === startLoc && f.end === endLoc && f.mode === travelMode)) return;

    const newFav: RouteHistory = {
      id: "route-" + Date.now(),
      start: startLoc,
      end: endLoc,
      mode: travelMode
    };
    setFavorites([...favorites, newFav]);
  };

  const handleDeleteFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(favorites.filter((f) => f.id !== id));
  };

  const handleLoadRoute = (fav: RouteHistory) => {
    setStartLoc(fav.start);
    setEndLoc(fav.end);
    setTravelMode(fav.mode);
  };

  const handleOpenMap = (provider: NavigationProvider = "system") => {
    if (!endLoc.trim()) return;
    const url = buildMapUrl(provider, startLoc, endLoc, travelMode);
    window.location.href = url;
  };

  return (
    <div className="flex flex-col h-full bg-[#111113] text-zinc-100 overflow-hidden font-sans border border-white/[0.05] select-none justify-between">
      
      {/* Header with Mode Tabs */}
      <div className="flex items-center justify-between p-4 bg-[#18181b] border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-[14px]">高智能全路网规划</h3>
        </div>
        
        {/* Mode Buttons */}
        <div className="flex bg-[#111113] p-1 rounded-lg border border-white/[0.04]">
          <button
            onClick={() => setTravelMode("drive")}
            className={`p-1.5 rounded-md transition-colors ${travelMode === "drive" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title="驾车"
          >
            <Car className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTravelMode("transit")}
            className={`p-1.5 rounded-md transition-colors ${travelMode === "transit" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title="公交"
          >
            <Train className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTravelMode("bike")}
            className={`p-1.5 rounded-md transition-colors ${travelMode === "bike" ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title="骑行"
          >
            <Bike className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Input Sorters & Favorite list */}
      <div className="p-4 flex-1 flex flex-col space-y-3 overflow-y-auto hide-scrollbar">
        
        {/* Addresses list inputs */}
        <div className="space-y-2.5 bg-[#18181b]/50 p-3 rounded-[16px] border border-white/[0.03]">
          <div className="flex items-center gap-2 relative">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <input
              type="text"
              value={startLoc}
              onChange={(e) => setStartLoc(e.target.value)}
              placeholder="输入起点..."
              className="flex-1 bg-transparent border-none outline-none font-medium text-xs text-zinc-200 placeholder-zinc-600 outline-none"
            />
          </div>
          <div className="h-px bg-white/[0.04] ml-4" />
          <div className="flex items-center gap-2 relative">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-505 bg-indigo-500 flex-shrink-0" />
            <input
              type="text"
              value={endLoc}
              onChange={(e) => setEndLoc(e.target.value)}
              placeholder="输入终点..."
              className="flex-1 bg-transparent border-none outline-none font-medium text-xs text-zinc-100 placeholder-zinc-600 outline-none"
            />
            
            {/* Save current to favorite */}
            <button
              onClick={handleAddFavorite}
              className="p-1 px-2.5 text-[11px] font-bold text-zinc-500 hover:text-emerald-400 bg-white/[0.02] hover:bg-emerald-500/10 rounded-full border border-white/[0.05] hover:border-emerald-500/20 transition-all flex items-center gap-0.5"
              title="收藏当前路线"
            >
              <Heart className="w-3 h-3 fill-current text-zinc-500 hover:text-emerald-400" />
              收藏
            </button>
          </div>
        </div>

        {/* Favorite list */}
        {favorites.length > 0 && (
          <div className="text-left">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2 pl-1">我的常用路线 / 习惯点</div>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 hide-scrollbar">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  onClick={() => handleLoadRoute(fav)}
                  className="flex items-center justify-between p-2.5 bg-zinc-800/15 hover:bg-zinc-800/40 border border-white/[0.02] hover:border-white/[0.08] rounded-xl cursor-pointer group transition-all"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-semibold truncate leading-tight">
                      <span>{fav.start}</span>
                      <span className="text-zinc-600">→</span>
                      <span className="text-zinc-100 font-medium truncate">{fav.end}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1.5">
                      {fav.mode === "drive" ? "🚗 驾车自驾" : fav.mode === "transit" ? "🚇 公共交通" : "🚲 绿色慢行"}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteFavorite(fav.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 rounded transition-all"
                    title="移出常去点"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Simulated ETA Navigation Card */}
      <div className="p-4 bg-[#18181b]/50 border-t border-white/[0.05] flex-shrink-0">
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-[20px] p-4 flex items-center justify-between">
          <div className="text-left">
            <div className="flex items-baseline gap-1 text-emerald-400 font-bold text-2xl tracking-tight mb-1 font-mono">
              {minutes}
              <span className="text-xs font-medium text-emerald-500/80 font-sans">分钟</span>
            </div>
            <div className="text-xs text-zinc-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-500" />
              {eta} · {distance} 公里
            </div>
          </div>
          <button
            onClick={() => handleOpenMap("system")}
            className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0 group"
            title="唤起系统地图"
          >
            <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>
        
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            onClick={() => handleOpenMap("apple")}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2 text-[11px] font-bold text-zinc-300 hover:bg-white/[0.06]"
          >
            Apple
          </button>
          <button
            onClick={() => handleOpenMap("amap")}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2 text-[11px] font-bold text-zinc-300 hover:bg-white/[0.06]"
          >
            高德
          </button>
          <button
            onClick={() => handleOpenMap("google")}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2 text-[11px] font-bold text-zinc-300 hover:bg-white/[0.06]"
          >
            Google
          </button>
        </div>

        <div className="text-[10px] text-center text-zinc-600 pt-2 font-medium">
          手机端会优先唤起本地地图 App；未安装时由系统回退到网页地图
        </div>
      </div>

    </div>
  );
}
