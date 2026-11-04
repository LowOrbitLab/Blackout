# Blackout 品牌与发布维护

Blackout 是基于 AirGap Vault 的独立应用。正式应用标识为 `io.github.loworbitlab.blackout`，本应用的 URL 协议为 `blackout://`，显示名称为 `Blackout`。上游的许可证和署名仍适用，不能将上游审计结论视为 Blackout 已通过独立审计。

## 身份和数据

- Android 的 applicationId、namespace、源码包和 Manifest 一致；iOS 的 Bundle ID 与桌面打包 appId 一致。
- SQLite／LocalStorage 数据库为 `__blackout_storage`。秘密和联系人使用 `blackout-*` 键；原生安全存储、偏好设置和模块目录使用独立命名空间。
- Electron 的两个入口都使用 `appData/Blackout`。浏览器部署还应使用独立源，不能把不同应用的同源脚本视为安全隔离。
- 新应用不自动读取 AirGap 的数据。需要恢复钱包时，在 Blackout 中通过现有恢复流程操作；不要复制系统密钥库或加密数据库。
- 首次公开发行后保持应用标识、签名证书和数据命名空间稳定。修复或回退通过新的构建版本发布，不能改回上游身份或清空用户数据。

## 通信与保留项

- `blackout://` 打开账户入口，`blackout://add-account/eth` 打开相应链的添加账户流程，`blackout://?d=...` 接收 IAC V2 请求，`blackout://?ur=...` 接收 IAC V3 请求。
- 未注册 `airgap-vault://`。向 AirGap Wallet 回传仍使用 `airgap-wallet://`；对端如果只能打开旧 Vault 协议，需要使用扫码交换。
- 保留标准 IAC／UR 数据格式、`@airgap/*` 包、`AirGapWallet` 等依赖 API、依赖提供的 `airgap-*` 组件，以及 AirGap Wallet、Knox 等第三方名称。
- Kotlin、Swift 和依赖 JS 共用的 `it.airgap.__UNDEFINED__` 是协议值，必须保持一致。
- 没有配置自有 Universal Link 域名，不声明上游域名归属于 Blackout。

## 依赖和素材

`scripts/apply-blackout-branding.cjs` 为锁定的 `@airgap/angular-core@0.1.0` 定制 MetaMask 账户显示名称，以及公共翻译中的本应用名称。补丁校验版本及精确匹配次数，支持重复执行，结构变化时立即失败。它不修改二维码协议、序列化算法或第三方包名。更新依赖时需重新审查补丁；不能只修改 node_modules 后提交应用源码。

`node scripts/generate-brand-assets.cjs` 使用标准库生成 SVG、PNG 和 Android 矢量图，统一应用内图标、启动屏、浏览器、桌面和商店图标。第三方钱包图标保持原身份。

## 发布

Android 版本名来自根 package.json；构建号通过 `-PblackoutVersionCode=N` 指定，GitHub CI 使用递增的运行编号。普通构建产出未签名包和明确标注 debug 的测试包，测试签名不能用于正式发行。

正式签名通过手动运行 Build 工作流并选择 `sign_release`。仓库管理员需配置以下 Actions Secrets；缺少任何项时签名步骤失败，不使用调试证书兜底：

- `BLACKOUT_KEYSTORE_BASE64`：正式签名密钥库的 Base64 内容。
- `BLACKOUT_KEYSTORE_PASSWORD`：密钥库密码。
- `BLACKOUT_KEY_ALIAS`：签名别名。
- `BLACKOUT_KEY_PASSWORD`：密钥密码。

密钥库只在 CI 临时目录解码，退出时清理，不上传到构建产物或提交到仓库。应在仓库外妥善备份长期使用的证书。iOS 构建由实际拥有者设置开发者团队；GitLab 构建参数为 `BLACKOUT_APPLE_TEAM_ID`，项目不再绑定上游团队。

网页部署工作流仅支持手动触发，推送代码不会自动部署网页。源码和文档入口指向 LowOrbitLab/Blackout；仓库当前没有公开反馈系统，不展示无效的 Issues、邮箱或上游客服入口。

## 验收

运行 `yarn verify:branding`、`yarn smoke:evm` 和生产构建。品牌验证覆盖多平台身份、协议边界、持久化隔离、依赖补丁幂等性、实际 MetaMask 账户分享二维码解码、第三方协议保留和译文完整性。使用 Node.js 22 运行 `node scripts/verify-branding-browser.cjs` 验证实际构建中的欢迎页、关于页、中文设置、图标、页面布局和旧应用数据保留；Chrome 路径可通过 `BLACKOUT_CHROME` 指定。浏览器验收不等同于原生账户导入与签名的完整设备验证。

发布前还需在原生设备上安装两款应用，验证独立启动、重启与升级保留数据、生物识别、相机和重置范围。仅浏览器或源码检查不能代替系统密钥库的真机验证。

2026-11-04 本地验收：8 组品牌与行为测试、30 项既有 EVM 回归、6 项 Chrome 页面检查通过；生产构建、桌面资源构建与准备、Android Capacitor 同步完成。IAC 回归使用公开测试密钥，通过实际请求处理器解码、签名并验证响应的发送地址及金额，没有广播交易。已目视检查欢迎页、关于页、设置页和新图标。当前 Windows 环境不具备 Android SDK 或 Xcode，原生双应用安装、生物识别和桌面安装包运行仍需对应设备验证。
