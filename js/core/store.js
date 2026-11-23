/**
 * Хранилище приложения: localStorage как единственный источник, версионируемая
 * схема, CRUD-операции и демо-данные для первого запуска.
 */
import { BUILTIN_FOODS } from '../data/foods.js'
import { toISO, addDays, roundTo } from './format.js'

const STORAGE_KEY = 'nutridesk.v1'
const SCHEMA_VERSION = 1
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']

export function newId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`
}

export function emptyClient(overrides = {}) {
  return {
    id: newId('client'),
    name: 'Новый клиент',
    sex: 'female',
    birthDate: '',
    heightCm: 168,
    weightKg: 65,
    goalType: 'maintain',
    goalWeightKg: 65,
    goalDate: addDays(toISO(), 84),
    activity: 'light',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    anamnesis: {
      complaints: [],
      conditions: [],
      medications: '',
      allergies: [],
      intolerances: [],
      dietStyle: 'обычный',
      sleepHours: 7,
      notes: '',
    },
    measurements: [],
    labs: [],
    foodLog: {},
    planSeed: 0,
    ...overrides,
  }
}

function day(entries) {
  const base = { breakfast: [], lunch: [], dinner: [], snack: [] }
  for (const [meal, items] of Object.entries(entries)) {
    base[meal] = items.map((item, index) => ({
      id: `${meal}-${index}`,
      foodId: item.foodId,
      grams: item.grams,
      source: 'demo',
    }))
  }
  return base
}

/** Демонстрационные клиенты: наполняют интерфейс при первом запуске. */
export function seedDemo() {
  const today = toISO()
  const anna = emptyClient({
    id: 'client-anna-demo',
    name: 'Анна К. (демо)',
    sex: 'female',
    birthDate: '1994-04-12',
    heightCm: 168,
    weightKg: 73.8,
    goalType: 'lose',
    goalWeightKg: 66,
    goalDate: addDays(today, 112),
    activity: 'light',
    anamnesis: {
      complaints: ['усталость и низкая энергия', 'выпадение волос', 'тяга к сладкому', 'запоры'],
      conditions: ['инсулинорезистентность'],
      medications: 'Витамин D 2000 МЕ (по назначению врача)',
      allergies: ['орехи'],
      intolerances: ['лактоза'],
      dietStyle: 'обычный',
      sleepHours: 6,
      notes: 'Работа в офисе, 2 силовые тренировки в неделю. Сладкое вечером.',
    },
    measurements: [
      { id: newId('m'), date: addDays(today, -49), weightKg: 78.4, waistCm: 89, bodyFatPct: 34.5, wellBeing: 3, note: 'старт' },
      { id: newId('m'), date: addDays(today, -35), weightKg: 77.1, waistCm: 88, bodyFatPct: 34, wellBeing: 3, note: '' },
      { id: newId('m'), date: addDays(today, -21), weightKg: 75.6, waistCm: 86, bodyFatPct: 32.8, wellBeing: 4, note: 'легче вечером' },
      { id: newId('m'), date: addDays(today, -7), weightKg: 74.2, waistCm: 84.5, bodyFatPct: 31.9, wellBeing: 4, note: '' },
      { id: newId('m'), date: addDays(today, -1), weightKg: 73.8, waistCm: 84, bodyFatPct: 31.5, wellBeing: 4, note: 'сон лучше' },
    ],
    labs: [
      { id: newId('lab'), marker: 'ferritin', value: 12, date: addDays(today, -70) },
      { id: newId('lab'), marker: 'ferritin', value: 15, date: addDays(today, -35) },
      { id: newId('lab'), marker: 'ferritin', value: 22, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'hemoglobin', value: 114, date: addDays(today, -70) },
      { id: newId('lab'), marker: 'hemoglobin', value: 122, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'vitamin_d', value: 17, date: addDays(today, -70) },
      { id: newId('lab'), marker: 'vitamin_d', value: 26, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'glucose', value: 5.4, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'hba1c', value: 5.6, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'cholesterol', value: 5.6, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'ldl', value: 3.5, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'hdl', value: 1.15, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'triglycerides', value: 1.4, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'tsh', value: 2.1, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'b12', value: 310, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'folate', value: 8, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'magnesium', value: 0.78, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'calcium', value: 2.32, date: addDays(today, -3) },
      { id: newId('lab'), marker: 'crp', value: 2.4, date: addDays(today, -3) },
    ],
    foodLog: {
      [addDays(today, -2)]: day({
        breakfast: [{ foodId: 'oats', grams: 60 }, { foodId: 'kefir', grams: 200 }, { foodId: 'banana', grams: 100 }],
        lunch: [{ foodId: 'chicken_breast', grams: 140 }, { foodId: 'buckwheat', grams: 70 }, { foodId: 'cucumber', grams: 120 }, { foodId: 'olive_oil', grams: 8 }],
        dinner: [{ foodId: 'cod', grams: 180 }, { foodId: 'potato', grams: 200 }, { foodId: 'broccoli', grams: 150 }],
        snack: [{ foodId: 'apple', grams: 160 }, { foodId: 'dark_chocolate', grams: 20 }],
      }),
      [addDays(today, -1)]: day({
        breakfast: [{ foodId: 'eggs', grams: 120 }, { foodId: 'bread_whole', grams: 60 }, { foodId: 'tomato', grams: 100 }],
        lunch: [{ foodId: 'turkey_breast', grams: 150 }, { foodId: 'rice_brown', grams: 70 }, { foodId: 'zucchini', grams: 150 }, { foodId: 'olive_oil', grams: 8 }],
        dinner: [{ foodId: 'lentils', grams: 80 }, { foodId: 'carrot', grams: 100 }, { foodId: 'spinach', grams: 80 }, { foodId: 'bread_rye', grams: 40 }],
        snack: [{ foodId: 'greek_yogurt', grams: 150 }, { foodId: 'blueberry', grams: 100 }],
      }),
      [today]: day({
        breakfast: [{ foodId: 'greek_yogurt', grams: 200 }, { foodId: 'oats', grams: 40 }, { foodId: 'blueberry', grams: 80 }, { foodId: 'chia', grams: 10 }],
        lunch: [{ foodId: 'salmon', grams: 120 }, { foodId: 'quinoa', grams: 60 }, { foodId: 'broccoli', grams: 150 }, { foodId: 'olive_oil', grams: 6 }],
        dinner: [{ foodId: 'chicken_breast', grams: 150 }, { foodId: 'pumpkin', grams: 200 }, { foodId: 'green_peas', grams: 80 }],
        snack: [{ foodId: 'apple', grams: 150 }, { foodId: 'almonds', grams: 10 }],
      }),
    },
  })

  const igor = emptyClient({
    id: 'client-igor-demo',
    name: 'Игорь М. (демо)',
    sex: 'male',
    birthDate: '1989-08-03',
    heightCm: 182,
    weightKg: 87.4,
    goalType: 'gain',
    goalWeightKg: 94,
    goalDate: addDays(today, 140),
    activity: 'moderate',
    anamnesis: {
      complaints: ['плохой сон'],
      conditions: [],
      medications: '',
      allergies: [],
      intolerances: [],
      dietStyle: 'обычный',
      sleepHours: 6.5,
      notes: 'Тренировки 4 раза в неделю, хочет набрать мышечную массу.',
    },
    measurements: [
      { id: newId('m'), date: addDays(today, -42), weightKg: 86.2, waistCm: 92, bodyFatPct: 22, wellBeing: 4, note: '' },
      { id: newId('m'), date: addDays(today, -14), weightKg: 87.4, waistCm: 92, bodyFatPct: 21.4, wellBeing: 4, note: '' },
    ],
    labs: [
      { id: newId('lab'), marker: 'vitamin_d', value: 24, date: addDays(today, -10) },
      { id: newId('lab'), marker: 'testosterone', value: 18, date: addDays(today, -10) },
      { id: newId('lab'), marker: 'glucose', value: 5.1, date: addDays(today, -10) },
    ],
  })

  return {
    version: SCHEMA_VERSION,
    activeClientId: anna.id,
    clients: [anna, igor],
    customFoods: [],
  }
}

function normalizeData(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.clients)) return null
  const data = {
    version: SCHEMA_VERSION,
    activeClientId: raw.activeClientId ?? raw.clients[0]?.id ?? null,
    clients: raw.clients.map((client) => ({
      ...emptyClient(),
      ...client,
      anamnesis: { ...emptyClient().anamnesis, ...(client.anamnesis ?? {}) },
      measurements: Array.isArray(client.measurements) ? client.measurements : [],
      labs: Array.isArray(client.labs) ? client.labs : [],
      foodLog: client.foodLog && typeof client.foodLog === 'object' ? client.foodLog : {},
      planSeed: Number(client.planSeed) || 0,
    })),
    customFoods: Array.isArray(raw.customFoods) ? raw.customFoods : [],
  }
  if (!data.clients.some((client) => client.id === data.activeClientId)) {
    data.activeClientId = data.clients[0]?.id ?? null
  }
  return data
}

export function createStore(storage = globalThis.localStorage) {
  let data = null
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    data = raw ? normalizeData(JSON.parse(raw)) : null
  } catch {
    data = null
  }
  let seeded = false
  if (!data) {
    data = seedDemo()
    seeded = true
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* приватный режим */ }
  }

  const save = () => {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* игнорируем переполнение */ }
  }

  const allFoods = () => [...BUILTIN_FOODS, ...data.customFoods]
  const foodsById = () => Object.fromEntries(allFoods().map((food) => [food.id, food]))

  const store = {
    get data() { return data },
    get seeded() { return seeded },
    foods: allFoods,
    foodsById,
    save,
    mutate(fn) {
      const result = fn(data)
      save()
      return result
    },
    activeClient() {
      return data.clients.find((client) => client.id === data.activeClientId) ?? null
    },
    clientById(id) {
      return data.clients.find((client) => client.id === id) ?? null
    },
    setActiveClient(id) {
      if (data.clients.some((client) => client.id === id)) {
        data.activeClientId = id
        save()
      }
    },
    addClient(overrides) {
      const client = emptyClient(overrides)
      data.clients.push(client)
      data.activeClientId = client.id
      save()
      return client
    },
    updateClient(id, patch) {
      const client = store.clientById(id)
      if (!client) return null
      Object.assign(client, patch, { updatedAt: new Date().toISOString() })
      if (patch.anamnesis) client.anamnesis = { ...client.anamnesis, ...patch.anamnesis }
      save()
      return client
    },
    deleteClient(id) {
      data.clients = data.clients.filter((client) => client.id !== id)
      if (data.activeClientId === id) data.activeClientId = data.clients[0]?.id ?? null
      save()
    },
    addMeasurement(clientId, measurement) {
      const client = store.clientById(clientId)
      if (!client) return
      client.measurements.push({ id: newId('m'), ...measurement })
      client.measurements.sort((a, b) => a.date.localeCompare(b.date))
      if (measurement.weightKg) client.weightKg = Number(measurement.weightKg)
      save()
    },
    addLab(clientId, lab) {
      const client = store.clientById(clientId)
      if (!client) return
      client.labs.push({ id: newId('lab'), ...lab })
      client.labs.sort((a, b) => a.date.localeCompare(b.date))
      save()
    },
    deleteLab(clientId, labId) {
      const client = store.clientById(clientId)
      if (!client) return
      client.labs = client.labs.filter((lab) => lab.id !== labId)
      save()
    },
    addFoodEntry(clientId, date, meal, entry) {
      const client = store.clientById(clientId)
      if (!client) return
      if (!client.foodLog[date]) client.foodLog[date] = { breakfast: [], lunch: [], dinner: [], snack: [] }
      client.foodLog[date][meal].push({ id: newId('entry'), ...entry })
      save()
    },
    updateFoodEntry(clientId, date, meal, entryId, patch) {
      const client = store.clientById(clientId)
      const entry = client?.foodLog?.[date]?.[meal]?.find((item) => item.id === entryId)
      if (!entry) return
      Object.assign(entry, patch)
      save()
    },
    deleteFoodEntry(clientId, date, meal, entryId) {
      const client = store.clientById(clientId)
      if (!client?.foodLog?.[date]?.[meal]) return
      client.foodLog[date][meal] = client.foodLog[date][meal].filter((item) => item.id !== entryId)
      if (MEALS.every((key) => client.foodLog[date][key].length === 0)) delete client.foodLog[date]
      save()
    },
    setDay(clientId, date, dayData) {
      const client = store.clientById(clientId)
      if (!client) return
      const empty = MEALS.every((meal) => (dayData?.[meal] ?? []).length === 0)
      if (empty) delete client.foodLog[date]
      else client.foodLog[date] = dayData
      save()
    },
    addCustomFood(food) {
      const next = { id: newId('food'), cat: 'other', ...food }
      data.customFoods.push(next)
      save()
      return next
    },
    exportJson() {
      return JSON.stringify(data, null, 2)
    },
    importJson(text) {
      const parsed = normalizeData(JSON.parse(text))
      if (!parsed) throw new Error('Файл не похож на резервную копию NutriDesk')
      data = parsed
      save()
    },
    resetDemo() {
      data = seedDemo()
      save()
    },
    clearAll() {
      data = { version: SCHEMA_VERSION, activeClientId: null, clients: [], customFoods: [] }
      save()
    },
    roundGrams(value) {
      return roundTo(value, 1)
    },
  }
  return store
}

export { STORAGE_KEY, SCHEMA_VERSION, MEALS }
