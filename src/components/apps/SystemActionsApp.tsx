import { useEffect, useState } from "react";
import { Command, ExternalLink, Mail, MessageSquare, Phone, Play, Save, Trash2 } from "lucide-react";
import { getClientState, setClientState } from "../../services/lifeosApi";
import {
  DANGEROUS_SCHEMES,
  buildShortcutUrl,
  getUrlScheme,
  normalizeAllowedUrlSchemes,
  riskForScheme,
  summarizeActionParams,
} from "../../services/systemActions";
import {
  ALLOWED_URL_SCHEMES_STORAGE_KEY,
  SYSTEM_ACTIONS_STORAGE_KEY,
  SYSTEM_ACTION_LOGS_STORAGE_KEY,
  loadAllowedUrlSchemes,
  loadSavedSystemActions,
  loadSystemActionLogs,
  normalizeSystemActionLog,
  writeSystemActionStorage,
  type SavedSystemAction,
  type SystemActionLog,
} from "../../services/systemActionStorage";

type SystemActionsAppProps = {
  initialAction?: Record<string, unknown>;
};

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function riskLabel(risk: SystemActionLog["risk"]) {
  return risk === "high" ? "高风险" : risk === "medium" ? "中风险" : "低风险";
}

function actionStatusLabel(status: SystemActionLog["status"]) {
  return status === "opened" ? "已打开" : status === "blocked" ? "已拦截" : "已取消";
}

function actionStatusClass(status: SystemActionLog["status"]) {
  return status === "opened" ? "bg-emerald-500/15 text-emerald-200" : status === "blocked" ? "bg-red-500/15 text-red-200" : "bg-zinc-500/15 text-zinc-300";
}

function openUrl(url: string, allowedSchemes: string[], options?: {
  confirm?: boolean;
  label?: string;
  source?: string;
  target?: string;
  paramsSummary?: string;
  onLog?: (log: Omit<SystemActionLog, "id" | "createdAt">) => void;
}) {
  const trimmed = url.trim();
  if (!trimmed) return;
  const scheme = getUrlScheme(trimmed);
  const baseLog = {
    label: options?.label || trimmed,
    url: trimmed,
    scheme: scheme || "unknown",
    source: options?.source || "手动操作",
    target: options?.target || trimmed,
    paramsSummary: options?.paramsSummary || summarizeActionParams(trimmed),
  };
  if (!scheme || !allowedSchemes.includes(scheme)) {
    options?.onLog?.({ ...baseLog, status: "blocked", risk: "high" });
    alert(`已拦截未授权的 URL Scheme：${scheme || "未知"}`);
    return;
  }
  if ((options?.confirm || DANGEROUS_SCHEMES.has(scheme)) && !window.confirm(`确认执行：${options?.label || trimmed}`)) {
    options?.onLog?.({ ...baseLog, scheme, status: "cancelled", risk: riskForScheme(scheme) });
    return;
  }
  options?.onLog?.({ ...baseLog, scheme, status: "opened", risk: riskForScheme(scheme) });
  window.location.href = trimmed;
}

export default function SystemActionsApp({ initialAction }: SystemActionsAppProps) {
  const [phone, setPhone] = useState(() => safeString(initialAction?.phoneNumber));
  const [messageText, setMessageText] = useState(() => safeString(initialAction?.text));
  const [email, setEmail] = useState(() => safeString(initialAction?.email));
  const [subject, setSubject] = useState(() => safeString(initialAction?.subject));
  const [shortcutName, setShortcutName] = useState(() => safeString(initialAction?.shortcutName) || "LifeOS Bridge");
  const [shortcutInput, setShortcutInput] = useState(() => safeString(initialAction?.text));
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState(() => safeString(initialAction?.targetUrl));
  const [allowedSchemes, setAllowedSchemes] = useState<string[]>(loadAllowedUrlSchemes);
  const [schemeInput, setSchemeInput] = useState(() => allowedSchemes.join(", "));
  const [hydrated, setHydrated] = useState(false);
  const [savedActions, setSavedActions] = useState<SavedSystemAction[]>(loadSavedSystemActions);
  const [actionLogs, setActionLogs] = useState<SystemActionLog[]>(loadSystemActionLogs);
  const latestActionLog = actionLogs[0];
  const actionLogSummary = {
    opened: actionLogs.filter((log) => log.status === "opened").length,
    blocked: actionLogs.filter((log) => log.status === "blocked").length,
    cancelled: actionLogs.filter((log) => log.status === "cancelled").length,
    highRisk: actionLogs.filter((log) => log.risk === "high").length,
  };

  const appendActionLog = (log: Omit<SystemActionLog, "id" | "createdAt">) => {
    const normalized = normalizeSystemActionLog({
      ...log,
      id: `action-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    });
    if (!normalized) return;
    setActionLogs((items) => [
      normalized,
      ...items,
    ].slice(0, 20));
  };

  useEffect(() => {
    writeSystemActionStorage(SYSTEM_ACTIONS_STORAGE_KEY, savedActions);
    if (hydrated) void setClientState("lifeos_system_actions", savedActions);
  }, [savedActions, hydrated]);

  useEffect(() => {
    writeSystemActionStorage(ALLOWED_URL_SCHEMES_STORAGE_KEY, allowedSchemes);
    if (hydrated) void setClientState("lifeos_allowed_url_schemes", allowedSchemes);
  }, [allowedSchemes, hydrated]);

  useEffect(() => {
    writeSystemActionStorage(SYSTEM_ACTION_LOGS_STORAGE_KEY, actionLogs);
    if (hydrated) void setClientState("lifeos_system_action_logs", actionLogs);
  }, [actionLogs, hydrated]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [serverActions, serverSchemes, serverLogs] = await Promise.all([
        getClientState<SavedSystemAction[]>("lifeos_system_actions", savedActions),
        getClientState<string[]>("lifeos_allowed_url_schemes", allowedSchemes),
        getClientState<SystemActionLog[]>("lifeos_system_action_logs", actionLogs),
      ]);
      if (cancelled) return;
      if (Array.isArray(serverActions)) setSavedActions(serverActions);
      if (Array.isArray(serverSchemes) && serverSchemes.length > 0) {
        const safeSchemes = normalizeAllowedUrlSchemes(serverSchemes);
        setAllowedSchemes(safeSchemes);
        setSchemeInput(safeSchemes.join(", "));
      }
      if (Array.isArray(serverLogs)) setActionLogs(serverLogs.map(normalizeSystemActionLog).filter(Boolean).slice(0, 20) as SystemActionLog[]);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveCustomAction = () => {
    if (!customName.trim() || !customUrl.trim()) return;
    const scheme = getUrlScheme(customUrl);
    if (!scheme || !allowedSchemes.includes(scheme)) {
      alert(`无法保存，${scheme || "未知"} 不在白名单中。`);
      return;
    }
    const action = {
      id: `action-${Date.now()}`,
      name: customName.trim().slice(0, 40),
      url: customUrl.trim(),
    };
    setSavedActions((items) => [action, ...items].slice(0, 12));
    setCustomName("");
  };

  const updateAllowedSchemes = () => {
    const next = normalizeAllowedUrlSchemes(schemeInput.split(","), []);
    if (next.length === 0) return;
    setAllowedSchemes(next);
    setSchemeInput(next.join(", "));
  };

  return (
    <div className="h-full overflow-y-auto bg-[#111113] text-zinc-100 p-4 space-y-4 border border-white/[0.05]">
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold">动作权限中心</h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-zinc-300">
              已记录 {actionLogs.length} 条
            </span>
            {actionLogs.length > 0 ? (
              <button onClick={() => setActionLogs([])} className="rounded-full border border-red-300/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-100">
                清空记录
              </button>
            ) : null}
          </div>
        </div>
        <div className="mb-3 grid grid-cols-4 gap-2 text-center text-[10px]">
          <ActionMetric label="打开" value={actionLogSummary.opened} tone="text-emerald-200" />
          <ActionMetric label="拦截" value={actionLogSummary.blocked} tone="text-red-200" />
          <ActionMetric label="取消" value={actionLogSummary.cancelled} tone="text-zinc-300" />
          <ActionMetric label="高风险" value={actionLogSummary.highRisk} tone="text-amber-100" />
        </div>
        <div className="flex flex-wrap gap-2">
          {allowedSchemes.map((scheme) => (
            <span key={scheme} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${riskForScheme(scheme) === "high" ? "border-amber-300/25 bg-amber-500/10 text-amber-100" : riskForScheme(scheme) === "medium" ? "border-blue-300/20 bg-blue-500/10 text-blue-100" : "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"}`}>
              {scheme}
            </span>
          ))}
        </div>
        <div className="mt-2 text-xs text-zinc-500">高风险动作会二次确认；未在白名单内的 scheme 会被拦截并记录。</div>
        {latestActionLog ? (
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-xs">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-bold text-zinc-100">最近执行记录</div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${actionStatusClass(latestActionLog.status)}`}>
                {actionStatusLabel(latestActionLog.status)}
              </span>
            </div>
            <div className="grid gap-1 text-[10px] text-zinc-500">
              <div className="truncate">来源：{latestActionLog.source} · 目标：{latestActionLog.target}</div>
              <div className="truncate">Scheme：{latestActionLog.scheme} · 风险：{riskLabel(latestActionLog.risk)} · 参数：{latestActionLog.paramsSummary}</div>
              <div className="truncate">时间：{new Date(latestActionLog.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 text-xs text-zinc-500">
            最近执行记录：暂无。本页打开、拦截、取消的动作都会保存在本机并同步到电脑端。
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-4 h-4 text-cyan-300" />
          <h3 className="text-sm font-bold">电话 / 短信</h3>
        </div>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
          placeholder="手机号"
        />
        <textarea
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          className="mt-2 h-16 w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
          placeholder="短信内容"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => openUrl(`tel:${encodeURIComponent(phone)}`, allowedSchemes, { confirm: true, label: `拨打 ${phone}`, source: "电话动作", target: phone || "未填写号码", paramsSummary: "-", onLog: appendActionLog })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-[#061016]">
            <Phone className="w-3.5 h-3.5" />
            呼叫
          </button>
          <button onClick={() => openUrl(`sms:${encodeURIComponent(phone)}?body=${encodeURIComponent(messageText)}`, allowedSchemes, { confirm: true, label: `向 ${phone} 发送短信`, source: "短信动作", target: phone || "未填写号码", paramsSummary: messageText ? "body" : "-", onLog: appendActionLog })} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200">
            <MessageSquare className="w-3.5 h-3.5" />
            短信
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4 text-emerald-300" />
          <h3 className="text-sm font-bold">邮件</h3>
        </div>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs outline-none focus:border-emerald-400/50"
          placeholder="收件人邮箱"
        />
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs outline-none focus:border-emerald-400/50"
          placeholder="邮件主题"
        />
        <button
          onClick={() => openUrl(`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText)}`, allowedSchemes, { confirm: true, label: `向 ${email} 写邮件`, source: "邮件动作", target: email || "未填写邮箱", paramsSummary: [subject ? "subject" : "", messageText ? "body" : ""].filter(Boolean).join(", ") || "-", onLog: appendActionLog })}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-[#061016]"
        >
          <Mail className="w-3.5 h-3.5" />
          打开邮件 App
        </button>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="flex items-center gap-2 mb-3">
          <Command className="w-4 h-4 text-violet-300" />
          <h3 className="text-sm font-bold">iOS 快捷指令桥</h3>
        </div>
        <input
          value={shortcutName}
          onChange={(event) => setShortcutName(event.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs outline-none focus:border-violet-400/50"
          placeholder="快捷指令名称"
        />
        <textarea
          value={shortcutInput}
          onChange={(event) => setShortcutInput(event.target.value)}
          className="mt-2 h-16 w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs outline-none focus:border-violet-400/50"
          placeholder="传给快捷指令的文本"
        />
        <button
          onClick={() => openUrl(buildShortcutUrl(shortcutName, shortcutInput), allowedSchemes, { confirm: true, label: `运行快捷指令 ${shortcutName}`, source: "快捷指令", target: shortcutName || "未命名快捷指令", paramsSummary: shortcutInput ? "text" : "name", onLog: appendActionLog })}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-xs font-bold text-white"
        >
          <Play className="w-3.5 h-3.5" />
          运行快捷指令
        </button>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="flex items-center gap-2 mb-3">
          <ExternalLink className="w-4 h-4 text-amber-300" />
          <h3 className="text-sm font-bold">自定义 URL Scheme</h3>
        </div>
        <input
          value={customName}
          onChange={(event) => setCustomName(event.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs outline-none focus:border-amber-400/50"
          placeholder="名称，例如：打开微信"
        />
        <input
          value={customUrl}
          onChange={(event) => setCustomUrl(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs outline-none focus:border-amber-400/50"
          placeholder="URL，例如：weixin:// 或 shortcuts://..."
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => openUrl(customUrl, allowedSchemes, { confirm: true, label: customName || customUrl, source: "自定义 URL", target: customName || customUrl, onLog: appendActionLog })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-[#161004]">
            <Play className="w-3.5 h-3.5" />
            打开
          </button>
          <button onClick={saveCustomAction} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200">
            <Save className="w-3.5 h-3.5" />
            保存
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
        <h3 className="mb-2 text-sm font-bold">URL Scheme 白名单</h3>
        <textarea
          value={schemeInput}
          onChange={(event) => setSchemeInput(event.target.value)}
          className="h-16 w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
          placeholder="http, https, tel, sms, mailto, shortcuts"
        />
        <button onClick={updateAllowedSchemes} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200">
          更新白名单
        </button>
      </section>

      {savedActions.length > 0 && (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
          <h3 className="mb-2 text-sm font-bold">常用启动项</h3>
          <div className="space-y-2">
            {savedActions.map((action) => (
              <div key={action.id} className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-black/20 p-2">
                <button onClick={() => openUrl(action.url, allowedSchemes, { confirm: true, label: action.name, source: "常用启动项", target: action.name, onLog: appendActionLog })} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-xs font-bold text-zinc-100">{action.name}</div>
                  <div className="truncate text-[10px] text-zinc-500">{action.url}</div>
                </button>
                <button
                  onClick={() => setSavedActions((items) => items.filter((item) => item.id !== action.id))}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {actionLogs.length > 0 && (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">最近动作记录</h3>
            <button onClick={() => setActionLogs([])} className="text-[11px] font-bold text-zinc-500 hover:text-zinc-200">
              清空
            </button>
          </div>
          <div className="space-y-2">
            {actionLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="rounded-xl border border-white/[0.05] bg-black/20 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-bold text-zinc-100">{log.label}</div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${actionStatusClass(log.status)}`}>
                    {actionStatusLabel(log.status)}
                  </span>
                </div>
                <div className="mt-1 grid gap-1 text-[10px] text-zinc-500">
                  <div className="truncate">来源：{log.source} · 目标：{log.target}</div>
                  <div className="truncate">Scheme：{log.scheme} · 风险：{riskLabel(log.risk)} · 参数：{log.paramsSummary}</div>
                  <div className="truncate">时间：{new Date(log.createdAt).toLocaleString()} · {log.url}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ActionMetric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/15 px-2 py-2">
      <div className={`font-black ${tone}`}>{value}</div>
      <div className="mt-0.5 font-bold text-zinc-500">{label}</div>
    </div>
  );
}
