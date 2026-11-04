const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const ts = require('typescript')
const { applyBranding } = require('./apply-blackout-branding.cjs')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const json = (file) => JSON.parse(read(file))

// 编译实际源码，只替换与被测行为无关的框架注入入口。
function loadSource(file, stubs = {}, globals = {}) {
  const absolute = path.resolve(root, file)
  const localRequire = createRequire(absolute)
  const compiled = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true, esModuleInterop: true }
  }).outputText
  const module = { exports: {} }
  const requireSource = (name) => {
    if (Object.hasOwn(stubs, name)) return stubs[name]
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(absolute), name)
      if (fs.existsSync(target + '.ts')) return loadSource(target + '.ts', stubs, globals)
    }
    return localRequire(name)
  }
  vm.runInNewContext(compiled, { module, exports: module.exports, require: requireSource, Buffer, URL, console, ...globals }, { filename: absolute })
  return module.exports
}

test('多平台使用一致的独立应用身份', () => {
  const id = 'io.github.loworbitlab.blackout'
  assert.equal(json('package.json').name, 'blackout')
  for (const file of ['android/app/src/main/assets/capacitor.config.json', 'ios/App/App/capacitor.config.json', 'electron/capacitor.config.json']) {
    assert.equal(json(file).appId, id)
    assert.equal(json(file).appName, 'Blackout')
  }
  assert.equal(json('electron/package.json').build.appId, id)
  assert.match(read('android/app/build.gradle'), /applicationId "io\.github\.loworbitlab\.blackout"/)
  assert.match(read('android/app/build.gradle'), /namespace "io\.github\.loworbitlab\.blackout"/)
  assert.match(read('android/app/src/main/AndroidManifest.xml'), /android:name="io\.github\.loworbitlab\.blackout\.MainActivity"/)
  assert.match(read('android/app/src/main/res/values/strings.xml'), /name="custom_url_scheme">blackout</)
  assert.equal((read('ios/App/App.xcodeproj/project.pbxproj').match(/PRODUCT_BUNDLE_IDENTIFIER = io\.github\.loworbitlab\.blackout;/g) || []).length, 2)
  assert.doesNotMatch(read('ios/App/App/Info.plist'), /airgap-vault|it\.airgap\.vault/)
  assert.match(read('ios/App/App/Info.plist'), /<string>airgap-wallet<\/string>/)
})

test('接收 Blackout 账户、IAC V2 和 V3 链接，拒绝其他应用入口', () => {
  const { parseAppLink } = loadSource('src/app/utils/app-link.ts')
  assert.equal(parseAppLink('blackout://').kind, 'account')
  assert.equal(parseAppLink('blackout://add-account/eth').protocol, 'eth')
  assert.equal(parseAppLink('blackout://add-account/').protocol, undefined)
  for (const parameter of ['d', 'ur']) assert.equal(parseAppLink(`blackout://?${parameter}=public-test-request`).kind, 'request')
  for (const value of ['airgap-vault://?d=data', 'airgap-wallet://?d=data', 'https://vault.airgap.it', 'blackout://add-account/eth/extra', 'blackout://user@add-account/eth', 'blackout://?d=', 'invalid', 'blackout://other-host?ur=x']) {
    assert.equal(parseAppLink(value), undefined, value)
  }
})

test('冷启动等待初始化、热启动去重，处理失败后可重试', async () => {
  // 提取实际生命周期和路由方法，隔离无关的平台初始化与插件加载。
  const source = ts.createSourceFile('app.component.ts', read('src/app/app.component.ts'), ts.ScriptTarget.Latest, true)
  const component = source.statements.find((node) => ts.isClassDeclaration(node) && node.name.text === 'AppComponent')
  const members = component.members.filter((node) => ['ngAfterViewInit', 'activeAppLinks', 'handleAppUrl'].includes(node.name?.getText(source)))
  const printer = ts.createPrinter()
  const code = 'class AppComponent {' + members.map((node) => printer.printNode(ts.EmitHint.Unspecified, node, source)).join('\n') + '}\nAppComponent'
  const { parseAppLink } = loadSource('src/app/utils/app-link.ts')
  const errors = []
  const Component = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    parseAppLink, first: require('rxjs/operators').first, setTimeout,
    IACMessageTransport: { DEEPLINK: 'deeplink' }, ErrorCategory: {}, handleErrorLocal: () => (error) => errors.push(error)
  })
  const app = new Component()
  let ready
  let listener
  const calls = []
  app.isInitialized = { promise: new Promise((resolve) => { ready = resolve }) }
  app.platform = { ready: async () => {}, is: (name) => name === 'hybrid' }
  app.app = {
    addListener: async (_, callback) => { listener = callback },
    getLaunchUrl: async () => ({ url: 'blackout://add-account/eth' })
  }
  app.secretsService = { getSecretsObservable: () => require('rxjs').of([{ id: 'public-test' }]) }
  app.ngZone = { run: (task) => task() }
  app.navigationService = { routeWithState: async (...args) => calls.push(args), route: async (...args) => calls.push(args), routeToSecretsTab: async () => calls.push(['secrets']) }
  app.iacService = { handleRequest: async (...args) => calls.push(args) }
  const launched = app.ngAfterViewInit()
  await new Promise((resolve) => setImmediate(resolve))
  listener({ url: 'blackout://add-account/eth' })
  assert.equal(calls.length, 0)
  ready()
  await launched
  assert.equal(calls.length, 1)
  assert.equal(calls[0][1].protocol, 'eth')
  const request = 'blackout://?ur=public-test-request'
  await Promise.all([app.handleAppUrl(request), app.handleAppUrl(request)])
  assert.equal(calls.length, 2)
  assert.equal(calls[1][1], 'deeplink')
  await app.handleAppUrl('airgap-vault://?d=ignored')
  assert.equal(calls.length, 2)
  app.iacService.handleRequest = async () => { throw new Error('测试失败') }
  await assert.rejects(app.handleAppUrl(request), /测试失败/)
  app.iacService.handleRequest = async (...args) => calls.push(args)
  await app.handleAppUrl(request)
  assert.equal(calls.length, 3)
  assert.equal(errors.length, 0)
})

test('浏览器秘密存储读写、重建与清理均限制在 Blackout 空间', async () => {
  const values = new Map([['same-alias-same-key', 'upstream-test-value'], ['__airgap_storage/airgap-secret-list', 'upstream-test-list']])
  const localStorage = {
    get length() { return values.size },
    key(index) { return [...values.keys()][index] ?? null },
    getItem(key) { return values.get(key) ?? null },
    setItem(key, value) { values.set(key, value) },
    removeItem(key) { values.delete(key) }
  }
  const { SecureStorageServiceMock } = loadSource('src/app/services/secure-storage/secure-storage.mock.ts', {
    '@angular/core': { Injectable: () => (value) => value },
    './../error-handler/error-handler.service': { ErrorCategory: {}, handleErrorLocal: () => (error) => { throw error } }
  }, { localStorage, console: { log() {}, warn() {} } })
  const first = new SecureStorageServiceMock()
  const storage = await first.get('same-alias', false)
  assert.equal((await storage.getItem('same-key')).value, null)
  await storage.setItem('same-key', 'blackout-public-test-value')
  const reopened = await new SecureStorageServiceMock().get('same-alias', false)
  assert.equal((await reopened.getItem('same-key')).value, 'blackout-public-test-value')
  const otherAlias = await first.get('another-alias', false)
  assert.equal((await otherAlias.getItem('same-key')).value, null)
  await first.wipe()
  assert.equal((await reopened.getItem('same-key')).value, null)
  assert.equal(values.get('same-alias-same-key'), 'upstream-test-value')
  assert.equal(values.get('__airgap_storage/airgap-secret-list'), 'upstream-test-list')
})

test('依赖品牌补丁重复执行后不丢翻译或改变桥接协议', () => {
  applyBranding()
  const core = 'node_modules/@airgap/angular-core/'
  const before = read(core + 'fesm2022/airgap-angular-core.mjs')
  const translations = fs.readdirSync(path.join(root, core, 'src/assets/i18n-common')).filter((file) => file.endsWith('.json'))
  const snapshot = translations.map((file) => read(core + 'src/assets/i18n-common/' + file))
  applyBranding()
  assert.equal(read(core + 'fesm2022/airgap-angular-core.mjs'), before)
  translations.forEach((file, index) => assert.equal(read(core + 'src/assets/i18n-common/' + file), snapshot[index]))
  assert.match(before, /it\.airgap\.__UNDEFINED__/)
  assert.match(read('android/app/src/main/java/io/github/loworbitlab/blackout/util/JS.kt'), /it\.airgap\.__UNDEFINED__/)
  assert.match(read('ios/App/App/Helpers/JS.swift'), /it\.airgap\.__UNDEFINED__/)
})

test('实际 MetaMask 二维码保留公钥与派生路径并显示 Blackout', async () => {
  const { MetamaskGenerator } = loadSource('node_modules/@airgap/angular-core/esm2022/lib/services/qr/qr-generators/metamask-generator.mjs', {
    '../../iac/qr-generator': { IACQrGenerator: class {} },
    '../../../utils/utils': { TEMP_MM_REQUEST_IDS: new Map() }
  })
  const { BIP32Factory } = require('@airgap/coinlib-core/dependencies/src/bip32-5.0.1/src/index')
  const ecc = require('@airgap/coinlib-core/dependencies/src/@bitcoinerlab/secp256k1-1.2.0/src/index')
  const { IACMessageType } = require('@airgap/serializer')
  const { URDecoder } = require('@ngraveio/bc-ur')
  const { CryptoHDKey } = require('@keystonehq/bc-ur-registry')
  const master = BIP32Factory(ecc).fromSeed(Buffer.alloc(32, 1))
  const account = master.derivePath("m/44'/60'/0'")
  const generator = new MetamaskGenerator()
  await generator.create([{ id: 12345678, type: IACMessageType.AccountShareResponse, protocol: 'eth', payload: {
    publicKey: account.neutered().toBase58(), derivationPath: "m/44'/60'/0'", masterFingerprint: master.fingerprint,
    groupLabel: 'Public test', isExtendedPublicKey: true
  } }], 150, 1000)
  const decoder = new URDecoder()
  decoder.receivePart(await generator.getSingle())
  assert.equal(decoder.isComplete(), true)
  const decoded = CryptoHDKey.fromCBOR(decoder.resultUR().cbor)
  assert.equal(decoded.getName(), 'Blackout - Public test')
  assert.deepEqual(Buffer.from(decoded.getKey()), Buffer.from(account.publicKey))
  assert.equal(decoded.getOrigin().getPath(), "44'/60'/0'")
})

test('Blackout 入口的 IAC 请求和签名响应可由标准解码器往返验证', async () => {
  const { createEthereumProtocol } = require('@airgap/ethereum')
  const { EthereumV3SerializerCompanion } = require('@airgap/ethereum/v1/serializer/v3/serializer-companion')
  const { SerializerV3, IACMessageType } = require('@airgap/serializer')
  const { newSecretKey, newPublicKey } = require('@airgap/module-kit')
  const { TransactionFactory } = require('@ethereumjs/tx')
  const { UR, UREncoder } = require('@ngraveio/bc-ur')
  const bs58check = require('@airgap/coinlib-core/dependencies/src/bs58check-2.1.2/index')
  const { SerializerV3Handler } = loadSource('node_modules/@airgap/angular-core/esm2022/lib/services/qr/qr-handler/serializer-v3-handler.mjs', {
    '../../iac/message-handler': { IACHandlerStatus: { PARTIAL: 'partial', SUCCESS: 'success', UNSUPPORTED: 'unsupported' } },
    '../../../../public-api': { QRType: {} },
    '../../../utils/utils': { TEMP_BTC_REQUEST_IDS: new Map(), TEMP_MM_REQUEST_IDS: new Map() }
  })
  const ecc = require('@airgap/coinlib-core/dependencies/src/@bitcoinerlab/secp256k1-1.2.0/src/index')
  const { parseAppLink } = loadSource('src/app/utils/app-link.ts')
  // 固定的公开测试密钥仅用于离线验证，不发送或广播交易。
  const secretKey = newSecretKey('01'.repeat(32), 'hex')
  const publicKey = newPublicKey(Buffer.from(ecc.pointFromScalar(Buffer.from(secretKey.value, 'hex'), false)).toString('hex'), 'hex')
  const protocol = createEthereumProtocol()
  // 与 angular-core 的协议选项入口一致，注册发行版自带的 IAC 模式。
  require('@airgap/ethereum/v0')
  const companion = new EthereumV3SerializerCompanion()
  const serializer = SerializerV3.getInstance()
  for (const schema of companion.schemas) serializer.addSchema(schema.type, schema.schema, schema.protocolIdentifier)
  const transaction = { type: 'unsigned', ethereumType: 'raw', nonce: '0x00', gasPrice: '0x3b9aca00', gasLimit: '0x5208', to: '0x2222222222222222222222222222222222222222', value: '0x01', chainId: 1, data: '0x' }
  const payload = await companion.toTransactionSignRequest('eth', transaction, publicKey.value, 'airgap-wallet://')
  const encoded = await serializer.serialize([{ id: 12345678, type: IACMessageType.TransactionSignRequest, protocol: 'eth', payload }])
  const ur = new UREncoder(UR.fromBuffer(bs58check.decode(encoded)), Number.MAX_SAFE_INTEGER).nextPart()
  const link = parseAppLink('blackout://?ur=' + ur.split('/').pop())
  assert.equal(link.kind, 'request')
  const handler = new SerializerV3Handler()
  assert.equal(await handler.receive(link.url), 'success')
  const request = await handler.getResult()
  assert.equal(request.result.length, 1)
  const decoded = request.result[0]
  assert.equal(decoded.payload.callbackURL, 'airgap-wallet://')
  const unsigned = await companion.fromTransactionSignRequest(decoded.protocol, decoded.payload)
  const signed = await protocol.signTransactionWithSecretKey(unsigned, secretKey)
  const response = await companion.toTransactionSignResponse('eth', signed, publicKey.value)
  const responseData = await serializer.serialize([{ id: decoded.id, type: IACMessageType.TransactionSignResponse, protocol: 'eth', payload: response }])
  const restored = await serializer.deserialize(responseData)
  assert.equal(restored.deserialize[0].ok, true)
  assert.equal(restored.deserialize[0].value.id, decoded.id)
  const walletTransaction = await companion.fromTransactionSignResponse('eth', restored.deserialize[0].value.payload)
  const verified = TransactionFactory.fromSerializedData(Buffer.from(walletTransaction.serialized.replace(/^0x/, ''), 'hex'))
  assert.equal(verified.verifySignature(), true)
  assert.equal(verified.getSenderAddress().toString().toLowerCase(), (await protocol.getAddressFromPublicKey(publicKey)).toLowerCase())
  assert.equal(verified.to.toString(), transaction.to)
  assert.equal(verified.value.toString(), '1')
})

test('七种语言保留第三方身份，新增品牌字段齐全', () => {
  for (const language of ['en', 'de', 'es', 'fr', 'pt_BR', 'ru', 'zh_CN']) {
    const data = json(`src/assets/i18n/${language}.json`)
    assert.match(data.about['open-source_text'], /Blackout/)
    assert.match(data.about['made-in_text'], /AirGap Vault/)
    assert.match(data.shop['AirGap-Knox_label'], /AirGap Knox/)
    assert.match(data['secure-setup'].advanced.ios.step8, /Blackout/)
    assert.doesNotMatch(data['secure-setup'].advanced.ios.step8, /App Store/)
    for (const field of ['introduction.wallet.heading', 'introduction.wallet_install_label', 'interaction-selection-settings.heading', 'interaction-selection-settings.connectivity_text', 'tab-scan.text', 'tab-secrets.tab-secret-popover.sync-all_label', 'tab-wallets.empty-state_text', 'transaction-signed.heading', 'interaction-selection.heading', 'wallet-share-select.heading', 'message-signing-request.heading', 'accounts-list-edit-popover.sync-all_label']) {
      const value = field.split('.').reduce((item, key) => item[key], data)
      assert.match(value, /AirGap/, `${language}: ${field}`)
      assert.doesNotMatch(value, /Blackout/, `${language}: ${field}`)
    }
  }
})
