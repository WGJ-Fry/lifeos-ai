# LifeOS v0.1.5-alpha Release Draft

Do not publish this note until `v0.1.5-alpha` is tagged, the GHCR image is anonymously pullable, and the macOS/Windows/Linux unsigned packages plus `SHA256SUMS` are uploaded.

Package version: `0.1.5-alpha.0`

## What This Alpha Adds

- Bilingual README product videos: English and Chinese 30-second MP4 demos with matching GIF previews and cover images.
- Mobile offline recovery evidence: the mobile queue now records the latest foreground, background, network, and timer recovery attempt with synced count, ready count, paused state, sync mode, and redacted failure reason.
- Stronger remote-release evidence: release promotion checks require a real remote acceptance evidence pack for stable HTTPS, cellular, network switching, desktop restart, stale QR repair, tunnel interruption, and diagnostic export.
- Remote diagnostics now keep long-run health samples with pass/fail counts, recovery attempts, consecutive successes, observed duration, and latest samples for support and release review.
- Release diagnostics now include a manual public-release review checklist covering GitHub Latest, deprecated old releases, clean-machine SHA256 verification, anonymous GHCR pulls, and README/Release/Discussions truthfulness.
- Desktop update diagnostics now distinguish manual mode, blocked feeds, explicitly opted-in HTTPS feed readiness, and signed-distribution safe defaults. Signed distributions with a safe HTTPS feed can enter feed-ready mode without `LIFEOS_ENABLE_DESKTOP_AUTO_UPDATE=1`; unsigned alpha builds still require explicit opt-in and should remain manual for public testing.
- Studio auto-repair continues to expose readiness gates, execution sessions, smoke-review state, rollback evidence, and conservative static smoke checks for low-risk repairs.
- Native automation remains gated: clipboard, allowlisted Shortcuts, Finder reveal, and allowlisted macOS app open actions are narrow opt-in paths. Shell, calendar, reminder, and broad file-write automation remain blocked by default.
- Calendar/task connectors remain guarded: Apple Calendar, Google Calendar, Google Tasks, and system reminders can use preview, explicit admin confirmation, audit logging, SQLite write history, rollback status, and `calendar:acceptance` evidence before any public sync claim.

## Desktop Packages

This alpha continues the unsigned distribution policy:

- macOS Apple Silicon unsigned ZIP: `LifeOS.AI-0.1.5-alpha.0-arm64-unsigned.zip`.
- Windows x64 unsigned NSIS installer: `LifeOS.AI.Setup.0.1.5-alpha.0.exe`.
- Linux x64 AppImage: `LifeOS.AI-0.1.5-alpha.0.AppImage`.

Verify every downloaded file with `SHA256SUMS`. macOS Gatekeeper and Windows SmartScreen may warn because the public packages are not formally signed yet.

## Docker

After the tag is published and the Docker workflow finishes, verify:

```bash
docker logout ghcr.io || true
docker pull ghcr.io/wgj-fry/lifeos-ai:v0.1.5-alpha
```

## Current Limits

- Automatic updates are not enabled by default for the public unsigned alpha. Use manual download plus SHA256 verification unless a maintainer publishes a stable HTTPS feed and either ships a signed distribution or explicitly opts an unsigned alpha into feed checks.
- macOS Developer ID signing/notarization and Windows Authenticode signing are not part of this unsigned alpha.
- Apple Calendar, Google Calendar, Google Tasks, and system reminders full background account sync is not broadly shipped yet. Narrow connector writes require explicit environment opt-in, explicit admin confirmation, audit logging, SQLite write history, rollback status, and real-account `calendar:acceptance` evidence before public promotion.
- `.ics` support is read-only local ingestion, not two-way calendar/task management.
- Studio generated programs remain alpha: scoring, readiness checks, template expansion, guarded repair prompts, smoke evidence, and rollback exist, but fully automatic unattended self-repair is not advertised.
- Local actions are still URL Scheme / browser / Shortcuts bridge based. Full native automation and deep OS permission control are future work.
- Remote diagnostics can verify configuration, but long-term remote stability still needs real-device evidence from the user's network.

## Release Gate Before Publishing

Run these checks before uploading or announcing the release:

```bash
npm run lint
npm test
npm run test:e2e
npm run test:desktop
npm run release:check:unsigned
npm run version:truth:release
npm run github:public:check
LIFEOS_CHECK_GHCR=1 LIFEOS_CHECK_GITHUB_RELEASE=1 npm run check:cold-launch
```

`npm run version:truth:release` requires release assets and remote acceptance evidence. Save the exported diagnostic bundle or remote evidence pack as `release/remote-acceptance-evidence.json`, or set `LIFEOS_REMOTE_ACCEPTANCE_EVIDENCE=/path/to/diagnostic-bundle.json`, before running the release gate.

If this release promotes the Google Calendar/Tasks connector, also run the real-account acceptance command with a disposable test calendar/task list or a safe personal test account:

```bash
LIFEOS_ENABLE_GOOGLE_CALENDAR_CONNECTOR=1 \
LIFEOS_GOOGLE_CALENDAR_CLIENT_ID="..." \
LIFEOS_GOOGLE_CALENDAR_CLIENT_SECRET="..." \
LIFEOS_GOOGLE_CALENDAR_REFRESH_TOKEN="..." \
LIFEOS_ENABLE_EXTERNAL_CALENDAR_WRITES=1 \
LIFEOS_CALENDAR_ACCEPTANCE_CONFIRMATION="WRITE TO EXTERNAL CALENDAR" \
npm run calendar:acceptance -- --write --out calendar-acceptance.json
```

If this release promotes Apple Calendar/System Reminders connector writes, also run the macOS provider on a real Mac account or disposable local calendar/reminder list:

```bash
LIFEOS_CALENDAR_ACCEPTANCE_PROVIDER=macos \
LIFEOS_ENABLE_MACOS_CALENDAR_CONNECTOR=1 \
LIFEOS_ENABLE_EXTERNAL_CALENDAR_WRITES=1 \
LIFEOS_CALENDAR_ACCEPTANCE_CONFIRMATION="WRITE TO EXTERNAL CALENDAR" \
npm run calendar:acceptance -- --provider macos --write --out macos-calendar-acceptance.json
```

Keep the generated `calendar-acceptance.json` with release evidence. It should not contain OAuth secrets or raw Google item IDs.

## 中文说明

发布前不要公开这份说明。必须等 `v0.1.5-alpha` tag 已创建、GHCR 镜像可以匿名拉取、macOS/Windows/Linux unsigned 安装包和 `SHA256SUMS` 都上传完成后再发布。

Package version：`0.1.5-alpha.0`

### 本 alpha 新增

- 中英文 README 产品视频：分别提供 30 秒 MP4、对应 GIF 预览和封面图。
- 手机离线恢复证据：手机离线队列会记录最近一次前台、后台、网络恢复、定时恢复尝试，包括已同步数量、可同步数量、暂停状态、同步模式和脱敏失败原因。
- 更严格的异地发布证据：发布提升检查要求真实远程验收包，覆盖稳定 HTTPS、蜂窝网络、网络切换、电脑重启、旧二维码修复、隧道中断和诊断包导出。
- 远程诊断会保留长测健康样本：通过/失败次数、恢复尝试、连续成功次数、观测时长和最近样本，方便支持和发布复核。
- 发布诊断新增人工公开发布复核清单：GitHub Latest、旧 Release 废弃标记、干净机器 SHA256 校验、匿名 GHCR 拉取，以及 README/Release/Discussions 是否真实。
- 桌面更新诊断现在区分手动模式、被阻断 feed、显式 opt-in 的 HTTPS feed，以及 signed 分发安全默认。signed 分发配合安全 HTTPS feed 可以进入默认检查；unsigned alpha 仍需要显式 opt-in，公开测试建议继续手动更新。
- Studio 自动修复继续保留就绪闸门、执行会话、烟测复核、回滚证据和低风险静态烟测。
- 原生自动化仍受控：剪贴板、白名单 Shortcuts、Finder reveal、白名单 macOS app 打开是窄范围 opt-in 路径。shell、日历、提醒事项和宽泛文件写入默认继续阻断。
- 日历/任务连接器仍受控：Apple Calendar、Google Calendar、Google Tasks、系统提醒事项需要预览、管理员确认、审计日志、SQLite 写入历史、回滚状态和 `calendar:acceptance` 证据，才能作为公开同步能力宣传。

### 桌面包

本 alpha 继续采用 unsigned 分发策略：

- macOS Apple Silicon unsigned ZIP：`LifeOS.AI-0.1.5-alpha.0-arm64-unsigned.zip`。
- Windows x64 unsigned NSIS：`LifeOS.AI.Setup.0.1.5-alpha.0.exe`。
- Linux x64 AppImage：`LifeOS.AI-0.1.5-alpha.0.AppImage`。

请用 `SHA256SUMS` 校验每个下载文件。因为公开包还没有正式签名，macOS Gatekeeper 和 Windows SmartScreen 可能提示。

### Docker

tag 发布并且 Docker workflow 完成后，验证：

```bash
docker logout ghcr.io || true
docker pull ghcr.io/wgj-fry/lifeos-ai:v0.1.5-alpha
```

### 当前限制

- 默认不启用自动更新。公开 unsigned alpha 继续建议手动下载并校验 SHA256，除非维护者发布稳定 HTTPS feed，并且发 signed 分发版或显式允许 unsigned alpha 进入 feed 检查。
- 本 alpha 不包含 macOS Developer ID 签名/公证，也不包含 Windows Authenticode 签名。
- Apple Calendar、Google Calendar、Google Tasks、系统提醒事项的完整后台账号同步还没有广泛发布。窄范围连接器写入仍需要环境变量显式开启、管理员确认、审计日志、SQLite 写入历史、回滚状态，以及真实账号 `calendar:acceptance` 证据。
- `.ics` 只是本地只读读取，不是双向日历/任务管理。
- Studio 生成程序仍是 alpha：已有评分、就绪检查、模板扩展、带护栏修复提示、烟测证据和回滚，但不宣传完全无人值守自修复。
- 本地动作仍基于 URL Scheme / 浏览器 / Shortcuts 桥；完整原生自动化和深度 OS 权限控制是后续工作。
- 远程诊断可以验证配置，但长期稳定性仍需要用户自己完成真实设备长测。

### 发布前门禁

发布或宣传前运行：

```bash
npm run lint
npm test
npm run test:e2e
npm run test:desktop
npm run release:check:unsigned
npm run version:truth:release
npm run github:public:check
LIFEOS_CHECK_GHCR=1 LIFEOS_CHECK_GITHUB_RELEASE=1 npm run check:cold-launch
```

`npm run version:truth:release` 需要安装包资产和真实远程验收证据。请把导出的诊断包或远程证据包保存为 `release/remote-acceptance-evidence.json`，或设置 `LIFEOS_REMOTE_ACCEPTANCE_EVIDENCE=/path/to/diagnostic-bundle.json` 后再运行。
