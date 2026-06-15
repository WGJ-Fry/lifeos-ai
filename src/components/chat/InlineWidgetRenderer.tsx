import type { CustomApp } from "../../types";
import CalculatorApp from "../apps/CalculatorApp";
import CalendarApp from "../apps/CalendarApp";
import CustomAppFrame from "../apps/CustomAppFrame";
import NavigationApp from "../apps/NavigationApp";
import NotesApp from "../apps/NotesApp";
import SystemActionsApp from "../apps/SystemActionsApp";
import TasksApp from "../apps/TasksApp";
import TimerApp from "../apps/TimerApp";

export default function InlineWidgetRenderer({
  widgetName,
  widgetArgs,
  customApps,
}: {
  widgetName: string;
  widgetArgs?: Record<string, unknown>;
  customApps: CustomApp[];
}) {
  switch (widgetName) {
    case "tasks":
      return <div className="h-[360px] w-full bg-black pointer-events-auto"><TasksApp /></div>;
    case "notes":
      return <div className="h-[440px] w-full bg-black pointer-events-auto"><NotesApp /></div>;
    case "calendar":
      return <div className="h-[380px] w-full bg-zinc-900 pointer-events-auto"><CalendarApp /></div>;
    case "calculator":
      return <div className="h-[430px] w-full bg-black pointer-events-auto"><CalculatorApp /></div>;
    case "timer":
      return <div className="h-[280px] w-full bg-black pointer-events-auto"><TimerApp /></div>;
    case "navigation":
      return <div className="h-[380px] w-full bg-black pointer-events-auto"><NavigationApp initialRoute={widgetArgs} /></div>;
    case "launcher":
      return <div className="h-[460px] w-full bg-black pointer-events-auto"><SystemActionsApp initialAction={widgetArgs} /></div>;
    default: {
      const customApp = customApps.find((app) => app.name.toLowerCase() === widgetName.toLowerCase() || app.id === widgetName);
      return customApp ? <CustomAppFrame app={customApp} /> : null;
    }
  }
}
