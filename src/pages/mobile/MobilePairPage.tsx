import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import { confirmBinding, saveStoredDeviceCredential } from "../../services/lifeosApi";
import { isDeviceSignatureAvailable } from "../../services/deviceKeyStore";
import {
  clearPendingPairingToken,
  consumePendingPairingToken,
  extractPairingToken,
  pairingInstallPath,
  savePendingPairingToken,
  setPairingManifestToken,
} from "../../services/mobilePairingIntent";

export default function MobilePairPage() {
  const token = useMemo(() => extractPairingToken(window.location.href), []);
  const [deviceName, setDeviceName] = useState(() => {
    const platform = navigator.platform || "Mobile";
    return `手机端 ${platform}`;
  });
  const [status, setStatus] = useState<"idle" | "binding" | "bound" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const signatureAvailable = isDeviceSignatureAvailable();

  useEffect(() => {
    if (!token) {
      const pendingToken = consumePendingPairingToken();
      if (pendingToken) {
        savePendingPairingToken(pendingToken);
        window.location.replace(pairingInstallPath(pendingToken));
      }
      return undefined;
    }
    savePendingPairingToken(token);
    const installPath = pairingInstallPath(token);
    if (window.location.pathname !== installPath) {
      window.history.replaceState(null, "", installPath);
    }
    return setPairingManifestToken(token);
  }, [token]);

  const handleConfirm = async () => {
    if (!token || !deviceName.trim()) return;
    setStatus("binding");
    setError(null);
    try {
      const credential = await confirmBinding(token, deviceName.trim());
      await saveStoredDeviceCredential(credential);
      clearPendingPairingToken();
      setStatus("bound");
    } catch (err: any) {
      setError(err.message || "绑定失败，请重新生成二维码");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#060a10] text-zinc-100 flex items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-[28px] border border-white/[0.08] bg-[#101722] p-6 shadow-2xl">
        {status === "bound" ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-emerald-300 mx-auto mb-5" />
            <h1 className="text-xl font-bold">绑定完成</h1>
            <p className="text-sm text-zinc-400 mt-2">这台手机已经可以连接你的 LifeOS AI 基站。</p>
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-left text-xs leading-relaxed text-emerald-100/80">
              现在可以把 LifeOS 添加到主屏幕。设备凭证已经保存，之后从桌面图标打开会自动连接这台电脑。
            </div>
            <a href="/mobile/chat" className="mt-8 inline-flex w-full justify-center rounded-xl bg-cyan-500 py-3 font-bold text-[#061016]">
              进入手机端 AI
            </a>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center mb-5">
              <Smartphone className="w-5 h-5 text-cyan-300" />
            </div>
            <h1 className="text-xl font-bold">确认绑定电脑</h1>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
              绑定后，这台手机可以向电脑端发送 AI 请求、同步基础设置，并使用你的个性化 JARVIS。
            </p>
            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100/80">
              推荐先点下面的“确认绑定”再添加到主屏幕。即使你现在添加，LifeOS 也会把绑定参数保存 24 小时；桌面图标如果打开到手机首页，也会自动恢复到确认绑定页。
            </div>

            {!token && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 flex gap-2">
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                绑定链接缺少 token，请回到电脑端重新生成二维码。
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <label className="block mt-6 text-xs font-bold text-zinc-500 uppercase tracking-wider">设备名称</label>
            <input
              value={deviceName}
              onChange={(event) => setDeviceName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
              placeholder="例如：iPhone 15 Pro"
            />

            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold">{signatureAvailable ? "安全提示" : "局域网兼容模式"}</div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {signatureAvailable
                    ? "请只绑定你信任的个人电脑。之后你可以在电脑端设备管理中随时撤销这台手机。"
                    : "当前浏览器没有开放 WebCrypto 签名能力，通常是因为正在使用局域网 HTTP 地址。会先使用短期设备 Token 完成绑定；之后可在 HTTPS/Tailscale/Cloudflare Tunnel 下重新绑定升级为签名设备。"}
                </p>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={!token || !deviceName.trim() || status === "binding"}
              className="mt-6 w-full rounded-xl bg-cyan-500 py-3 font-bold text-[#061016] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === "binding" && <Loader2 className="w-4 h-4 animate-spin" />}
              确认绑定
            </button>
          </>
        )}
      </div>
    </div>
  );
}
