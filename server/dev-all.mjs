import { spawn } from 'node:child_process'

const npmCommand = 'npm'
const viteArguments = process.argv.slice(2)
const spawnOptions = { stdio: 'inherit', shell: process.platform === 'win32' }
const children = [
  spawn(npmCommand, ['run', 'server'], spawnOptions),
  spawn(npmCommand, ['run', 'dev', ...(viteArguments.length ? ['--', ...viteArguments] : [])], spawnOptions),
]

let shuttingDown = false

function stopChildren() {
  if (shuttingDown) return
  shuttingDown = true
  children.forEach((child) => {
    if (!child.pid) return
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else child.kill('SIGTERM')
  })
}

process.on('SIGINT', () => { stopChildren(); process.exit(0) })
process.on('SIGTERM', () => { stopChildren(); process.exit(0) })
children.forEach((child) => child.on('exit', (code) => { if (!shuttingDown && code && code !== 0) { stopChildren(); process.exit(code) } }))
