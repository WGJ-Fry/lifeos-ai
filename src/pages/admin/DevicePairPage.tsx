import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Copy, Loader2, PlugZap, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { BindingSession, BoundDevice, getBindingSession, getNetworkDiagnostics, NetworkDiagnostics, startBindingSession, testConnectionUrl } from "../../services/lifeosApi";

export default function DevicePairPage() {
  const [session, setSession] = useState<BindingSession | null>(null);
  const [confirmedDevice, setConfirmedDevice] = useState<BoundDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pairingBaseUrl, setPairingBaseUrl] = useState("");
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnostics | null>(null);
  const [connectionTestStatus, setConnectionTestStatus] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const createSession = async () => {
    setError(null);
    setConfirmedDevice(null);
    setConnectionTestStatus(null);
    try {
      let recommendedBaseUrl = "";
      try {
        const networkDiagnostics = await getNetworkDiagnostics();
        setDiagnostics(networkDiagnostics);
        recommendedBaseUrl = networkDiagnostics.recommendedBaseUrl;
      } catch {
        setDiagnostics(null);
        recommendedBaseUrl = "";
      }
      const data = await startBindingSession(recommendedBaseUrl);
      setPairingBaseUrl(data.baseUrl || recommendedBaseUrl);
      setSession(data);
    } catch (err: any) {
      setError(err.message || "无法创建绑定二维码");
    }
  };

  useEffect(() => {
    createSession();
  }, []);

  useEffect(() => {
    if (!session || confirmedDevice) return;
    const interval = window.setInterval(async () => {
      try {
        const data = await getBindingSession(session.id);
        if (data.device) {
          setConfirmedDevice(data.device);
          window.clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1500);
    return () => window.clearInterval(interval);
  }, [session, confirmedDevice]);

  const expiresIn = session ? Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000)) : 0;
  const activeCandidate = diagnostics?.connectionCandidates?.find((candidate) => candidate.baseUrl === pairingBaseUrl) || diagnostics?.connectionCandidates?.[0] || null;

  const handleTestPairingAddress = async () => {
    if (!pairingBaseUrl) return;
    setTestingConnection(true);
    setConnectionTestStatus(null);
    try {
      const { result } = await testConnectionUrl(pairingBaseUrl);
      setConnectionTestStatus(
        result.ok
          ? `连接测试通过：${result.latencyMs}ms，手机可访问 ${result.url}`
          : `连接测试失败：${result.error || `HTTP ${result.status}`}。请换用同一 Wi-Fi、Tailscale 或 Cloudflare Tunnel 地址。`,
      );
    } catch (err: any) {
      setConnectionTestStatus(err.message || "连接测试失败，请检查当前绑定地址。");
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a10] text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-[1fr_420px] gap-6">
        <section className="rounded-[28px] border border-white/[0.08] bg-[#101722] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">绑定手机端</h1>
              <p className="text-sm text-zinc-400 mt-1">让手机安全连接这台电脑上的 LifeOS Local Core。</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-zinc-300 leading-relaxed">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="font-bold text-zinc-100 mb-1">1. 打开手机浏览器</div>
              <p>访问当前服务地址，或直接扫描右侧二维码。</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="font-bold text-zinc-100 mb-1">2. 确认设备信息</div>
              <p>手机端会显示绑定确认页，确认后会保存一份本机设备凭证。</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="font-bold text-zinc-100 mb-1">3. 保持电脑端在线</div>
              <p>同局域网可直接访问；异地连接时建议通过 Cloudflare Tunnel 暴露 HTTPS 地址。</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/[0.08] bg-[#0b111a] p-6 flex flex-col items-center justify-center min-h-[520px]">
          {error && (
            <div className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 w-full">
              {error}
            </div>
          )}

          {confirmedDevice ? (
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-300 mx-auto mb-5" />
              <h2 className="text-xl font-bold">绑定成功</h2>
              <p className="text-sm text-zinc-400 mt-2">{confirmedDevice.name} 已经可以连接这台电脑。</p>
              <a href="/admin/dashboard" className="inline-flex mt-8 px-5 py-3 rounded-xl bg-cyan-500 text-[#061016] font-bold">
                查看控制台
              </a>
            </div>
          ) : session ? (
            <>
              <div className="bg-white p-4 rounded-3xl mb-5">
                <QRCodeSVG value={session.pairingUrl} size={260} />
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-5">
                <Smartphone className="w-4 h-4" />
                二维码 {expiresIn > 0 ? `${expiresIn}s 后过期` : "已过期"}
              </div>
              {pairingBaseUrl ? (
                <div className="mb-4 w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-zinc-400">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="font-bold text-zinc-200">已根据连接诊断自动选择绑定地址</span>
                    {activeCandidate ? (
                      <>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeCandidate.secure ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-100"}`}>
                          {activeCandidate.secure ? "推荐安全" : "仅可信网络"}
                        </span>
                        {activeCandidate.requiresRestart ? <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-100">需重启生效</span> : null}
                      </>
                    ) : null}
                  </div>
                  <div className="mt-2 text-center">当前绑定地址：<span className="font-mono text-cyan-200">{pairingBaseUrl}</span></div>
                  {activeCandidate ? <div className="mt-2 text-center text-zinc-500">{activeCandidate.label} · {activeCandidate.notes[0]}</div> : null}
                  {activeCandidate?.requiresRestart ? (
                    <div className="mt-3 rounded-xl border border-blue-400/20 bg-blue-500/10 p-2 text-left">
                      <div className="font-bold text-blue-100">重启后生效</div>
                      <div className="mt-1 text-blue-100/75">{activeCandidate.restartInstruction}</div>
                      <div className="mt-2 rounded-lg bg-black/15 p-2 font-mono text-[10px] leading-relaxed text-blue-100/80">{activeCandidate.envTemplate}</div>
                      <button
                        aria-label="复制当前绑定启动环境"
                        onClick={async () => {
                          await navigator.clipboard.writeText(activeCandidate.envTemplate).catch(() => null);
                          setCopiedEnv(true);
                          window.setTimeout(() => setCopiedEnv(false), 1200);
                        }}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-100/20 bg-[#061016]/35 px-3 py-2 text-xs font-bold text-blue-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedEnv ? "已复制启动环境" : "复制当前绑定启动环境"}
                      </button>
                    </div>
                  ) : null}
                  <button
                    onClick={handleTestPairingAddress}
                    disabled={testingConnection}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-50"
                  >
                    <PlugZap className="h-3.5 w-3.5" />
                    {testingConnection ? "测试中" : "测试当前绑定地址"}
                  </button>
                  {connectionTestStatus ? (
                    <div className="mt-2 rounded-xl border border-white/[0.06] bg-[#061016]/55 p-2 text-center leading-relaxed text-zinc-300">
                      {connectionTestStatus}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(session.pairingUrl).catch(() => null);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1200);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-sm font-bold text-zinc-200 hover:bg-white/[0.06]"
              >
                <Copy className="w-4 h-4" />
                {copied ? "已复制绑定链接" : "复制绑定链接"}
              </button>
              <button
                onClick={createSession}
                className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-500/15"
              >
                <RefreshCw className="w-4 h-4" />
                重新生成二维码
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在创建绑定会话...
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
