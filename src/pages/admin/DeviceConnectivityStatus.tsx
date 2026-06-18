import type { BoundDevice } from "../../services/lifeosApi";
import { useI18n } from "../../i18n/I18nProvider";

export default function DeviceConnectivityStatus({ report }: { report: BoundDevice["connectivityReport"] }) {
  const { t } = useI18n();
  if (!report) {
    return <div className="mt-2 text-xs text-zinc-600">{t("dashboard.mobileConnectivityMissing")}</div>;
  }
  return (
    <div className={`mt-2 text-xs leading-relaxed ${report.ok ? "text-emerald-300" : "text-amber-300"}`}>
      {t(report.ok ? "dashboard.mobileConnectivityOk" : "dashboard.mobileConnectivityFail", {
        time: new Date(report.createdAt).toLocaleString(),
        url: report.currentBaseUrl,
      })}
      <div className="mt-1 text-zinc-500">
        {t("dashboard.mobileConnectivityChecks", {
          health: report.healthOk ? t("dashboard.pass") : t("dashboard.fail"),
          mobile: report.mobileShellOk ? t("dashboard.pass") : t("dashboard.fail"),
          realtime: report.websocketOk ? t("dashboard.pass") : t("dashboard.fail"),
        })}
      </div>
    </div>
  );
}
