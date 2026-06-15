# Contributing / 参与开发

中文 | [English](#english)

## 本地开发

```bash
npm install
npm run dev
```

管理端：

```text
http://localhost:3000/admin/login
```

桌面壳：

```bash
npm run desktop
```

## 质量门

提交前建议运行：

```bash
npm run lint
npm test
npm run test:e2e
npm run test:desktop
npm run release:check:unsigned
```

完整发布前运行：

```bash
npm run release:check
```

## 代码原则

- 优先沿用现有架构和服务模块。
- 数据统一进 SQLite 或现有安全存储，不新增散落的本地明文存储。
- API 响应、日志、审计和诊断包必须脱敏。
- 手机端凭证优先使用 WebCrypto 设备签名。
- 危险本地动作必须有白名单和用户确认。
- 大文件继续拆分，保持页面壳和核心服务可测试。

## 发布相关

- 不要提交 `release/` 产物到 git；通过 GitHub Release 上传二进制。
- 不要提交 `.env.local`、`.env.signing.local`、证书或私钥。
- macOS 发布前运行 `npm run signing:check:mac`。
- Windows 正式签名需要单独的 Authenticode 证书。

---

# English

## Local Development

```bash
npm install
npm run dev
```

Admin:

```text
http://localhost:3000/admin/login
```

Desktop shell:

```bash
npm run desktop
```

## Quality Gate

Before submitting changes:

```bash
npm run lint
npm test
npm run test:e2e
npm run test:desktop
npm run release:check:unsigned
```

Before a full release:

```bash
npm run release:check
```

## Engineering Rules

- Follow existing architecture and service modules.
- Store durable data in SQLite or existing secure storage; avoid scattered plaintext local storage.
- Redact API responses, logs, audit metadata, and diagnostic bundles.
- Prefer WebCrypto device signatures for mobile credentials.
- Dangerous local actions require allowlists and user confirmation.
- Keep large UI files split and core services testable.

## Release Notes

- Do not commit `release/` artifacts to git; upload binaries through GitHub Releases.
- Do not commit `.env.local`, `.env.signing.local`, certificates, or private keys.
- Run `npm run signing:check:mac` before macOS releases.
- Windows polished distribution requires a separate Authenticode certificate.
