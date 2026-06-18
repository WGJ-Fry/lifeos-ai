# LifeOS AI 0.1.0 Release Notes / 发布说明

中文 | [English](#english)

## 下载

- macOS Apple Silicon：`LifeOS AI-0.1.0-arm64.dmg`
- Windows x64：`LifeOS AI Setup 0.1.0.exe`
- Linux x64：`LifeOS AI-0.1.0.AppImage`

## 这个版本有什么

- 电脑端 LifeOS AI 桌面应用。
- 手机端 PWA 绑定和聊天。
- 管理员登录、首次启动向导、设备绑定。
- AI provider 配置：Gemini、OpenAI、OpenRouter、本地模型接口预留。
- SQLite 数据存储、迁移、备份、恢复、恢复任务取消。
- 手机离线队列、连接状态、动作权限中心。
- URL Scheme 白名单和危险动作确认。
- 桌面诊断包、日志目录、启动失败提示。
- macOS 签名、公证、DMG staple。
- Windows NSIS 和 Linux AppImage 发布包。

## 安装

macOS：打开 DMG，把 LifeOS AI 拖到 Applications。

Windows：运行 EXE。当前 Windows 包未 Authenticode 签名，SmartScreen 可能提示未知发布者。

Linux：

```bash
chmod +x "LifeOS AI-0.1.0.AppImage"
./"LifeOS AI-0.1.0.AppImage"
```

## 校验

```text
a935ab398d8b88a1e47de9645bdf7f46372b3da14fd7b8ab09fbc00f83904b7a  LifeOS AI-0.1.0-arm64.dmg
ebacb858194ae884c0770820536450e72514b8fee7fdd329933610d70c769022  LifeOS AI Setup 0.1.0.exe
12b2c32148cff4a3bc3cd2247d4c4b17b1709624b77ea2853785b39a3cf0f279  LifeOS AI-0.1.0.AppImage
```

## 注意

- 当前未配置 `LIFEOS_UPDATE_URL`，所以不会自动更新。
- macOS 包是 Apple Silicon arm64，不是 Intel/Universal。
- Windows 包可安装但未正式签名。
- 首次启动后请先设置管理员密码，再配置 AI Key 和绑定手机。

---

# English

## Downloads

- macOS Apple Silicon: `LifeOS AI-0.1.0-arm64.dmg`
- Windows x64: `LifeOS AI Setup 0.1.0.exe`
- Linux x64: `LifeOS AI-0.1.0.AppImage`

## What's Included

- LifeOS AI desktop app.
- Mobile PWA pairing and chat.
- Admin login, first-launch onboarding, device pairing.
- AI provider configuration for Gemini, OpenAI, OpenRouter, and local model endpoints.
- SQLite persistence, migrations, backups, restore, and restore cancellation.
- Mobile offline queue, connection status, action permission center.
- URL Scheme allowlist and dangerous-action confirmation.
- Desktop diagnostics, logs folder, startup failure page.
- macOS signing, notarization, and DMG stapling.
- Windows NSIS and Linux AppImage packages.

## Install

macOS: open the DMG and drag LifeOS AI to Applications.

Windows: run the EXE. The current Windows build is not Authenticode signed, so SmartScreen may warn about an unknown publisher.

Linux:

```bash
chmod +x "LifeOS AI-0.1.0.AppImage"
./"LifeOS AI-0.1.0.AppImage"
```

## Verification

```text
a935ab398d8b88a1e47de9645bdf7f46372b3da14fd7b8ab09fbc00f83904b7a  LifeOS AI-0.1.0-arm64.dmg
ebacb858194ae884c0770820536450e72514b8fee7fdd329933610d70c769022  LifeOS AI Setup 0.1.0.exe
12b2c32148cff4a3bc3cd2247d4c4b17b1709624b77ea2853785b39a3cf0f279  LifeOS AI-0.1.0.AppImage
```

## Notes

- `LIFEOS_UPDATE_URL` is not configured, so auto-update is disabled.
- The macOS artifact is Apple Silicon arm64, not Intel/Universal.
- The Windows package is installable but not Authenticode signed.
- On first launch, set an admin password, configure an AI key, and pair the phone.
