/**
 * Шаблоны приёмов пищи. Граммы — базовые, генератор масштабирует порции под
 * энергетическую цель приёма и корректирует белок. Все ингредиенты ссылаются
 * на id из foods.js.
 */
const t = (id, meal, name, items, note = '') => ({ id, meal, name, items, note })

export const MEAL_TEMPLATES = [
  // Завтраки
  t('b1', 'breakfast', 'Овсянка с ягодами и грецким орехом', [
    { food: 'oats', grams: 60 }, { food: 'milk', grams: 200 }, { food: 'blueberry', grams: 80 },
    { food: 'walnuts', grams: 12 }, { food: 'honey', grams: 8 },
  ], 'Овсянку варить на молоке, сверху — ягоды, орехи и мёд.'),
  t('b2', 'breakfast', 'Омлет с овощами и цельнозерновым тостом', [
    { food: 'eggs', grams: 120 }, { food: 'tomato', grams: 80 }, { food: 'bell_pepper', grams: 60 },
    { food: 'olive_oil', grams: 5 }, { food: 'bread_whole', grams: 60 },
  ]),
  t('b3', 'breakfast', 'Творог с бананом и семенами льна', [
    { food: 'cottage_cheese', grams: 200 }, { food: 'banana', grams: 100 },
    { food: 'flaxseed', grams: 10 }, { food: 'honey', grams: 5 },
  ]),
  t('b4', 'breakfast', 'Греческий йогурт с чиа и голубикой', [
    { food: 'greek_yogurt', grams: 220 }, { food: 'chia', grams: 12 },
    { food: 'blueberry', grams: 100 }, { food: 'almonds', grams: 10 },
  ]),
  t('b5', 'breakfast', 'Булгур с яйцом и шпинатом', [
    { food: 'bulgur', grams: 50 }, { food: 'eggs', grams: 100 },
    { food: 'spinach', grams: 80 }, { food: 'olive_oil', grams: 5 },
  ]),
  t('b7', 'breakfast', 'Тофу-скрэмбл с овощами', [
    { food: 'tofu', grams: 180 }, { food: 'tomato', grams: 80 }, { food: 'spinach', grams: 60 },
    { food: 'olive_oil', grams: 6 }, { food: 'bread_whole', grams: 50 },
  ]),

  // Обеды
  t('l1', 'lunch', 'Курица с гречкой и овощным салатом', [
    { food: 'chicken_breast', grams: 150 }, { food: 'buckwheat', grams: 70 },
    { food: 'tomato', grams: 100 }, { food: 'cucumber', grams: 100 }, { food: 'olive_oil', grams: 8 },
  ]),
  t('l2', 'lunch', 'Лосось с бурым рисом и брокколи', [
    { food: 'salmon', grams: 150 }, { food: 'rice_brown', grams: 70 },
    { food: 'broccoli', grams: 150 }, { food: 'olive_oil', grams: 6 },
  ]),
  t('l3', 'lunch', 'Индейка с киноа и овощами', [
    { food: 'turkey_breast', grams: 150 }, { food: 'quinoa', grams: 70 },
    { food: 'bell_pepper', grams: 100 }, { food: 'zucchini', grams: 100 }, { food: 'olive_oil', grams: 8 },
  ]),
  t('l4', 'lunch', 'Чечевица с овощами и ржаным хлебом', [
    { food: 'lentils', grams: 80 }, { food: 'carrot', grams: 100 }, { food: 'tomato', grams: 100 },
    { food: 'olive_oil', grams: 8 }, { food: 'bread_rye', grams: 40 },
  ]),
  t('l5', 'lunch', 'Говядина с картофелем и капустой', [
    { food: 'beef_lean', grams: 140 }, { food: 'potato', grams: 250 },
    { food: 'cabbage', grams: 120 }, { food: 'olive_oil', grams: 6 },
  ]),
  t('l6', 'lunch', 'Тофу с рисом и брокколи в соевом соусе', [
    { food: 'tofu', grams: 200 }, { food: 'rice_white', grams: 70 },
    { food: 'broccoli', grams: 150 }, { food: 'soy_sauce', grams: 10 }, { food: 'sunflower_oil', grams: 6 },
  ]),

  // Ужины
  t('d1', 'dinner', 'Треска с картофелем и брокколи', [
    { food: 'cod', grams: 180 }, { food: 'potato', grams: 200 },
    { food: 'broccoli', grams: 150 }, { food: 'olive_oil', grams: 8 },
  ]),
  t('d2', 'dinner', 'Творог с овощным салатом', [
    { food: 'cottage_cheese', grams: 200 }, { food: 'cucumber', grams: 100 },
    { food: 'tomato', grams: 100 }, { food: 'bread_rye', grams: 40 }, { food: 'olive_oil', grams: 5 },
  ]),
  t('d3', 'dinner', 'Курица с овощами на гриле', [
    { food: 'chicken_breast', grams: 150 }, { food: 'eggplant', grams: 100 },
    { food: 'zucchini', grams: 100 }, { food: 'bell_pepper', grams: 80 }, { food: 'olive_oil', grams: 8 },
  ]),
  t('d4', 'dinner', 'Омлет с овощным салатом', [
    { food: 'eggs', grams: 150 }, { food: 'cucumber', grams: 100 }, { food: 'tomato', grams: 100 },
    { food: 'olive_oil', grams: 6 }, { food: 'bread_whole', grams: 40 },
  ]),
  t('d5', 'dinner', 'Креветки с пастой и шпинатом', [
    { food: 'shrimp', grams: 150 }, { food: 'pasta', grams: 60 },
    { food: 'tomato', grams: 100 }, { food: 'spinach', grams: 80 }, { food: 'olive_oil', grams: 8 },
  ]),
  t('d6', 'dinner', 'Индейка с тыквой и зелёным горошком', [
    { food: 'turkey_breast', grams: 150 }, { food: 'pumpkin', grams: 250 },
    { food: 'green_peas', grams: 80 }, { food: 'olive_oil', grams: 8 },
  ]),
  t('d7', 'dinner', 'Лосось с овощами', [
    { food: 'salmon', grams: 130 }, { food: 'broccoli', grams: 150 },
    { food: 'zucchini', grams: 120 }, { food: 'olive_oil', grams: 6 },
  ]),

  // Перекусы
  t('s1', 'snack', 'Яблоко с миндалём', [
    { food: 'apple', grams: 150 }, { food: 'almonds', grams: 12 },
  ]),
  t('s2', 'snack', 'Творог с огурцом', [
    { food: 'cottage_cheese', grams: 150 }, { food: 'cucumber', grams: 100 },
  ]),
  t('s3', 'snack', 'Банан с греческим йогуртом', [
    { food: 'banana', grams: 100 }, { food: 'greek_yogurt', grams: 120 },
  ]),
  t('s4', 'snack', 'Хумус с морковью', [
    { food: 'hummus', grams: 60 }, { food: 'carrot', grams: 150 },
  ]),
  t('s5', 'snack', 'Протеиновый коктейль', [
    { food: 'whey', grams: 25 }, { food: 'milk', grams: 250 }, { food: 'banana', grams: 80 },
  ]),
  t('s6', 'snack', 'Кефир с семенами льна', [
    { food: 'kefir', grams: 250 }, { food: 'flaxseed', grams: 8 },
  ]),
]

export const TEMPLATES_BY_MEAL = {
  breakfast: MEAL_TEMPLATES.filter((template) => template.meal === 'breakfast'),
  lunch: MEAL_TEMPLATES.filter((template) => template.meal === 'lunch'),
  dinner: MEAL_TEMPLATES.filter((template) => template.meal === 'dinner'),
  snack: MEAL_TEMPLATES.filter((template) => template.meal === 'snack'),
}

export const MEAL_LABELS = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
}

/** Доли суточной энергии по приёмам пищи. */
export const MEAL_ENERGY_SHARE = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
}
