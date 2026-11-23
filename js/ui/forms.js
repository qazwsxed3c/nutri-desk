/** Формы приложения: клиент, измерение, анализ, продукт. */
import { field, input, select, textarea, button } from './components.js'
import { GOAL_TYPES, ACTIVITY_LEVELS } from '../core/nutrition.js'
import { LAB_MARKERS, LAB_GROUPS } from '../data/labs.js'
import { FOOD_CATEGORIES } from '../data/foods.js'
import { toISO } from '../core/format.js'

const goalOptions = GOAL_TYPES.map((goal) => ({ value: goal.id, label: goal.label }))
const activityOptions = ACTIVITY_LEVELS.map((level) => ({ value: level.id, label: level.label }))

export const DIET_STYLES = [
  { value: 'обычный', label: 'Обычный' },
  { value: 'вегетарианское', label: 'Вегетарианское' },
  { value: 'веган', label: 'Веганское' },
  { value: 'без глютена', label: 'Без глютена' },
  { value: 'без лактозы', label: 'Без лактозы' },
  { value: 'халяль', label: 'Халяль' },
  { value: 'другое', label: 'Другое' },
]

export function clientFormHtml(client = {}) {
  const anamnesis = client.anamnesis ?? {}
  return `<div class="form-grid">
    <fieldset class="span-2"><legend>Профиль</legend><div class="form-grid">
      ${field('Имя клиента', input({ name: 'name', value: client.name ?? '', placeholder: 'Например, Анна К.', required: true }))}
      ${field('Пол', select({ name: 'sex', value: client.sex ?? 'female', items: [{ value: 'female', label: 'Женский' }, { value: 'male', label: 'Мужской' }] }))}
      ${field('Дата рождения', input({ name: 'birthDate', type: 'date', value: client.birthDate ?? '' }))}
      ${field('Рост, см', input({ name: 'heightCm', type: 'number', value: client.heightCm ?? 168, step: '0.5', min: '120', max: '230', required: true }))}
      ${field('Текущий вес, кг', input({ name: 'weightKg', type: 'number', value: client.weightKg ?? 65, step: '0.1', min: '30', max: '250', required: true }))}
      ${field('Активность', select({ name: 'activity', value: client.activity ?? 'light', items: activityOptions }))}
    </div></fieldset>

    <fieldset class="span-2"><legend>Цель</legend><div class="form-grid">
      ${field('Цель', select({ name: 'goalType', value: client.goalType ?? 'maintain', items: goalOptions }))}
      ${field('Целевой вес, кг', input({ name: 'goalWeightKg', type: 'number', value: client.goalWeightKg ?? client.weightKg ?? 65, step: '0.1', min: '30', max: '250' }))}
      ${field('Желаемая дата', input({ name: 'goalDate', type: 'date', value: client.goalDate ?? '' }), 'Используется для проверки безопасного темпа')}
    </div></fieldset>

    <fieldset class="span-2"><legend>Анамнез</legend><div class="form-grid">
      ${field('Жалобы', textarea({ name: 'complaints', value: (anamnesis.complaints ?? []).join(', '), rows: 2, placeholder: 'усталость, выпадение волос, тяга к сладкому' }), 'Через запятую или с новой строки')}
      ${field('Состояния и диагнозы', textarea({ name: 'conditions', value: (anamnesis.conditions ?? []).join(', '), rows: 2, placeholder: 'например, инсулинорезистентность' }))}
      ${field('Лекарства и добавки', textarea({ name: 'medications', value: anamnesis.medications ?? '', rows: 2 }))}
      ${field('Аллергии', input({ name: 'allergies', value: (anamnesis.allergies ?? []).join(', '), placeholder: 'орехи, рыба' }))}
      ${field('Непереносимости', input({ name: 'intolerances', value: (anamnesis.intolerances ?? []).join(', '), placeholder: 'лактоза, глютен' }))}
      ${field('Тип питания', select({ name: 'dietStyle', value: anamnesis.dietStyle ?? 'обычный', items: DIET_STYLES }))}
      ${field('Сон, ч', input({ name: 'sleepHours', type: 'number', value: anamnesis.sleepHours ?? 7, step: '0.5', min: '0', max: '16' }))}
      ${field('Заметки', textarea({ name: 'notes', value: anamnesis.notes ?? '', rows: 2, placeholder: 'образ жизни, тренировки, пищевые привычки' }))}
    </div></fieldset>
  </div>`
}

const list = (value) => String(value ?? '')
  .split(/[,;\n]/)
  .map((item) => item.trim())
  .filter(Boolean)

export function parseClientForm(values) {
  return {
    name: String(values.name ?? '').trim() || 'Без имени',
    sex: values.sex === 'male' ? 'male' : 'female',
    birthDate: values.birthDate || '',
    heightCm: Number(values.heightCm) || null,
    weightKg: Number(values.weightKg) || null,
    goalType: values.goalType ?? 'maintain',
    goalWeightKg: Number(values.goalWeightKg) || null,
    goalDate: values.goalDate || null,
    activity: values.activity ?? 'light',
    anamnesis: {
      complaints: list(values.complaints),
      conditions: list(values.conditions),
      medications: String(values.medications ?? '').trim(),
      allergies: list(values.allergies),
      intolerances: list(values.intolerances),
      dietStyle: values.dietStyle ?? 'обычный',
      sleepHours: Number(values.sleepHours) || null,
      notes: String(values.notes ?? '').trim(),
    },
  }
}

export function measurementFormHtml(today = toISO()) {
  return `<div class="form-grid">
    ${field('Дата', input({ name: 'date', type: 'date', value: today, required: true }))}
    ${field('Вес, кг', input({ name: 'weightKg', type: 'number', value: '', step: '0.1', min: '30', max: '250', required: true }))}
    ${field('Талия, см', input({ name: 'waistCm', type: 'number', value: '', step: '0.5', min: '40', max: '200' }))}
    ${field('Жир, %', input({ name: 'bodyFatPct', type: 'number', value: '', step: '0.1', min: '3', max: '60' }))}
    ${field('Самочувствие', select({ name: 'wellBeing', value: '4', items: [5, 4, 3, 2, 1].map((value) => ({ value, label: `${value} / 5` })) }))}
    ${field('Заметка', input({ name: 'note', value: '', placeholder: 'например, после тренировки' }))}
  </div>`
}

export function parseMeasurement(values) {
  return {
    date: values.date || toISO(),
    weightKg: Number(values.weightKg) || null,
    waistCm: Number(values.waistCm) || null,
    bodyFatPct: Number(values.bodyFatPct) || null,
    wellBeing: Number(values.wellBeing) || null,
    note: String(values.note ?? '').trim(),
  }
}

export function labsOptionsHtml(client, selected) {
  return LAB_GROUPS.map((group) => {
    const markers = LAB_MARKERS.filter((marker) => marker.group === group.id)
    if (!markers.length) return ''
    return `<optgroup label="${group.label}">${markers.map((marker) => `<option value="${marker.id}" ${marker.id === selected ? 'selected' : ''}>${marker.name} (${marker.unit})</option>`).join('')}</optgroup>`
  }).join('')
}

export function labFormHtml(client, today = toISO(), selected = 'ferritin') {
  return `<div class="form-grid">
    ${field('Дата', input({ name: 'date', type: 'date', value: today, required: true }))}
    ${field('Показатель', `<select class="input" name="marker" required>${labsOptionsHtml(client, selected)}</select>`)}
    ${field('Значение', input({ name: 'value', type: 'number', value: '', step: '0.01', min: '0', required: true }))}
    ${field('Заметка', input({ name: 'note', value: '', placeholder: 'лаборатория, комментарий' }))}
  </div>
  <p class="tiny muted" style="margin-top:10px">Референсные диапазоны ориентировочные и могут отличаться от бланка лаборатории — приложение не ставит диагноз.</p>`
}

export function parseLab(values) {
  return {
    date: values.date || toISO(),
    marker: values.marker,
    value: Number(values.value),
    note: String(values.note ?? '').trim(),
  }
}

export function customFoodFormHtml() {
  return `<div class="form-grid">
    ${field('Название', input({ name: 'name', value: '', placeholder: 'Например, хумус домашний', required: true }))}
    ${field('Категория', select({ name: 'cat', value: 'other', items: FOOD_CATEGORIES.map((category) => ({ value: category.id, label: category.label })) }))}
    ${field('Ккал на 100 г', input({ name: 'kcal', type: 'number', value: '', step: '0.1', min: '0', required: true }))}
    ${field('Белки, г', input({ name: 'p', type: 'number', value: '', step: '0.1', min: '0' }))}
    ${field('Жиры, г', input({ name: 'f', type: 'number', value: '', step: '0.1', min: '0' }))}
    ${field('Углеводы, г', input({ name: 'c', type: 'number', value: '', step: '0.1', min: '0' }))}
    ${field('Клетчатка, г', input({ name: 'fiber', type: 'number', value: '', step: '0.1', min: '0' }))}
    ${field('Натрий, мг', input({ name: 'na', type: 'number', value: '', step: '1', min: '0' }))}
    ${field('Кальций, мг', input({ name: 'ca', type: 'number', value: '', step: '1', min: '0' }))}
    ${field('Железо, мг', input({ name: 'fe', type: 'number', value: '', step: '0.1', min: '0' }))}
    ${field('Магний, мг', input({ name: 'mg', type: 'number', value: '', step: '1', min: '0' }))}
    ${field('Калий, мг', input({ name: 'k', type: 'number', value: '', step: '1', min: '0' }))}
    ${field('Витамин C, мг', input({ name: 'vc', type: 'number', value: '', step: '0.1', min: '0' }))}
    ${field('B12, мкг', input({ name: 'b12', type: 'number', value: '', step: '0.01', min: '0' }))}
    ${field('Фолат, мкг', input({ name: 'folate', type: 'number', value: '', step: '0.1', min: '0' }))}
    ${field('Омега-3 ALA, г', input({ name: 'ala', type: 'number', value: '', step: '0.01', min: '0' }))}
  </div>`
}

export function parseCustomFood(values) {
  const numeric = ['kcal', 'p', 'f', 'c', 'fiber', 'na', 'ca', 'fe', 'mg', 'k', 'vc', 'b12', 'folate', 'ala']
  const food = {
    name: String(values.name ?? '').trim(),
    cat: values.cat ?? 'other',
    allergens: [],
  }
  for (const key of numeric) food[key] = Number(values[key]) || 0
  return food
}
