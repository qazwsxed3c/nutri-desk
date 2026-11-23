/** Экран «Анализы»: графики, референсы, история. */
import { badge, icon, section } from '../components.js'
import { lineChart } from '../charts.js'
import { clientPageHead, disclaimer, labModal } from '../shared.js'
import { LAB_BY_ID, LAB_MARKERS, LAB_STATUS_LABELS, flaggedLabs, labRange, labStatus, labTrend } from '../../data/labs.js'
import { fmt, formatDateShort } from '../../core/format.js'

const TREND_ICON = { up: '↑', down: '↓', flat: '→', none: '·' }
const STATUS_LABEL = { low: 'ниже нормы', normal: 'в норме', high: 'выше нормы', unknown: '—' }
const STATUS_TONE = { low: 'warn', high: 'alert', normal: 'good', unknown: 'muted' }

function rangeText(range) {
  if (!range) return '—'
  const hasMin = Number.isFinite(range.min)
  const hasMax = Number.isFinite(range.max)
  if (hasMin && hasMax) return `${fmt(range.min)}–${fmt(range.max)}`
  if (hasMin) return `≥ ${fmt(range.min)}`
  if (hasMax) return `≤ ${fmt(range.max)}`
  return '—'
}

export function labsView(ctx) {
  const { client, params } = ctx
  const labs = [...(client.labs ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const flagged = flaggedLabs(labs, client)
  const requested = params.get('marker')
  const markerId = LAB_BY_ID[requested] ? requested : flagged[0]?.marker ?? 'ferritin'
  const marker = LAB_BY_ID[markerId]
  const range = labRange(marker, client)
  const markerLabs = labs.filter((lab) => lab.marker === markerId)
  const latest = markerLabs.at(-1)
  const trend = labTrend(markerLabs)
  const status = latest ? labStatus(latest.value, range) : 'unknown'
  const points = markerLabs.map((lab) => ({ date: lab.date, value: Number(lab.value) }))

  const latestByMarker = new Map()
  for (const lab of labs) {
    const current = latestByMarker.get(lab.marker)
    if (!current || lab.date > current.date) latestByMarker.set(lab.marker, lab)
  }
  const allRows = LAB_MARKERS.map((item) => {
    const value = latestByMarker.get(item.id)
    if (!value) return null
    const itemRange = labRange(item, client)
    const itemStatus = labStatus(value.value, itemRange)
    return { marker: item, value, range: itemRange, status: itemStatus, trend: labTrend(labs.filter((lab) => lab.marker === item.id)) }
  }).filter(Boolean).sort((a, b) => {
    const order = { low: 0, high: 0, normal: 1, unknown: 2 }
    return order[a.status] - order[b.status] || a.marker.name.localeCompare(b.marker.name)
  })

  const flagCards = flagged.length
    ? `<div class="grid" style="gap:8px">${flagged.map((lab) => {
      const meta = LAB_BY_ID[lab.marker]
      return `<div class="finding tone-${lab.status === 'high' ? 'alert' : 'warn'}" style="flex-direction:row; align-items:center; justify-content:space-between; gap:12px">
        <span class="small"><b>${escape(meta?.name ?? lab.marker)}</b> — ${fmt(lab.value)} ${meta?.unit ?? ''} ${lab.status === 'low' ? '↓ ниже' : '↑ выше'} референса</span>
        <button class="btn btn-sm btn-ghost" data-action="select-marker" data-marker="${lab.marker}">График</button>
      </div>`
    }).join('')}</div>`
    : '<p class="muted small">Все показатели в пределах референсных диапазонов.</p>'

  const chart = points.length
    ? lineChart({
      points,
      height: 260,
      unit: marker.unit,
      band: { from: range.min, to: range.max },
      tooltip: (point) => `${formatDateShort(point.date)}: ${fmt(point.value)} ${marker.unit} (референс ${rangeText(range)})`,
    })
    : '<div class="chart-empty">Нет значений этого показателя</div>'

  const markerOptions = LAB_MARKERS.map((item) => `<option value="${item.id}" ${item.id === markerId ? 'selected' : ''}>${item.name}</option>`).join('')
  const historyRows = [...markerLabs].reverse().map((lab) => {
    const itemStatus = labStatus(lab.value, range)
    return `<tr class="${itemStatus === 'normal' ? '' : 'is-alert'}">
      <td>${formatDateShort(lab.date)}</td>
      <td class="num">${fmt(lab.value)} ${marker.unit}</td>
      <td class="num">${rangeText(range)}</td>
      <td>${badge(STATUS_LABEL[itemStatus] ?? '—', STATUS_TONE[itemStatus] ?? 'muted')}</td>
      <td>${escape(lab.note ?? '')}</td>
      <td class="num"><button class="btn btn-sm btn-ghost" data-action="delete-lab" data-id="${lab.id}" aria-label="Удалить">${icon('trash', 14)}</button></td>
    </tr>`
  }).join('')

  const html = `
    ${clientPageHead(client, {
      subtitle: 'Графики анализов с референсными диапазонами, динамикой и отклонениями.',
      actions: `<button class="btn btn-primary" data-action="add-lab">${icon('plus', 16)}Добавить анализ</button>`,
    })}
    ${section('Отклонения по последним значениям', flagCards, { subtitle: 'Диапазоны ориентировочные; интерпретацию делает врач.' })}
    <div class="row" style="margin:16px 0 10px; gap:10px; flex-wrap:wrap">
      <select class="input" style="max-width:340px" data-marker-select aria-label="Показатель">
        ${markerOptions}
      </select>
      ${latest ? badge(`${fmt(latest.value)} ${marker.unit} · ${STATUS_LABEL[status]}`, STATUS_TONE[status]) : badge('нет данных', 'muted')}
      ${trend !== 'none' ? badge(`динамика ${TREND_ICON[trend]}`, 'muted') : ''}
    </div>
    <div class="grid cols-2" style="align-items:start; margin-bottom:16px">
      ${section(marker.name, `${chart}
        <div class="chart-legend"><span><span class="legend-dot" style="background:rgba(47,125,90,.25)"></span>референс ${rangeText(range)} ${marker.unit}</span>
        <span class="spacer"></span><span>${marker.note ? escape(marker.note) : ''}</span></div>`)}
      ${section('История показателя', `<div class="table-wrap"><table>
        <thead><tr><th>Дата</th><th class="num">Значение</th><th class="num">Референс</th><th>Статус</th><th>Заметка</th><th></th></tr></thead>
        <tbody>${historyRows || `<tr><td colspan="6" class="muted">Нет данных</td></tr>`}</tbody></table></div>`)}
    </div>
    ${section('Все показатели (последние значения)', `<div class="table-wrap"><table>
      <thead><tr><th>Показатель</th><th class="num">Последнее</th><th class="num">Референс</th><th>Статус</th><th class="num">Тренд</th><th></th></tr></thead>
      <tbody>${allRows.map((row) => `<tr class="${row.status === 'normal' ? '' : row.status === 'high' ? 'is-alert' : 'is-warn'}">
        <td>${escape(row.marker.name)}</td>
        <td class="num">${fmt(row.value.value)} ${row.marker.unit}<br><span class="tiny muted">${formatDateShort(row.value.date)}</span></td>
        <td class="num">${rangeText(row.range)}</td>
        <td>${badge(STATUS_LABEL[row.status], STATUS_TONE[row.status])}</td>
        <td class="num">${TREND_ICON[row.trend]}</td>
        <td class="num"><button class="btn btn-sm btn-ghost" data-action="select-marker" data-marker="${row.marker.id}">График</button></td>
      </tr>`).join('')}</tbody></table></div>`, { subtitle: `${allRows.length} показателей с данными` })}
    ${disclaimer()}`

  return {
    html,
    bind(root) {
      root.querySelector('[data-marker-select]')?.addEventListener('change', (event) => {
        ctx.navigate('labs', { marker: event.target.value })
      })
    },
    actions: {
      'add-lab': () => labModal(ctx, client, markerId),
      'select-marker': (element) => ctx.navigate('labs', { marker: element.dataset.marker }),
      'delete-lab': (element) => {
        const lab = labs.find((item) => item.id === element.dataset.id)
        if (!lab) return
        if (!confirm('Удалить запись анализа?')) return
        ctx.store.deleteLab(client.id, lab.id)
        ctx.toast('Запись удалена')
        ctx.render()
      },
    },
  }
}

function escape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
