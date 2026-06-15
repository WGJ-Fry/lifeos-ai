import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { changeAdminPassword } from "../../../services/lifeosApi";
import type { ConfigDiagnostics } from "../../../services/lifeosApi";

export default function AdminPasswordPanel({
  diagnostics,
  onChanged,
}: {
  diagnostics: ConfigDiagnostics;
  onChanged: () => Promise<void> | void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const passwordCheck = diagnostics.securityCheck.items.find((item) => item.id === "password");
  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSubmit = async () => {
    setStatus(null);
    if (newPassword.length < 8) {
      setStatus("新密码至少需要 8 位。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("两次输入的新密码不一致。");
      return;
    }

    setBusy(true);
    try {
      const result = await changeAdminPassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus(result.securityCheck.overall === "ok" ? "管理员密码已更新，公网安全自检已通过。" : "管理员密码已更新，请继续处理安全自检提示。");
      await onChanged();
    } catch (error: any) {
      setStatus(error.message || "修改管理员密码失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-[28px] border border-white/[0.08] bg-[#101722] p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            管理员密码
          </div>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            公网或异地连接前建议使用 12 位以上的短语密码，并混合数字或符号。密码只保存在电脑端。
          </p>
        </div>
        {passwordCheck ? (
          <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
            passwordCheck.status === "critical"
              ? "bg-red-500/10 text-red-200"
              : passwordCheck.status === "warning"
                ? "bg-amber-500/10 text-amber-200"
                : "bg-emerald-500/10 text-emerald-200"
          }`}>
            {passwordCheck.status === "ok" ? "强度通过" : passwordCheck.status === "critical" ? "需要处理" : "建议加强"}
          </span>
        ) : null}
      </div>

      {passwordCheck ? (
        <div className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs leading-relaxed text-zinc-400">
          <div className="font-bold text-zinc-200">{passwordCheck.message}</div>
          <div className="mt-1">{passwordCheck.action}</div>
        </div>
      ) : null}

      {status ? <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-zinc-300">{status}</div> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <PasswordField label="当前密码" value={currentPassword} onChange={setCurrentPassword} disabled={busy} />
        <PasswordField label="新密码" value={newPassword} onChange={setNewPassword} disabled={busy} />
        <PasswordField label="确认新密码" value={confirmPassword} onChange={setConfirmPassword} disabled={busy} />
      </div>
      <button
        onClick={handleSubmit}
        disabled={busy || !canSubmit}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 disabled:opacity-50 sm:w-auto"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        更新管理员密码
      </button>
    </section>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm outline-none focus:border-emerald-400/60 disabled:opacity-55"
      />
    </label>
  );
}
