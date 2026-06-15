export type Message = {
  role: "user" | "model";
  parts: { text?: string }[];
  widget?: string; // name of the app to show inline, e.g. "tasks", "notes", "calendar"
  widgetArgs?: Record<string, unknown>;
};

export type ViewMode = "terminal" | "studio";

export type CustomApp = {
  id: string;
  name: string;
  description: string;
  visibility: "private" | "public";
  status: "active" | "building";
  createdAt: number;
  code?: string;
};
