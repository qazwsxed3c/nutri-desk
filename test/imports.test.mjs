import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createStore } from '../js/core/store.js'
import { calcTargets, analyzeDiet, lastDays } from '../js/core/nutrition.js'

const MODULES = [
  '../js/data/foods.js',
  '../js/data/labs.js',
  '../js/data/meal-templates.js',
  '../js/core/format.js',
  '../js/core/nutrition.js',
  '../js/core/store.js',
  '../js/ui/charts.js',
  '../js/ui/components.js',
  '../js/ui/forms.js',
  '../js/ui/shared.js',
  '../js/ui/views/clients.js',
  '../js/ui/views/overview.js',
  '../js/ui/views/anamnesis.js',
  '../js/ui/views/results.js',
  '../js/ui/views/diary.js',
  '../js/ui/views/analysis.js',
  '../js/ui/views/labs.js',
  '../js/ui/views/plan.js',
  '../js/ui/views/advice.js',
]

test('все модули приложения импортируются', async () => {
  for (const path of MODULES) {
    const module = await import(path)
    assert.ok(module, path)
  }
})

function fakeStorage() {
  const map = new Map()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  }
}

test('хранилище сеет демо-данные и отдаёт продукты', () => {
  const store = createStore(fakeStorage())
  assert.equal(store.data.clients.length, 2)
  assert.equal(store.seeded, true)
  const anna = store.activeClient()
  assert.ok(anna)
  assert.ok(store.foods().length > 50)
  assert.ok(store.foodsById()['chicken_breast'])
})

test('CRUD клиента, измерений, дневника и анализов', () => {
  const store = createStore(fakeStorage())
  const client = store.addClient({ name: 'Тест', weightKg: 70, heightCm: 170, goalType: 'lose' })
  assert.equal(store.data.clients.length, 3)
  store.updateClient(client.id, { name: 'Тест 2', goalWeightKg: 65 })
  assert.equal(store.clientById(client.id).name, 'Тест 2')

  store.addMeasurement(client.id, { date: '2026-11-01', weightKg: 70, waistCm: 80 })
  assert.equal(store.clientById(client.id).measurements.length, 1)

  store.addLab(client.id, { marker: 'ferritin', value: 20, date: '2026-11-01' })
  assert.equal(store.clientById(client.id).labs.length, 1)

  store.addFoodEntry(client.id, '2026-11-01', 'breakfast', { foodId: 'oats', grams: 60 })
  assert.equal(store.clientById(client.id).foodLog['2026-11-01'].breakfast.length, 1)
  store.updateFoodEntry(client.id, '2026-11-01', 'breakfast', store.clientById(client.id).foodLog['2026-11-01'].breakfast[0].id, { grams: 80 })
  assert.equal(store.clientById(client.id).foodLog['2026-11-01'].breakfast[0].grams, 80)
  store.deleteFoodEntry(client.id, '2026-11-01', 'breakfast', store.clientById(client.id).foodLog['2026-11-01'].breakfast[0].id)
  assert.equal(store.clientById(client.id).foodLog['2026-11-01'], undefined)

  const custom = store.addCustomFood({ name: 'Тестовый продукт', kcal: 100, p: 5, f: 2, c: 10, fiber: 1 })
  assert.ok(store.foodsById()[custom.id])

  const backup = store.exportJson()
  const store2 = createStore(fakeStorage())
  store2.importJson(backup)
  assert.equal(store2.data.clients.length, 3)

  store.deleteClient(client.id)
  assert.equal(store.data.clients.length, 2)
})

test('демо-клиент проходит полный анализ рациона', () => {
  const store = createStore(fakeStorage())
  const client = store.data.clients[0]
  const targets = calcTargets(client)
  assert.equal(targets.ready, true)
  const analysis = analyzeDiet({
    client, targets, foodLog: client.foodLog,
    dates: lastDays(7), foodsById: store.foodsById(), foods: store.foods(),
  })
  assert.equal(analysis.ready, true)
  assert.ok(analysis.daysWithData >= 3)
  assert.ok(analysis.advice.length > 0)
})
