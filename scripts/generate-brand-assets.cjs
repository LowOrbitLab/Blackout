const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const root = path.resolve(__dirname, '..')
const background = [15, 15, 15]
const foreground = [240, 245, 244]
const accent = [144, 235, 190]
const mark = '<circle cx="244" cy="256" r="144" fill="#f0f5f4"/><circle cx="300" cy="224" r="136" fill="#0f0f0f"/><circle cx="360" cy="360" r="20" fill="#90ebbe"/>'
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>Blackout</title><rect width="512" height="512" fill="#0f0f0f"/>' + mark + '</svg>\n'

function write(file, data) {
  const target = path.join(root, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, data)
}

// PNG 编码仅使用标准库，所有平台素材由同一几何标记生成。
function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data])
  const result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length, 0)
  body.copy(result, 4)
  result.writeUInt32BE(crc32(body), result.length - 4)
  return result
}

function png(width, height = width, markSize = width) {
  const bytes = Buffer.alloc((width * 3 + 1) * height)
  const scale = markSize / 512
  function circle(x, y, cx, cy, radius) {
    return Math.max(0, Math.min(1, (radius - Math.hypot(x - cx, y - cy)) * scale + 0.5))
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = (x + 0.5 - width / 2) / scale + 256
      const py = (y + 0.5 - height / 2) / scale + 256
      const light = circle(px, py, 244, 256, 144) * (1 - circle(px, py, 300, 224, 136))
      const mint = circle(px, py, 360, 360, 20)
      const offset = y * (width * 3 + 1) + 1 + x * 3
      for (let channel = 0; channel < 3; channel++) {
        const shade = background[channel] + (foreground[channel] - background[channel]) * light
        bytes[offset + channel] = Math.round(shade + (accent[channel] - shade) * mint)
      }
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 2
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(bytes)), chunk('IEND', Buffer.alloc(0))])
}

for (const file of ['resources/logo.svg', 'resources/logo_splash.svg', 'resources/logo-dark_splash.svg', 'resources/splash.svg', 'resources/splash-dark.svg', 'src/assets/img/logo.svg']) write(file, svg)
for (const [density, size] of Object.entries({ ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const image = png(size)
  for (const name of ['ic_launcher', 'ic_launcher_round']) write(`android/app/src/main/res/mipmap-${density}/${name}.png`, image)
}
const vector = '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="288dp" android:height="288dp" android:viewportWidth="512" android:viewportHeight="512"><path android:fillColor="#0f0f0f" android:pathData="M0,0H512V512H0Z"/><path android:fillColor="#f0f5f4" android:pathData="M100,256a144,144 0,1 0,288 0a144,144 0,1 0,-288 0"/><path android:fillColor="#0f0f0f" android:pathData="M164,224a136,136 0,1 0,272 0a136,136 0,1 0,-272 0"/><path android:fillColor="#90ebbe" android:pathData="M340,360a20,20 0,1 0,40 0a20,20 0,1 0,-40 0"/></vector>\n'
for (const folder of ['drawable', 'drawable-night']) write(`android/app/src/main/res/${folder}/splash_icon.xml`, vector)
write('src/assets/icon/favicon.png', png(64))
for (const size of [72, 96, 128, 192, 256, 512]) write(`icons/icon-${size}.png`, png(size))
for (const file of ['ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 'electron/resources/icons/icon.png', 'fastlane/metadata/android/en-US/images/icon.png']) write(file, png(1024))
const splash = png(2732, 2732, 512)
for (const scale of [1, 2, 3]) {
  for (const theme of ['', '-dark']) write(`ios/App/App/Assets.xcassets/Splash.imageset/Default@${scale}x~universal~anyany${theme}.png`, splash)
}
write('electron/splash_assets/splash.png', png(480, 800, 288))
