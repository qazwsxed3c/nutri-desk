/** Экран «Клиенты». */
import { badge, button, emptyState, icon } from '../components.js'
import { clientFormHtml, parseClientForm } from '../forms.js'
import { disclaimer, escape } from '../shared.js'
import { analyzeAnamnesis, bmiFor, calcTargets, latestMeasurement } from '../../core/nutrition.js'
import { flaggedLabs } from '../../data/labs.js'
import { ageFromBirthDate, ageLabel, fmt, fmtInt } from '../../core/format.js'

function clientCard(client, ctx) {
  const targets = calcTargets(client)
  const latest = latestMeasurement(client)
  const first = [...client.measurements].sort((a, b) => a.date.localeCompare(b.date))[0]
  const weight = latest?.weightKg ?? client.weightKg
  const bmi = bmiFor(weight, client.heightCm)
  const flagged = flaggedLabs(client.labs, client)
  const anamnesis = analyzeAnamnesis(client)
  const isActive = ctx.store.data.activeClientId === client.id
  const isDemo = String(client.name).includes('(демо)')
  const target = client.goalWeightKg
  const start = first?.weightKg ?? weight
  const progress = start !== target && Number.isFinite(target)
    ? Math.max(0, Math.min(100, ((start - weight) / (start - target)) * 100))
    : 0
  return `<article class="card client-card ${isActive ? 'active' : ''}">
    <div class="client-card-head">
      <div class="avatar">${escape(String(client.name).split(' ').map((part) => part[0] ?? '').slice(0, 2).join('').toUpperCase())}</div>
      <div style="flex:1; min-width:0">
        <div class="client-name">${escape(client.name)} ${isDemo ? badge('демо', 'info') : ''}</div>
        <div class="client-meta">${[
          ageFromBirthDate(client.birthDate) !== null ? ageLabel(ageFromBirthDate(client.birthDate)) : '',
          client.sex === 'male' ? 'муж.' : 'жен.',
          targets.ready ? `цель ${fmtInt(targets.kcal)} ккал` : 'цели не заданы',
        ].filter(Boolean).join(' · ')}</div>
      </div>
    </div>
    <div class="client-stats">
      <div class="client-stat"><b>${fmt(weight, new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }))} кг</b><span>вес</span></div>
      <div class="client-stat"><b>${bmi ? fmt(bmi, new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })) : '—'}</b><span>ИМТ</span></div>
      <div class="client-stat"><b>${Math.round(progress)}%</b><span>к цели</span></div>
    </div>
    <div class="row" style="gap:6px">
      ${flagged.length ? badge(`${flagged.length} отклон. в анализах`, 'warn') : badge('анализы в норме', 'good')}
      ${anamnesis.findings.some((finding) => finding.severity === 'alert') ? badge('есть важные флаги', 'alert') : ''}
      ${targets.ready ? badge(`белок ${fmtInt(targets.protein)} г`, 'muted') : ''}
    </div>
    <div class="client-actions">
      <button class="btn btn-sm btn-primary" data-action="open-client" data-id="${escape(client.id)}">Открыть</button>
      <button class="btn btn-sm" data-action="edit-client" data-id="${escape(client.id)}">${icon('edit', 14)}Изменить</button>
      <button class="btn btn-sm btn-danger" data-action="delete-client" data-id="${escape(client.id)}">${icon('trash', 14)}Удалить</button>
    </div>
  </article>`
}

function newClientModal(ctx) {
  ctx.openModal({
    title: 'Новый клиент',
    body: clientFormHtml({}),
    submitLabel: 'Добавить клиента',
    wide: true,
    onSubmit(values) {
      const patch = parseClientForm(values)
      const client = ctx.store.addClient(patch)
      ctx.toast(`Клиент «${client.name}» добавлен`)
      ctx.navigate('overview')
      ctx.render({ preserveScroll: false })
    },
  })
}

function editClientModal(ctx, client) {
  ctx.openModal({
    title: 'Редактировать клиента',
    body: clientFormHtml(client),
    submitLabel: 'Сохранить',
    wide: true,
    onSubmit(values) {
      ctx.store.updateClient(client.id, parseClientForm(values))
      ctx.toast('Анкета обновлена')
      ctx.render()
    },
  })
}

export function clientsView(ctx) {
  const { store } = ctx
  const clients = store.data.clients
  const total = clients.length
  const withDiary = clients.filter((client) => Object.keys(client.foodLog ?? {}).length > 0).length
  const withLabs = clients.filter((client) => (client.labs ?? []).length > 0).length

  const html = `
    <div class="page-head">
      <div>
        <h1>Клиенты</h1>
        <p class="subtitle">Рабочее пространство нутрициолога: анкеты, дневники, анализы и планы питания.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="new-client">${icon('plus', 16)}Добавить клиента</button>
        <button class="btn" data-action="export">${icon('download', 16)}Резервная копия</button>
        <button class="btn" data-action="import">${icon('upload', 16)}Импорт</button>
      </div>
    </div>
    <div class="grid cols-4" style="margin-bottom:16px">
      <div class="stat"><div class="stat-label">Клиентов</div><div class="stat-value">${total}</div></div>
      <div class="stat"><div class="stat-label">С дневником</div><div class="stat-value">${withDiary}</div></div>
      <div class="stat"><div class="stat-label">С анализами</div><div class="stat-value">${withLabs}</div></div>
      <div class="stat"><div class="stat-label">Демо-данные</div><div class="stat-value">${clients.filter((client) => String(client.name).includes('(демо)')).length}</div><div class="stat-hint">можно удалить в любой момент</div></div>
    </div>
    ${clients.length ? `<div class="client-grid">${clients.map((client) => clientCard(client, ctx)).join('')}</div>
      <div class="row" style="margin-top:16px"><button class="btn" data-action="new-client">${icon('plus', 16)}Добавить ещё клиента</button></div>` :
      emptyState('Пока нет клиентов', 'Создайте первого клиента: заполните анкету, цель и стартовые измерения — приложение рассчитает цели и поможет вести дневник.', `<button class="btn btn-primary" data-action="new-client">${icon('plus', 16)}Добавить клиента</button>`)}
    <div class="card" style="margin-top:16px">
      <div class="card-body row" style="justify-content:space-between">
        <div>
          <b>Демо-режим</b>
          <p class="tiny muted">Загрузить примеры заново или начать с пустого списка.</p>
        </div>
        <div class="row">
          <button class="btn btn-sm" data-action="seed-demo">Загрузить демо-данные</button>
        </div>
      </div>
    </div>
    ${disclaimer()}`

  return {
    html,
    actions: {
      'new-client': () => newClientModal(ctx),
      'edit-client': (element) => {
        const client = store.clientById(element.dataset.id)
        if (client) editClientModal(ctx, client)
      },
      'delete-client': (element) => {
        const client = store.clientById(element.dataset.id)
        if (!client) return
        if (!confirm(`Удалить клиента «${client.name}» и все его данные? Действие необратимо.`)) return
        store.deleteClient(client.id)
        ctx.toast('Клиент удалён')
        ctx.render({ preserveScroll: false })
      },
      'open-client': (element) => {
        store.setActiveClient(element.dataset.id)
        ctx.navigate('overview')
      },
      'seed-demo': () => shellSeedDemo(ctx),
    },
  }
}

function shellSeedDemo(ctx) {
  if (!confirm('Загрузить демонстрационные данные? Текущие данные будут заменены.')) return
  ctx.store.resetDemo()
  ctx.toast('Демо-данные загружены')
  ctx.render({ preserveScroll: false })
}
