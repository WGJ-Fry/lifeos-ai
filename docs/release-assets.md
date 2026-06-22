# Release Assets / 发布资产清单

中文 | [English](#english)

## 当前版本

版本：`0.1.0`

推荐 GitHub Release tag：

```text
v0.1.0
```

## 当前已上传的公开文件

`v0.1.0` 当前 GitHub Release 已上传：

```text
LifeOS.AI-0.1.0-arm64-unsigned.zip
SHA256SUMS
INSTALL-unsigned-mac.md
USER-INSTALL.md
latest-mac.yml
release-manifest.json
```

## 待真实打包验证后再上传

下面这些是发布链路目标，不是当前公开下载资产。只有在真实生成、校验、签名策略确认后才能上传：

```text
LifeOS AI-0.1.0-arm64.dmg
LifeOS AI Setup 0.1.0.exe
LifeOS AI-0.1.0.AppImage
latest.yml
latest-linux.yml
```

如果未来启用自动更新，安装包会读取这些 feed 文件。当前没有配置 `LIFEOS_UPDATE_URL`，所以 update feed 主要用于诊断和后续准备。

## 当前 SHA256

```text
50570710de1732273d62233a44aa4441e76ec6200657a7f5a1c778274eae8f0e  LifeOS AI-0.1.0-arm64-unsigned.zip
```

## 平台说明

- macOS：当前公开资产是 unsigned ZIP。正式路径仍支持 Developer ID Application 签名 + Apple notarization + DMG stapled，但需要重新生成并上传真实 DMG。
- Windows：NSIS 安装包路线已接入构建脚本和 CI smoke；当前 Release 未上传 EXE。
- Linux：AppImage 路线已接入构建脚本和 CI smoke；当前 Release 未上传 AppImage。

## 不要上传

不要上传：

```text
.env.local
.env.signing.local
*.p12
*.pfx
data/
node_modules/
dist/
release/*-unpacked/
```

## 上传后检查

1. GitHub Release 页面能看到 macOS unsigned ZIP、`SHA256SUMS`、安装说明和 `release-manifest.json`。
2. 下载 macOS ZIP 后可以解压出 `LifeOS AI.app`。
3. `SHA256SUMS` 与下载文件校验一致。
4. `release-manifest.json` 里的文件名、大小和 sha256 与 Release 资产一致。
5. Windows/Linux 下载说明没有指向尚未上传的资产。

---

# English

## Current Version

Version: `0.1.0`

Recommended GitHub Release tag:

```text
v0.1.0
```

## Currently Uploaded Public Assets

The current `v0.1.0` GitHub Release uploads:

```text
LifeOS.AI-0.1.0-arm64-unsigned.zip
SHA256SUMS
INSTALL-unsigned-mac.md
USER-INSTALL.md
latest-mac.yml
release-manifest.json
```

## Upload Later After Real Package Verification

These are release-chain targets, not current public download assets. Upload them only after real generation, verification, and signing-policy review:

```text
LifeOS AI-0.1.0-arm64.dmg
LifeOS AI Setup 0.1.0.exe
LifeOS AI-0.1.0.AppImage
latest.yml
latest-linux.yml
```

These feed files are required for future auto-update support. Because `LIFEOS_UPDATE_URL` is not configured yet, the current feed files are mostly for diagnostics and future preparation.

## Current SHA256

```text
50570710de1732273d62233a44aa4441e76ec6200657a7f5a1c778274eae8f0e  LifeOS AI-0.1.0-arm64-unsigned.zip
```

## Platform Notes

- macOS: the current public asset is an unsigned ZIP. The formal path still supports Developer ID signing, Apple notarization, and a stapled DMG, but a real DMG must be regenerated and uploaded first.
- Windows: the NSIS packaging path is wired into scripts and CI smoke checks; the current Release does not upload an EXE.
- Linux: the AppImage packaging path is wired into scripts and CI smoke checks; the current Release does not upload an AppImage.

## Do Not Upload

Do not upload:

```text
.env.local
.env.signing.local
*.p12
*.pfx
data/
node_modules/
dist/
release/*-unpacked/
```

## Post-Upload Check

1. The GitHub Release shows the macOS unsigned ZIP, `SHA256SUMS`, install guides, and `release-manifest.json`.
2. The macOS ZIP downloads and extracts to `LifeOS AI.app`.
3. `SHA256SUMS` verifies the downloaded file.
4. `release-manifest.json` file names, sizes, and sha256 values match the uploaded assets.
5. Windows/Linux download instructions do not link to assets that have not been uploaded yet.
