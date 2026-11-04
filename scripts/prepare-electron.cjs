const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const source = path.join(root, 'www')
const destination = path.join(root, 'electron/app')
const index = fs.readFileSync(path.join(source, 'index.html'), 'utf8')
if (!index.includes('<base href="./"')) throw new Error('请先运行 yarn build:electron:prod，确保桌面使用相对资源路径')
// 目标固定为当前项目的桌面打包目录，避免混入上次构建的资源。
fs.rmSync(destination, { recursive: true, force: true })
fs.cpSync(source, destination, { recursive: true })
