import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSyncedClientState } from "../../hooks/useSyncedClientState";

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time: string; // e.g., "10:00 AM"
}

export default function CalendarApp() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June (0-indexed, so 5 is June)
  const [selectedDay, setSelectedDay] = useState<number>(4); // Default to June 4, 2026

  const [events, setEvents] = useSyncedClientState<CalendarEvent[]>("lifeos_calendar_events", [
    { id: "e1", date: "2026-06-04", title: "产品发布会预演", time: "10:00 AM" },
    { id: "e2", date: "2026-06-04", title: "周四例行周报总结", time: "05:35 PM" },
    { id: "e3", date: "2026-06-13", title: "周末咖啡拉花课程", time: "02:00 PM" },
    { id: "e4", date: "2026-06-18", title: "牙齿日常检查预约", time: "11:30 AM" }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("09:00 AM");

  const daysOfWeek = ["日", "一", "二", "三", "四", "五", "六"];

  // Helper values for rendering calendar
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(1); // Reset selected day to 1st of the new month
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(1); // Reset selected day to 1st of the new month
  };

  const formattedDateString = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${currentYear}-${mm}-${dd}`;
  };

  const selectedDateStr = formattedDateString(selectedDay);

  const selectedDayEvents = events.filter((e) => e.date === selectedDateStr);

  const handleAddEvent = () => {
    if (!newEventTitle.trim()) return;
    const newEvent: CalendarEvent = {
      id: "ev-" + Date.now(),
      date: selectedDateStr,
      title: newEventTitle,
      time: newEventTime
    };
    setEvents([...events, newEvent]);
    setNewEventTitle("");
    setShowAddForm(false);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter((e) => e.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100 p-5 font-sans justify-between relative select-none">
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3 h-10 flex-shrink-0">
        <h3 className="font-semibold text-[15px] flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-indigo-400" />
          数字日程规划
        </h3>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handlePrevMonth}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1 rounded-md transition-colors"
          >
            <ChevronLeft className="w-4 h-4"/>
          </button>
          <span className="text-[13px] font-bold text-zinc-200">
            {currentYear}年 {currentMonth + 1}月
          </span>
          <button 
            type="button"
            onClick={handleNextMonth}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1 rounded-md transition-colors"
          >
            <ChevronRight className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {/* Calendar Grid Sorter */}
      <div className="flex-1 overflow-y-auto pr-1 hide-scrollbar">
        <div className="grid grid-cols-7 gap-1">
          {daysOfWeek.map((day) => (
            <div key={day} className="text-center text-[10px] font-bold text-zinc-500 mb-1.5 font-sans">
              {day}
            </div>
          ))}

          {/* Empty cell offsets before the 1st of the month */}
          {Array.from({ length: startDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="w-full aspect-square" />
          ))}

          {/* Actual days of the month */}
          {Array.from({ length: totalDaysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isToday = today.getDate() === dayNum && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
            const isSelected = selectedDay === dayNum;
            const dateStr = formattedDateString(dayNum);
            const hasEvent = events.some((e) => e.date === dateStr);

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => {
                  setSelectedDay(dayNum);
                  setShowAddForm(false);
                }}
                className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-all rounded-[10px] aspect-square relative
                  ${isSelected ? "bg-indigo-600/30 ring-1 ring-indigo-500/50" : isToday ? "bg-zinc-800/60" : "hover:bg-zinc-800/40"}
                `}
              >
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold
                  ${isSelected ? "bg-indigo-500 text-white shadow-lg" : isToday ? "text-indigo-400 font-bold" : "text-zinc-300"}
                `}>
                  {dayNum}
                </span>

                {/* Event Dot Indicator */}
                <div className="absolute bottom-1 w-full flex justify-center">
                  {hasEvent && (
                    <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-indigo-400 animate-pulse"}`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda Section for the Selected Day */}
      <div className="pt-3 border-t border-zinc-800/80 mt-2 h-36 flex flex-col justify-between flex-shrink-0">
        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 mb-1.5 uppercase tracking-wider pl-1">
          <span>{currentMonth + 1}月{selectedDay}日 · 待办日程 ({selectedDayEvents.length})</span>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5"/> 新建日程
            </button>
          )}
        </div>

        {/* Dynamic Panel (Events List or Add Event Form) */}
        <div className="flex-1 overflow-y-auto max-h-[110px] hide-scrollbar">
          <AnimatePresence mode="wait">
            {showAddForm ? (
              <motion.div
                key="add-form"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-2 p-1.5 bg-zinc-800/40 rounded-xl border border-white/[0.04]"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="输入活动主题..."
                    className="flex-1 bg-zinc-900 border border-white/[0.05] text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-indigo-500/50 text-left font-medium"
                    onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
                  />
                  <input
                    type="text"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="w-20 bg-zinc-900 border border-white/[0.05] text-xs px-2 py-1.5 rounded-lg outline-none focus:border-indigo-500/50 text-center font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 text-[10px]">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-zinc-400 hover:text-zinc-200 px-2 py-1"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddEvent}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-md"
                  >
                    添加
                  </button>
                </div>
              </motion.div>
            ) : selectedDayEvents.length === 0 ? (
              <motion.div
                key="empty-events"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-zinc-500 text-center py-6 font-medium"
              >
                今天没有安排，享受慢节奏生活。☘️
              </motion.div>
            ) : (
              <motion.div
                key="events-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1.5"
              >
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between text-xs bg-zinc-800/30 p-2.5 rounded-[12px] group hover:bg-zinc-800/50 border border-transparent hover:border-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 text-left truncate flex-1 pr-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] flex-shrink-0" />
                      <span className="text-zinc-200 font-medium truncate">{ev.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-zinc-500 text-[10px] font-mono leading-none flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {ev.time}
                      </span>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 rounded-md transition-all duration-200"
                        title="删除日程"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
