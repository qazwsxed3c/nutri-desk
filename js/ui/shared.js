/** Общие фрагменты страниц: шапка клиента, бейджи, дисклеймер. */
import { badge, findingCard, icon, section } from './components.js'
import { clientFormHtml, labFormHtml, measurementFormHtml, parseClientForm, parseLab, parseMeasurement } from './forms.js'
import { ACTIVITY_LEVELS, GOAL_TYPES } from '../core/nutrition.js'
import { ageFromBirthDate, ageLabel, fmt, fmtInt, toISO } from '../core/format.js'

export function goalLabel(id) {
  return GOAL_TYPES.find((goal) => goal.id === id)?.label ?? 'Поддержание'
}

export function activityLabel(id) {
  return ACTIVITY_LEVELS.find((level) => level.id === id)?.label ?? '—'
}

export function identityBadges(client) {
  const age = ageFromBirthDate(client.birthDate)
  const parts = []
  if (age !== null) parts.push(ageLabel(age))
  parts.push(client.sex === 'male' ? 'мужчина' : 'женщина')
  parts.push(goalLabel(client.goalType))
  return parts.map((part) => badge(part, 'muted')).join('')
}

export function clientPageHead(client, { subtitle = '', actions = '' } = {}) {
  return `<div class="page-head">
    <div>
      <h1>${escape(client.name)}</h1>
      <div class="row" style="margin-top:8px">${identityBadges(client)}</div>
      ${subtitle ? `<p class="subtitle">${escape(subtitle)}</p>` : ''}
    </div>
    <div class="page-actions">${actions}</div>
  </div>`
}

export function targetsPills(targets) {
  if (!targets?.ready) return '<span class="badge tone-warn">Цели не рассчитаны</span>'
  return [
    `${fmtInt(targets.kcal)} ккал`,
    `Б ${fmtInt(targets.protein)} г`,
    `Ж ${fmtInt(targets.fat)} г`,
    `У ${fmtInt(targets.carbs)} г`,
  ].map((label) => `<span class="chip">${escape(label)}</span>`).join('')
}

export function disclaimer() {
  return `<div class="tiny muted" style="margin-top:18px; line-height:1.5">
    NutriDesk — инструмент для планирования и анализа. Расчёты и рекомендации ориентировочные и не заменяют
    консультацию врача, диетолога или лабораторную диагностику. Данные хранятся только на этом устройстве.
  </div>`
}

export function escape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Список находок анализа компактными карточками. */
export function findingList(findings, limit = 4) {
  return findings.slice(0, limit).map((finding) => findingCard(finding)).join('')
}

/** Диалог редактирования клиента. */
export function editClientModal(ctx, client) {
  ctx.openModal({
    title: 'Редактировать клиента',
    body: clientFormHtml(client),
    submitLabel: 'Сохранить',
    wide: true,
    onSubmit(values) {
      ctx.store.updateClient(client.id, parseClientForm(values))
      ctx.toast('Данные клиента обновлены')
      ctx.render()
    },
  })
}

/** Диалог добавления измерения. */
export function measurementModal(ctx, client) {
  ctx.openModal({
    title: 'Новое измерение',
    body: measurementFormHtml(toISO()),
    submitLabel: 'Добавить измерение',
    onSubmit(values) {
      const measurement = parseMeasurement(values)
      if (!measurement.weightKg) {
        ctx.toast('Укажите вес')
        return false
      }
      ctx.store.addMeasurement(client.id, measurement)
      ctx.toast('Измерение добавлено')
      ctx.render()
    },
  })
}

/** Диалог добавления лабораторного показателя. */
export function labModal(ctx, client, selected = 'ferritin') {
  ctx.openModal({
    title: 'Добавить показатель',
    body: labFormHtml(client, toISO(), selected),
    submitLabel: 'Сохранить',
    onSubmit(values) {
      const lab = parseLab(values)
      if (!lab.marker || !Number.isFinite(lab.value)) {
        ctx.toast('Выберите показатель и укажите значение')
        return false
      }
      ctx.store.addLab(client.id, lab)
      ctx.toast('Показатель добавлен')
      ctx.render()
    },
  })
}
export function macroTargetsCard(targets, { current = null } = {}) {
  if (!targets?.ready) return ''
  const rows = [
    ['Калорийность', targets.kcal, current?.kcal, 'ккал'],
    ['Белки', targets.protein, current?.protein, 'г'],
    ['Жиры', targets.fat, current?.fat, 'г'],
    ['Углеводы', targets.carbs, current?.carbs, 'г'],
    ['Клетчатка', targets.fiber, current?.fiber, 'г'],
  ]
  const body = rows.map(([label, target, value, unit]) => {
    const percent = value !== null && value !== undefined ? Math.round((value / target) * 100) : null
    return `<div class="row" style="justify-content:space-between; padding:7px 0; border-bottom:1px dashed var(--line)">
      <span>${label}</span>
      <span class="mono"><b>${fmtInt(target)}</b> ${unit}${percent !== null ? ` <span class="muted tiny">/ ${percent}%</span>` : ''}</span>
    </div>`
  }).join('')
  return section('Цели по макросам', body + `<p class="tiny muted" style="margin-top:10px">Белок ${targets.proteinPerKg.toFixed(2)} г/кг · вода ≈ ${fmtInt(targets.waterMl)} мл/сут</p>`)
}
