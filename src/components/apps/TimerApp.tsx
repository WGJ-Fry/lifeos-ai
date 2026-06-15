import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, RotateCcw, Award, Coffee, Zap, Flame, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSyncedClientState } from "../../hooks/useSyncedClientState";

type TimerMode = "focus" | "shortBreak" | "longBreak";

const MODE_PRESETS: Record<TimerMode, { label: string; duration: number; color: string; bgLight: string }> = {
  focus: { label: "深度专注", duration: 25 * 60, color: "text-indigo-400", bgLight: "bg-indigo-500/10" },
  shortBreak: { label: "短时休憩", duration: 5 * 60, color: "text-emerald-400", bgLight: "bg-emerald-500/10" },
  longBreak: { label: "深度放松", duration: 15 * 60, color: "text-amber-400", bgLight: "bg-amber-500/10" }
};

export default function TimerApp() {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(MODE_PRESETS.focus.duration);
  const [isActive, setIsActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Stats
  const [stats, setStats] = useSyncedClientState("lifeos_timer_stats", { sessions: 0, minutes: 0, streak: 1 });

  const totalDuration = MODE_PRESETS[mode].duration;
  const progress = totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0;

  // Sound Synth effect (Offline AudioContext)
  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Multi-tone chime
      const tones = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      tones.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.4);
        
        osc.start(ctx.currentTime + idx * 0.15);
        osc.stop(ctx.currentTime + idx * 0.15 + 0.5);
      });
    } catch (e) {
      console.warn("Audio Context init blocked by browser permissions until user interaction.", e);
    }
  };

  useEffect(() => {
    // Reset timer when changing mode
    setTimeLeft(MODE_PRESETS[mode].duration);
    setIsActive(false);
  }, [mode]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      playAlertSound();
      
      // Update statistics
      if (mode === "focus") {
        setStats((prev: any) => ({
          sessions: prev.sessions + 1,
          minutes: prev.minutes + Math.floor(MODE_PRESETS.focus.duration / 60),
          streak: prev.streak + (prev.sessions % 4 === 3 ? 1 : 0) // Reward streak increment periodically
        }));
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const toggle = () => setIsActive(!isActive);

  const reset = () => {
    setIsActive(false);
    setTimeLeft(MODE_PRESETS[mode].duration);
  };

  const handleQuickDuration = (minutes: number) => {
    setIsActive(false);
    setTimeLeft(minutes * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // SVG Progress Ring calculations
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col h-full bg-[#111113] text-zinc-100 p-5 font-sans justify-between relative select-none">
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 h-10 flex-shrink-0">
        <h3 className="font-semibold text-[14px] flex items-center gap-2">
          <Timer className="w-4 h-4 text-indigo-400" />
          冥想专注节奏
        </h3>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
          title={soundEnabled ? "静音告警" : "开启提示音"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Mode Selectors */}
      <div className="grid grid-cols-3 gap-1 bg-[#18181b]/60 p-1 rounded-xl border border-white/[0.04]">
        {(Object.keys(MODE_PRESETS) as TimerMode[]).map((m) => {
          const isSelected = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-white/[0.06] text-white shadow"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {MODE_PRESETS[m].label}
            </button>
          );
        })}
      </div>

      {/* Radial Clock Circle Area */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Radial SVG overlay */}
          <svg className="w-full h-full transform -rotate-90 absolute top-0 left-0">
            {/* Background circle */}
            <circle
              cx="88"
              cy="88"
              r={radius}
              className="stroke-zinc-800/40"
              strokeWidth="4"
              fill="transparent"
            />
            {/* Foreground Progress circle */}
            <circle
              cx="88"
              cy="88"
              r={radius}
              className={`transition-all duration-300 ${
                mode === "focus" 
                  ? "stroke-indigo-500" 
                  : mode === "shortBreak" 
                    ? "stroke-emerald-400" 
                    : "stroke-amber-400"
              }`}
              strokeWidth="5"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          {/* Central Time Text and Mode Banner */}
          <div className="text-center z-13 flex flex-col items-center justify-center">
            <span className="text-[38px] font-bold tracking-tight font-mono text-zinc-100 leading-none">
              {formatTime(timeLeft)}
            </span>
            <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider ${MODE_PRESETS[mode].color}`}>
              {isActive ? "正在专注中" : "待发状态"}
            </span>
          </div>
        </div>

        {/* Quick Duration Preset Shortcuts */}
        <div className="flex gap-1.5 mt-4">
          {[15, 25, 45, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => handleQuickDuration(mins)}
              className="text-[10px] bg-white/[0.02] border border-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.1] px-2.5 py-1 rounded-md transition-all font-mono"
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center gap-3 items-center flex-shrink-0">
        <button
          onClick={reset}
          className="w-10 h-10 border border-white/[0.05] hover:border-zinc-700 rounded-2xl flex items-center justify-center hover:bg-zinc-800/40 transition-colors active:scale-95"
          title="重置节奏"
        >
          <RotateCcw className="w-4 h-4 text-zinc-400" />
        </button>

        <button
          onClick={toggle}
          className={`px-8 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all active:scale-95 shadow-md ${
            isActive
              ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              : mode === "focus"
                ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/10"
                : mode === "shortBreak"
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/10"
                  : "bg-amber-600 text-white hover:bg-amber-500 shadow-amber-600/10"
          }`}
        >
          {isActive ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>暂停中继</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              <span>开始专注</span>
            </>
          )}
        </button>
      </div>

      {/* Persistence Statistics Metrics */}
      <div className="pt-3 border-t border-zinc-800/80 mt-3 flex items-center justify-around flex-shrink-0 bg-white/[0.01] p-2.5 rounded-[16px] border border-white/[0.02]">
        <div className="text-center">
          <div className="text-[13px] font-bold text-zinc-200 font-mono flex items-center justify-center gap-1">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            {stats.sessions} <span className="text-[9px] text-zinc-500 font-sans">个次</span>
          </div>
          <div className="text-[9px] font-bold text-zinc-500 uppercase mt-0.5">累计圆满频次</div>
        </div>
        
        <div className="w-px h-6 bg-white/[0.05]" />

        <div className="text-center">
          <div className="text-[13px] font-bold text-zinc-200 font-mono flex items-center justify-center gap-1">
            <Coffee className="w-3.5 h-3.5 text-emerald-400" />
            {stats.minutes} <span className="text-[9px] text-zinc-500 font-sans">分钟</span>
          </div>
          <div className="text-[9px] font-bold text-zinc-500 uppercase mt-0.5">累积心流时长</div>
        </div>

        <div className="w-px h-6 bg-white/[0.05]" />

        <div className="text-center">
          <div className="text-[13px] font-bold text-zinc-200 font-mono flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            {stats.streak} <span className="text-[9px] text-zinc-500 font-sans">天度</span>
          </div>
          <div className="text-[9px] font-bold text-zinc-500 uppercase mt-0.5">多日连续保持</div>
        </div>
      </div>
    </div>
  );
}
