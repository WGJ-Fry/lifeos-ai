import { useEffect, useState } from "react";
import { AlertTriangle, LockKeyhole, Loader2, ShieldCheck } from "lucide-react";
import { getAdminStatus, getHealth, loginAdmin, setupAdmin } from "../../services/lifeosApi";

type Mode = "loading" | "setup" | "login";

export default function AdminLoginPage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [envManaged, setEnvManaged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicSetupRisk, setPublicSetupRisk] = useState(false);

  useEffect(() => {
    Promise.all([getAdminStatus(), getHealth().catch(() => null)])
      .then((status) => {
        const [adminStatus, health] = status;
        setEnvManaged(adminStatus.envManaged);
        setPublicSetupRisk(Boolean(health?.publicSetupRisk));
        if (adminStatus.authenticated) {
          window.location.href = "/admin/dashboard";
          return;
        }
        setMode(adminStatus.configured ? "login" : "setup");
      })
      .catch(() => setMode("login"));
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 8) {
      setError("密码至少需要 8 位。");
      return;
    }
    if (mode === "setup" && password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "setup") {
        const session = await setupAdmin(password);
        window.location.href = session.nextPath || "/admin/onboarding";
      } else {
        const session = await loginAdmin(password);
        window.location.href = session.onboardingRequired ? (session.nextPath || "/admin/onboarding") : "/admin/dashboard";
      }
    } catch (err: any) {
      setError(err.message || "认证失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a10] text-zinc-100 flex items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-[28px] border border-white/[0.08] bg-[#101722] p-6 shadow-2xl">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10">
          {mode === "loading" ? <Loader2 className="h-5 w-5 animate-spin text-cyan-300" /> : <ShieldCheck className="h-5 w-5 text-cyan-300" />}
        </div>

        <h1 className="text-xl font-bold">{mode === "setup" ? "设置管理员密码" : "管理员登录"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {mode === "setup"
            ? "首次启动需要设置本机管理员密码，用于保护设备绑定、记忆、聊天记录和 AI 工具接口。"
            : envManaged
              ? "请输入环境变量 LIFEOS_ADMIN_PASSWORD 配置的管理员密码。"
              : "请输入本机管理员密码。"}
        </p>

        {publicSetupRisk ? (
          <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm leading-relaxed text-red-100">
            <div className="mb-1 flex items-center gap-2 font-bold text-red-50">
              <AlertTriangle className="h-4 w-4" />
              公网/LAN 暴露未完成初始化
            </div>
            请立刻设置管理员密码，并确认只通过可信 HTTPS 隧道或受控网络访问。完成初始化前不要把这个地址分享给其他人。
          </div>
        ) : null}

        {error && <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

        {mode !== "loading" && (
          <div className="mt-6 space-y-3">
            {mode === "setup" ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs leading-relaxed text-zinc-400">
                <div className="mb-2 font-bold text-zinc-200">首次启动向导</div>
                <div>1. 设置管理员密码</div>
                <div>2. 进入设置页配置 AI Key</div>
                <div>3. 绑定手机端开始使用</div>
              </div>
            ) : null}
            <label htmlFor="admin-password" className="block text-xs font-bold uppercase tracking-wider text-zinc-500">密码</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSubmit();
              }}
              className="w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
              autoFocus
            />

            {mode === "setup" && (
              <>
                <label htmlFor="admin-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-zinc-500">确认密码</label>
                <input
                  id="admin-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleSubmit();
                  }}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
                />
              </>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-sm font-bold text-[#061016] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {mode === "setup" ? "完成初始化" : "进入控制台"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
