type ServerLocale = "zh-CN" | "en-US";

const serverTranslations = {
  "zh-CN": {
    chatFallback: "好的，我这就为您安排，请稍作等待。",
  },
  "en-US": {
    chatFallback: "Of course. I will take care of it for you now.",
  },
} satisfies Record<ServerLocale, Record<string, string>>;

export function resolveServerLocale(locale: unknown): ServerLocale {
  return locale === "en-US" ? "en-US" : "zh-CN";
}

export function serverT(locale: unknown, key: keyof typeof serverTranslations["en-US"]) {
  return serverTranslations[resolveServerLocale(locale)][key];
}
