/** SVG-графики без внешних зависимостей. */

const COLORS = {
  line: '#2f7d5a', line2: '#c77b3a', goal: '#8a8f8b', danger: '#c25a4a', grid: 'rgba(120,130,124,.18)',
  band: 'rgba(47,125,90,.10)', text: '#77817b', dot: '#2f7d5a',
}

function niceBounds(values, padding = 0.08) {
  const numbers = values.filter((value) => Number.isFinite(value))
  if (!numbers.length) return { min: 0, max: 1 }
  let min = Math.min(...numbers)
  let max = Math.max(...numbers)
  if (min === max) {
    const delta = Math.abs(min) * 0.1 || 1
    min -= delta
    max += delta
  }
  const span = max - min
  return { min: min - span * padding, max: max + span * padding }
}

function fmtTick(value) {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 100) return String(Math.round(value))
  if (abs >= 10) return value.toFixed(1)
  if (abs >= 1) return value.toFixed(1)
  return value.toFixed(2)
}

/**
 * Линейный график.
 * @param {object} options
 * @param {Array<{date:string,value:number}>} options.points
 * @param {number} [options.height]
 * @param {string} [options.unit]
 * @param {{from:number,to:number}|null} [options.band]  референсный коридор
 * @param {number|null} [options.goal]  целевая линия
 * @param {string} [options.goalLabel]
 * @param {(point: any) => string} [options.tooltip]
 */
export function lineChart({ points = [], height = 240, unit = '', band = null, goal = null, goalLabel = 'цель', tooltip = null, emptyText = 'Нет данных' }) {
  const valid = points.filter((point) => Number.isFinite(Number(point.value)))
  if (valid.length === 0) return `<div class="chart-empty">${emptyText}</div>`
  const width = 720
  const padding = { top: 18, right: 16, bottom: 30, left: 44 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const values = valid.map((point) => Number(point.value))
  if (band) {
    if (Number.isFinite(band.from)) values.push(band.from)
    if (Number.isFinite(band.to)) values.push(band.to)
  }
  if (goal !== null && Number.isFinite(Number(goal))) values.push(Number(goal))
  const bounds = niceBounds(values)
  const minY = bounds.min
  const maxY = bounds.max
  const spanY = maxY - minY || 1

  const dates = valid.map((point) => new Date(point.date).getTime())
  const minX = Math.min(...dates)
  const maxX = Math.max(...dates)
  const spanX = maxX - minX || 1
  const x = (time) => padding.left + ((time - minX) / spanX) * innerW
  const y = (value) => padding.top + (1 - (value - minY) / spanY) * innerH

  const grid = []
  for (let index = 0; index <= 4; index += 1) {
    const value = minY + (spanY * index) / 4
    grid.push(`<line x1="${padding.left}" x2="${width - padding.right}" y1="${y(value)}" y2="${y(value)}" stroke="${COLORS.grid}" stroke-width="1"/>`)
    grid.push(`<text x="${padding.left - 8}" y="${y(value) + 4}" text-anchor="end" class="chart-tick">${fmtTick(value)}</text>`)
  }

  const xLabels = []
  const labelCount = Math.min(valid.length, 4)
  for (let index = 0; index < labelCount; index += 1) {
    const pointIndex = labelCount === 1 ? 0 : Math.round((index / (labelCount - 1)) * (valid.length - 1))
    const point = valid[pointIndex]
    const xx = x(new Date(point.date).getTime())
    xLabels.push(`<text x="${xx}" y="${height - 8}" text-anchor="${index === 0 ? 'start' : index === labelCount - 1 ? 'end' : 'middle'}" class="chart-tick">${new Date(point.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</text>`)
  }

  const bandRect = band && Number.isFinite(band.from) && Number.isFinite(band.to)
    ? `<rect x="${padding.left}" y="${y(Math.min(band.to, maxY))}" width="${innerW}" height="${Math.max(0, y(band.from) - y(band.to))}" fill="${COLORS.band}"/>`
    : ''
  const goalLine = goal !== null && Number.isFinite(Number(goal))
    ? `<line x1="${padding.left}" x2="${width - padding.right}" y1="${y(Number(goal))}" y2="${y(Number(goal))}" stroke="${COLORS.goal}" stroke-dasharray="6 5" stroke-width="1.5"/>
       <text x="${width - padding.right}" y="${y(Number(goal)) - 6}" text-anchor="end" class="chart-tick chart-goal">${goalLabel} ${fmtTick(Number(goal))}</text>`
    : ''

  const line = valid
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(new Date(point.date).getTime()).toFixed(1)},${y(Number(point.value)).toFixed(1)}`)
    .join(' ')
  const area = `${line} L${x(new Date(valid[valid.length - 1].date).getTime()).toFixed(1)},${padding.top + innerH} L${x(new Date(valid[0].date).getTime()).toFixed(1)},${padding.top + innerH} Z`

  const dots = valid.map((point, index) => {
    const tip = tooltip ? tooltip(point) : `${new Date(point.date).toLocaleDateString('ru-RU')}: ${fmtTick(Number(point.value))} ${unit}`
    const last = index === valid.length - 1
    return `<g><title>${escapeAttr(tip)}</title>
      <circle cx="${x(new Date(point.date).getTime())}" cy="${y(Number(point.value))}" r="${last ? 5 : 3.5}" fill="${last ? COLORS.dot : '#fff'}" stroke="${COLORS.dot}" stroke-width="${last ? 2 : 2}"/></g>`
  }).join('')

  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="график">
    ${grid.join('')}
    ${bandRect}
    ${goalLine}
    <path d="${area}" fill="url(#chartArea)"/>
    <path d="${line}" fill="none" stroke="${COLORS.line}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <defs><linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.line}" stop-opacity=".18"/>
      <stop offset="100%" stop-color="${COLORS.line}" stop-opacity="0"/>
    </linearGradient></defs>
    ${xLabels.join('')}
  </svg>`
}

function escapeAttr(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

/** Горизонтальная полоса прогресса (для макросов и микронутриентов). */
export function meter(label, valueText, percent, tone = 'good', hint = '') {
  const pct = Math.max(0, Math.min(percent, 140))
  return `<div class="meter">
    <div class="meter-head"><span>${label}</span><span class="meter-value">${valueText}</span></div>
    <div class="meter-track"><div class="meter-fill tone-${tone}" style="width:${Math.min(100, pct)}%"></div></div>
    ${hint ? `<div class="meter-hint">${hint}</div>` : ''}
  </div>`
}

/** Кольцевая диаграмма долей макросов. */
export function macroDonut(proteinPct, fatPct, carbsPct) {
  const size = 148
  const radius = 56
  const stroke = 16
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const segments = [
    { label: 'Белки', value: proteinPct, color: '#2f7d5a' },
    { label: 'Жиры', value: fatPct, color: '#c77b3a' },
    { label: 'Углеводы', value: carbsPct, color: '#d9b64c' },
  ]
  let offset = 0
  const circles = segments.map((segment) => {
    const share = Math.max(0, Math.min(segment.value, 100)) / 100
    const dash = share * circumference
    const circle = `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${segment.color}" stroke-width="${stroke}"
      stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset * circumference / 100}" transform="rotate(-90 ${center} ${center})"/>`
    offset += segment.value
    return circle
  }).join('')
  return `<div class="donut-wrap">
    <svg viewBox="0 0 ${size} ${size}" class="donut" role="img" aria-label="распределение макросов">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(120,130,124,.14)" stroke-width="${stroke}"/>
      ${circles}
    </svg>
    <ul class="donut-legend">
      ${segments.map((segment) => `<li><span class="dot" style="background:${segment.color}"></span>${segment.label} <b>${Math.round(segment.value)}%</b></li>`).join('')}
    </ul>
  </div>`
}
