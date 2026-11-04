const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const http = require('node:http')
const { spawn } = require('node:child_process')
const assert = require('node:assert/strict')

const root = path.resolve(__dirname, '..')
const web = path.join(root, 'www')
const output = path.resolve(process.env.BLACKOUT_REVIEW_OUTPUT || path.join(root, 'tmp/blackout-review'))
const executable = process.env.BLACKOUT_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'blackout-brand-review-'))
fs.mkdirSync(output, { recursive: true })
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function main() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const target = path.resolve(web, '.' + pathname)
    if (!target.startsWith(web + path.sep) && target !== web) { response.writeHead(403).end(); return }
    const exists = fs.existsSync(target) && fs.statSync(target).isFile()
    if (!exists && path.extname(pathname)) { response.writeHead(404).end(); return }
    const file = exists ? target : path.join(web, 'index.html')
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm' }
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
    fs.createReadStream(file).pipe(response)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
  let rpc
  let socket
  const deadline = setTimeout(() => {
    console.error('浏览器验收超过 55 秒，已终止')
    browser.kill()
    socket?.close()
    server.closeAllConnections()
    server.close()
    process.exit(1)
  }, 55000)
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let log = ''
      browser.on('error', reject)
      browser.stderr.on('data', (chunk) => {
        log += chunk
        const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/)
        if (match) resolve(match[1])
      })
      browser.on('exit', () => reject(new Error('Chrome 启动失败')))
    })
    socket = new WebSocket(endpoint)
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
    const pending = new Map()
    socket.onclose = () => {
      for (const task of pending.values()) task.reject(new Error('浏览器连接已关闭'))
      pending.clear()
    }
    let id = 0
    const errors = []
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data)
      if (message.id) {
        const task = pending.get(message.id)
        if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result) }
      } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
    }
    rpc = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const requestId = ++id
      pending.set(requestId, { resolve, reject })
      socket.send(JSON.stringify({ id: requestId, method, params, sessionId }))
    })
    const { targetId } = await rpc('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await rpc('Target.attachToTarget', { targetId, flatten: true })
    const call = (method, params = {}) => rpc(method, params, sessionId)
    const evaluate = async (expression) => {
      const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
      return result.result.value
    }
    const waitFor = async (expression) => {
      for (let index = 0; index < 100; index++) { if (await evaluate(expression)) return; await delay(100) }
      fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify(await evaluate('({text:document.body.innerText,url:location.href,keys:Object.keys(localStorage)})'), null, 2))
      await capture('failure')
      throw new Error(`页面等待超时：${expression}`)
    }
    const capture = async (name) => {
      await delay(250)
      const screenshot = await call('Page.captureScreenshot', { format: 'png' })
      fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(screenshot.data, 'base64'))
    }
    await call('Runtime.enable')
    await call('Page.enable')
    await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await call('Page.navigate', { url: origin })
    await waitFor("document.querySelector('blackout-onboarding-welcome') && document.body.innerText.includes('Blackout')")
    assert.equal(await evaluate('document.title'), 'Blackout')
    await capture('welcome')
    const firstState = await evaluate('({text: document.body.innerText, keys: Object.keys(localStorage)})')
    fs.writeFileSync(path.join(output, 'initial.json'), JSON.stringify(firstState, null, 2))
    await evaluate(`(() => {
      const flags = { DISCLAIMER_INITIAL: true, INSTALLATION_TYPE: 'OFFLINE', INTERACTION_TYPE: 'QR_CODE', ADVANCED_MODE_TYPE: 'SIMPLE', LANGUAGE_TYPE: 'zh_CN' };
      for (const [key, value] of Object.entries(flags)) localStorage.setItem('__blackout_storage/_ionickv/' + key, JSON.stringify(value));
      localStorage.setItem('__airgap_storage/_ionickv/airgap-secret-list', JSON.stringify(['upstream-public-test']));
    })()`)
    await call('Page.navigate', { url: origin + '/about' })
    await waitFor("document.querySelector('blackout-about') && document.body.innerText.includes('独立项目')")
    await capture('about-zh')
    const about = await evaluate('document.body.innerText')
    assert.ok(about.includes('Blackout ' + require('../package.json').version))
    assert.ok(about.includes('io.github.loworbitlab.blackout'))
    assert.ok(!about.includes('APP_NAME') && !about.includes('VERSION_NUMBER'))
    assert.equal(await evaluate("document.querySelector('.ok-about-hero__logo').naturalWidth > 0"), true)
    await call('Page.navigate', { url: origin + '/tabs/tab-settings' })
    await waitFor("document.querySelector('blackout-tab-settings') && document.body.innerText.includes('Blackout')")
    await capture('settings-zh')
    for (const width of [320, 390]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true })
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
    }
    const settings = await evaluate('document.body.innerText')
    assert.ok(!settings.includes('重置 AirGap'))
    assert.equal(await evaluate("JSON.parse(localStorage.getItem('__airgap_storage/_ionickv/airgap-secret-list'))[0]"), 'upstream-public-test')
    assert.equal(errors.length, 0, errors.join('\n'))
    const report = { title: 'Blackout', about, settings, errors, checks: ['初次启动品牌', '真实关于页', '中文设置页', '320/390 像素布局', '旧应用数据保留', '脚本无异常'] }
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ checks: report.checks.length, errors: errors.length, output }))
    await rpc('Browser.close')
    socket.close()
  } finally {
    clearTimeout(deadline)
    socket?.close()
    browser.kill()
    server.closeAllConnections()
    server.close()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
