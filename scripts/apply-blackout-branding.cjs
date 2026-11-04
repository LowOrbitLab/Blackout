const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const core = path.join(root, 'node_modules/@airgap/angular-core')

// 只定制依赖中的本产品展示名称，不修改包身份、二维码格式或桥接协议。
function applyBranding() {
  const metadata = JSON.parse(fs.readFileSync(path.join(core, 'package.json'), 'utf8'))
  if (metadata.version !== '0.1.0') throw new Error('请先审查新版 @airgap/angular-core 的品牌补丁')
  const from = 'name: `AirGap - ${account.groupLabel}`'
  const to = 'name: `Blackout - ${account.groupLabel}`'
  for (const relative of ['esm2022/lib/services/qr/qr-generators/metamask-generator.mjs', 'fesm2022/airgap-angular-core.mjs']) {
    const file = path.join(core, relative)
    const text = fs.readFileSync(file, 'utf8')
    const originalCount = text.split(from).length - 1
    const patchedCount = text.split(to).length - 1
    if (originalCount + patchedCount !== 1) throw new Error(`依赖品牌补丁匹配失败：${relative}`)
    if (originalCount) fs.writeFileSync(file, text.replace(from, to))
  }
  const directory = path.join(core, 'src/assets/i18n-common')
  for (const name of fs.readdirSync(directory).filter((file) => file.endsWith('.json'))) {
    const file = path.join(directory, name)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    const address = data['from-to']
    const onboarding = data['isolated-modules-onboarding']?.content
    if (typeof address?.notverified !== 'string' || typeof onboarding?.note !== 'string') {
      throw new Error(`依赖翻译结构已变化：${name}`)
    }
    address.notverified = address.notverified.replace(/AirGap(?: Vault)?/g, 'Blackout')
    onboarding.note = onboarding.note.replace(/AirGap(?: Vault)?/g, 'Blackout')
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
  }
}

if (require.main === module) applyBranding()
module.exports = { applyBranding }
