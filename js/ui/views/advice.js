/** Экран «Рекомендации»: макро/микро цели, исходный рацион и советы. */
import { badge, icon, section } from '../components.js'
import { clientPageHead, disclaimer, escape, macroTargetsCard } from '../shared.js'
import { analyzeAnamnesis, analyzeDiet, calcTargets, lastDays, topSources, MICRO_META } from '../../core/nutrition.js'
import { exclusionTags } from '../../data/foods.js'
import { fmt, fmtInt } from '../../core/format.js'

const STATUS_TONE = { low: 'warn', warn: 'info', ok: 'good', high: 'alert', unknown: 'muted' }
const STATUS_LABEL = { low: 'дефицит', warn: 'ниже цели', ok: 'норма', high: 'выше лимита', unknown: '—' }

export function adviceView(ctx) {
  const { client } = ctx
  const store = ctx.store
  const foodsById = store.foodsById()
  const targets = calcTargets(client)
  const dates = lastDays(7)
  const analysis = analyzeDiet({ client, targets, foodLog: client.foodLog, dates, foodsById, foods: store.foods() })
  const tags = exclusionTags(client)
  const findings = analyzeAnamnesis(client).findings.filter((finding) => finding.severity === 'warn' || finding.severity === 'alert')
  const hasDiary = analysis.ready

  const targetRows = targets.ready ? [
    ['Калорийность', `${fmtInt(targets.kcal)} ккал`, targets.tdee ? `расход ≈ ${fmtInt(targets.tdee)} ккал` : ''],
    ['Белки', `${fmtInt(targets.protein)} г`, `${targets.proteinPerKg.toFixed(2)} г/кг · ${Math.round(targets.macrosPct.protein)}% калорий`],
    ['Жиры', `${fmtInt(targets.fat)} г`, `${targets.fatPerKg.toFixed(2)} г/кг · ${Math.round(targets.macrosPct.fat)}% калорий`],
    ['Углеводы', `${fmtInt(targets.carbs)} г`, `${Math.round(targets.macrosPct.carbs)}% калорий`],
    ['Клетчатка', `${fmtInt(targets.fiber)} г`, 'клетчатка и микробиота'],
    ['Вода', `${fmtInt(targets.waterMl)} мл`, '≈30 мл/кг'],
  ] : []

  const targetTable = targets.ready ? `<div class="table-wrap"><table>
    <thead><tr><th>Нутриент</th><th class="num">Цель в сутки</th><th>Пояснение</th></tr></thead>
    <tbody>${targetRows.map(([label, value, hint]) => `<tr><td>${label}</td><td class="num"><b>${value}</b></td><td class="muted">${hint}</td></tr>`).join('')}</tbody>
  </table></div>` : '<p class="muted">Заполните анкету, чтобы рассчитать цели.</p>'

  const microRows = MICRO_META.map((micro) => {
    const target = targets.ready ? targets.micros[micro.key] : null
    const current = hasDiary ? analysis.micros.find((row) => row.key === micro.key) : null
    const status = current ? current.status : 'unknown'
    return `<div class="micro-row">
      <span class="micro-name">${micro.label}</span>
      <span class="muted small">${current ? `${fmt(current.value)} из ` : ''}${target ? fmtInt(target) : '—'} ${micro.unit}</span>
      <span class="mono small">${current && target ? `${Math.round((current.value / target) * 100)}%` : '—'}</span>
      <span class="micro-status">${badge(STATUS_LABEL[status], STATUS_TONE[status])}</span>
    </div>`
  }).join('')

  const deltaRows = hasDiary ? analysis.macroRows.map((row) => {
    const delta = Math.round(row.current - row.target)
    return `<tr><td>${row.label}</td><td class="num">${fmtInt(row.current)} ${row.unit}</td>
      <td class="num">${fmtInt(row.target)} ${row.unit}</td>
      <td class="num ${Math.abs(delta) > row.target * 0.15 ? 'bad' : 'good'}">${delta > 0 ? '+' : ''}${delta}</td></tr>`
  }).join('') : ''

  const deltaTable = hasDiary ? `<div class="table-wrap"><table>
    <thead><tr><th>Показатель</th><th class="num">Сейчас (7 дней)</th><th class="num">Цель</th><th class="num">Δ</th></tr></thead>
    <tbody>${deltaRows}</tbody></table></div>` : '<p class="muted small">Заполните дневник за 3–7 дней — покажу отклонения от целей в граммах.</p>'

  const adviceCards = hasDiary && analysis.advice.length
    ? analysis.advice.map((item) => `<article class="finding tone-${item.level === 'warn' ? 'warn' : 'info'}">
      <div class="finding-head"><span class="finding-icon">${icon(item.level === 'warn' ? 'alert' : 'info', 16)}</span>
        <h3>${escape(item.title)}</h3>${badge(item.level === 'warn' ? 'внимание' : 'к сведению', item.level === 'warn' ? 'warn' : 'info')}</div>
      <p>${escape(item.text)}</p>
    </article>`).join('')
    : '<p class="muted small">Заполните дневник, чтобы получить персональные рекомендации по макро- и микронутриентам.</p>'

  const sourcesForGaps = hasDiary
    ? analysis.micros.filter((micro) => micro.status === 'low' || micro.status === 'warn')
      .map((micro) => {
        const sources = topSources(micro.key, store.foods(), tags, 3).map((entry) => entry.food.name)
        return sources.length ? `<div class="row" style="justify-content:space-between; padding:6px 0; border-bottom:1px dashed var(--line)">
          <span>${micro.label}</span><span class="muted small">${sources.join(', ')}</span>
        </div>` : ''
      }).join('')
    : ''

  const findingsCards = findings.length
    ? findings.map((finding) => `<article class="finding tone-${finding.severity === 'alert' ? 'alert' : 'warn'}">
      <div class="finding-head"><span class="finding-icon">${icon('alert', 16)}</span><h3>${escape(finding.title)}</h3></div>
      <p>${escape(finding.detail)}</p>
      <p class="finding-action"><b>Что делать:</b> ${escape(finding.action)}</p>
    </article>`).join('')
    : '<p class="muted small">Критичных медицинских флагов нет.</p>'

  const html = `${clientPageHead(client, {
    subtitle: 'Цели по макро- и микронутриентам, сравнение с исходным рационом и конкретные шаги.',
    actions: `<a class="btn" href="#/client/${client.id}/analysis">Анализ рациона</a>
      <a class="btn btn-primary" href="#/client/${client.id}/plan">Пример рациона</a>`,
  })}
    <div class="grid cols-2" style="margin-bottom:16px; align-items:start">
      ${macroTargetsCard(targets)}
      ${section('Цели по нутриентам', targetTable, { subtitle: 'Расчёт по формуле Миффлина–Сан Жеора с поправкой на активность и цель.' })}
    </div>
    <div class="grid cols-2" style="margin-bottom:16px; align-items:start">
      ${section('Исходный рацион против цели', deltaTable, { subtitle: 'Среднее по дневнику за последние 7 дней.' })}
      ${section('Микронутриенты: цель и текущее потребление', `<div>${microRows}</div>`, { subtitle: 'Натрий — верхний лимит; остальные — минимальные цели.' })}
    </div>
    ${section('На что обратить внимание', findingsCards, { subtitle: 'Флаги из анкеты и измерений.' })}
    <div class="grid cols-2" style="margin-top:16px; align-items:start">
      ${section('Рекомендации по рациону', adviceCards, { subtitle: 'Сформированы из анализа последних 7 дней и анкеты.' })}
      ${section('Продукты-источники для дефицитов', sourcesForGaps || '<p class="muted small">Дефицитов по дневнику не выявлено.</p>', { subtitle: 'С учётом исключений из анкеты.' })}
    </div>
    ${disclaimer()}`

  return { html }
}
