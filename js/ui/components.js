/** Общие UI-примитивы: иконки, карточки, поля форм, бейджи. */
import { escapeHtml } from '../core/format.js'

export { escapeHtml }
export { meter, macroDonut, lineChart } from './charts.js'
export const esc = escapeHtml

const ICONS = {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  clipboard: '<path d="M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1z"/><path d="M8 11h8M8 15h6M8 7h1"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 4 3 5-7"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/>',
  pie: '<path d="M21.2 15.9A10 10 0 1 1 8.1 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  flask: '<path d="M9 3h6M10 3v6.5L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/><path d="M7.5 14h9"/>',
  sparkles: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
  chevronRight: '<path d="M9 18l6-6-6-6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 8l5-5 5 5"/><path d="M12 3v12"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  left: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
}

export function icon(name, size = 18, className = '') {
  const body = ICONS[name] ?? ICONS.info
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}

export function badge(text, tone = 'muted') {
  return `<span class="badge tone-${tone}">${esc(text)}</span>`
}

export function stat(label, value, hint = '', tone = '') {
  return `<div class="stat ${tone ? `tone-${tone}` : ''}">
    <div class="stat-label">${esc(label)}</div>
    <div class="stat-value">${esc(value)}</div>
    ${hint ? `<div class="stat-hint">${esc(hint)}</div>` : ''}
  </div>`
}

export function section(title, body, { subtitle = '', actions = '', className = '' } = {}) {
  return `<section class="card ${className}">
    <header class="card-head">
      <div>
        <h2>${esc(title)}</h2>
        ${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ''}
      </div>
      ${actions ? `<div class="card-actions">${actions}</div>` : ''}
    </header>
    <div class="card-body">${body}</div>
  </section>`
}

export function field(label, control, hint = '') {
  return `<label class="field">
    <span class="field-label">${esc(label)}</span>
    ${control}
    ${hint ? `<span class="field-hint">${esc(hint)}</span>` : ''}
  </label>`
}

export function input(options = {}) {
  const { name, type = 'text', value = '', placeholder = '', step = '', min = '', max = '', required = false, inputmode = '' } = options
  return `<input class="input" name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" placeholder="${esc(placeholder)}"
    ${step !== '' ? `step="${esc(step)}"` : ''} ${min !== '' ? `min="${esc(min)}"` : ''} ${max !== '' ? `max="${esc(max)}"` : ''}
    ${inputmode ? `inputmode="${esc(inputmode)}"` : ''} ${required ? 'required' : ''}>`
}

export function textarea(options = {}) {
  const { name, value = '', placeholder = '', rows = 3 } = options
  return `<textarea class="input textarea" name="${esc(name)}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
}

export function select(options = {}) {
  const { name, value = '', items = [], placeholder = '' } = options
  return `<select class="input" name="${esc(name)}">
    ${placeholder ? `<option value="">${esc(placeholder)}</option>` : ''}
    ${items.map((item) => `<option value="${esc(item.value)}" ${String(item.value) === String(value) ? 'selected' : ''}>${esc(item.label)}</option>`).join('')}
  </select>`
}

export function button(label, { variant = 'primary', action = '', type = 'button', attrs = '', iconName = '' } = {}) {
  return `<button class="btn btn-${variant}" type="${type}" ${action ? `data-action="${esc(action)}"` : ''} ${attrs}>
    ${iconName ? icon(iconName, 16) : ''}<span>${esc(label)}</span></button>`
}

export function emptyState(titleText, text, actionHtml = '', iconName = 'sparkles') {
  return `<div class="empty">
    <div class="empty-icon">${icon(iconName, 26)}</div>
    <h3>${esc(titleText)}</h3>
    <p>${esc(text)}</p>
    ${actionHtml}
  </div>`
}

export function progress(pct, tone = 'good') {
  return `<div class="progress"><div class="progress-fill tone-${tone}" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`
}

export const SEVERITY = {
  alert: { label: 'важно', tone: 'alert', icon: 'alert' },
  warn: { label: 'обратить внимание', tone: 'warn', icon: 'alert' },
  info: { label: 'к сведению', tone: 'info', icon: 'info' },
  good: { label: 'хорошо', tone: 'good', icon: 'check' },
}

export function findingCard(finding) {
  const meta = SEVERITY[finding.severity] ?? SEVERITY.info
  return `<article class="finding tone-${meta.tone}">
    <div class="finding-head">
      <span class="finding-icon">${icon(meta.icon, 16)}</span>
      <h3>${esc(finding.title)}</h3>
      ${badge(meta.label, meta.tone)}
    </div>
    <p>${esc(finding.detail)}</p>
    <p class="finding-action"><b>Что делать:</b> ${esc(finding.action)}</p>
  </article>`
}

export function mealName(meal) {
  return { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }[meal] ?? meal
}

export function toneForPercent(pct) {
  if (pct >= 90 && pct <= 115) return 'good'
  if (pct >= 70 && pct < 90) return 'warn'
  if (pct > 115) return 'alert'
  return 'alert'
}

export function chips(values) {
  return (values ?? []).map((value) => `<span class="chip">${esc(value)}</span>`).join('')
}
