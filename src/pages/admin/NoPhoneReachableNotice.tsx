import { AlertTriangle } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";

export default function NoPhoneReachableNotice() {
  const { t } = useI18n();
  return (
    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100">
      <div className="mb-1 flex items-center gap-2 font-bold">
        <AlertTriangle className="h-3.5 w-3.5" />
        {t("connection.noPhoneReachableTitle")}
      </div>
      <div>{t("connection.noPhoneReachableAction")}</div>
    </div>
  );
}
