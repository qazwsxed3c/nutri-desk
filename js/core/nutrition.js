/**
 * Ядро питания: расчёт целей, анализ анкеты, агрегация дневника,
 * микронутриентный анализ, рекомендации и генерация примерного рациона.
 * Модуль чистый: не обращается к DOM и хранилищу.
 */
import { ageFromBirthDate, clamp, roundTo, toISO, addDays } from './format.js'
import { exclusionTags, foodAllowed, ALLERGEN_LABELS } from '../data/foods.js'
import { MEAL_ENERGY_SHARE, MEAL_LABELS, TEMPLATES_BY_MEAL } from '../data/meal-templates.js'

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Сидячий образ жизни', factor: 1.2, hint: 'офис, мало движения' },
  { id: 'light', label: 'Небольшая активность', factor: 1.375, hint: '1–3 тренировки в неделю' },
  { id: 'moderate', label: 'Средняя активность', factor: 1.55, hint: '3–5 тренировок в неделю' },
  { id: 'high', label: 'Высокая активность', factor: 1.725, hint: '6–7 тренировок в неделю' },
  { id: 'very_high', label: 'Очень высокая активность', factor: 1.9, hint: 'физическая работа + тренировки' },
]

export const GOAL_TYPES = [
  { id: 'lose', label: 'Снижение веса', adjust: 0.85 },
  { id: 'maintain', label: 'Поддержание веса', adjust: 1 },
  { id: 'gain', label: 'Набор массы', adjust: 1.1 },
]

export const NUTRIENT_KEYS = ['kcal', 'protein', 'fat', 'carbs', 'fiber', 'na', 'ca', 'fe', 'mg', 'k', 'vc', 'b12', 'folate', 'ala']

export const NUTRIENT_META = {
  kcal: { label: 'Калорийность', unit: 'ккал' },
  protein: { label: 'Белки', unit: 'г' },
  fat: { label: 'Жиры', unit: 'г' },
  carbs: { label: 'Углеводы', unit: 'г' },
  fiber: { label: 'Клетчатка', unit: 'г' },
  na: { label: 'Натрий', unit: 'мг' },
  ca: { label: 'Кальций', unit: 'мг' },
  fe: { label: 'Железо', unit: 'мг' },
  mg: { label: 'Магний', unit: 'мг' },
  k: { label: 'Калий', unit: 'мг' },
  vc: { label: 'Витамин C', unit: 'мг' },
  b12: { label: 'Витамин B12', unit: 'мкг' },
  folate: { label: 'Фолат', unit: 'мкг' },
  ala: { label: 'Омега-3 (ALA)', unit: 'г' },
}

export const MICRO_META = [
  { key: 'ca', label: 'Кальций', unit: 'мг', kind: 'min' },
  { key: 'fe', label: 'Железо', unit: 'мг', kind: 'min' },
  { key: 'mg', label: 'Магний', unit: 'мг', kind: 'min' },
  { key: 'k', label: 'Калий', unit: 'мг', kind: 'min' },
  { key: 'vc', label: 'Витамин C', unit: 'мг', kind: 'min' },
  { key: 'b12', label: 'Витамин B12', unit: 'мкг', kind: 'min' },
  { key: 'folate', label: 'Фолат', unit: 'мкг', kind: 'min' },
  { key: 'ala', label: 'Омега-3 (ALA)', unit: 'г', kind: 'min' },
  { key: 'fiber', label: 'Клетчатка', unit: 'г', kind: 'min' },
  { key: 'na', label: 'Натрий', unit: 'мг', kind: 'max' },
]

export function emptyTotals() {
  const totals = {}
  for (const key of NUTRIENT_KEYS) totals[key] = 0
  return totals
}

export function bmiFor(weightKg, heightCm) {
  const weight = Number(weightKg)
  const height = Number(heightCm)
  if (!(weight > 0) || !(height > 0)) return null
  return weight / (height / 100) ** 2
}

export function bmiCategory(bmi) {
  if (bmi === null) return { label: 'нет данных', tone: 'muted' }
  if (bmi < 18.5) return { label: 'недостаток веса', tone: 'warn' }
  if (bmi < 25) return { label: 'норма', tone: 'good' }
  if (bmi < 30) return { label: 'избыточный вес', tone: 'warn' }
  return { label: 'ожирение', tone: 'alert' }
}

/** Соответствие полей справочника продуктов ключам нутриентов. */
export const FOOD_FIELD = { kcal: 'kcal', protein: 'p', fat: 'f', carbs: 'c', fiber: 'fiber', na: 'na', ca: 'ca', fe: 'fe', mg: 'mg', k: 'k', vc: 'vc', b12: 'b12', folate: 'folate', ala: 'ala' }

/** Энергия и нутриенты одного продукта на заданную массу. */
export function foodNutrients(food, grams) {
  const factor = Number(grams) / 100
  const nutrients = {}
  for (const key of NUTRIENT_KEYS) nutrients[key] = (Number(food?.[FOOD_FIELD[key]]) || 0) * factor
  return nutrients
}

export function addNutrients(target, source, factor = 1) {
  for (const key of NUTRIENT_KEYS) target[key] += (Number(source?.[key]) || 0) * factor
  return target
}

export function sumItems(items, foodsById) {
  const totals = emptyTotals()
  for (const item of items ?? []) {
    const food = foodsById[item.foodId ?? item.food]
    if (!food) continue
    addNutrients(totals, foodNutrients(food, item.grams))
  }
  return totals
}

export function sumDay(day, foodsById) {
  const totals = emptyTotals()
  const byMeal = {}
  for (const meal of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const mealTotals = sumItems(day?.[meal] ?? [], foodsById)
    byMeal[meal] = mealTotals
    for (const key of NUTRIENT_KEYS) totals[key] += mealTotals[key]
  }
  return { totals, byMeal }
}

/** Цели по энергии, макросам, микронутриентам и воде. */
export function calcTargets(client, options = {}) {
  const weight = Number(client?.weightKg)
  const height = Number(client?.heightCm)
  const today = options.today ?? toISO()
  const age = ageFromBirthDate(client?.birthDate, today) ?? Number(client?.age) ?? 35
  const sex = client?.sex === 'male' ? 'male' : 'female'
  const goal = GOAL_TYPES.find((entry) => entry.id === client?.goalType) ?? GOAL_TYPES[1]
  const activity = ACTIVITY_LEVELS.find((entry) => entry.id === client?.activity) ?? ACTIVITY_LEVELS[0]
  const notes = []

  if (!(weight > 0) || !(height > 0)) {
    return { ready: false, notes: ['Заполните рост и текущий вес в анкете, чтобы рассчитать цели.'] }
  }

  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161)
  const tdee = bmr * activity.factor
  let kcal = tdee * goal.adjust
  const floor = sex === 'male' ? 1500 : 1200
  if (kcal < floor) {
    kcal = floor
    notes.push(`Калорийность поднята до безопасного минимума (${floor} ккал).`)
  }
  if (client?.goalType === 'lose') notes.push('Дефицит 15% от расхода — умеренный темп снижения веса.')
  if (client?.goalType === 'gain') notes.push('Профицит 10% от расхода — плавный набор массы.')

  const proteinPerKg = client?.goalType === 'lose' ? 2.0 : client?.goalType === 'gain' ? 1.8 : 1.6
  let protein = proteinPerKg * weight
  const proteinCap = (0.4 * kcal) / 4
  if (protein > proteinCap) {
    protein = proteinCap
    notes.push('Белок ограничен 40% калорийности — иначе не останется места жирам и углеводам.')
  }
  const fatPerKg = client?.goalType === 'lose' ? 0.8 : 0.9
  let fat = fatPerKg * weight
  const minFat = (0.2 * kcal) / 9
  if (fat < minFat) {
    fat = minFat
    notes.push('Жиры подняты до 20% калорийности — минимум для гормональной функции.')
  }
  let carbs = (kcal - protein * 4 - fat * 9) / 4
  if (carbs < 80) {
    carbs = 80
    fat = Math.max(fat - ((kcal - protein * 4 - carbs * 4 - fat * 9) / 9), minFat)
    notes.push('Углеводы не опускаются ниже 80 г/сут.')
  }

  const fiber = clamp((14 * kcal) / 1000, 25, 45)
  const micros = {
    ca: age >= 50 ? 1200 : 1000,
    fe: sex === 'female' ? (age <= 50 ? 18 : 8) : 8,
    mg: sex === 'female' ? 320 : 400,
    k: 3500,
    vc: 90,
    b12: 2.4,
    folate: 400,
    ala: sex === 'female' ? 1.1 : 1.6,
    fiber,
    na: 2000,
  }
  if (client?.anamnesis?.conditions?.some((condition) => /гипертон|давлен/i.test(condition))) {
    micros.na = 1500
    notes.push('Натрий ограничен 1500 мг/сут из-за гипертонии (мягкий вариант DASH).')
  }
  const waterMl = Math.round((weight * 30) / 50) * 50
  const bmi = bmiFor(weight, height)
  const macrosPct = {
    protein: (protein * 4 * 100) / kcal,
    fat: (fat * 9 * 100) / kcal,
    carbs: (carbs * 4 * 100) / kcal,
  }

  return {
    ready: true,
    age, sex, goal, activity,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
    fiber: Math.round(fiber),
    waterMl,
    micros,
    proteinPerKg: +(protein / weight).toFixed(2),
    fatPerKg: +(fat / weight).toFixed(2),
    macrosPct,
    bmi: bmi === null ? null : +bmi.toFixed(1),
    notes,
  }
}

/* ------------------------------------------------------------------ анкета */

const COMPLAINT_RULES = [
  {
    id: 'fatigue', title: 'Усталость и низкая энергия', severity: 'warn',
    keywords: ['устал', 'слабост', 'сонлив', 'энерги', 'нет сил', 'апати'],
    detail: 'Часто связаны с дефицитом железа, B12/фолата, витамина D, недосыпом или слишком большим дефицитом калорий.',
    action: 'Проверить ферритин, B12, фолат, витамин D; оценить сон и адекватность калорийности.',
  },
  {
    id: 'hair', title: 'Волосы и ногти', severity: 'warn',
    keywords: ['волос', 'ногт', 'выпаден', 'ломкост'],
    detail: 'Белок, железо (ферритин), цинк и B12 — частые причины ухудшения состояния волос и ногтей.',
    action: 'Контролировать белок ≥1,6 г/кг, ферритин, B12; при выпадении — к трихологу/терапевту.',
  },
  {
    id: 'sugar_craving', title: 'Тяга к сладкому', severity: 'warn',
    keywords: ['сладк', 'тяга', 'переедан', 'срыв', 'аппетит'],
    detail: 'Часто усиливается при дефиците белка и клетчатки, нерегулярных приёмах пищи и качелях глюкозы.',
    action: 'Добавить белок и клетчатку в каждый приём пищи, не пропускать завтрак, убрать «жидкие» калории.',
  },
  {
    id: 'sleep', title: 'Сон и тревожность', severity: 'info',
    keywords: ['бессонн', 'сон', 'тревог', 'стресс', 'нервн'],
    detail: 'Качество сна влияет на аппетит, вес и восстановление; кофеин после обеда и поздние приёмы пищи мешают.',
    action: 'Ограничить кофеин после 14:00, стабильный режим сна, магний и вечерний белок в рационе.',
  },
  {
    id: 'digest', title: 'Пищеварение', severity: 'warn',
    keywords: ['вздут', 'живот', 'жкт', 'запор', 'понос', 'рефлюкс', 'изжог', 'газ'],
    detail: 'Резкое увеличение клетчатки, недостаток воды и FODMAP-продукты могут усиливать симптомы.',
    action: 'Повышать клетчатку постепенно, вода ≥30 мл/кг; при стойких симптомах — гастроэнтеролог.',
  },
  {
    id: 'edema', title: 'Отёки', severity: 'warn',
    keywords: ['отёк', 'отек', 'отечн', 'вода задерж'],
    detail: 'Натрий, калий, белок и общий объём жидкости влияют на задержку воды; исключить медицинские причины.',
    action: 'Снизить натрий, повысить калий (овощи, бобовые), проверить белок и давление.',
  },
  {
    id: 'immunity', title: 'Частые простуды', severity: 'info',
    keywords: ['простуд', 'иммун', 'болею', 'орви'],
    detail: 'Витамин C, D, цинк, белок и сон — основа иммунной поддержки.',
    action: 'Проверить витамин D и ферритин, обеспечить белок и овощи/фрукты ежедневно.',
  },
  {
    id: 'pain', title: 'Мышечные боли и судороги', severity: 'info',
    keywords: ['мышц', 'судорог', 'спазм', 'боль в тел', 'судорог'],
    detail: 'Магний, калий, кальций и витамин D участвуют в мышечном сокращении; возможен дефицит на дефиците калорий.',
    action: 'Проверить магний, витамин D; добавить орехи, бобовые, зелень, молочные продукты.',
  },
]

const CONDITION_RULES = [
  {
    id: 'diabetes', title: 'Нарушения углеводного обмена', severity: 'alert', keywords: ['диабет', 'инсулинорезист', 'преддиабет', 'глюкоз'],
    detail: 'Требуется контроль порций углеводов, клетчатки, распределения по приёмам пищи и регулярность питания.',
    action: 'Распределить углеводы равномерно, выбирать цельные крупы и бобовые, минимизировать добавленный сахар. Контроль — с врачом.',
  },
  {
    id: 'hypertension', title: 'Повышенное давление', severity: 'warn', keywords: ['гипертон', 'давлен', 'гипертенз'],
    detail: 'Снижение натрия, повышение калия и вес снижают давление; рацион в духе DASH.',
    action: 'Натрий ≤1500–2000 мг, больше овощей, бобовых и молочных продуктов; контроль у врача.',
  },
  {
    id: 'kidney', title: 'Болезни почек', severity: 'alert', keywords: ['почк', 'почечн', 'хбп'],
    detail: 'Ограничение белка, калия и фосфора индивидуально; самодеятельность в питании здесь опасна.',
    action: 'Согласовать белок и калий с нефрологом; приложение лишь ориентир, не замена консультации.',
  },
  {
    id: 'gastro', title: 'Заболевания ЖКТ', severity: 'alert', keywords: ['гастрит', 'язв', 'колит', 'крона', 'целиак', 'рефлюкс', 'срк'],
    detail: 'Рацион требует индивидуального подбора: исключения, мягкие способы готовки, постепенное введение клетчатки.',
    action: 'Учесть исключения в анкете, не назначать жёсткие ограничения без врача.',
  },
  {
    id: 'thyroid', title: 'Щитовидная железа', severity: 'info', keywords: ['щитовид', 'тиреоид', 'ттг', 'гипотиреоз'],
    detail: 'При гипотиреозе важен достаточный белок, йод и селен; интерпретация ТТГ — врачебная.',
    action: 'Обсудить с эндокринологом; проверить ТТГ, ферритин, B12 и витамин D.',
  },
  {
    id: 'pcos', title: 'СПКЯ / гормональный фон', severity: 'info', keywords: ['спкя', 'поликистоз', 'гормон'],
    detail: 'Клетчатка, белок, силовые тренировки и стабильный уровень глюкозы помогают управлять симптомами.',
    action: 'Равномерные приёмы пищи, белок ≥1,6 г/кг, умеренный дефицит; наблюдение у эндокринолога.',
  },
  {
    id: 'pregnancy', title: 'Беременность / лактация', severity: 'alert', keywords: ['беремен', 'лактац', 'кормлю', 'грудн'],
    detail: 'Повышенные потребности в фолате, железе, кальции и йоде; дефицит калорий недопустим без врача.',
    action: 'Фолат 400–600 мкг, железо по анализам, кальций 1000 мг; ведение совместно с врачом.',
  },
]

function matchesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword))
}

/** Анализ анкеты: находки и рекомендации по дообследованию/рациону. */
export function analyzeAnamnesis(client) {
  const anamnesis = client?.anamnesis ?? {}
  const complaints = (anamnesis.complaints ?? []).join(' ').toLowerCase()
  const conditions = (anamnesis.conditions ?? []).join(' ').toLowerCase()
  const notes = (anamnesis.notes ?? '').toLowerCase()
  const text = [complaints, conditions, notes].join(' ')
  const findings = []
  const add = (finding) => {
    if (!findings.some((item) => item.id === finding.id)) findings.push(finding)
  }

  for (const rule of COMPLAINT_RULES) {
    if (matchesAny(complaints || text, rule.keywords)) add({ ...rule })
  }
  for (const rule of CONDITION_RULES) {
    if (matchesAny(conditions, rule.keywords)) add({ ...rule })
  }

  const dietStyle = String(anamnesis.dietStyle ?? '').toLowerCase()
  if (dietStyle.includes('веган')) {
    add({
      id: 'vegan', title: 'Веганский рацион', severity: 'warn',
      detail: 'Обязательны B12 (добавка), железо с витамином C, омега-3 (ALA/водорослевое масло) и достаточный белок из бобовых/сои.',
      action: 'B12 25–100 мкг/сут или инъекции по назначению врача; железо+витамин C; омега-3 из водорослей.',
    })
  } else if (dietStyle.includes('вегетариан')) {
    add({
      id: 'vegetarian', title: 'Вегетарианский рацион', severity: 'info',
      detail: 'Следить за B12 (часто дефицит), железом, цинком и белком (яйца/творог/бобовые/соя).',
      action: 'Проверить B12 раз в год, сочетать бобовые с витамином C, следить за белком 1,6 г/кг.',
    })
  }

  const bmi = bmiFor(client?.weightKg, client?.heightCm)
  const category = bmiCategory(bmi)
  if (bmi !== null) {
    add({
      id: 'bmi', title: `ИМТ ${bmi.toFixed(1)} — ${category.label}`, severity: category.tone === 'alert' ? 'alert' : category.tone === 'warn' ? 'warn' : 'info',
      detail: bmi < 18.5
        ? 'Недостаток веса повышает риск дефицитов; нужен мягкий профицит калорий и проверка причин.'
        : bmi < 25
          ? 'ИМТ в пределах нормы — можно работать над качеством состава тела и привычками.'
          : 'Избыток веса связан с рисками метаболических нарушений; снижение на 5–10% уже даёт эффект.',
      action: bmi < 18.5
        ? 'Оценить питание на дефицит белка и энергии, проверить общий анализ крови и ферритин.'
        : bmi < 25
          ? 'Поддерживать текущий вес, белок 1,6 г/кг, силовые 2–3 раза в неделю.'
          : 'Дефицит 15% калорийности, белок 1,6–2,0 г/кг, контроль анализов и давления.',
    })
  }

  const waist = Number(client?.measurements?.at(-1)?.waistCm)
  if (waist > 0) {
    const risky = client?.sex === 'male' ? waist >= 94 : waist >= 80
    if (risky) {
      add({
        id: 'waist', title: `Окружность талии ${waist} см`, severity: 'warn',
        detail: 'Жировые отложения в области живота связаны с инсулинорезистентностью и сердечно-сосудистым риском.',
        action: 'Снижение веса и силовые тренировки; проверка глюкозы, HbA1c и липидного профиля.',
      })
    }
  }

  const goalWeight = Number(client?.goalWeightKg)
  const weightNow = Number(client?.weightKg)
  if (goalWeight > 0 && weightNow > 0) {
    const targetBmi = bmiFor(goalWeight, client?.heightCm)
    if (targetBmi !== null && (targetBmi < 18.5 || targetBmi > 30)) {
      add({
        id: 'goal-bmi', title: 'Целевой вес требует внимания', severity: 'warn',
        detail: `Целевой вес ${goalWeight} кг соответствует ИМТ ${targetBmi.toFixed(1)} — это вне безопасного диапазона 18,5–25.`,
        action: 'Согласовать реалистичную цель и сроки; резкое изменение веса может навредить.',
      })
    }
    if (client?.goalDate) {
      const weeks = (new Date(client.goalDate) - new Date(toISO())) / (7 * 86400000)
      const rate = (weightNow - goalWeight) / Math.max(weeks, 0.1)
      if (Math.abs(rate) > Math.max(0.5, weightNow * 0.01) && Math.sign(weightNow - goalWeight) === Math.sign(rate)) {
        add({
          id: 'goal-rate', title: 'Слишком быстрый темп цели', severity: 'warn',
          detail: `Для цели ${goalWeight} кг к ${client.goalDate} нужно ${Math.abs(rate).toFixed(2)} кг/нед — это быстрее безопасного темпа.`,
          action: 'Сдвинуть срок или цель: комфортно 0,3–0,8 кг/нед (до 1% массы тела).',
        })
      }
    }
  }

  const sleep = Number(anamnesis.sleepHours)
  if (sleep > 0 && sleep < 7) {
    add({
      id: 'sleep-hours', title: `Сон ${sleep} ч — меньше рекомендуемого`, severity: 'warn',
      detail: 'Недостаток сна повышает аппетит, ухудшает восстановление и чувствительность к инсулину.',
      action: 'Цель 7–9 ч, стабильное время подъёма, кофеин до 14:00, ограничить экраны перед сном.',
    })
  }

  const tags = exclusionTags(client)
  if (tags.size > 0) {
    add({
      id: 'exclusions', title: 'Исключения в рационе учтены', severity: 'info',
      detail: `При генерации рациона исключаются: ${[...tags].map((tag) => ALLERGEN_LABELS[tag] ?? tag).join(', ')}.`,
      action: 'Проверьте, что у клиента нет перекрёстных реакций и скрытых источников этих продуктов.',
    })
  }

  if (findings.length === 0) {
    add({
      id: 'ok', title: 'Критичных красных флагов в анкете нет', severity: 'info',
      detail: 'Продолжайте сбор данных: 3–7 дней дневника питания и базовые анализы дадут более точную картину.',
      action: 'Заполните дневник и внесите анализы, чтобы анализ рациона стал точнее.',
    })
  }

  const order = { alert: 0, warn: 1, info: 2 }
  findings.sort((a, b) => order[a.severity] - order[b.severity])
  return { findings, bmi, bmiCategory: category, tags }
}

/* ---------------------------------------------------------------- дневник */

export function recordedDates(foodLog) {
  return Object.keys(foodLog ?? {}).filter((date) => {
    const day = foodLog[date]
    return ['breakfast', 'lunch', 'dinner', 'snack'].some((meal) => (day?.[meal] ?? []).length > 0)
  }).sort()
}

export function dayHasEntries(day) {
  return ['breakfast', 'lunch', 'dinner', 'snack'].some((meal) => (day?.[meal] ?? []).length > 0)
}

/** Среднее потребление за выбранные даты; делит на число дней с записями. */
export function averageIntake(foodLog, dates, foodsById) {
  const filled = (dates ?? []).filter((date) => dayHasEntries(foodLog?.[date]))
  const totals = emptyTotals()
  for (const date of filled) {
    const day = sumDay(foodLog[date], foodsById)
    for (const key of NUTRIENT_KEYS) totals[key] += day.totals[key]
  }
  const days = filled.length || 1
  const average = emptyTotals()
  for (const key of NUTRIENT_KEYS) average[key] = totals[key] / days
  return { average, totals, daysWithData: filled.length, dates: filled }
}

/** Статус микронутриента относительно цели. */
export function microStatus(value, target, kind) {
  if (!(target > 0)) return 'unknown'
  const ratio = value / target
  if (kind === 'max') return ratio > 1 ? 'high' : 'ok'
  if (ratio < 0.7) return 'low'
  if (ratio < 0.9) return 'warn'
  return 'ok'
}

function macroRanges(client) {
  const goal = client?.goalType
  if (goal === 'lose') return { protein: [1.6, 2.2], fatPct: [20, 35], carbsPct: [35, 50] }
  if (goal === 'gain') return { protein: [1.6, 2.2], fatPct: [25, 35], carbsPct: [45, 60] }
  return { protein: [1.4, 2.2], fatPct: [20, 35], carbsPct: [40, 55] }
}

/** Анализ рациона за период: макросы, микро, флаги, рекомендации. */
export function analyzeDiet({ client, targets, foodLog, dates, foodsById, foods = [] }) {
  const intake = averageIntake(foodLog, dates, foodsById)
  const { average, daysWithData } = intake
  if (!daysWithData) {
    return {
      ready: false,
      daysWithData: 0,
      message: 'Нет записей в дневнике за выбранный период. Добавьте приёмы пищи, чтобы увидеть анализ.',
      micros: [], flags: [], advice: [], mealDistribution: [], topFoods: [], intake,
    }
  }
  if (!targets?.ready) {
    return { ready: false, daysWithData, message: 'Сначала заполните рост, вес и цель в анкете.', micros: [], flags: [], advice: [], mealDistribution: [], topFoods: [], intake }
  }

  const kcalPct = (average.kcal / targets.kcal) * 100
  const proteinPerKg = client?.weightKg > 0 ? average.protein / client.weightKg : null
  const ranges = macroRanges(client)
  const flags = []

  if (kcalPct < 80) flags.push({ level: 'warn', text: `Калорийность ниже цели на ${Math.round(100 - kcalPct)}% — риск недоедания и срывов.` })
  else if (kcalPct > 115) flags.push({ level: 'warn', text: `Калорийность выше цели на ${Math.round(kcalPct - 100)}% — цель по весу может не достигаться.` })
  if (proteinPerKg !== null && proteinPerKg < 1.2) flags.push({ level: 'alert', text: `Белка мало: ${proteinPerKg.toFixed(2)} г/кг при ориентире 1,6–2,0 г/кг.` })
  else if (proteinPerKg !== null && proteinPerKg < ranges.protein[0]) flags.push({ level: 'warn', text: `Белок ${proteinPerKg.toFixed(2)} г/кг — ниже рекомендуемого диапазона.` })
  if (average.fiber < targets.fiber * 0.7) flags.push({ level: 'warn', text: `Клетчатки ${Math.round(average.fiber)} г — меньше 70% цели (${targets.fiber} г).` })
  if (average.na > targets.micros.na) flags.push({ level: 'warn', text: `Натрий ${Math.round(average.na)} мг выше лимита ${targets.micros.na} мг — источники: соль, соусы, колбасы, сыры.` })
  if ((average.protein * 4 * 100) / Math.max(average.kcal, 1) < 12) flags.push({ level: 'warn', text: 'Доля белка ниже 12% калорийности — блюда стоит дополнить белковым компонентом.' })

  const micros = MICRO_META.map((meta) => {
    const target = targets.micros[meta.key]
    const value = average[meta.key]
    const status = microStatus(value, target, meta.kind)
    return {
      ...meta,
      target,
      value,
      pct: target > 0 ? Math.min((value / target) * 100, 200) : 0,
      status,
      ratio: target > 0 ? value / target : null,
    }
  })

  const mealDistribution = ['breakfast', 'lunch', 'dinner', 'snack'].map((meal) => {
    let mealKcal = 0
    for (const date of intake.dates) {
      mealKcal += sumItems(foodLog?.[date]?.[meal] ?? [], foodsById).kcal
    }
    mealKcal /= Math.max(intake.daysWithData, 1)
    const share = average.kcal > 0 ? (mealKcal / average.kcal) * 100 : 0
    return { meal, label: MEAL_LABELS[meal], kcal: mealKcal, share, targetShare: MEAL_ENERGY_SHARE[meal] * 100 }
  })

  const topFoods = topFoodContributors(foodLog, intake.dates, foodsById, 5)
  const { advice, macroRows } = buildAdvice({ client, targets, average, micros, flags, mealDistribution, daysWithData, foods })

  return {
    ready: true,
    daysWithData,
    dates: intake.dates,
    average,
    intake,
    macroRows,
    kcalPct,
    proteinPerKg,
    micros,
    flags,
    advice,
    mealDistribution,
    topFoods,
    macroPct: {
      protein: (average.protein * 4 * 100) / Math.max(average.kcal, 1),
      fat: (average.fat * 9 * 100) / Math.max(average.kcal, 1),
      carbs: (average.carbs * 4 * 100) / Math.max(average.kcal, 1),
    },
  }
}

function topFoodContributors(foodLog, dates, foodsById, limit = 5) {
  const totals = new Map()
  for (const date of dates ?? []) {
    const day = foodLog?.[date]
    if (!day) continue
    for (const meal of ['breakfast', 'lunch', 'dinner', 'snack']) {
      for (const item of day[meal] ?? []) {
        const food = foodsById[item.foodId]
        if (!food) continue
        const grams = Number(item.grams) || 0
        const current = totals.get(food.id) ?? { food, grams: 0, kcal: 0 }
        current.grams += grams
        current.kcal += (food.kcal * grams) / 100
        totals.set(food.id, current)
      }
    }
  }
  return [...totals.values()].sort((a, b) => b.kcal - a.kcal).slice(0, limit)
}

/** Топ продуктов — источников нутриента (плотность на 100 ккал). */
export function topSources(nutrient, foods, tags, limit = 3) {
  const field = FOOD_FIELD[nutrient] ?? nutrient
  return (foods ?? [])
    .filter((food) => foodAllowed(food, tags))
    .filter((food) => (Number(food[field]) || 0) > 0 && food.kcal > 0)
    .map((food) => ({
      food,
      per100: Number(food[field]) || 0,
      density: ((Number(food[field]) || 0) / food.kcal) * 100,
    }))
    .sort((a, b) => b.density - a.density)
    .slice(0, limit)
}

const MICRO_FOOD_HINTS = {
  ca: 'продукты с кальцием', fe: 'богатые железом продукты', mg: 'продукты с магнием',
  k: 'продукты с калием', vc: 'источники витамина C', b12: 'источники B12',
  folate: 'источники фолата', ala: 'источники омега-3 (ALA)', fiber: 'источники клетчатки',
}

/** Рекомендации по макро- и микронутриентам на основе среднего рациона. */
export function buildAdvice({ client, targets, average, micros, flags, mealDistribution, daysWithData, foods = [] }) {
  const tags = exclusionTags(client)
  const advice = []
  const macroRows = [
    { key: 'kcal', label: 'Калорийность', unit: 'ккал', current: average.kcal, target: targets.kcal },
    { key: 'protein', label: 'Белки', unit: 'г', current: average.protein, target: targets.protein },
    { key: 'fat', label: 'Жиры', unit: 'г', current: average.fat, target: targets.fat },
    { key: 'carbs', label: 'Углеводы', unit: 'г', current: average.carbs, target: targets.carbs },
    { key: 'fiber', label: 'Клетчатка', unit: 'г', current: average.fiber, target: targets.fiber },
  ].map((row) => ({
    ...row,
    pct: row.target > 0 ? (row.current / row.target) * 100 : 0,
    delta: row.current - row.target,
  }))

  const proteinDelta = targets.protein - average.protein
  if (proteinDelta > 15) {
    const sources = topSources('protein', foods, tags, 3)
    advice.push({
      id: 'protein-up', level: 'warn', title: 'Добавить белок',
      text: `Не хватает ${Math.round(proteinDelta)} г белка в день. Распределите по 25–35 г на приём: ${sources.map((entry) => `${entry.food.name.toLowerCase()} ${suggestProteinGrams(entry.food)}`).join(', ') || 'яйца, творог, рыба, птица, бобовые'}.`,
    })
  }
  if (targets.protein - average.protein < -25) {
    advice.push({ id: 'protein-down', level: 'info', title: 'Белка больше цели', text: 'Белка в рационе с избытком — проверьте, хватает ли места овощам, фруктам и цельным углеводам.' })
  }
  if (average.fiber < targets.fiber * 0.8) {
    const sources = topSources('fiber', foods, tags, 3)
    advice.push({
      id: 'fiber-up', level: 'warn', title: 'Добавить клетчатку',
      text: `Клетчатки ${Math.round(average.fiber)} г из ${targets.fiber} г. Добавьте ${sources.map((entry) => entry.food.name.toLowerCase()).join(', ') || 'овощи, бобовые, цельные крупы'} и увеличьте порции овощей до 400–500 г в день, повышая постепенно.`,
    })
  }
  if (average.na > targets.micros.na) {
    advice.push({
      id: 'sodium', level: 'warn', title: 'Снизить натрий',
      text: `Сейчас ≈${Math.round(average.na)} мг натрия при лимите ${targets.micros.na} мг. Источники: соль при готовке, соусы, колбасы, сыры, готовые продукты. Замените часть соли специями и лимоном.`,
    })
  }

  const lowMicros = micros.filter((micro) => micro.status === 'low' || micro.status === 'warn')
  for (const micro of lowMicros) {
    const sources = topSources(micro.key, foods, tags, 3)
    if (!sources.length) continue
    advice.push({
      id: `micro-${micro.key}`, level: micro.status === 'low' ? 'warn' : 'info',
      title: `Мало ${micro.label.toLowerCase()}`,
      text: `${Math.round(Math.min(micro.ratio * 100, 999))}% от цели (${Math.round(micro.value)} из ${micro.target} ${micro.unit}). Добавьте ${sources.map((entry) => entry.food.name.toLowerCase()).join(', ')}; при подтверждённом дефиците по анализам — добавка по согласованию с врачом.`,
    })
  }

  const breakfast = mealDistribution?.find((meal) => meal.meal === 'breakfast')
  if (breakfast && breakfast.share < 15) {
    advice.push({ id: 'breakfast', level: 'info', title: 'Усилить завтрак', text: 'На завтрак приходится менее 15% калорий — он помогает стабильной энергии и контролю аппетита. Добавьте белок и цельные углеводы.' })
  }

  if (daysWithData < 3) {
    advice.unshift({ id: 'more-days', level: 'info', title: 'Мало данных', text: `Учтено ${daysWithData} дн. дневника. Для точного анализа рациона нужны минимум 3–7 дней.` })
  }

  return { advice, macroRows }
}

let foodsForAdvice = []
/** Подключает справочник для советов (устаревший путь совместимости). */
export function setAdviceFoods(foods) {
  foodsForAdvice = foods ?? []
}

function suggestProteinGrams(food) {
  const grams = Math.ceil((25 / Math.max(food.p, 1)) * 100 / 10) * 10
  return grams >= 60 ? `${grams} г` : `порция ~${grams} г`
}

/* ------------------------------------------------------------ план рациона */

function templateNutrition(template, foodsById) {
  const totals = emptyTotals()
  for (const item of template.items) {
    const food = foodsById[item.food]
    if (!food) continue
    addNutrients(totals, foodNutrients(food, item.grams))
  }
  return totals
}

function scaleItems(template, factor, foodsById) {
  return template.items.map((item) => {
    const food = foodsById[item.food]
    const grams = Math.max(1, roundTo(item.grams * factor, item.grams * factor < 20 ? 1 : 5))
    return { foodId: item.food, name: food?.name ?? item.food, grams, nutrients: food ? foodNutrients(food, grams) : emptyTotals() }
  })
}

function nutrientsOfItems(items) {
  const totals = emptyTotals()
  for (const item of items) addNutrients(totals, item.nutrients)
  return totals
}

function bumpProtein(items, deficitGrams, foodsById) {
  if (deficitGrams <= 0) return { items, bumped: 0 }
  let best = null
  for (const item of items) {
    const food = foodsById[item.foodId]
    if (!food || food.cat === 'vegetable' || food.cat === 'fruit') continue
    if (!(food.p > 8)) continue
    if (!best || food.p > best.food.p) best = { item, food }
  }
  if (!best) return { items, bumped: 0 }
  const extraGrams = Math.min(80, Math.max(10, Math.ceil((deficitGrams / (best.food.p / 100)) / 10) * 10))
  const next = items.map((item) => {
    if (item !== best.item) return item
    const grams = item.grams + extraGrams
    return { ...item, grams, nutrients: foodNutrients(best.food, grams) }
  })
  return { items: next, bumped: extraGrams }
}

/** Генератор примерного дня: завтрак, обед, ужин и перекус под цель клиента. */
export function generateMealPlan({ client, targets, foodsById, templates = TEMPLATES_BY_MEAL, seed = 0 }) {
  if (!targets?.ready) return { ready: false, message: 'Сначала рассчитайте цели в анкете.' }
  const tags = exclusionTags(client)
  const meals = []
  const excludedTemplates = []

  for (const meal of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const targetKcal = targets.kcal * MEAL_ENERGY_SHARE[meal]
    const targetProtein = targets.protein * MEAL_ENERGY_SHARE[meal]
    const targetFat = targets.fat * MEAL_ENERGY_SHARE[meal]
    const targetCarbs = targets.carbs * MEAL_ENERGY_SHARE[meal]
    const candidates = (templates[meal] ?? []).filter((template) => {
      const allowed = template.items.every((item) => foodAllowed(foodsById[item.food], tags))
      if (!allowed) excludedTemplates.push(template)
      return allowed
    })
    if (!candidates.length) {
      meals.push({ meal, label: MEAL_LABELS[meal], name: null, items: [], totals: emptyTotals(), note: 'Нет подходящих блюд с учётом исключений — добавьте продукты вручную.' })
      continue
    }

    const scored = candidates.map((template) => {
      const base = templateNutrition(template, foodsById)
      const factor = clamp(targetKcal / Math.max(base.kcal, 1), 0.55, 1.9)
      let items = scaleItems(template, factor, foodsById)
      let totals = nutrientsOfItems(items)
      let bumped = 0
      if (totals.protein < targetProtein * 0.85) {
        const result = bumpProtein(items, targetProtein - totals.protein, foodsById)
        items = result.items
        totals = nutrientsOfItems(items)
        bumped = result.bumped
      }
      const error =
        (Math.abs(totals.kcal - targetKcal) / Math.max(targetKcal, 1)) * 0.3 +
        (Math.abs(totals.protein - targetProtein) / Math.max(targetProtein, 1)) * 0.45 +
        (Math.abs(totals.fat - targetFat) / Math.max(targetFat, 1)) * 0.15 +
        (Math.abs(totals.carbs - targetCarbs) / Math.max(targetCarbs, 1)) * 0.1
      return { template, items, totals, error, bumped }
    })
    scored.sort((a, b) => a.error - b.error)
    const pool = scored.slice(0, Math.min(3, scored.length))
    const picked = pool[Math.abs(seed + meal.length) % pool.length]
    meals.push({
      meal,
      label: MEAL_LABELS[meal],
      name: picked.template.name,
      note: picked.template.note,
      items: picked.items,
      totals: picked.totals,
      targetKcal: Math.round(targetKcal),
      targetProtein,
      targetFat,
      targetCarbs,
      fit: Math.max(0, Math.round(100 - picked.error * 100)),
      bumpedGrams: picked.bumped,
    })
  }

  const computeTotals = () => {
    const totals = emptyTotals()
    for (const meal of meals) addNutrients(totals, meal.totals)
    return totals
  }

  let totals = computeTotals()

  // Финальная калибровка: если день заметно ушёл от цели по энергии, мягко
  // масштабируем все порции (в пределах ±18%) и пересчитываем итоги.
  if (targets.kcal > 0) {
    const ratio = totals.kcal / targets.kcal
    const scale = clamp(1 / ratio, 0.82, 1.18)
    if (Math.abs(ratio - 1) > 0.08 && Math.abs(scale - 1) > 0.01) {
      for (const meal of meals) {
        for (const item of meal.items) {
          const food = foodsById[item.foodId]
          const grams = Math.max(1, roundTo(item.grams * scale, item.grams < 20 ? 1 : 5))
          item.grams = grams
          item.nutrients = food ? foodNutrients(food, grams) : emptyTotals()
        }
        meal.totals = nutrientsOfItems(meal.items)
        const error =
          (Math.abs(meal.totals.kcal - meal.targetKcal) / Math.max(meal.targetKcal, 1)) * 0.3 +
          (Math.abs(meal.totals.protein - meal.targetProtein) / Math.max(meal.targetProtein, 1)) * 0.45 +
          (Math.abs(meal.totals.fat - meal.targetFat) / Math.max(meal.targetFat, 1)) * 0.15 +
          (Math.abs(meal.totals.carbs - meal.targetCarbs) / Math.max(meal.targetCarbs, 1)) * 0.1
        meal.fit = Math.max(0, Math.round(100 - error * 100))
      }
      totals = computeTotals()
    }
  }

  const error =
    (Math.abs(totals.kcal - targets.kcal) / Math.max(targets.kcal, 1)) * 0.35 +
    (Math.abs(totals.protein - targets.protein) / Math.max(targets.protein, 1)) * 0.4 +
    (Math.abs(totals.fat - targets.fat) / Math.max(targets.fat, 1)) * 0.15 +
    (Math.abs(totals.carbs - targets.carbs) / Math.max(targets.carbs, 1)) * 0.1

  return {
    ready: true,
    meals,
    totals,
    targets,
    fit: Math.max(0, Math.round(100 - error * 100)),
    excludedCount: new Set(excludedTemplates.map((template) => template.id)).size,
    seed,
    generatedAt: new Date().toISOString(),
  }
}

/** Превращает план в записи дневника (для кнопки «в дневник»). */
export function planToDayEntries(plan, date) {
  const day = { breakfast: [], lunch: [], dinner: [], snack: [] }
  let sequence = 0
  for (const meal of plan?.meals ?? []) {
    for (const item of meal.items) {
      sequence += 1
      day[meal.meal].push({
        id: `${date}-plan-${sequence}`,
        foodId: item.foodId,
        grams: item.grams,
        source: 'plan',
      })
    }
  }
  return day
}

/** Значение последнего измерения для графика/карточек. */
export function latestMeasurement(client) {
  const list = [...(client?.measurements ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  return list.at(-1) ?? null
}

export function measurementDelta(measurements, key = 'weightKg') {
  const list = [...(measurements ?? [])].filter((entry) => Number(entry[key]) > 0).sort((a, b) => a.date.localeCompare(b.date))
  if (list.length < 2) return null
  return Number(list.at(-1)[key]) - Number(list[0][key])
}

/** Даты последних N дней, заканчивая today. */
export function lastDays(count, today = toISO()) {
  return Array.from({ length: count }, (_, index) => addDays(today, index - count + 1))
}
