export const performanceData = [
  { time: "Mon", calls: 120, compute: 45 },
  { time: "Tue", calls: 210, compute: 52 },
  { time: "Wed", calls: 180, compute: 48 },
  { time: "Thu", calls: 290, compute: 65 },
  { time: "Fri", calls: 340, compute: 72 },
  { time: "Sat", calls: 150, compute: 38 },
  { time: "Sun", calls: 190, compute: 42 },
];

export const mockLogs = [
  { id: 1, action: "Navigation intent recognition started", time: "just now", status: "success" },
  { id: 2, action: "Fitness tracker module built", time: "2m ago", status: "success" },
  { id: 3, action: "Local SQLite sync executed", time: "10m ago", status: "success" },
  { id: 4, action: "External weather API fetched", time: "1h ago", status: "warning" },
  { id: 5, action: "Model warm start completed", time: "2h ago", status: "success" },
];

export const PRESET_INSTRUCTIONS = [
  { label: "🎯 Reset", prompt: "Add a rebuild/reset button so users can clear and restore all inputs and local state in one click." },
  { label: "📊 Black-Gold Theme", prompt: "Rebuild the micro app colors with futuristic dark gray, purple, and bright gold, plus glass-like gradients." },
  { label: "📋 Local Persistence", prompt: "Add Alpine.js $persist so inputs, history, and dynamic data survive refreshes through IndexedDB/localStorage." },
  { label: "✨ Smooth Motion", prompt: "Use Tailwind motion for press scale, hover shadows, glowing states, and list transitions." },
];
