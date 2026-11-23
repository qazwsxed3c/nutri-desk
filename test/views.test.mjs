import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createStore } from '../js/core/store.js'
import { clientsView } from '../js/ui/views/clients.js'
import { overviewView } from '../js/ui/views/overview.js'
import { anamnesisView } from '../js/ui/views/anamnesis.js'
import { resultsView } from '../js/ui/views/results.js'
import { diaryView } from '../js/ui/views/diary.js'
import { analysisView } from '../js/ui/views/analysis.js'
import { labsView } from '../js/ui/views/labs.js'
import { planView } from '../js/ui/views/plan.js'
import { adviceView } from '../js/ui/views/advice.js'

function fakeStorage() {
  const map = new Map()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  }
}

function makeCtx(store, routeName = 'overview', params = {}) {
  const client = store.clientById('client-anna-demo')
  const search = new URLSearchParams(params)
  return {
    store,
    client,
    route: { name: routeName, params: search },
    params: search,
    navigate() {},
    render() {},
    openModal() {},
    closeModal() {},
    toast() {},
  }
}

const VIEWS = [
  ['clients', clientsView, 'clients'],
  ['overview', overviewView, 'overview'],
  ['anamnesis', anamnesisView, 'anamnesis'],
  ['results', resultsView, 'results'],
  ['diary', diaryView, 'diary'],
  ['analysis', analysisView, 'analysis'],
  ['labs', labsView, 'labs'],
  ['plan', planView, 'plan'],
  ['advice', adviceView, 'advice'],
]

test('каждый экран рендерится в корректный HTML', () => {
  const store = createStore(fakeStorage())
  for (const [name, view, routeName] of VIEWS) {
    const ctx = makeCtx(store, routeName)
    const result = view(ctx)
    assert.equal(typeof result.html, 'string', name)
    assert.ok(result.html.length > 800, `${name}: слишком короткий HTML`)
    assert.ok(!/undefined|NaN|\[object Object\]/.test(result.html), `${name}: в HTML попали undefined/NaN`)
  }
})

test('ключевые экраны содержат ожидаемые блоки', () => {
  const store = createStore(fakeStorage())
  const overview = overviewView(makeCtx(store, 'overview')).html
  assert.ok(overview.includes('Динамика веса'))
  assert.ok(overview.includes('Цели по макросам'))
  const anamnesis = anamnesisView(makeCtx(store, 'anamnesis')).html
  assert.ok(anamnesis.includes('Разбор анкеты'))
  assert.ok(anamnesis.includes('data-form="client"'))
  const diary = diaryView(makeCtx(store, 'diary')).html
  assert.ok(diary.includes('Завтрак') && diary.includes('Обед') && diary.includes('Ужин'))
  const analysis = analysisView(makeCtx(store, 'analysis', { period: '7' })).html
  assert.ok(analysis.includes('Микронутриенты'))
  assert.ok(analysis.includes('Что улучшить'))
  const labs = labsView(makeCtx(store, 'labs', { marker: 'ferritin' })).html
  assert.ok(labs.includes('История показателя'))
  assert.ok(labs.includes('Отклонения'))
  const plan = planView(makeCtx(store, 'plan')).html
  assert.ok(plan.includes('Итоги дня и цели'))
  const advice = adviceView(makeCtx(store, 'advice')).html
  assert.ok(advice.includes('Микронутриенты: цель'))
})

test('клиентская страница со списком и пустой стейт', () => {
  const store = createStore(fakeStorage())
  const list = clientsView({ ...makeCtx(store, 'clients'), client: null }).html
  assert.ok(list.includes('Анна К. (демо)'))
  store.mutate((data) => { data.clients = [] })
  const empty = clientsView({ ...makeCtx(store, 'clients'), client: null }).html
  assert.ok(empty.includes('Пока нет клиентов'))
})
