import assert from 'node:assert/strict'
import { test } from 'node:test'

import { BUILTIN_FOODS, FOOD_BY_ID, exclusionTags, foodAllowed, searchFoods } from '../js/data/foods.js'
import { MEAL_TEMPLATES, TEMPLATES_BY_MEAL } from '../js/data/meal-templates.js'
import { LAB_BY_ID, flaggedLabs, labRange, labStatus, labTrend } from '../js/data/labs.js'
import {
  analyzeAnamnesis, analyzeDiet, averageIntake, bmiFor, calcTargets, emptyTotals, foodNutrients,
  generateMealPlan, planToDayEntries, sumDay, sumItems, topSources,
} from '../js/core/nutrition.js'

const foodsById = FOOD_BY_ID

const client = {
  id: 'c1', name: 'Анна', sex: 'female', birthDate: '1994-04-12', heightCm: 168, weightKg: 74,
  goalType: 'lose', goalWeightKg: 66, activity: 'light',
  anamnesis: {
    complaints: ['усталость', 'выпадение волос', 'тяга к сладкому'],
    conditions: [],
    allergies: [],
    intolerances: [],
    dietStyle: 'обычный',
    sleepHours: 6,
    notes: '',
  },
  measurements: [
    { date: '2026-10-01', weightKg: 78, waistCm: 88, wellBeing: 3 },
    { date: '2026-11-20', weightKg: 74, waistCm: 84, wellBeing: 4 },
  ],
}

const day = (entries) => {
  const base = { breakfast: [], lunch: [], dinner: [], snack: [] }
  for (const [meal, items] of Object.entries(entries)) base[meal] = items.map((item, index) => ({ id: `${meal}-${index}`, ...item }))
  return base
}

const demoLog = {
  '2026-11-18': day({
    breakfast: [{ foodId: 'oats', grams: 60 }, { foodId: 'milk', grams: 200 }, { foodId: 'banana', grams: 100 }],
    lunch: [{ foodId: 'chicken_breast', grams: 150 }, { foodId: 'buckwheat', grams: 70 }, { foodId: 'cucumber', grams: 100 }],
    dinner: [{ foodId: 'cod', grams: 180 }, { foodId: 'potato', grams: 200 }, { foodId: 'broccoli', grams: 150 }],
    snack: [{ foodId: 'apple', grams: 150 }],
  }),
  '2026-11-19': day({
    breakfast: [{ foodId: 'eggs', grams: 120 }, { foodId: 'bread_whole', grams: 60 }, { foodId: 'tomato', grams: 100 }],
    lunch: [{ foodId: 'turkey_breast', grams: 150 }, { foodId: 'rice_brown', grams: 70 }, { foodId: 'broccoli', grams: 150 }],
    dinner: [{ foodId: 'lentils', grams: 80 }, { foodId: 'carrot', grams: 100 }, { foodId: 'bread_rye', grams: 40 }],
    snack: [{ foodId: 'kefir', grams: 250 }],
  }),
  '2026-11-20': day({
    breakfast: [{ foodId: 'greek_yogurt', grams: 200 }, { foodId: 'blueberry', grams: 100 }, { foodId: 'chia', grams: 10 }],
    lunch: [{ foodId: 'salmon', grams: 150 }, { foodId: 'quinoa', grams: 70 }, { foodId: 'zucchini', grams: 150 }],
    dinner: [{ foodId: 'chicken_breast', grams: 150 }, { foodId: 'pumpkin', grams: 200 }, { foodId: 'olive_oil', grams: 8 }],
    snack: [{ foodId: 'apple', grams: 150 }],
  }),
}

test('цели считаются для женского профиля с дефицитом', () => {
  const targets = calcTargets(client, { today: '2026-11-23' })
  assert.equal(targets.ready, true)
  assert.equal(targets.age, 32)
  assert.ok(targets.kcal > 1400 && targets.kcal < 2200, `kcal=${targets.kcal}`)
  assert.equal(targets.protein, 148) // 2,0 г/кг × 74 кг
  assert.ok(targets.fat > 40)
  assert.ok(targets.carbs > 80)
  assert.equal(targets.micros.fe, 18)
  assert.equal(targets.micros.ca, 1000)
  assert.equal(targets.bmi, 26.2)
  const macroKcal = targets.protein * 4 + targets.fat * 9 + targets.carbs * 4
  assert.ok(Math.abs(macroKcal - targets.kcal) < 30, `макросы ${macroKcal} vs ${targets.kcal}`)
  assert.ok(targets.proteinPerKg >= 1.6 && targets.proteinPerKg <= 2.2)
})

test('цели корректны для мужчины, набора и гипертонии', () => {
  const male = { ...client, sex: 'male', birthDate: '1988-01-10', weightKg: 90, heightCm: 182, goalType: 'gain' }
  const targets = calcTargets(male, { today: '2026-11-23' })
  assert.ok(targets.protein > 140)
  assert.equal(targets.micros.fe, 8)
  assert.equal(targets.micros.ala, 1.6)
  const hyper = { ...client, anamnesis: { ...client.anamnesis, conditions: ['гипертония 2 ст.'] } }
  const hyperTargets = calcTargets(hyper, { today: '2026-11-23' })
  assert.equal(hyperTargets.micros.na, 1500)
})

test('без роста и веса цели не готовы', () => {
  const targets = calcTargets({ name: 'X' })
  assert.equal(targets.ready, false)
  assert.ok(targets.notes.length > 0)
})

test('анализ анкеты находит жалобы, сон и ИМТ', () => {
  const analysis = analyzeAnamnesis(client)
  const ids = analysis.findings.map((finding) => finding.id)
  for (const expected of ['fatigue', 'hair', 'sugar_craving', 'sleep-hours', 'bmi']) {
    assert.ok(ids.includes(expected), `нет находки ${expected}`)
  }
  assert.equal(analysis.bmiCategory.label, 'избыточный вес')
  const vegan = { ...client, anamnesis: { ...client.anamnesis, dietStyle: 'веган' } }
  assert.ok(analyzeAnamnesis(vegan).findings.some((finding) => finding.id === 'vegan'))
})

test('исключения из анкеты выключают продукты', () => {
  const withAllergy = { ...client, anamnesis: { ...client.anamnesis, allergies: ['орехи'], dietStyle: 'вегетарианское' } }
  const tags = exclusionTags(withAllergy)
  assert.ok(tags.has('nuts'))
  assert.ok(tags.has('meat'))
  assert.equal(foodAllowed(FOOD_BY_ID.walnuts, tags), false)
  assert.equal(foodAllowed(FOOD_BY_ID.chicken_breast, tags), false)
  assert.equal(foodAllowed(FOOD_BY_ID.apple, tags), true)
})

test('дневник суммируется по приёмам пищи', () => {
  const totals = sumDay(demoLog['2026-11-18'], foodsById)
  assert.ok(totals.totals.kcal > 1200)
  assert.ok(totals.totals.protein > 60)
  const breakfast = totals.byMeal.breakfast
  assert.ok(breakfast.kcal > 300)
  const manual = sumItems([{ foodId: 'oats', grams: 100 }], foodsById)
  assert.equal(Math.round(manual.kcal), 380)
  assert.equal(manual.protein, 13)
})

test('среднее потребление делится на число дней с записями', () => {
  const dates = ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']
  const result = averageIntake(demoLog, dates, foodsById)
  assert.equal(result.daysWithData, 3)
  assert.ok(result.average.kcal > 1000)
})

test('анализ рациона возвращает микро-таблицу, флаги и советы', () => {
  const targets = calcTargets(client, { today: '2026-11-23' })
  const labels = client.anamnesis.complaints
  const analysis = analyzeDiet({
    client, targets, foodLog: demoLog,
    dates: ['2026-11-18', '2026-11-19', '2026-11-20'], foodsById, foods: BUILTIN_FOODS,
  })
  assert.equal(analysis.ready, true)
  assert.equal(analysis.daysWithData, 3)
  assert.equal(analysis.micros.length, 10)
  assert.equal(analysis.macroRows.length, 5)
  assert.equal(analysis.mealDistribution.length, 4)
  assert.ok(analysis.advice.length > 0)
  assert.ok(analysis.macroPct.protein > 0 && analysis.macroPct.protein < 100)
  assert.ok(Array.isArray(analysis.topFoods))
  assert.ok(labels.length === 3)
})

test('пустой дневник даёт понятное сообщение', () => {
  const analysis = analyzeDiet({ client, targets: calcTargets(client), foodLog: {}, dates: [], foodsById, foods: BUILTIN_FOODS })
  assert.equal(analysis.ready, false)
  assert.ok(analysis.message.includes('дневник'))
})

test('топ-источники нутриента фильтруют исключения', () => {
  const tags = new Set(['nuts'])
  const sources = topSources('fe', BUILTIN_FOODS, tags, 5)
  assert.ok(sources.length > 0)
  assert.ok(sources.every((entry) => !entry.food.allergens.includes('nuts')))
})

test('все шаблоны ссылаются на существующие продукты', () => {
  for (const template of MEAL_TEMPLATES) {
    for (const item of template.items) {
      assert.ok(foodsById[item.food], `${template.id}: нет продукта ${item.food}`)
      assert.ok(item.grams > 0)
    }
  }
  for (const meal of ['breakfast', 'lunch', 'dinner', 'snack']) {
    assert.ok(TEMPLATES_BY_MEAL[meal].length >= 2, `мало шаблонов для ${meal}`)
  }
})

test('генератор рациона учитывает цели и исключения', () => {
  const targets = calcTargets(client, { today: '2026-11-23' })
  const plan = generateMealPlan({ client, targets, foodsById })
  assert.equal(plan.ready, true)
  assert.equal(plan.meals.length, 4)
  assert.ok(plan.fit >= 50, `fit=${plan.fit}`)
  assert.ok(plan.totals.protein > targets.protein * 0.7)
  assert.ok(plan.totals.kcal > targets.kcal * 0.75)
  assert.ok(plan.meals.every((meal) => meal.items.length > 0))

  const allergyClient = { ...client, anamnesis: { ...client.anamnesis, allergies: ['орехи'] } }
  const allergyPlan = generateMealPlan({ client: allergyClient, targets, foodsById })
  for (const meal of allergyPlan.meals) {
    for (const item of meal.items) {
      const food = foodsById[item.foodId]
      assert.equal(food.allergens.includes('nuts'), false, `${meal.meal}: ${food.name} содержит орехи`)
    }
  }
})

test('план переносится в дневник', () => {
  const targets = calcTargets(client, { today: '2026-11-23' })
  const plan = generateMealPlan({ client, targets, foodsById })
  const dayEntries = planToDayEntries(plan, '2026-11-23')
  assert.ok(dayEntries.breakfast.length > 0)
  assert.ok(dayEntries.lunch.length > 0)
  assert.ok(dayEntries.dinner.length > 0)
  const totals = sumDay(dayEntries, foodsById)
  assert.ok(Math.abs(totals.totals.kcal - plan.totals.kcal) < 5)
})

test('лабораторные статусы, диапазоны и тренды', () => {
  assert.equal(labStatus(14, labRange('ferritin', client)), 'low')
  assert.equal(labStatus(120, labRange('ferritin', client)), 'normal')
  assert.equal(labStatus(6, labRange('glucose', client)), 'high')
  assert.equal(labRange('hemoglobin', { sex: 'male' }).min, 130)
  assert.equal(labRange('hemoglobin', { sex: 'female' }).min, 120)
  const flagged = flaggedLabs([
    { marker: 'ferritin', value: 14, date: '2026-11-01' },
    { marker: 'ferritin', value: 22, date: '2026-10-01' },
    { marker: 'glucose', value: 4.8, date: '2026-11-01' },
  ], client)
  assert.equal(flagged.length, 1)
  assert.equal(flagged[0].marker, 'ferritin')
  assert.equal(labTrend([{ value: 10, date: '2026-01-01' }, { value: 20, date: '2026-02-01' }]), 'up')
  assert.equal(labTrend([{ value: 10, date: '2026-01-01' }]), 'none')
  assert.ok(LAB_BY_ID.hemoglobin)
})

test('поиск продуктов находит по части названия', () => {
  assert.ok(searchFoods('греч').some((food) => food.id === 'buckwheat'))
  assert.ok(searchFoods('кури').some((food) => food.id === 'chicken_breast'))
  assert.equal(searchFoods('').length, BUILTIN_FOODS.length)
})

test('нутриенты продукта масштабируются по граммам', () => {
  const half = foodNutrients(FOOD_BY_ID.oats, 50)
  assert.equal(Math.round(half.kcal), 190)
  assert.equal(half.fiber, 5)
  assert.deepEqual(Object.keys(emptyTotals()).length, 14)
})

test('BMI и границы веса', () => {
  assert.equal(Math.round(bmiFor(74, 168) * 10) / 10, 26.2)
  assert.equal(bmiFor(null, 168), null)
})
