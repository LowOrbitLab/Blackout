# Blackout

Blackout 是基于 AirGap Vault 的独立离线加密资产签名钱包，可与 AirGap Vault 同时安装。它在本机生成和保管密钥，通过二维码与 AirGap Wallet、MetaMask、Rabby 等支持的钱包交换公开账户信息及签名请求。

应用标识：`io.github.loworbitlab.blackout`。应用入口：`blackout://`。

## 构建

使用 Node.js 20 或 22、Yarn 1.22.19，按锁文件安装依赖：

```sh
yarn install --frozen-lockfile
yarn build:prod
yarn verify:branding
yarn smoke:evm
```

开发预览使用 `yarn start`。构建时会生成离线 EVM 签名数据库，并应用受版本检查约束的依赖品牌补丁。

Android：

```sh
yarn build:prod
yarn cap sync android
./android/gradlew --project-dir android assembleRelease -PblackoutVersionCode=1
```

iOS 需在 macOS 上使用 Xcode，先运行 `yarn cap sync ios`，再配置自己的开发者团队和签名证书。桌面版先运行 `yarn build:electron:prod` 和 `yarn electron:prepare`，再使用 electron/package.json 中的平台打包命令；桌面适配仍使用项目现有 Capacitor Electron 实现。

## 数据与互通

Blackout 使用独立应用数据空间，不自动读取 AirGap 的秘密或联系人。已有钱包通过恢复流程导入。它保留标准 IAC／UR 格式和第三方钱包身份；对端若只支持唤起 `airgap-vault://`，使用二维码交换。

普通 CI 构建产出未签名包和调试签名测试包。正式签名配置、素材生成、保留的上游标识及发布验收要求见 [品牌与发布维护](docs/branding.md)。请核实任何下载文件的来源和签名。

## 上游与许可证

本项目源自 [AirGap Vault](https://github.com/airgap-it/airgap-vault)，使用 AirGap 协议库及其他开源组件。AirGap Wallet、AirGap Knox 等名称指相应第三方产品，Blackout 与这些服务的运营方无隶属关系。

保留 [Papers AG 的 MIT 版权及许可声明](LICENSE.md)。上游的安全审计及可复现构建结论适用于其审计对象，不能据此宣称 Blackout 已通过同等审计。
