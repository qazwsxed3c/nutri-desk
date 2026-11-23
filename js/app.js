/** Точка входа: маршрутизация, оболочка, модалки, тосты, PWA. */
import { createStore } from './core/store.js'
import { icon } from './ui/components.js'
import { clientsView } from './ui/views/clients.js'
import { overviewView } from './ui/views/overview.js'
import { anamnesisView } from './ui/views/anamnesis.js'
import { resultsView } from './ui/views/results.js'
import { diaryView } from './ui/views/diary.js'
import { analysisView } from './ui/views/analysis.js'
import { labsView } from './ui/views/labs.js'
import { planView } from './ui/views/plan.js'
import { adviceView } from './ui/views/advice.js'

export const SECTIONS = [
  { id: 'overview', label: 'Обзор', icon: 'chart' },
  { id: 'anamnesis', label: 'Анкета', icon: 'clipboard' },
  { id: 'results', label: 'Результаты', icon: 'activity' },
  { id: 'diary', label: 'Дневник', icon: 'book' },
  { id: 'analysis', label: 'Анализ рациона', icon: 'pie' },
  { id: 'labs', label: 'Анализы', icon: 'flask' },
  { id: 'plan', label: 'Пример рациона', icon: 'target' },
  { id: 'advice', label: 'Рекомендации', icon: 'sparkles' },
]

const VIEWS = {
  clients: clientsView,
  overview: overviewView,
  anamnesis: anamnesisView,
  results: resultsView,
  diary: diaryView,
  analysis: analysisView,
  labs: labsView,
  plan: planView,
  advice: adviceView,
}

const store = createStore()
const app = document.getElementById('app')
const modalRoot = document.getElementById('modal-root')
const toastRoot = document.getElementById('toast-root')
let currentView = null
let deferredPrompt = null
let toastTimer = null

/* --------------------------------------------------------------- маршруты */

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '')
  const [path, queryString] = raw.split('?')
  const params = new URLSearchParams(queryString ?? '')
  const parts = path.split('/').filter(Boolean)
  if (parts[0] === 'client' && parts[1]) {
    const known = VIEWS[parts[2]] ? parts[2] : 'overview'
    return { name: known, clientId: parts[1], params }
  }
  return { name: 'clients', params }
}

function routeFor(name, clientId, params = {}) {
  if (name === 'clients' || !clientId) return '#/clients'
  const query = new URLSearchParams(params).toString()
  return `#/client/${clientId}/${name}${query ? `?${query}` : ''}`
}

function navigate(name, clientId, params = {}) {
  const next = routeFor(name, clientId, params)
  if (location.hash === next) render()
  else location.hash = next
}

/* ----------------------------------------------------------------- тосты */

function toast(message) {
  if (!toastRoot) return
  toastRoot.innerHTML = `<div class="toast show">${escape(message)}</div>`
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    const node = toastRoot.firstElementChild
    if (node) node.classList.remove('show')
  }, 2800)
}

function escape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/* ---------------------------------------------------------------- модалки */

let activeModalCleanup = null

function openModal({ title, body, submitLabel = 'Сохранить', cancelLabel = 'Отмена', onSubmit = null, wide = false, onMount = null, footerExtra = '' }) {
  closeModal()
  modalRoot.innerHTML = `<div class="modal-backdrop" data-modal-backdrop>
    <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${escape(title)}">
      <div class="modal-head"><h2>${escape(title)}</h2>
        <button type="button" class="modal-close" data-modal-close aria-label="Закрыть">${icon('close', 18)}</button>
      </div>
      <form class="modal-body" novalidate>
        ${body}
        <div class="form-actions" style="margin-top:18px">
          ${footerExtra}
          <button type="button" class="btn" data-modal-close>${escape(cancelLabel)}</button>
          ${onSubmit ? `<button type="submit" class="btn btn-primary">${escape(submitLabel)}</button>` : ''}
        </div>
      </form>
    </div>
  </div>`
  const backdrop = modalRoot.querySelector('[data-modal-backdrop]')
  const form = modalRoot.querySelector('form')
  const close = () => closeModal()
  modalRoot.querySelectorAll('[data-modal-close]').forEach((button) => button.addEventListener('click', close))
  if (backdrop) {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) close()
    })
  }
  document.addEventListener('keydown', escapeKey)
  function escapeKey(event) {
    if (event.key === 'Escape') close()
  }
  activeModalCleanup = () => document.removeEventListener('keydown', escapeKey)
  if (form && onSubmit) {
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      const data = formValues(form)
      const result = onSubmit(data, form, close)
      if (result === false) return
      close()
    })
  }
  if (onMount) onMount(modalRoot, close)
  const firstInput = modalRoot.querySelector('input, select, textarea, button')
  if (firstInput) requestAnimationFrame(() => firstInput.focus({ preventScroll: true }))
}

function closeModal() {
  if (activeModalCleanup) activeModalCleanup()
  activeModalCleanup = null
  modalRoot.innerHTML = ''
}

/** Собирает значения формы; числа и чекбоксы приводятся к типам. */
export function formValues(form) {
  const result = {}
  for (const element of form.elements) {
    if (!element.name) continue
    if (element.type === 'checkbox') {
      result[element.name] = element.checked
    } else if (element.type === 'number' || element.dataset.type === 'number') {
      result[element.name] = element.value === '' ? null : Number(element.value)
    } else {
      result[element.name] = element.value
    }
  }
  return result
}

/* ------------------------------------------------------------------ оболочка */

function clientInitials(name) {
  return String(name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function clientOptions(activeId) {
  return store.data.clients.map((client) => `<option value="${escape(client.id)}" ${client.id === activeId ? 'selected' : ''}>${escape(client.name)}</option>`).join('')
}

function shellHtml(route, viewHtml) {
  const activeClient = route.clientId ? store.clientById(route.clientId) : store.activeClient()
  const section = route.name === 'clients' ? 'clients' : route.name
  const navLinks = SECTIONS.map((item) => {
    const href = activeClient ? routeFor(item.id, activeClient.id) : '#/clients'
    const disabled = !activeClient && item.id !== 'overview'
    return `<a href="${href}" class="${section === item.id ? 'active' : ''} ${disabled ? 'disabled' : ''}" ${disabled ? 'aria-disabled="true" tabindex="-1"' : ''}>${icon(item.icon, 17)}<span>${item.label}</span></a>`
  }).join('')
  const tabLinks = SECTIONS.map((item) => {
    const href = activeClient ? routeFor(item.id, activeClient.id) : '#/clients'
    return `<a href="${href}" class="${section === item.id ? 'active' : ''}">${item.label}</a>`
  }).join('')
  const pickerOptions = store.data.clients.length
    ? clientOptions(activeClient?.id)
    : '<option value="">Нет клиентов</option>'
  return `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">N</div>
        <div><div class="brand-name">NutriDesk</div><div class="brand-sub">кабинет нутрициолога</div></div>
      </div>
      <div class="client-picker">
        <label for="client-picker-side">Активный клиент</label>
        <select id="client-picker-side" class="input" data-change="switch-client">${pickerOptions}</select>
      </div>
      <nav class="nav" aria-label="Разделы клиента">${navLinks}</nav>
      <div class="sidebar-foot">
        <div class="foot-actions">
          <button class="btn btn-sm" data-action="export">${icon('download', 14)}Экспорт</button>
          <button class="btn btn-sm" data-action="import">${icon('upload', 14)}Импорт</button>
        </div>
        ${deferredPrompt ? `<button class="btn btn-sm btn-primary" data-action="install">${icon('download', 14)}Установить приложение</button>` : ''}
        <div class="hint-block">Данные хранятся только на этом устройстве. Приложение не заменяет консультацию врача.</div>
      </div>
    </aside>
    <div class="main-col">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">N</div>
          <div><div class="brand-name">NutriDesk</div></div>
        </div>
        <select class="input" style="max-width:190px" data-change="switch-client" aria-label="Активный клиент">${pickerOptions}</select>
      </header>
      <nav class="tabs" aria-label="Разделы">${tabLinks}</nav>
      <main class="view" id="view">${viewHtml}</main>
    </div>
  </div>`
}

/* ------------------------------------------------------------------ рендер */

let lastScroll = 0

function render({ preserveScroll = true } = {}) {
  const route = parseRoute()
  const client = route.clientId ? store.clientById(route.clientId) : null
  if (route.name !== 'clients' && !client) {
    if (store.data.activeClientId) {
      location.hash = routeFor('overview', store.data.activeClientId)
      return
    }
    location.hash = '#/clients'
    return
  }
  if (client && store.data.activeClientId !== client.id) store.data.activeClientId = client.id

  const view = VIEWS[route.name] ?? clientsView
  const ctx = {
    store,
    route,
    client,
    params: route.params,
    navigate: (name, params) => navigate(name, client?.id ?? store.data.activeClientId, params),
    render: (options) => render(options),
    openModal,
    closeModal,
    toast,
  }
  let result
  try {
    result = view(ctx)
  } catch (error) {
    console.error('view error', error)
    result = { html: `<div class="card card-body"><h2>Не удалось открыть раздел</h2><p class="muted">${escape(error.message)}</p></div>`, actions: {}, forms: {} }
  }
  const html = shellHtml(route, result.html ?? '')
  lastScroll = preserveScroll ? window.scrollY : 0
  app.innerHTML = html
  currentView = result
  if (result.bind) result.bind(app, ctx)
  if (preserveScroll) requestAnimationFrame(() => window.scrollTo({ top: lastScroll }))
  else window.scrollTo({ top: 0 })
}

/* ----------------------------------------------------- глобальные действия */

function downloadJson() {
  const filename = `nutridesk-backup-${new Date().toISOString().slice(0, 10)}.json`
  const json = store.exportJson()
  const nativeBridge = globalThis.NutriDeskAndroid
  if (nativeBridge && typeof nativeBridge.saveBackup === 'function') {
    nativeBridge.saveBackup(filename, json)
    toast('Выберите, куда сохранить резервную копию')
    return
  }
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  toast('Резервная копия сохранена')
}

function importJson() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json,.json'
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      store.importJson(text)
      toast('Данные импортированы')
      render({ preserveScroll: false })
    } catch (error) {
      toast(`Не удалось импортировать: ${error.message}`)
    }
  })
  input.click()
}

const shellActions = {
  export: () => downloadJson(),
  import: () => importJson(),
  install: async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') toast('Приложение установлено')
    deferredPrompt = null
    render()
  },
  'seed-demo': () => {
    if (!confirm('Загрузить демонстрационные данные? Текущие данные будут заменены.')) return
    store.resetDemo()
    toast('Демо-данные загружены')
    render({ preserveScroll: false })
  },
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]')
  if (!target) return
  const action = target.dataset.action
  if (shellActions[action]) {
    event.preventDefault()
    shellActions[action](target, event)
    return
  }
  const handler = currentView?.actions?.[action]
  if (handler) {
    event.preventDefault()
    handler(target, event)
  }
})

document.addEventListener('change', (event) => {
  const target = event.target.closest('[data-change="switch-client"]')
  if (!target) return
  const id = target.value
  if (!id) return
  store.setActiveClient(id)
  navigate('overview', id)
})

document.addEventListener('submit', (event) => {
  const form = event.target
  const name = form?.dataset?.form
  if (!name) return
  const handler = currentView?.forms?.[name]
  if (!handler) return
  event.preventDefault()
  handler(form, event)
})

window.addEventListener('hashchange', () => render({ preserveScroll: false }))
window.addEventListener('resize', () => {}, { passive: true })

/* ------------------------------------------------------------------- PWA */

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredPrompt = event
  if (location.hash.includes('clients') || !location.hash) render()
})
window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  toast('NutriDesk установлен на устройство')
})
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !globalThis.NutriDeskAndroid) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('SW:', error))
  })
}

/* ------------------------------------------------------------------- старт */

if (!location.hash) location.hash = store.data.activeClientId ? routeFor('overview', store.data.activeClientId) : '#/clients'
render({ preserveScroll: false })
if (store.seeded) toast('Загружены демо-клиенты — можно удалить их и начать с чистого листа')
