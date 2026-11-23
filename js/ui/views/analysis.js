/** Экран «Анализ рациона». */
import { badge, icon, meter, section } from '../components.js'
import { macroDonut } from '../charts.js'
import { clientPageHead, disclaimer, escape } from '../shared.js'
import { analyzeDiet, calcTargets, lastDays, recordedDates } from '../../core/nutrition.js'
import { fmt, fmtInt, formatDateShort } from '../../core/format.js'

const STATUS = {
  low: { label: 'дефицит', tone: 'warn' },
  warn: { label: 'ниже цели', tone: 'info' },
  ok: { label: 'норма', tone: 'good' },
  high: { label: 'выше лимита', tone: 'alert' },
  unknown: { label: '—', tone: 'muted' },
}

export function analysisView(ctx) {
  const { client, params } = ctx
  const foodsById = ctx.store.foodsById()
  const targets = calcTargets(client)
  const period = ['1', '7', '30'].includes(params.get('period') ?? '') ? params.get('period') : '7'
  const datesRecorded = recordedDates(client.foodLog)
  const dates = period === '1'
    ? [datesRecorded.at(-1) ?? new Date().toISOString().slice(0, 10)]
    : lastDays(Number(period))
  const analysis = analyzeDiet({ client, targets, foodLog: client.foodLog, dates, foodsById, foods: ctx.store.foods() })

  const header = clientPageHead(client, {
    subtitle: 'Средний рацион за период: калории, макросы, микронутриенты и точки роста.',
    actions: `<a class="btn" href="#/client/${client.id}/diary">${icon('book', 16)}Дневник</a>
      <a class="btn btn-primary" href="#/client/${client.id}/advice">${icon('sparkles', 16)}Рекомендации</a>`,
  })

  const periodSwitch = `<div class="segmented" role="group" aria-label="Период анализа">
    ${[['1', '1 день'], ['7', '7 дней'], ['30', '30 дней']].map(([value, label]) => `<button data-action="set-period" data-period="${value}" class="${period === value ? 'active' : ''}">${label}</button>`).join('')}
  </div>`

  if (!analysis.ready) {
    return {
      html: `${header}
        <div class="row" style="margin-bottom:14px">${periodSwitch}</div>
        <div class="card card-body">${analysis.message ?? 'Недостаточно данных для анализа.'}
          <div class="row" style="margin-top:12px"><a class="btn btn-primary" href="#/client/${client.id}/diary">Открыть дневник</a></div>
        </div>${disclaimer()}`,
      actions: { 'set-period': (element) => ctx.navigate('analysis', { period: element.dataset.period }) },
    }
  }

  const macroCard = section('Макросы и калории', `
    ${macroDonut(analysis.macroPct.protein, analysis.macroPct.fat, analysis.macroPct.carbs)}
    <div class="grid" style="gap:12px; margin-top:16px">
      ${analysis.macroRows.map((row) => meter(
        row.label,
        `${fmtInt(row.current)} из ${fmtInt(row.target)} ${row.unit}`,
        row.pct,
        row.pct >= 90 && row.pct <= 115 ? 'good' : row.pct >= 70 ? 'warn' : 'alert',
        row.key === 'fiber' && row.current < row.target ? `дефицит ${Math.round(row.target - row.current)} г` : '',
      )).join('')}
    </div>`, { subtitle: `Среднее за ${analysis.daysWithData} дн. · ${analysis.dates.map((date) => formatDateShort(date)).join(', ')}` })

  const flags = analysis.flags.length
    ? `<div class="grid" style="gap:8px">${analysis.flags.map((flag) => `<div class="row finding tone-${flag.level === 'alert' ? 'alert' : 'warn'}" style="padding:10px 12px">
        ${icon('alert', 16)}<span class="small">${escape(flag.text)}</span></div>`).join('')}</div>`
    : '<p class="muted small">Существенных отклонений не найдено — рацион близок к целям.</p>'

  const microRows = analysis.micros.map((micro) => {
    const status = STATUS[micro.status] ?? STATUS.unknown
    const pct = micro.target > 0 ? Math.min((micro.value / micro.target) * 100, 120) : 0
    return `<div class="micro-row">
      <span class="micro-name">${micro.label}</span>
      <span class="meter"><span class="meter-track"><span class="meter-fill tone-${status.tone === 'alert' ? 'alert' : status.tone === 'good' ? 'good' : status.tone === 'warn' ? 'warn' : 'info'}" style="display:block;width:${pct}%"></span></span></span>
      <span class="mono small">${fmt(micro.value)} / ${fmtInt(micro.target)} ${micro.unit}</span>
      <span class="micro-status">${badge(status.label, status.tone)}</span>
    </div>`
  }).join('')

  const distribution = analysis.mealDistribution.map((meal) => `<div class="dist-row">
    <span>${meal.label}</span>
    <span class="dist-bar"><span class="dist-fill" style="display:block;width:${Math.min(meal.share, 100)}%"></span></span>
    <span class="mono small">${Math.round(meal.share)}% · ${fmtInt(meal.kcal)} ккал</span>
  </div>`).join('')

  const advice = analysis.advice.map((item) => `<article class="finding tone-${item.level === 'warn' ? 'warn' : 'info'}">
    <div class="finding-head"><span class="finding-icon">${icon(item.level === 'warn' ? 'alert' : 'info', 16)}</span>
      <h3>${escape(item.title)}</h3>${badge(item.level === 'warn' ? 'внимание' : 'к сведению', item.level === 'warn' ? 'warn' : 'info')}</div>
    <p>${escape(item.text)}</p>
  </article>`).join('')

  const topFoods = analysis.topFoods.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Продукт</th><th class="num">Граммы за период</th><th class="num">Ккал</th></tr></thead>
    <tbody>${analysis.topFoods.map((entry) => `<tr><td>${escape(entry.food.name)}</td><td class="num">${fmt(entry.grams)}</td><td class="num">${fmtInt(entry.kcal)}</td></tr>`).join('')}</tbody>
  </table></div>` : '<p class="muted small">Нет данных.</p>'

  const html = `${header}
    <div class="row" style="margin-bottom:16px">${periodSwitch}<span class="muted small">Учтено дней: ${analysis.daysWithData}</span></div>
    <div class="grid cols-4" style="margin-bottom:16px">
      <div class="stat"><div class="stat-label">Калории в среднем</div><div class="stat-value">${fmtInt(analysis.average.kcal)}</div><div class="stat-hint">${Math.round(analysis.kcalPct)}% от цели ${fmtInt(targets.kcal)}</div></div>
      <div class="stat"><div class="stat-label">Белок</div><div class="stat-value">${analysis.proteinPerKg ? analysis.proteinPerKg.toFixed(2) : '—'} г/кг</div><div class="stat-hint">${fmtInt(analysis.average.protein)} г/сут · цель ${fmtInt(targets.protein)}</div></div>
      <div class="stat"><div class="stat-label">Клетчатка</div><div class="stat-value">${fmt(analysis.average.fiber)} г</div><div class="stat-hint">цель ${fmtInt(targets.fiber)} г</div></div>
      <div class="stat"><div class="stat-label">Дней с дневником</div><div class="stat-value">${analysis.daysWithData}</div><div class="stat-hint">${analysis.daysWithData < 3 ? 'мало для точного анализа' : 'достаточно данных'}</div></div>
    </div>
    <div class="grid cols-2" style="margin-bottom:16px; align-items:start">
      ${macroCard}
      ${section('Флаги рациона', flags)}
    </div>
    ${section('Микронутриенты', `<div>${microRows}</div>`, { subtitle: 'Сравнение среднего потребления с нормами. Натрий — верхний лимит, остальные — цель, к которой стремимся.' })}
    <div class="grid cols-2" style="margin-top:16px; align-items:start">
      ${section('Распределение по приёмам пищи', distribution, { subtitle: 'Ориентир: завтрак 25%, обед 35%, ужин 30%, перекус 10%.' })}
      ${section('Топ продуктов по калориям', topFoods)}
    </div>
    ${section('Что улучшить', advice || '<p class="muted small">Рекомендаций нет — рацион сбалансирован.</p>', { subtitle: 'Советы учитывают исходный рацион и исключения из анкеты.' })}
    ${disclaimer()}`

  return {
    html,
    actions: {
      'set-period': (element) => ctx.navigate('analysis', { period: element.dataset.period }),
    },
  }
}
