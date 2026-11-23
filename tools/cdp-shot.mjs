/**
 * Скриншот и диагностика страницы через Chrome DevTools Protocol.
 * Использование: node tools/cdp-shot.mjs <url> <out.png> [width] [height] [theme]
 * theme: auto | light | dark
 */
import fs from 'node:fs'

const [url, outPath, width = '390', height = '844', theme = 'auto'] = process.argv.slice(2)
const base = 'http://127.0.0.1:9223'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const targets = await (await fetch(`${base}/json/list`)).json()
const page = targets.find((target) => target.type === 'page')
if (!page) throw new Error('No page target')
const socket = new WebSocket(page.webSocketDebuggerUrl)
const pending = new Map()
const problems = []
let sequence = 0

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id) {
    const resolver = pending.get(message.id)
    if (resolver) {
      pending.delete(message.id)
      resolver(message)
    }
    return
  }
  if (message.method === 'Runtime.exceptionThrown') {
    const details = message.params?.exceptionDetails
    problems.push(`exception: ${details?.exception?.description ?? details?.text ?? 'unknown'}`)
  }
  if (message.method === 'Log.entryAdded' && message.params?.entry?.level === 'error') {
    problems.push(`log: ${message.params.entry.text}`)
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
    problems.push(`console: ${(message.params.args ?? []).map((arg) => arg.value ?? arg.description ?? '').join(' ')}`)
  }
})

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence
    pending.set(id, (message) => (message.error ? reject(new Error(`${method}: ${JSON.stringify(message.error)}`)) : resolve(message.result)))
    socket.send(JSON.stringify({ id, method, params }))
  })
}

await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(width),
  height: Number(height),
  deviceScaleFactor: 2,
  mobile: Number(width) < 600,
})
if (theme === 'light' || theme === 'dark') {
  await send('Emulation.setEmulatedMedia', {
    media: '',
    features: [{ name: 'prefers-color-scheme', value: theme }],
  })
}
await send('Page.navigate', { url })
await sleep(3500)
const metrics = await send('Runtime.evaluate', {
  expression: `(async () => JSON.stringify({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
    blocks: document.querySelectorAll('.card, .stat, .finding, .meal-card').length,
    sw: 'serviceWorker' in navigator ? Boolean(await navigator.serviceWorker.getRegistration()) : false,
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  }))()`,
  awaitPromise: true,
  returnByValue: true,
})
const shot = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'))
console.log(JSON.stringify({ url, outPath, metrics: JSON.parse(metrics.result.value), problems }, null, 2))
socket.close()
