import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Globe2, PlugZap, Router, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { getHealth, getNetworkDiagnostics, NetworkDiagnostics, saveDesktopConnectionConfig, testConnectionUrl } from "../../services/lifeosApi";

type Health = Awaited<ReturnType<typeof getHealth>>;

export default function ConnectionGuide({ health }: { health: Health | null }) {
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnostics | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testingCandidate, setTestingCandidate] = useState<string | null>(null);
  const [savingCandidate, setSavingCandidate] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const baseUrl = diagnostics?.recommendedBaseUrl || health?.publicBaseUrl || "http://电脑局域网IP:3000";
  const mobileChatUrl = `${baseUrl.replace(/\/$/, "")}/mobile/chat`;
  const recommendedCandidate = diagnostics?.connectionCandidates?.[0] || null;

  useEffect(() => {
    let cancelled = false;
    getNetworkDiagnostics()
      .then((data) => {
        if (!cancelled) setDiagnostics(data);
      })
      .catch(() => {
        if (!cancelled) setDiagnostics(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copyText = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value).catch(() => null);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1200);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      const { result } = await testConnectionUrl(baseUrl);
      setTestStatus(result.ok ? `连接成功：${result.latencyMs}ms，${result.url}` : `连接失败：${result.error || `HTTP ${result.status}`}`);
    } catch (error: any) {
      setTestStatus(error.message || "连接测试失败");
    } finally {
      setTesting(false);
    }
  };

  const handleTestCandidate = async (candidateId: string, candidateBaseUrl: string) => {
    setTestingCandidate(candidateId);
    setTestStatus(null);
    try {
      const { result } = await testConnectionUrl(candidateBaseUrl);
      setTestStatus(result.ok ? `连接成功：${result.latencyMs}ms，${result.url}` : `连接失败：${result.error || `HTTP ${result.status}`}`);
    } catch (error: any) {
      setTestStatus(error.message || "连接测试失败");
    } finally {
      setTestingCandidate(null);
    }
  };

  const handleSaveCandidate = async (candidate: NetworkDiagnostics["connectionCandidates"][number]) => {
    setSavingCandidate(candidate.id);
    setTestStatus(null);
    try {
      const result = await saveDesktopConnectionConfig({
        mode: candidate.mode,
        label: candidate.label,
        baseUrl: candidate.baseUrl,
      });
      setTestStatus(result.message);
      const nextDiagnostics = await getNetworkDiagnostics().catch(() => null);
      if (nextDiagnostics) setDiagnostics(nextDiagnostics);
    } catch (error: any) {
      setTestStatus(error.message || "保存桌面连接配置失败");
    } finally {
      setSavingCandidate(null);
    }
  };

  return (
    <section id="mobile-connect" className="mb-6 scroll-mt-6 rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
      <div className="mb-4 flex items-center gap-2 font-bold">
        <Router className="h-4 w-4 text-cyan-300" />
        手机连接向导
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <GuideCard
          icon={<ShieldCheck className="h-4 w-4" />}
          title="本机管理"
          status={health?.networkMode === "local" && !health?.publicBaseUrl ? "当前模式" : "可选"}
          rows={[
            ["用途", "电脑本机管理"],
            ["监听", "LIFEOS_HOST=127.0.0.1"],
            ["风险", "最低"],
          ]}
          notes={["适合只在电脑上管理和测试。手机无法直接访问电脑端服务。"]}
          tone="green"
        />
        <GuideCard
          icon={<Router className="h-4 w-4" />}
          title="同一局域网"
          status={health?.networkMode === "lan" && !health?.publicBaseUrl ? "当前模式" : "需要重启"}
          rows={[
            ["用途", "手机和电脑在同一 Wi-Fi"],
            ["监听", "LIFEOS_HOST=0.0.0.0"],
            ["授权", "LIFEOS_ALLOW_PUBLIC=1"],
          ]}
          notes={diagnostics?.lanUrls.length ? [`可用地址：${diagnostics.lanUrls[0]}`, "只在可信网络中开启。"] : ["手机访问电脑局域网 IP 后扫码绑定。只在可信网络中开启。"]}
          tone="blue"
        />
        <GuideCard
          icon={<Globe2 className="h-4 w-4" />}
          title="公网/隧道"
          status={health?.publicBaseUrl ? "当前模式" : "需要域名"}
          rows={[
            ["用途", "不在同一局域网"],
            ["地址", diagnostics?.publicBaseUrl || health?.publicBaseUrl || "PUBLIC_BASE_URL=https://..."],
            ["授权", "LIFEOS_ALLOW_PUBLIC=1"],
          ]}
          notes={diagnostics?.tailscale.mobileUrls?.length ? [`Tailscale：${diagnostics.tailscale.mobileUrls[0]}`, "推荐放在 Tailscale、Cloudflare Tunnel 或受控 HTTPS 反向代理之后。"] : ["推荐放在 Tailscale、Cloudflare Tunnel 或受控 HTTPS 反向代理之后。"]}
          tone={health?.publicBaseUrl ? "amber" : "blue"}
        />
      </div>
      {diagnostics ? (
        <>
        <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-100">
                <CheckCircle2 className="h-4 w-4" />
                推荐绑定地址
              </div>
              <div className="mt-2 font-mono text-sm text-cyan-50">{recommendedCandidate?.baseUrl || baseUrl}</div>
              <div className="mt-2 text-xs leading-relaxed text-cyan-100/75">
                {recommendedCandidate?.requiresRestart
                  ? "这个地址需要保存到桌面启动配置并重启 LifeOS AI 后，二维码才会稳定使用。复制启动环境只作为开发者备用。"
                  : "当前服务已经可以直接使用这个地址生成绑定二维码。"}
              </div>
              {recommendedCandidate?.envTemplate ? (
                <div className="mt-3 rounded-xl border border-cyan-100/15 bg-[#061016]/45 p-3">
                  <div className="mb-1 text-[11px] font-bold text-cyan-100/80">推荐启动环境</div>
                  <div className="font-mono text-[11px] leading-relaxed text-cyan-50/85">{recommendedCandidate.envTemplate}</div>
                  {recommendedCandidate.requiresRestart ? (
                    <div className="mt-2 text-[11px] leading-relaxed text-cyan-100/60">
                      安装包用户请点击“保存到桌面启动配置”，退出并重新打开 LifeOS AI。开发者可使用：{recommendedCandidate.restartInstruction}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {diagnostics.desktopRuntimeConfig ? (
                <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-[11px] leading-relaxed text-emerald-100">
                  已保存桌面启动配置：{diagnostics.desktopRuntimeConfig.label}，地址 {diagnostics.desktopRuntimeConfig.baseUrl}。退出并重新打开 LifeOS AI 后会按该配置启动。
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copyText("recommended-mobile", recommendedCandidate?.mobileChatUrl || mobileChatUrl)}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-100/20 bg-[#061016]/45 px-3 py-2 text-xs font-bold text-cyan-50"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied === "recommended-mobile" ? "已复制手机入口" : "复制手机入口"}
              </button>
              {recommendedCandidate?.envTemplate ? (
                <button
                  aria-label="复制推荐启动环境"
                  onClick={() => copyText("recommended-env", recommendedCandidate.envTemplate)}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-100/20 bg-[#061016]/45 px-3 py-2 text-xs font-bold text-cyan-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === "recommended-env" ? "已复制推荐启动环境" : "复制推荐启动环境"}
                </button>
              ) : null}
              <button
                onClick={() => handleTestCandidate(recommendedCandidate?.id || "recommended", recommendedCandidate?.baseUrl || baseUrl)}
                disabled={testingCandidate === (recommendedCandidate?.id || "recommended")}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-100/20 bg-[#061016]/45 px-3 py-2 text-xs font-bold text-cyan-50 disabled:opacity-50"
              >
                <PlugZap className="h-3.5 w-3.5" />
                {testingCandidate === (recommendedCandidate?.id || "recommended") ? "测试中" : "测试推荐地址"}
              </button>
              {recommendedCandidate ? (
                <button
                  onClick={() => handleSaveCandidate(recommendedCandidate)}
                  disabled={savingCandidate === recommendedCandidate.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {savingCandidate === recommendedCandidate.id ? "保存中" : "保存到桌面启动配置"}
                </button>
              ) : null}
            </div>
          </div>
          {diagnostics.connectionCandidates?.length ? (
            <div className="mt-4 grid gap-2 lg:grid-cols-2">
              {diagnostics.connectionCandidates.slice(0, 6).map((candidate) => (
                <div key={candidate.id} className="rounded-2xl border border-white/[0.08] bg-[#061016]/45 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-zinc-100">{candidate.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${candidate.secure ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-100"}`}>
                          {candidate.secure ? "推荐安全" : "仅可信网络"}
                        </span>
                        {candidate.requiresRestart ? <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-100">需重启生效</span> : null}
                      </div>
                      <div className="mt-1 truncate font-mono text-xs text-cyan-200">{candidate.baseUrl}</div>
                      <div className="mt-2 text-xs leading-relaxed text-zinc-400">{candidate.notes[0]}</div>
                      <div className="mt-2 rounded-xl border border-white/[0.06] bg-black/15 p-2 font-mono text-[10px] leading-relaxed text-zinc-400">
                        {candidate.envTemplate}
                      </div>
                      <div className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                        安装包用户保存后退出并重新打开 LifeOS AI。开发者备用：{candidate.restartInstruction}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => copyText(candidate.id, candidate.mobileChatUrl)}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied === candidate.id ? "已复制" : "复制手机入口"}
                    </button>
                    <button
                      onClick={() => handleTestCandidate(candidate.id, candidate.baseUrl)}
                      disabled={testingCandidate === candidate.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-50"
                    >
                      <PlugZap className="h-3.5 w-3.5" />
                      {testingCandidate === candidate.id ? "测试中" : "测试"}
                    </button>
                    <button
                      onClick={() => copyText(`${candidate.id}-env`, candidate.envTemplate)}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied === `${candidate.id}-env` ? "已复制启动环境" : "复制启动环境"}
                    </button>
                    <button
                      onClick={() => handleSaveCandidate(candidate)}
                      disabled={savingCandidate === candidate.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {savingCandidate === candidate.id ? "保存中" : "保存到桌面启动配置"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ToolStatus
            title="Cloudflare Tunnel"
            status={diagnostics.cloudflare.running ? "运行中" : diagnostics.cloudflare.installed ? "已安装" : "未安装"}
            rows={[
              ["版本", diagnostics.cloudflare.version || "-"],
              ["公网地址", diagnostics.cloudflare.detectedUrls[0] || "-"],
              ["安装", diagnostics.cloudflare.installCommand],
              ["命令", diagnostics.cloudflare.suggestedCommand],
              ["启动", diagnostics.cloudflare.envTemplate],
            ]}
            notes={diagnostics.cloudflare.notes}
            onCopy={() => copyText("cloudflare", diagnostics.cloudflare.detectedUrls[0] || diagnostics.cloudflare.suggestedCommand)}
            copied={copied === "cloudflare"}
            extraCopy={{
              label: copied === "cloudflare-env" ? "已复制启动环境" : "复制启动环境",
              onCopy: () => copyText("cloudflare-env", diagnostics.cloudflare.envTemplate),
            }}
          />
          <ToolStatus
            title="Tailscale"
            status={diagnostics.tailscale.online ? "在线" : diagnostics.tailscale.installed ? "已安装" : "未安装"}
            rows={[
              ["设备", diagnostics.tailscale.deviceName || "-"],
              ["Tailnet", diagnostics.tailscale.tailnetName || "-"],
              ["MagicDNS", diagnostics.tailscale.magicDnsUrls?.[0] || "-"],
              ["Tailnet IP", diagnostics.tailscale.urls[0] || "-"],
              ["安装", diagnostics.tailscale.installCommand],
              ["手机访问", diagnostics.tailscale.mobileUrls?.[0] || diagnostics.tailscale.urls[0] || "-"],
              ["启动", diagnostics.tailscale.envTemplate],
            ]}
            notes={diagnostics.tailscale.notes}
            onCopy={(diagnostics.tailscale.mobileUrls?.[0] || diagnostics.tailscale.urls[0]) ? () => copyText("tailscale", diagnostics.tailscale.mobileUrls?.[0] || diagnostics.tailscale.urls[0]) : undefined}
            copied={copied === "tailscale"}
            extraCopy={{
              label: copied === "tailscale-env" ? "已复制启动环境" : "复制启动环境",
              onCopy: () => copyText("tailscale-env", diagnostics.tailscale.envTemplate),
            }}
          />
        </div>
        </>
      ) : null}
      {diagnostics?.lanEnvTemplate ? (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 font-bold text-zinc-200">局域网启动环境</div>
            <div className="font-mono text-zinc-300">{diagnostics.lanEnvTemplate}</div>
          </div>
          <button
            aria-label="复制局域网启动环境"
            onClick={() => copyText("lan-env", diagnostics.lanEnvTemplate)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied === "lan-env" ? "已复制" : "复制"}
          </button>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs text-zinc-400 md:grid-cols-[1fr_1fr_auto]">
        <div>
          <div className="mb-1 font-bold text-zinc-200">手机端入口</div>
          <div aria-label="手机端入口地址" className="font-mono text-cyan-200">{mobileChatUrl}</div>
          <div className="mt-1 leading-relaxed text-zinc-500">
            绑定二维码会在“绑定手机端”页面生成，实际地址形如 /mobile/install/&lt;token&gt;。
          </div>
        </div>
        <div>
          <div className="mb-1 font-bold text-zinc-200">手机聊天入口</div>
          <div aria-label="手机聊天入口地址" className="font-mono text-cyan-200">{mobileChatUrl}</div>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlugZap className="h-3.5 w-3.5" />
            {testing ? "测试中" : "测试推荐地址"}
          </button>
        </div>
      </div>
      {testStatus ? <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs leading-relaxed text-zinc-300">{testStatus}</div> : null}
      {diagnostics?.safety.requiresHttpsForInternet ? (
        <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
          当前 PUBLIC_BASE_URL 不是 HTTPS。异地访问建议改用 Cloudflare Tunnel、Tailscale 或可信 HTTPS 反向代理。
        </div>
      ) : null}
    </section>
  );
}

function ToolStatus({
  title,
  status,
  rows,
  notes,
  onCopy,
  copied,
  extraCopy,
}: {
  title: string;
  status: string;
  rows: Array<[string, string]>;
  notes: string[];
  onCopy?: () => void;
  copied: boolean;
  extraCopy?: { label: string; onCopy: () => void };
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-bold text-zinc-100">{title}</div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-300">{status}</span>
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-500">{label}</span>
            <span className="max-w-[70%] truncate text-right font-mono text-zinc-200">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
        {notes.map((note) => (
          <div key={note} className="text-xs leading-relaxed text-zinc-400">{note}</div>
        ))}
      </div>
      {onCopy ? (
        <button aria-label={`复制 ${title}`} onClick={onCopy} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200">
          <Copy className="h-3.5 w-3.5" />
          {copied ? "已复制" : "复制"}
        </button>
      ) : null}
      {extraCopy ? (
        <button aria-label={`复制 ${title} 启动环境`} onClick={extraCopy.onCopy} className="ml-2 mt-3 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-200">
          <Copy className="h-3.5 w-3.5" />
          {extraCopy.label}
        </button>
      ) : null}
    </div>
  );
}

function GuideCard({
  icon,
  title,
  status,
  rows,
  notes,
  tone,
}: {
  icon: ReactNode;
  title: string;
  status: string;
  rows: Array<[string, string]>;
  notes: string[];
  tone: "green" | "blue" | "amber";
}) {
  const toneClass = {
    green: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  }[tone];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-bold">
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${toneClass}`}>{icon}</span>
          {title}
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${toneClass}`}>{status}</span>
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-500">{label}</span>
            <span className="max-w-[62%] truncate text-right font-mono text-zinc-200">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-3">
        {notes.map((note) => (
          <div key={note} className="text-xs leading-relaxed text-zinc-400">
            {note}
          </div>
        ))}
      </div>
    </div>
  );
}
