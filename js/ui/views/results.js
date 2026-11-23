/** Экран «Результаты»: измерения и графики динамики. */
import { icon, section, stat } from '../components.js'
import { lineChart } from '../charts.js'
import { clientPageHead, disclaimer, measurementModal } from '../shared.js'
import { bmiFor, calcTargets, latestMeasurement } from '../../core/nutrition.js'
import { fmt, formatDateShort } from '../../core/format.js'

export function resultsView(ctx) {
  const { client } = ctx
  const targets = calcTargets(client)
  const measurements = [...client.measurements].sort((a, b) => a.date.localeCompare(b.date))
  const latest = latestMeasurement(client) ?? {}
  const firstWeight = measurements.find((entry) => entry.weightKg > 0)?.weightKg ?? null
  const currentWeight = latest.weightKg ?? client.weightKg
  const delta = firstWeight !== null ? currentWeight - firstWeight : null
  const weightPoints = measurements.filter((entry) => entry.weightKg > 0).map((entry) => ({ date: entry.date, value: entry.weightKg }))
  const waistPoints = measurements.filter((entry) => entry.waistCm > 0).map((entry) => ({ date: entry.date, value: entry.waistCm }))
  const bmi = bmiFor(currentWeight, client.heightCm)

  const rows = [...measurements].reverse().map((entry) => `<tr>
    <td>${formatDateShort(entry.date)}</td>
    <td class="num">${entry.weightKg ? fmt(entry.weightKg) : '—'}</td>
    <td class="num">${entry.waistCm ? fmt(entry.waistCm) : '—'}</td>
    <td class="num">${entry.bodyFatPct ? fmt(entry.bodyFatPct) : '—'}</td>
    <td class="num">${entry.wellBeing ? `${entry.wellBeing}/5` : '—'}</td>
    <td>${escape(entry.note ?? '')}</td>
    <td class="num"><button class="btn btn-sm btn-ghost" data-action="delete-measurement" data-id="${escape(entry.id)}" aria-label="Удалить измерение">${icon('trash', 14)}</button></td>
  </tr>`).join('')

  const html = `
    ${clientPageHead(client, {
      subtitle: 'Динамика веса, талии и самочувствия — по измерениям, которые вы добавляете.',
      actions: `<button class="btn btn-primary" data-action="add-measurement">${icon('plus', 16)}Добавить измерение</button>`,
    })}
    <div class="grid cols-4" style="margin-bottom:16px">
      <div class="stat"><div class="stat-label">Вес</div><div class="stat-value">${fmt(currentWeight)} кг</div>
        <div class="stat-hint">${delta === null ? 'нет данных' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} кг за всё время`}</div></div>
      <div class="stat"><div class="stat-label">ИМТ</div><div class="stat-value">${bmi ? bmi.toFixed(1) : '—'}</div><div class="stat-hint">${targets.ready ? `цель ${fmt(targets.protein)} г белка` : ''}</div></div>
      <div class="stat"><div class="stat-label">Талия</div><div class="stat-value">${latest.waistCm ? `${fmt(latest.waistCm)} см` : '—'}</div><div class="stat-hint">${latest.date ? formatDateShort(latest.date) : 'нет измерения'}</div></div>
      <div class="stat"><div class="stat-label">Самочувствие</div><div class="stat-value">${latest.wellBeing ? `${latest.wellBeing}/5` : '—'}</div><div class="stat-hint">по последнему измерению</div></div>
    </div>
    <div class="grid cols-2" style="margin-bottom:16px">
      <div>${section('Вес, кг', weightPoints.length ? lineChart({ points: weightPoints, height: 240, unit: 'кг', goal: client.goalWeightKg || null, goalLabel: 'цель' }) : '<div class="chart-empty">Добавьте измерения, чтобы построить график</div>')}</div>
      <div>${section('Талия, см', waistPoints.length ? lineChart({ points: waistPoints, height: 240, unit: 'см' }) : '<div class="chart-empty">Добавьте обхват талии в измерения</div>')}</div>
    </div>
    ${section('История измерений', measurements.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Дата</th><th class="num">Вес, кг</th><th class="num">Талия, см</th><th class="num">Жир, %</th><th class="num">Самочувствие</th><th>Заметка</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>` : '<div class="chart-empty">Пока нет измерений</div>', { actions: `<button class="btn btn-sm" data-action="add-measurement">${icon('plus', 14)}Добавить</button>` })}
    ${disclaimer()}`

  return {
    html,
    actions: {
      'add-measurement': () => measurementModal(ctx, client),
      'delete-measurement': (element) => {
        const id = element.dataset.id
        const entry = client.measurements.find((item) => item.id === id)
        if (!entry) return
        if (!confirm(`Удалить измерение от ${formatDateShort(entry.date)}?`)) return
        ctx.store.mutate((data) => {
          const target = data.clients.find((item) => item.id === client.id)
          if (!target) return
          target.measurements = target.measurements.filter((item) => item.id !== id)
          const sorted = [...target.measurements].sort((a, b) => a.date.localeCompare(b.date))
          if (sorted.length) target.weightKg = sorted.at(-1).weightKg ?? target.weightKg
        })
        ctx.toast('Измерение удалено')
        ctx.render()
      },
    },
  }
}

function escape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
