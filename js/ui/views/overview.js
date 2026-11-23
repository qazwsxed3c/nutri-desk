/** Экран «Обзор клиента». */
import { badge, icon, meter, section } from '../components.js'
import { lineChart } from '../charts.js'
import { clientPageHead, disclaimer, editClientModal, findingList, macroTargetsCard, measurementModal, targetsPills, escape } from '../shared.js'
import { analyzeAnamnesis, analyzeDiet, calcTargets, latestMeasurement, sumDay, lastDays } from '../../core/nutrition.js'
import { flaggedLabs } from '../../data/labs.js'
import { fmt, fmtInt, toISO, formatDate, formatDateShort } from '../../core/format.js'

export function overviewView(ctx) {
  const { store, client } = ctx
  const foodsById = store.foodsById()
  const targets = calcTargets(client)
  const measurements = [...client.measurements].sort((a, b) => a.date.localeCompare(b.date))
  const latest = latestMeasurement(client)
  const first = measurements[0]
  const currentWeight = latest?.weightKg ?? client.weightKg
  const delta = first && latest ? currentWeight - first.weightKg : null
  const flagged = flaggedLabs(client.labs, client)
  const analysis = analyzeAnamnesis(client)
  const findings = analysis.findings.filter((finding) => finding.severity === 'warn' || finding.severity === 'alert')
  const today = toISO()
  const todayTotals = sumDay(client.foodLog[today] ?? {}, foodsById).totals
  const diet = analyzeDiet({ client, targets, foodLog: client.foodLog, dates: lastDays(7), foodsById, foods: store.foods() })

  const weightPoints = measurements.filter((entry) => entry.weightKg > 0).map((entry) => ({ date: entry.date, value: entry.weightKg }))
  const goal = Number(client.goalWeightKg) > 0 ? Number(client.goalWeightKg) : null
  const progress = first && goal !== null
    ? Math.max(0, Math.min(100, ((first.weightKg - currentWeight) / Math.max(first.weightKg - goal, 0.1)) * 100))
    : 0

  const todayMeters = targets.ready ? `
    ${meter('Калории', `${fmtInt(todayTotals.kcal)} / ${fmtInt(targets.kcal)} ккал`, (todayTotals.kcal / targets.kcal) * 100, todayTotals.kcal > targets.kcal * 1.15 ? 'alert' : todayTotals.kcal > targets.kcal * 0.8 ? 'good' : 'warn')}
    ${meter('Белки', `${fmtInt(todayTotals.protein)} / ${fmtInt(targets.protein)} г`, (todayTotals.protein / targets.protein) * 100, todayTotals.protein >= targets.protein * 0.8 ? 'good' : 'warn')}
    ${meter('Жиры', `${fmtInt(todayTotals.fat)} / ${fmtInt(targets.fat)} г`, (todayTotals.fat / targets.fat) * 100, 'good')}
    ${meter('Углеводы', `${fmtInt(todayTotals.carbs)} / ${fmtInt(targets.carbs)} г`, (todayTotals.carbs / targets.carbs) * 100, 'good')}
    ${meter('Клетчатка', `${fmt(todayTotals.fiber)} / ${fmtInt(targets.fiber)} г`, (todayTotals.fiber / targets.fiber) * 100, todayTotals.fiber >= targets.fiber * 0.7 ? 'good' : 'warn')}`
    : '<p class="muted">Заполните анкету, чтобы увидеть цели.</p>'

  const html = `
    ${clientPageHead(client, {
      subtitle: 'Ключевые показатели, питание и флаги по клиенту в одном месте.',
      actions: `<a class="btn" href="#/clients">${icon('users', 16)}Клиенты</a>
        <button class="btn" data-action="add-measurement">${icon('plus', 16)}Измерение</button>
        <button class="btn" data-action="edit-client">${icon('edit', 16)}Анкета</button>
        <a class="btn btn-primary" href="#/client/${client.id}/diary">${icon('book', 16)}Дневник</a>
        <button class="btn btn-sm btn-danger" data-action="delete-client" aria-label="Удалить клиента">${icon('trash', 14)}Удалить</button>`,
    })}
    <div class="grid cols-4" style="margin-bottom:16px">
      <div class="stat"><div class="stat-label">Вес сейчас</div><div class="stat-value">${fmt(currentWeight)} кг</div>
        <div class="stat-hint">${delta === null ? 'нет динамики' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} кг с начала`}</div></div>
      <div class="stat ${analysis.bmiCategory.tone === 'alert' ? 'tone-alert' : analysis.bmiCategory.tone === 'warn' ? 'tone-warn' : 'tone-good'}">
        <div class="stat-label">ИМТ</div><div class="stat-value">${targets.ready ? targets.bmi : '—'}</div>
        <div class="stat-hint">${escape(analysis.bmiCategory.label)}</div></div>
      <div class="stat"><div class="stat-label">Цель по весу</div><div class="stat-value">${goal ? `${fmt(goal)} кг` : '—'}</div>
        <div class="stat-hint">${goal ? `${Math.round(progress)}% пути` : 'не задана'}</div></div>
      <div class="stat"><div class="stat-label">Калории сегодня</div><div class="stat-value">${fmtInt(todayTotals.kcal)}</div>
        <div class="stat-hint">${targets.ready ? `из ${fmtInt(targets.kcal)} ккал · ${Math.round((todayTotals.kcal / targets.kcal) * 100)}%` : 'цели не заданы'}</div></div>
    </div>
    <div class="summary-grid">
      <div class="span-8">
        ${section('Динамика веса', `
          ${weightPoints.length ? lineChart({ points: weightPoints, height: 260, unit: 'кг', goal, goalLabel: 'цель' }) : '<div class="chart-empty">Добавьте первое измерение</div>'}
          <div class="chart-legend">
            <span><span class="legend-dot" style="background:#2f7d5a"></span>вес, кг</span>
            ${goal ? '<span><span class="legend-dot" style="background:#8a8f8b"></span>целевой вес</span>' : ''}
            <span class="spacer"></span><span>${formatDate(latest?.date ?? today, { day: 'numeric', month: 'long' })}</span>
          </div>`, { actions: `<button class="btn btn-sm" data-action="add-measurement">${icon('plus', 14)}Измерение</button>` })}
      </div>
      <div class="span-4">
        ${macroTargetsCard(targets)}
      </div>
      <div class="span-6">
        ${section('Питание сегодня', `${todayMeters}
          <div class="row" style="margin-top:14px">
            <a class="btn btn-sm" href="#/client/${client.id}/diary">Открыть дневник</a>
            <a class="btn btn-sm" href="#/client/${client.id}/analysis">Анализ рациона</a>
          </div>`, { subtitle: today ? formatDate(today, { day: 'numeric', month: 'long' }) : '' })}
      </div>
      <div class="span-6">
        ${section('Флаги и анализы', `
          ${findings.length ? findingList(findings.slice(0, 2)) : '<p class="muted small">Критичных флагов в анкете нет.</p>'}
          <div class="row" style="margin-top:12px; gap:6px">
            ${flagged.length ? flagged.slice(0, 4).map((lab) => badge(`${lab.marker} ${lab.status === 'low' ? '↓' : '↑'}`, 'warn')).join('') : badge('все анализы в норме', 'good')}
            ${flagged.length > 4 ? badge(`+${flagged.length - 4}`, 'muted') : ''}
          </div>
          <div class="row" style="margin-top:14px">
            <a class="btn btn-sm" href="#/client/${client.id}/labs">Анализы</a>
            <a class="btn btn-sm" href="#/client/${client.id}/advice">Рекомендации</a>
          </div>`, { subtitle: analysis.findings.length ? `${analysis.findings.length} находок в анкете` : '' })}
      </div>
      <div class="span-12">
        ${section('Быстрый переход', `<div class="row">
          ${[['diary', 'Дневник питания'], ['analysis', 'Анализ рациона'], ['plan', 'Пример рациона'], ['labs', 'Графики анализов'], ['advice', 'Макро- и микрорекомендации']]
            .map(([id, label]) => `<a class="btn btn-sm" href="#/client/${client.id}/${id}">${escape(label)}</a>`).join('')}
        </div>`)}
      </div>
    </div>
    <div class="row" style="margin-top:14px">${targetsPills(targets)}</div>
    ${disclaimer()}`

  return {
    html,
    actions: {
      'add-measurement': () => measurementModal(ctx, client),
      'edit-client': () => editClientModal(ctx, client),
      'delete-client': () => {
        if (!confirm(`Удалить клиента «${client.name}» и все его данные? Действие необратимо.`)) return
        ctx.store.deleteClient(client.id)
        ctx.toast('Клиент удалён')
        ctx.navigate('clients')
        ctx.render({ preserveScroll: false })
      },
    },
  }
}
