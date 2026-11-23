/** Форматирование чисел и дат (без DOM). */

export const ruNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
export const ruNumber0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

/** Число с разделителями; пустое/некорректное → «—». */
export function fmt(value, formatter = ruNumber) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '—'
  return formatter.format(Number(value))
}

export function fmtInt(value) {
  return fmt(value, ruNumber0)
}

export function pct(value, digits = 0) {
  if (!Number.isFinite(Number(value))) return '—'
  return `${Number(value).toFixed(digits)}%`
}

/** ISO-дата YYYY-MM-DD в локальном времени. */
export function toISO(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0)
}

export function addDays(iso, days) {
  const date = fromISO(iso)
  date.setDate(date.getDate() + days)
  return toISO(date)
}

/** «12 марта 2026» */
export function formatDate(iso, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '—'
  return fromISO(iso).toLocaleDateString('ru-RU', options)
}

/** «12.03.2026» */
export function formatDateShort(iso) {
  if (!iso) return '—'
  return fromISO(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Возраст в годах из даты рождения. */
export function ageFromBirthDate(birthDate, today = toISO()) {
  if (!birthDate) return null
  const birth = fromISO(birthDate)
  const now = fromISO(today)
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday = now.getMonth() < birth.getMonth()
    || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age >= 0 ? age : null
}

/** «32 года», «1 год», «25 лет». */
export function ageLabel(age) {
  if (age === null || age === undefined) return '—'
  return `${age} ${plural(age, ['год', 'года', 'лет'])}`
}

/** Русская плюрализация: 1 день / 3 дня / 5 дней. */
export function plural(count, forms) {
  const n = Math.abs(Number(count)) % 100
  const n1 = n % 10
  if (n >= 11 && n <= 19) return forms[2]
  if (n1 === 1) return forms[0]
  if (n1 >= 2 && n1 <= 4) return forms[1]
  return forms[2]
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function roundTo(value, step = 1) {
  if (!Number.isFinite(Number(value))) return 0
  return Math.round(Number(value) / step) * step
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
