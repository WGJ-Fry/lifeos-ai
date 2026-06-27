import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveProblemBlueprint,
  PROBLEM_BLUEPRINT_MAX_INPUT_CHARS,
} from "../src/services/problemBlueprint.ts";

test("problem blueprint turns accounting needs into a runnable app prompt", () => {
  const blueprint = deriveProblemBlueprint("帮我做一个本月支出记账、预算提醒和分类汇总面板");

  assert.equal(blueprint.isReady, true);
  assert.equal(blueprint.language, "zh-CN");
  assert.equal(blueprint.category, "ledger");
  assert.equal(blueprint.templateId, "problem-ledger");
  assert.match(blueprint.templateName, /台账模板/);
  assert.equal(blueprint.templateLibrary.length, 6);
  assert.equal(blueprint.templateLibrary[0].role, "primary");
  assert.equal(blueprint.templateLibrary[0].id, "problem-ledger");
  assert.equal(blueprint.templateLibrary[0].variantId, "core");
  assert.equal(blueprint.templateLibrary[0].matchScore, 100);
  assert.ok(blueprint.templateLibrary.some((item) => item.id === "problem-ledger-reimbursement"));
  assert.ok(blueprint.templateLibrary.some((item) => item.id === "problem-ledger-subscription"));
  assert.ok(blueprint.templateLibrary.some((item) => item.role === "alternative"));
  assert.ok(blueprint.templateLibrary.every((item) => Array.isArray(item.outputs) && item.outputs.length > 0));
  assert.ok(blueprint.templateLibrary.every((item) => Array.isArray(item.useCases) && item.useCases.length > 0));
  assert.ok(blueprint.templateLibrary.some((item) => item.riskLevel === "medium"));
  assert.ok(blueprint.templateFit.some((item) => item.includes("CSV")));
  assert.match(blueprint.categoryLabel, /记账/);
  assert.match(blueprint.summary, /可运行程序/);
  assert.match(blueprint.appPrompt, /生成一个可运行的解决程序/);
  assert.match(blueprint.appPrompt, /不是只根据描述生成一个展示用小程序/);
  assert.match(blueprint.appPrompt, /生成前确认/);
  assert.match(blueprint.appPrompt, /权限边界/);
  assert.match(blueprint.appPrompt, /失败修复/);
  assert.match(blueprint.appPrompt, /模板适配/);
  assert.match(blueprint.appPrompt, /候选模板库/);
  assert.match(blueprint.appPrompt, /模板检查/);
  assert.match(blueprint.appPrompt, /模板输入/);
  assert.match(blueprint.appPrompt, /模板输出/);
  assert.match(blueprint.appPrompt, /质量门槛/);
  assert.match(blueprint.appPrompt, /危险动作边界/);
  assert.match(blueprint.appPrompt, /版本计划/);
  assert.match(blueprint.appPrompt, /版本差异检查/);
  assert.match(blueprint.appPrompt, /就绪检查/);
  assert.match(blueprint.appPrompt, /质量评分/);
  assert.match(blueprint.appPrompt, /验收标准/);
  assert.match(blueprint.appPrompt, /失败触发/);
  assert.match(blueprint.appPrompt, /自动修复闭环/);
  assert.match(blueprint.appPrompt, /能力复核/);
  assert.match(blueprint.appPrompt, /修复循环/);
  assert.match(blueprint.appPrompt, /修复提示/);
  assert.equal(blueprint.steps.length, 3);
  assert.ok(blueprint.suggestedModules.some((item) => item.includes("预算")));
  assert.ok(blueprint.templateChecklist.some((item) => item.includes("示例数据")));
  assert.ok(blueprint.templateChecklist.some((item) => item.includes("空状态")));
  assert.ok(blueprint.templateInputs.some((item) => item.includes("金额")));
  assert.ok(blueprint.templateOutputs.some((item) => item.includes("超预算")));
  assert.ok(blueprint.templateQualityGates.some((item) => item.includes("有效数字")));
  assert.ok(blueprint.templateDangerousActions.some((item) => item.includes("银行卡")));
  assert.equal(blueprint.templateReadiness.level, "ready");
  assert.equal(blueprint.templateReadiness.score >= 85, true);
  assert.equal(blueprint.templateReadiness.checks.length, 6);
  assert.ok(blueprint.templateReadiness.checks.some((item) => item.id === "permission-boundary" && item.status === "review"));
  assert.ok(blueprint.templateReadiness.nextActions.some((item) => item.includes("权限边界")));
  assert.equal(blueprint.qualityScore.level, "usable");
  assert.equal(blueprint.qualityScore.score >= 80, true);
  assert.equal(blueprint.qualityScore.dimensions.length, 6);
  assert.ok(blueprint.qualityScore.dimensions.some((item) => item.id === "task-fit" && item.status === "pass"));
  assert.ok(blueprint.qualityScore.acceptanceCriteria.some((item) => item.includes("真实样例")));
  assert.ok(blueprint.qualityScore.failureTriggers.some((item) => item.includes("错误结果")));
  assert.equal(blueprint.autoRepairLoop.mode, "guarded-auto-repair");
  assert.equal(blueprint.autoRepairLoop.retryLimit, 2);
  assert.equal(blueprint.autoRepairLoop.canAutoRepair, true);
  assert.ok(blueprint.autoRepairLoop.autoRepairSignals.some((item) => item.includes("运行错误")));
  assert.ok(blueprint.autoRepairLoop.manualReviewSignals.some((item) => item.includes("权限")));
  assert.ok(blueprint.autoRepairLoop.rollbackRule.includes("回滚"));
  assert.ok(blueprint.autoRepairLoop.verificationSteps.some((item) => item.includes("样例任务")));
  assert.ok(blueprint.versioningPlan.some((item) => item.includes("替换可用版本前")));
  assert.ok(blueprint.versionDiffChecklist.some((item) => item.includes("真实样例")));
  assert.ok(blueprint.confirmationChecklist.some((item) => item.includes("完成标准")));
  assert.ok(blueprint.permissionNotes.some((item) => item.includes("本地存储")));
  assert.ok(blueprint.capabilityReview.some((item) => item.includes("requestAction")));
  assert.ok(blueprint.failureRecovery.some((item) => item.includes("重新生成")));
  assert.ok(blueprint.repairLoop.some((item) => item.includes("修复提案")));
  assert.ok(blueprint.repairPrompts.some((item) => item.includes("分类规则")));
  assert.ok(blueprint.riskNotes.some((item) => item.includes("银行卡号")));
});

test("problem blueprint recognizes planning and habit scenarios", () => {
  const planner = deriveProblemBlueprint("把下周项目计划拆成每天任务和优先级");
  const habit = deriveProblemBlueprint("做一个每天喝水打卡和复盘工具");

  assert.equal(planner.category, "planner");
  assert.equal(habit.category, "habit");
  assert.ok(planner.suggestedModules.some((item) => item.includes("优先级")));
  assert.ok(habit.suggestedModules.some((item) => item.includes("打卡")));
});

test("problem blueprint covers lookup, organizer, calculator, and form template contracts", () => {
  const lookup = deriveProblemBlueprint("做一个资料库查询和来源标注工具");
  const organizer = deriveProblemBlueprint("帮我把一堆笔记整理成分类清单和摘要");
  const calculator = deriveProblemBlueprint("做一个报价和税费计算器");
  const form = deriveProblemBlueprint("做一个报名表单和结果导出工具");

  assert.equal(lookup.category, "lookup");
  assert.equal(organizer.category, "organizer");
  assert.equal(calculator.category, "calculator");
  assert.equal(form.category, "form");
  assert.ok(lookup.templateOutputs.some((item) => item.includes("来源")));
  assert.ok(organizer.templateQualityGates.some((item) => item.includes("原始条目")));
  assert.ok(calculator.templateDangerousActions.some((item) => item.includes("财务建议")));
  assert.ok(form.templateInputs.some((item) => item.includes("字段")));
});

test("problem blueprint preserves English app generation guidance", () => {
  const blueprint = deriveProblemBlueprint("Create a customer lead follow-up workflow panel with status tracking");

  assert.equal(blueprint.language, "en-US");
  assert.equal(blueprint.category, "workflow");
  assert.equal(blueprint.templateId, "problem-workflow");
  assert.match(blueprint.templateName, /Workflow board template/);
  assert.equal(blueprint.templateLibrary[0].role, "primary");
  assert.equal(blueprint.templateLibrary[0].id, "problem-workflow");
  assert.equal(blueprint.templateLibrary.length, 6);
  assert.ok(blueprint.templateLibrary.some((item) => item.id === "problem-workflow-crm"));
  assert.ok(blueprint.templateLibrary.some((item) => item.useCases.includes("sales follow-up")));
  assert.ok(blueprint.templateLibrary.some((item) => item.role === "alternative"));
  assert.match(blueprint.appPrompt, /runnable problem-solving app/);
  assert.match(blueprint.appPrompt, /not merely visualize a description/);
  assert.match(blueprint.appPrompt, /Before generation/);
  assert.match(blueprint.appPrompt, /Permission boundary/);
  assert.match(blueprint.appPrompt, /Failure recovery/);
  assert.match(blueprint.appPrompt, /Template fit/);
  assert.match(blueprint.appPrompt, /Template library candidates/);
  assert.match(blueprint.appPrompt, /Template checklist/);
  assert.match(blueprint.appPrompt, /Template inputs/);
  assert.match(blueprint.appPrompt, /Template outputs/);
  assert.match(blueprint.appPrompt, /Quality gates/);
  assert.match(blueprint.appPrompt, /Dangerous action boundary/);
  assert.match(blueprint.appPrompt, /Versioning plan/);
  assert.match(blueprint.appPrompt, /Version diff checklist/);
  assert.match(blueprint.appPrompt, /Readiness checks/);
  assert.match(blueprint.appPrompt, /Quality score/);
  assert.match(blueprint.appPrompt, /Acceptance criteria/);
  assert.match(blueprint.appPrompt, /Failure triggers/);
  assert.match(blueprint.appPrompt, /Auto-repair loop/);
  assert.match(blueprint.appPrompt, /Capability review/);
  assert.match(blueprint.appPrompt, /Repair loop/);
  assert.match(blueprint.appPrompt, /Repair prompts/);
  assert.ok(blueprint.suggestedModules.includes("step board"));
  assert.ok(blueprint.templateFit.some((item) => item.includes("project stages")));
  assert.ok(blueprint.templateChecklist.some((item) => item.includes("sample data")));
  assert.ok(blueprint.templateInputs.some((item) => item.includes("workflow stages")));
  assert.ok(blueprint.templateOutputs.some((item) => item.includes("workflow board")));
  assert.ok(blueprint.templateQualityGates.some((item) => item.includes("traceable")));
  assert.ok(blueprint.templateDangerousActions.some((item) => item.includes("confirmation")));
  assert.equal(blueprint.templateReadiness.level, "ready");
  assert.equal(blueprint.templateReadiness.checks.some((item) => item.id === "repair-loop" && item.status === "review"), true);
  assert.equal(blueprint.qualityScore.level, "usable");
  assert.ok(blueprint.qualityScore.dimensions.some((item) => item.id === "permission-safety"));
  assert.equal(blueprint.autoRepairLoop.mode, "guarded-auto-repair");
  assert.ok(blueprint.autoRepairLoop.manualReviewSignals.some((item) => item.includes("requestAction")));
  assert.ok(blueprint.versioningPlan.some((item) => item.includes("Save each generated app version")));
  assert.ok(blueprint.versionDiffChecklist.some((item) => item.includes("previous runnable version")));
  assert.ok(blueprint.confirmationChecklist.some((item) => item.includes("success criteria")));
  assert.ok(blueprint.permissionNotes.some((item) => item.includes("second confirmation")));
  assert.ok(blueprint.capabilityReview.some((item) => item.includes("requestAction")));
  assert.ok(blueprint.failureRecovery.some((item) => item.includes("regenerate")));
  assert.ok(blueprint.repairLoop.some((item) => item.includes("repair proposal")));
  assert.ok(blueprint.repairPrompts.some((item) => item.includes("state machine")));
});

test("problem blueprint limits state payload size and handles empty input safely", () => {
  const empty = deriveProblemBlueprint("");
  const long = deriveProblemBlueprint(`规划${"很长".repeat(600)}`);

  assert.equal(empty.isReady, false);
  assert.equal(empty.appPrompt, "");
  assert.equal(empty.templateLibrary[0].role, "primary");
  assert.equal(empty.templateReadiness.level, "draft");
  assert.equal(empty.templateReadiness.score, 0);
  assert.equal(empty.qualityScore.level, "draft");
  assert.equal(empty.qualityScore.score, 0);
  assert.equal(empty.autoRepairLoop.canAutoRepair, false);
  assert.equal(empty.autoRepairLoop.mode, "manual-review");
  assert.equal(long.isReady, true);
  assert.equal(long.normalizedProblem.length, PROBLEM_BLUEPRINT_MAX_INPUT_CHARS);
  assert.ok(long.appPrompt.length < PROBLEM_BLUEPRINT_MAX_INPUT_CHARS + 4200);
});
