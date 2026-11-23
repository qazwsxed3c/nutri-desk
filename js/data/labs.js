/** Справочник лабораторных маркеров и оценка результатов. */

export const LAB_GROUPS = [
  { id: 'blood', label: 'Кровь' },
  { id: 'metabolic', label: 'Углеводный обмен' },
  { id: 'lipids', label: 'Липиды' },
  { id: 'vitamins', label: 'Витамины и минералы' },
  { id: 'liver', label: 'Печень' },
  { id: 'kidney', label: 'Почки' },
  { id: 'hormones', label: 'Гормоны' },
  { id: 'inflammation', label: 'Воспаление' },
]

const M = (id, name, unit, group, min, max, note = '') => ({ id, name, unit, group, min, max, note })

/** Базовые референсы; для половых различий используется refBySex. */
export const LAB_MARKERS = [
  M('hemoglobin', 'Гемоглобин', 'г/л', 'blood', 120, 170, 'Нижняя граница зависит от пола и может отличаться по лаборатории.'),
  M('ferritin', 'Ферритин', 'нг/мл', 'vitamins', 15, 150, 'Оптимально для самочувствия часто >30 нг/мл.'),
  M('iron', 'Железо сыворотки', 'мкмоль/л', 'vitamins', 9, 30),
  M('vitamin_d', 'Витамин D (25-OH)', 'нг/мл', 'vitamins', 30, 100, 'Дефицит <20, недостаточность 20–30 нг/мл.'),
  M('vitamin_b12', 'Витамин B12', 'пг/мл', 'vitamins', 200, 900),
  M('folate', 'Фолат', 'нг/мл', 'vitamins', 3, 17),
  M('magnesium', 'Магний', 'ммоль/л', 'vitamins', 0.66, 1.07),
  M('calcium', 'Кальций общий', 'ммоль/л', 'vitamins', 2.1, 2.6),
  M('potassium', 'Калий', 'ммоль/л', 'vitamins', 3.5, 5.1),
  M('tsh', 'ТТГ', 'мМЕ/л', 'hormones', 0.4, 4.0),
  M('testosterone', 'Тестостерон общий', 'нмоль/л', 'hormones', 8.6, 29, 'Референс зависит от пола и возраста; у женщин — отдельные диапазоны.'),
  M('glucose', 'Глюкоза', 'ммоль/л', 'metabolic', 3.9, 5.6),
  M('hba1c', 'Гликированный гемоглобин', '%', 'metabolic', null, 5.7, '≥6,5% — критерий диабета.'),
  M('insulin', 'Инсулин', 'мкЕд/мл', 'metabolic', 2.6, 24.9),
  M('cholesterol', 'Холестерин общий', 'ммоль/л', 'lipids', null, 5.2),
  M('ldl', 'ЛПНП (LDL)', 'ммоль/л', 'lipids', null, 3.0, 'Целевой уровень зависит от сердечно-сосудистого риска.'),
  M('hdl', 'ЛПВП (HDL)', 'ммоль/л', 'lipids', 1.0, null, 'Чем выше — тем лучше; у женщин нижняя граница обычно 1,3.'),
  M('triglycerides', 'Триглицериды', 'ммоль/л', 'lipids', null, 1.7),
  M('crp', 'С-реактивный белок', 'мг/л', 'inflammation', null, 5),
  M('alt', 'АЛТ', 'Ед/л', 'liver', null, 40),
  M('ast', 'АСТ', 'Ед/л', 'liver', null, 40),
  M('creatinine', 'Креатинин', 'мкмоль/л', 'kidney', 44, 106),
  M('uric_acid', 'Мочевая кислота', 'мкмоль/л', 'kidney', 150, 420),
]

export const LAB_BY_ID = Object.fromEntries(LAB_MARKERS.map((marker) => [marker.id, marker]))

/** Половые/возрастные поправки нижних/верхних границ. */
const SEX_RANGES = {
  hemoglobin: { male: [130, 170], female: [120, 150] },
  iron: { male: [9, 30], female: [7, 27] },
  ferritin: { male: [20, 250], female: [15, 150] },
  creatinine: { male: [62, 106], female: [44, 80] },
  uric_acid: { male: [210, 420], female: [150, 350] },
  hdl: { male: [1.0, null], female: [1.3, null] },
}

/** Референсный диапазон маркера с учётом пола клиента. */
export function labRange(markerOrId, client) {
  const marker = typeof markerOrId === 'string' ? LAB_BY_ID[markerOrId] : markerOrId
  if (!marker) return { min: null, max: null }
  const sex = client?.sex === 'male' ? 'male' : client?.sex === 'female' ? 'female' : null
  const override = sex ? SEX_RANGES[marker.id]?.[sex] : null
  return { min: override?.[0] ?? marker.min, max: override?.[1] ?? marker.max }
}

/** Статус значения: low / normal / high / unknown. */
export function labStatus(value, range) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'unknown'
  const number = Number(value)
  if (range?.min !== null && range?.min !== undefined && number < range.min) return 'low'
  if (range?.max !== null && range?.max !== undefined && number > range.max) return 'high'
  return 'normal'
}

export const LAB_STATUS_LABELS = {
  low: 'ниже нормы',
  normal: 'в норме',
  high: 'выше нормы',
  unknown: 'нет данных',
}

/** Динамика значения относительно предыдущего: up / down / flat / none. */
export function labTrend(values) {
  if (!Array.isArray(values) || values.length < 2) return 'none'
  const sorted = [...values].sort((a, b) => a.date.localeCompare(b.date))
  const previous = Number(sorted[sorted.length - 2].value)
  const current = Number(sorted[sorted.length - 1].value)
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return 'none'
  const delta = current - previous
  if (Math.abs(delta) < Math.max(0.01, Math.abs(previous) * 0.01)) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

/** Отклоняющиеся маркеры по последним значениям. */
export function flaggedLabs(labs, client) {
  const latest = new Map()
  for (const lab of labs ?? []) {
    const current = latest.get(lab.marker)
    if (!current || lab.date > current.date) latest.set(lab.marker, lab)
  }
  return [...latest.values()]
    .map((lab) => ({ ...lab, range: labRange(lab.marker, client) }))
    .map((lab) => ({ ...lab, status: labStatus(lab.value, lab.range) }))
    .filter((lab) => lab.status === 'low' || lab.status === 'high')
}
