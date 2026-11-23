/** Экран «Дневник питания». */
import { badge, icon, meter, section } from '../components.js'
import { clientPageHead, disclaimer, measurementModal } from '../shared.js'
import { calcTargets, foodNutrients, generateMealPlan, planToDayEntries, sumDay } from '../../core/nutrition.js'
import { MEAL_LABELS } from '../../data/meal-templates.js'
import { searchFoods } from '../../data/foods.js'
import { customFoodFormHtml, parseCustomFood } from '../forms.js'
import { fmt, fmtInt, toISO, addDays, formatDate } from '../../core/format.js'

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']

function mealRows(day, meal, foodsById, ctx, date) {
  const entries = day[meal] ?? []
  if (!entries.length) return `<div class="meal-empty">Пока пусто — добавьте продукты.</div>`
  return `<ul class="meal-list">${entries.map((entry) => {
    const food = foodsById[entry.foodId]
    const nutrients = food ? foodNutrients(food, entry.grams) : null
    const macros = nutrients
      ? `Б ${fmt(nutrients.protein)} · Ж ${fmt(nutrients.fat)} · У ${fmt(nutrients.carbs)}`
      : 'продукт удалён'
    return `<li class="meal-row">
      <span class="food-name">${escape(food?.name ?? 'Продукт')}</span>
      <span class="mono" style="font-size:12.5px">${fmt(entry.grams)} г</span>
      <span class="food-macros">${nutrients ? `${fmt(nutrients.kcal)} ккал · ${macros}` : macros}</span>
      <button class="btn btn-sm btn-ghost" data-action="edit-entry" data-meal="${meal}" data-id="${escape(entry.id)}" aria-label="Изменить">${icon('edit', 14)}</button>
      <button class="btn btn-sm btn-ghost" data-action="delete-entry" data-meal="${meal}" data-id="${escape(entry.id)}" aria-label="Удалить">${icon('trash', 14)}</button>
    </li>`
  }).join('')}</ul>`
}

function openAddFoodModal(ctx, { date, meal }) {
  const foods = ctx.store.foods()
  const foodsById = ctx.store.foodsById()
  ctx.openModal({
    title: `Добавить в «${MEAL_LABELS[meal]}»`,
    submitLabel: 'Добавить',
    body: `<div class="food-picker">
      <input class="input" data-food-search placeholder="Поиск: курица, гречка, творог…" autocomplete="off">
      <div class="food-results" data-food-results></div>
      <div class="form-grid">
        <label class="field"><span class="field-label">Граммы</span>
          <input class="input" type="number" name="grams" min="1" step="1" value="100" data-grams></label>
        <label class="field"><span class="field-label">Выбрано</span>
          <div class="input" data-selected-name style="display:flex;align-items:center;color:var(--muted)">—</div></label>
      </div>
      <input type="hidden" name="foodId" data-food-id value="">
      <div class="tiny muted" data-preview>Выберите продукт из списка</div>
    </div>`,
    onSubmit(values) {
      const foodId = values.foodId
      if (!foodId) {
        ctx.toast('Сначала выберите продукт')
        return false
      }
      const grams = Number(values.grams)
      if (!(grams > 0)) {
        ctx.toast('Укажите граммы')
        return false
      }
      ctx.store.addFoodEntry(ctx.client.id, date, meal, { foodId, grams })
      ctx.toast(`Добавлено: ${foodsById[foodId]?.name ?? 'продукт'}`)
      ctx.render()
    },
    onMount(scope) {
      const search = scope.querySelector('[data-food-search]')
      const results = scope.querySelector('[data-food-results]')
      const grams = scope.querySelector('[data-grams]')
      const foodIdInput = scope.querySelector('[data-food-id]')
      const selectedName = scope.querySelector('[data-selected-name]')
      const preview = scope.querySelector('[data-preview]')
      let selected = null
      const updatePreview = () => {
        if (!selected) {
          preview.textContent = 'Выберите продукт из списка'
          return
        }
        const gramsValue = Number(grams.value) || 0
        const nutrients = foodNutrients(selected, gramsValue)
        preview.textContent = `${fmt(gramsValue)} г: ${fmt(nutrients.kcal)} ккал · Б ${fmt(nutrients.protein)} · Ж ${fmt(nutrients.fat)} · У ${fmt(nutrients.carbs)} · клетчатка ${fmt(nutrients.fiber)} г`
      }
      const choose = (food) => {
        selected = food
        foodIdInput.value = food.id
        selectedName.textContent = food.name
        selectedName.style.color = 'var(--ink)'
        results.querySelectorAll('.food-option').forEach((button) => button.classList.toggle('selected', button.dataset.foodId === food.id))
        updatePreview()
      }
      const drawResults = (query = '') => {
        const list = searchFoods(query, foods).slice(0, 80)
        results.innerHTML = list.length
          ? list.map((food) => `<button type="button" class="food-option" data-food-id="${escape(food.id)}">
              <span class="food-name">${escape(food.name)}</span>
              <span class="food-kcal">${fmt(food.kcal)} ккал · Б ${fmt(food.p)} · Ж ${fmt(food.f)} · У ${fmt(food.c)}</span>
            </button>`).join('')
          : '<div class="meal-empty">Ничего не найдено. Добавьте продукт вручную кнопкой «Свой продукт».</div>'
        results.querySelectorAll('[data-food-id]').forEach((button) => {
          button.addEventListener('click', () => {
            const food = foodsById[button.dataset.foodId]
            if (food) choose(food)
          })
        })
      }
      search.addEventListener('input', () => drawResults(search.value))
      grams.addEventListener('input', updatePreview)
      drawResults('')
      search.focus()
    },
  })
}

function openEditEntryModal(ctx, { date, meal, entryId }) {
  const day = ctx.client.foodLog?.[date] ?? {}
  const entry = (day[meal] ?? []).find((item) => item.id === entryId)
  if (!entry) return
  const food = ctx.store.foodsById()[entry.foodId]
  ctx.openModal({
    title: `Изменить «${food?.name ?? 'продукт'}»`,
    submitLabel: 'Сохранить',
    body: `<div class="form-grid">
      <label class="field"><span class="field-label">Граммы</span>
        <input class="input" type="number" name="grams" min="1" step="1" value="${escape(String(entry.grams))}" required></label>
      <label class="field"><span class="field-label">Приём пищи</span>
        <input class="input" value="${escape(MEAL_LABELS[meal])}" disabled></label>
    </div>
    <div class="tiny muted" style="margin-top:10px">${food ? `${fmt(food.kcal)} ккал · Б ${fmt(food.p)} · Ж ${fmt(food.f)} · У ${fmt(food.c)} на 100 г` : ''}</div>`,
    footerExtra: `<button type="button" class="btn btn-danger" data-modal-delete>${icon('trash', 14)}Удалить</button>`,
    onSubmit(values) {
      const grams = Number(values.grams)
      if (!(grams > 0)) return false
      ctx.store.updateFoodEntry(ctx.client.id, date, meal, entryId, { grams })
      ctx.toast('Запись обновлена')
      ctx.render()
    },
    onMount(scope, close) {
      scope.querySelector('[data-modal-delete]')?.addEventListener('click', () => {
        ctx.store.deleteFoodEntry(ctx.client.id, date, meal, entryId)
        close()
        ctx.toast('Запись удалена')
        ctx.render()
      })
    },
  })
}

function openCustomFoodModal(ctx) {
  ctx.openModal({
    title: 'Свой продукт',
    submitLabel: 'Добавить продукт',
    wide: true,
    body: customFoodFormHtml(),
    onSubmit(values) {
      const food = parseCustomFood(values)
      if (!food.name || !(food.kcal > 0)) {
        ctx.toast('Нужны название и калорийность')
        return false
      }
      ctx.store.addCustomFood(food)
      ctx.toast(`Продукт «${food.name}» добавлен в справочник`)
      ctx.render()
    },
  })
}

export function diaryView(ctx) {
  const { client, params } = ctx
  const foodsById = ctx.store.foodsById()
  const targets = calcTargets(client)
  const today = toISO()
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '') ? params.get('date') : today
  const day = client.foodLog[date] ?? { breakfast: [], lunch: [], dinner: [], snack: [] }
  const totals = sumDay(day, foodsById).totals
  const plan = generateMealPlan({ client, targets, foodsById, seed: client.planSeed ?? 0 })

  const meters = targets.ready ? `
    <div class="grid cols-3" style="gap:14px">
      ${meter('Калории', `${fmtInt(totals.kcal)} из ${fmtInt(targets.kcal)}`, (totals.kcal / targets.kcal) * 100)}
      ${meter('Белки', `${fmtInt(totals.protein)} из ${fmtInt(targets.protein)} г`, (totals.protein / targets.protein) * 100)}
      ${meter('Жиры', `${fmtInt(totals.fat)} из ${fmtInt(targets.fat)} г`, (totals.fat / targets.fat) * 100)}
      ${meter('Углеводы', `${fmtInt(totals.carbs)} из ${fmtInt(targets.carbs)} г`, (totals.carbs / targets.carbs) * 100)}
      ${meter('Клетчатка', `${fmt(totals.fiber)} из ${fmtInt(targets.fiber)} г`, (totals.fiber / targets.fiber) * 100)}
      ${meter('Натрий (лимит)', `${fmtInt(totals.na)} из ${fmtInt(targets.micros.na)} мг`, (totals.na / targets.micros.na) * 100, totals.na > targets.micros.na ? 'alert' : 'good')}
    </div>` : '<p class="muted">Заполните анкету, чтобы видеть цели по питанию.</p>'

  const mealCards = MEALS.map((meal) => {
    const mealTotals = sumDay({ [meal]: day[meal] ?? [] }, foodsById).totals
    return `<article class="card meal-card">
      <div class="meal-head">
        <span class="finding-icon">${icon('book', 16)}</span>
        <h3>${MEAL_LABELS[meal]}</h3>
        <span class="meal-kcal">${fmtInt(mealTotals.kcal)} ккал · Б ${fmt(mealTotals.protein)} · Ж ${fmt(mealTotals.fat)} · У ${fmt(mealTotals.carbs)}</span>
        <button class="btn btn-sm" data-action="add-entry" data-meal="${meal}">${icon('plus', 14)}Добавить</button>
      </div>
      ${mealRows(day, meal, foodsById, ctx, date)}
    </article>`
  }).join('')

  const html = `
    ${clientPageHead(client, {
      subtitle: 'Дневник питания: добавляйте продукты по приёмам пищи, следите за калориями и макросами.',
      actions: `<button class="btn" data-action="custom-food">${icon('plus', 16)}Свой продукт</button>
        <a class="btn" href="#/client/${client.id}/analysis">Анализ рациона</a>
        <a class="btn btn-primary" href="#/client/${client.id}/plan">Пример рациона</a>`,
    })}
    <div class="diary-datebar">
      <button class="btn btn-icon" data-action="move-day" data-delta="-1" aria-label="Предыдущий день">${icon('chevronLeft', 18)}</button>
      <input class="input date-input" type="date" value="${date}" data-diary-date aria-label="Дата дневника">
      <button class="btn btn-icon" data-action="move-day" data-delta="1" aria-label="Следующий день">${icon('chevronRight', 18)}</button>
      <button class="btn btn-sm" data-action="today">Сегодня</button>
      <span class="spacer"></span>
      <span class="muted small">${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
    </div>
    <div class="card" style="margin-bottom:16px"><div class="card-body">${meters}
      <div class="row" style="margin-top:14px">
        <button class="btn btn-sm" data-action="copy-plan">${icon('sparkles', 14)}Взять пример рациона на этот день</button>
        <span class="muted tiny">${plan.ready ? `план рассчитан на ${fmtInt(plan.totals.kcal)} ккал` : 'план недоступен без целей'}</span>
      </div>
    </div></div>
    <div class="grid" style="gap:14px">${mealCards}</div>
    <div class="row" style="margin-top:16px">
      <span class="muted small">Итого за день: ${fmtInt(totals.kcal)} ккал · Б ${fmt(totals.protein)} · Ж ${fmt(totals.fat)} · У ${fmt(totals.carbs)} · клетчатка ${fmt(totals.fiber)} г</span>
    </div>
    ${disclaimer()}`

  return {
    html,
    bind(root) {
      root.querySelector('[data-diary-date]')?.addEventListener('change', (event) => {
        const value = event.target.value
        if (value) ctx.navigate('diary', { date: value })
      })
    },
    actions: {
      'move-day': (element) => {
        const delta = Number(element.dataset.delta) || 0
        ctx.navigate('diary', { date: addDays(date, delta) })
      },
      today: () => ctx.navigate('diary', { date: today }),
      'add-entry': (element) => openAddFoodModal(ctx, { date, meal: element.dataset.meal }),
      'edit-entry': (element) => openEditEntryModal(ctx, { date, meal: element.dataset.meal, entryId: element.dataset.id }),
      'delete-entry': (element) => {
        ctx.store.deleteFoodEntry(client.id, date, element.dataset.meal, element.dataset.id)
        ctx.toast('Запись удалена')
        ctx.render()
      },
      'custom-food': () => openCustomFoodModal(ctx),
      'copy-plan': () => {
        if (!plan.ready) {
          ctx.toast('Сначала заполните анкету и цель')
          return
        }
        if (!confirm('Заменить дневник за этот день примером рациона?')) return
        ctx.store.setDay(client.id, date, planToDayEntries(plan, date))
        ctx.toast('Пример рациона добавлен в дневник')
        ctx.render()
      },
    },
  }
}

function escape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
