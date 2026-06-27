import { BadgeCheck, Gauge, RotateCcw, ShieldCheck, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import type { ProblemBlueprint } from "../../../services/problemBlueprint";
import { useI18n } from "../../../i18n/I18nProvider";

type StudioBlueprintReadinessCardProps = {
  blueprint: ProblemBlueprint;
};

function readinessTone(level: ProblemBlueprint["templateReadiness"]["level"]) {
  if (level === "ready") return "border-emerald-500/20 bg-emerald-500/[0.045] text-emerald-100";
  if (level === "review") return "border-amber-500/20 bg-amber-500/[0.045] text-amber-100";
  return "border-zinc-500/20 bg-white/[0.025] text-zinc-200";
}

function qualityTone(level: ProblemBlueprint["qualityScore"]["level"]) {
  if (level === "strong") return "border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-100";
  if (level === "usable") return "border-cyan-500/20 bg-cyan-500/[0.045] text-cyan-100";
  return "border-zinc-500/20 bg-white/[0.025] text-zinc-200";
}

function checkTone(status: ProblemBlueprint["templateReadiness"]["checks"][number]["status"]) {
  if (status === "ready") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  if (status === "review") return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  return "border-red-500/20 bg-red-500/10 text-red-200";
}

function qualityStatusTone(status: ProblemBlueprint["qualityScore"]["dimensions"][number]["status"]) {
  if (status === "pass") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  if (status === "review") return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  return "border-red-500/20 bg-red-500/10 text-red-200";
}

export default function StudioBlueprintReadinessCard({ blueprint }: StudioBlueprintReadinessCardProps) {
  const { t } = useI18n();
  const readiness = blueprint.templateReadiness;
  const quality = blueprint.qualityScore;
  const repairLoop = blueprint.autoRepairLoop;
  return (
    <div className="space-y-3">
    <div className={`rounded-2xl border p-4 ${readinessTone(readiness.level)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-black flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            {t("studio.problemSolver.readiness")}
          </h4>
          <p className="mt-1 text-xs leading-relaxed opacity-75">{t("studio.problemSolver.readinessHint")}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black">{readiness.score}</div>
          <div className="text-[10px] font-bold uppercase opacity-70">
            {t(`studio.problemSolver.readinessLevel.${readiness.level}` as any)}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        {readiness.checks.map((check) => (
          <div key={check.id} className="rounded-xl border border-current/10 bg-black/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold">{check.label}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${checkTone(check.status)}`}>
                {t(`studio.problemSolver.readinessStatus.${check.status}` as any)}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed opacity-75">{check.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2">
        <ReviewBlock icon={<ShieldCheck className="w-4 h-4" />} title={t("studio.problemSolver.capabilityReview")} items={blueprint.capabilityReview} />
        <ReviewBlock icon={<Wrench className="w-4 h-4" />} title={t("studio.problemSolver.repairLoop")} items={blueprint.repairLoop} />
      </div>

      <div className="mt-3 border-t border-current/10 pt-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">{t("studio.problemSolver.nextActions")}</p>
        {readiness.nextActions.map((item) => (
          <p key={item} className="mt-1 text-xs leading-relaxed opacity-80">{item}</p>
        ))}
      </div>
    </div>

    <div className={`rounded-2xl border p-4 ${qualityTone(quality.level)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-black flex items-center gap-2">
            <BadgeCheck className="w-4 h-4" />
            {t("studio.problemSolver.qualityScore")}
          </h4>
          <p className="mt-1 text-xs leading-relaxed opacity-75">{t("studio.problemSolver.qualityHint")}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black">{quality.score}</div>
          <div className="text-[10px] font-bold uppercase opacity-70">
            {t(`studio.problemSolver.qualityLevel.${quality.level}` as any)}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        {quality.dimensions.map((dimension) => (
          <div key={dimension.id} className="rounded-xl border border-current/10 bg-black/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold">{dimension.label}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${qualityStatusTone(dimension.status)}`}>
                {t(`studio.problemSolver.qualityStatus.${dimension.status}` as any)}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-black opacity-80">{dimension.score}</div>
            <p className="mt-1 text-[11px] leading-relaxed opacity-75">{dimension.evidence}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2">
        <ReviewBlock icon={<BadgeCheck className="w-4 h-4" />} title={t("studio.problemSolver.acceptanceCriteria")} items={quality.acceptanceCriteria} />
        <ReviewBlock icon={<Wrench className="w-4 h-4" />} title={t("studio.problemSolver.failureTriggers")} items={quality.failureTriggers} />
      </div>
    </div>

    <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.035] p-4 text-cyan-50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-black flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-cyan-300" />
            {t("studio.problemSolver.autoRepairLoop")}
          </h4>
          <p className="mt-1 text-xs leading-relaxed opacity-75">{t("studio.problemSolver.autoRepairHint")}</p>
        </div>
        <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-[10px] font-black uppercase text-cyan-100">
          {repairLoop.mode} · {repairLoop.retryLimit}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        <ReviewBlock icon={<RotateCcw className="w-4 h-4" />} title={t("studio.problemSolver.autoRepairSignals")} items={repairLoop.autoRepairSignals} />
        <ReviewBlock icon={<ShieldCheck className="w-4 h-4" />} title={t("studio.problemSolver.manualRepairSignals")} items={repairLoop.manualReviewSignals} />
        <ReviewBlock icon={<BadgeCheck className="w-4 h-4" />} title={t("studio.problemSolver.verificationSteps")} items={repairLoop.verificationSteps} />
      </div>
      <p className="mt-3 rounded-xl border border-cyan-500/10 bg-black/10 p-3 text-xs leading-relaxed opacity-80">
        {repairLoop.rollbackRule}
      </p>
    </div>
  </div>
  );
}

function ReviewBlock({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-current/10 bg-black/10 p-3">
      <div className="flex items-center gap-2 text-xs font-black">
        {icon}
        {title}
      </div>
      {items.map((item) => (
        <p key={item} className="mt-1 text-[11px] leading-relaxed opacity-75">{item}</p>
      ))}
    </div>
  );
}
