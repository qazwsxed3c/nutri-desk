/** Проверка офлайн-режима PWA через CDP: онлайн-загрузка, затем offline reload. */
import fs from 'node:fs'

const url = process.argv[2] ?? 'http://127.0.0.1:8788/'
const base = 'http://127.0.0.1:9223'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const targets = await (await fetch(`${base}/json/list`)).json()
const page = targets.find((target) => target.type === 'page')
const socket = new WebSocket(page.webSocketDebuggerUrl)
const pending = new Map()
let sequence = 0
const problems = []
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id) {
    pending.get(message.id)?.(message)
    pending.delete(message.id)
    return
  }
  if (message.method === 'Runtime.exceptionThrown') problems.push(message.params?.exceptionDetails?.text ?? 'exception')
})
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence
  pending.set(id, (message) => (message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result)))
  socket.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expression, awaitPromise = false) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true })
  return result.result.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url })
await sleep(4000)
const online = JSON.parse(await evaluate(`(async () => JSON.stringify({
  title: document.title,
  shell: Boolean(document.querySelector('.app-shell')),
  sw: 'serviceWorker' in navigator ? Boolean(await navigator.serviceWorker.getRegistration()) : false,
  cached: 'caches' in window ? (await caches.keys()) : [],
}))()`, true))

await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
await send('Page.reload')
await sleep(4000)
const offline = JSON.parse(await evaluate(`JSON.stringify({
  title: document.title,
  shell: Boolean(document.querySelector('.app-shell')),
  cards: document.querySelectorAll('.card, .stat').length,
})`))
const shot = await send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync('preview/offline-check.png', Buffer.from(shot.data, 'base64'))
console.log(JSON.stringify({ online, offline, problems }, null, 2))
socket.close()
