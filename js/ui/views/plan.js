/** Экран «Пример рациона»: сгенерированный день под цели клиента. */
import { badge, icon, meter, section } from '../components.js'
import { clientPageHead, disclaimer, escape } from '../shared.js'
import { calcTargets, generateMealPlan, planToDayEntries } from '../../core/nutrition.js'
import { fmt, fmtInt, toISO } from '../../core/format.js'

export function planView(ctx) {
  const { client } = ctx
  const foodsById = ctx.store.foodsById()
  const targets = calcTargets(client)
  const seed = Number(client.planSeed) || 0
  const plan = generateMealPlan({ client, targets, foodsById, seed })

  const head = clientPageHead(client, {
    subtitle: 'Пример дня питания: порции подобраны под цели, исключения из анкеты учтены.',
    actions: `<button class="btn" data-action="regenerate">${icon('sparkles', 16)}Другой вариант</button>
      <button class="btn btn-primary" data-action="to-diary">${icon('book', 16)}В дневник на сегодня</button>`,
  })

  if (!plan.ready) {
    return {
      html: `${head}
        <div class="card"><div class="card-body">
          <h2>Сначала нужны цели</h2>
          <p class="muted" style="margin-top:6px">${escape(plan.message ?? 'Заполните рост, вес и цель в анкете.')}</p>
          <div class="row" style="margin-top:12px"><a class="btn btn-primary" href="#/client/${client.id}/anamnesis">Открыть анкету</a></div>
        </div></div>${disclaimer()}`,
      actions: {},
    }
  }

  const rows = [
    ['Калорийность', 'ккал', plan.totals.kcal, targets.kcal],
    ['Белки', 'г', plan.totals.protein, targets.protein],
    ['Жиры', 'г', plan.totals.fat, targets.fat],
    ['Углеводы', 'г', plan.totals.carbs, targets.carbs],
    ['Клетчатка', 'г', plan.totals.fiber, targets.fiber],
  ]
  const totalsTable = `<div class="table-wrap"><table>
    <thead><tr><th>Показатель</th><th class="num">План</th><th class="num">Цель</th><th class="num">Разница</th><th style="width:34%"></th></tr></thead>
    <tbody>${rows.map(([label, unit, value, target]) => {
      const pct = target > 0 ? (value / target) * 100 : 0
      const diff = value - target
      return `<tr><td>${label}</td>
        <td class="num">${fmtInt(value)} ${unit}</td>
        <td class="num">${fmtInt(target)} ${unit}</td>
        <td class="num ${Math.abs(pct - 100) <= 10 ? '' : 'muted'}">${diff > 0 ? '+' : ''}${fmtInt(diff)}</td>
        <td><div class="meter-track"><div class="meter-fill tone-${pct >= 90 && pct <= 112 ? 'good' : 'warn'}" style="width:${Math.min(100, pct)}%"></div></div></td>
      </tr>`
    }).join('')}</tbody></table></div>`

  const meals = plan.meals.map((meal) => {
    if (!meal.items.length) {
      return `<article class="card plan-meal"><div class="plan-meal-head"><h3>${meal.label}</h3></div>
        <div class="meal-empty">Нет подходящего блюда с учётом исключений.</div></article>`
    }
    const items = meal.items.map((item) => `<li class="plan-item">
      <span>${escape(item.name)}</span><span class="grams">${fmt(item.grams)} г</span>
      <span class="macros">${fmtInt(item.nutrients.kcal)} ккал · Б ${fmt(item.nutrients.protein)} · Ж ${fmt(item.nutrients.fat)} · У ${fmt(item.nutrients.carbs)}</span>
    </li>`).join('')
    return `<article class="card plan-meal">
      <div class="plan-meal-head">
        <span class="finding-icon">${icon('book', 16)}</span>
        <div style="flex:1"><h3>${meal.label}: ${escape(meal.name)}</h3>
        ${meal.note ? `<p class="tiny muted">${escape(meal.note)}</p>` : ''}</div>
        ${badge(`${meal.fit}% соответствие`, meal.fit >= 85 ? 'good' : 'warn')}
      </div>
      <ul class="plan-items">${items}</ul>
      <div class="plan-meal-foot">
        <span>${fmtInt(meal.totals.kcal)} ккал из ≈${fmtInt(meal.targetKcal)}</span>
        <span>Б ${fmt(meal.totals.protein)} · Ж ${fmt(meal.totals.fat)} · У ${fmt(meal.totals.carbs)}</span>
        ${meal.bumpedGrams ? `<span>белок скорректирован +${fmt(meal.bumpedGrams)} г</span>` : ''}
      </div>
    </article>`
  }).join('')

  const html = `${head}
    <div class="grid cols-4" style="margin-bottom:16px">
      <div class="stat"><div class="stat-label">Соответствие цели</div><div class="stat-value">${plan.fit}%</div>
        <div class="stat-hint">энергия, белок, жиры, углеводы</div></div>
      <div class="stat"><div class="stat-label">Калорийность дня</div><div class="stat-value">${fmtInt(plan.totals.kcal)}</div>
        <div class="stat-hint">цель ${fmtInt(targets.kcal)} ккал</div></div>
      <div class="stat"><div class="stat-label">Белок</div><div class="stat-value">${fmtInt(plan.totals.protein)} г</div>
        <div class="stat-hint">${(plan.totals.protein / Math.max(client.weightKg, 1)).toFixed(2)} г/кг</div></div>
      <div class="stat"><div class="stat-label">Исключено блюд</div><div class="stat-value">${plan.excludedCount}</div>
        <div class="stat-hint">из-за аллергий/непереносимостей</div></div>
    </div>
    <div class="row" style="margin-bottom:14px">${meter('Соответствие целям', `${plan.fit}%`, plan.fit, plan.fit >= 85 ? 'good' : 'warn')}</div>
    <div class="grid" style="gap:14px; margin-bottom:16px">${meals}</div>
    ${section('Итоги дня и цели', totalsTable, { subtitle: 'Порции — ориентир: их можно менять, сохраняя общий баланс.' })}
    ${section('Как построен план', `<div class="finding tone-info">
      <div class="finding-head"><span class="finding-icon">${icon('info', 16)}</span><h3>Логика подбора</h3></div>
      <p>Энергия распределена на завтрак 25%, обед 35%, ужин 30%, перекус 10%. Для каждого приёма выбрано блюдо из базы,
      порции отмасштабированы под цель по калориям и при необходимости дополнены белковым компонентом. Блюда с аллергенами и
      исключениями из анкеты не используются. Можно нажать «Другой вариант», чтобы получить другое сочетание блюд.</p>
    </div>`)}
    ${disclaimer()}`

  return {
    html,
    actions: {
      regenerate: () => {
        ctx.store.updateClient(client.id, { planSeed: seed + 1 })
        ctx.toast('Сгенерирован другой вариант рациона')
        ctx.render()
      },
      'to-diary': () => {
        if (!confirm('Записать этот план в дневник за сегодня? Текущие записи этого дня будут заменены.')) return
        const date = toISO()
        ctx.store.setDay(client.id, date, planToDayEntries(plan, date))
        ctx.toast('План добавлен в дневник')
        ctx.navigate('diary', { date })
      },
    },
  }
}
