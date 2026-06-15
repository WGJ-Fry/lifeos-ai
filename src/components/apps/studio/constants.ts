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
  { id: 1, action: "启动了导航意图识别", time: "刚刚", status: "success" },
  { id: 2, action: "构建了『健身记录』模块", time: "2分钟前", status: "success" },
  { id: 3, action: "执行本地 SQLite 同步", time: "10分钟前", status: "success" },
  { id: 4, action: "获取外部天气 API", time: "1小时前", status: "warning" },
  { id: 5, action: "模型热启动完成", time: "2小时前", status: "success" },
];

export const PRESET_INSTRUCTIONS = [
  { label: "🎯 一键重置", prompt: "请为应用增加一个重构/一键重置按钮，以便用户可以一键清空和恢复所有的输入及本地状态" },
  { label: "📊 星空黑金配色", prompt: "请重构当前微应用配色，运用更具未来感的深灰、紫和亮金，结合玻璃拟物渐变边框和通透质感，让界面视觉更为奢华和具有系统级交互质感" },
  { label: "📋 本地持久化", prompt: "请为应用引入 Alpine.js 的 $persist 特性，让应用的所有输入、历史列表等动态数据都保存到 H5 IndexedDB/localStorage，即便刷新页面数据也不会丢失" },
  { label: "✨ 顺滑交互动效", prompt: "请使用 Tailwind 动效（如点击弹起缩放、hover 弹性阴影、状态变更微光呼吸、列表过渡等）让所有的按键和卡片交互都变得极尽顺滑" },
];
