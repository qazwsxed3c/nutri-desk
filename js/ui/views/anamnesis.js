/** Экран «Анкета и анализ». */
import { badge, icon, section } from '../components.js'
import { clientFormHtml, parseClientForm } from '../forms.js'
import { clientPageHead, disclaimer, macroTargetsCard, measurementModal } from '../shared.js'
import { analyzeAnamnesis, calcTargets } from '../../core/nutrition.js'
import { fmt, fmtInt } from '../../core/format.js'

export function anamnesisView(ctx) {
  const { client } = ctx
  const targets = calcTargets(client)
  const analysis = analyzeAnamnesis(client)
  const bmiTone = analysis.bmiCategory.tone === 'alert' ? 'alert' : analysis.bmiCategory.tone === 'warn' ? 'warn' : 'good'

  const findingsHtml = analysis.findings.map((finding) => {
    const tone = finding.severity === 'alert' ? 'alert' : finding.severity === 'warn' ? 'warn' : finding.severity === 'good' ? 'good' : 'info'
    const label = finding.severity === 'alert' ? 'важно' : finding.severity === 'warn' ? 'внимание' : 'к сведению'
    return `<article class="finding tone-${tone}">
      <div class="finding-head"><span class="finding-icon">${icon(finding.severity === 'info' ? 'info' : 'alert', 16)}</span>
        <h3>${escapeText(finding.title)}</h3>${badge(label, tone)}</div>
      <p>${escapeText(finding.detail)}</p>
      <p class="finding-action"><b>Что делать:</b> ${escapeText(finding.action)}</p>
    </article>`
  }).join('')

  const html = `
    ${clientPageHead(client, {
      subtitle: 'Анамнез, жалобы, цели и автоматический разбор: что проверить и на что обратить внимание.',
      actions: `<button class="btn" data-action="add-measurement">${icon('plus', 16)}Измерение</button>
        <a class="btn" href="#/client/${client.id}/results">Результаты</a>`,
    })}
    <div class="grid cols-2" style="align-items:start">
      <div>
        ${section('Анкета клиента', `<form data-form="client" novalidate>
          ${clientFormHtml(client)}
          <div class="form-actions"><button class="btn btn-primary" type="submit">${icon('check', 16)}Сохранить анкету</button></div>
        </form>`, { subtitle: 'После сохранения цели и анализ пересчитываются автоматически.' })}
      </div>
      <div style="display:flex; flex-direction:column; gap:16px">
        ${section('Разбор анкеты', findingsHtml, { subtitle: 'Правила построены на жалобах, состояниях, типе питания и измерениях.' })}
        ${section('ИМТ и вес', `
          <div class="row" style="justify-content:space-between">
            <div><div class="muted tiny">Текущий ИМТ</div><div style="font-size:30px;font-weight:700">${analysis.bmi !== null ? analysis.bmi.toFixed(1) : '—'}</div>
            <div class="muted small">${analysis.bmiCategory.label}</div></div>
            <div class="stat tone-${bmiTone}"><div class="stat-label">Безопасный диапазон</div>
            <div class="stat-value" style="font-size:18px">${safeWeightRange(client)}</div>
            <div class="stat-hint">ИМТ 18,5–25</div></div>
          </div>`)}
        ${macroTargetsCard(targets)}
      </div>
    </div>
    ${disclaimer()}`

  return {
    html,
    actions: {
      'add-measurement': () => measurementModal(ctx, client),
    },
    forms: {
      client(form) {
        const values = Object.fromEntries(new FormData(form))
        ctx.store.updateClient(client.id, parseClientForm(values))
        ctx.toast('Анкета сохранена, цели пересчитаны')
        ctx.render()
      },
    },
  }
}

function escapeText(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function safeWeightRange(client) {
  const height = Number(client.heightCm) / 100
  if (!(height > 0)) return '—'
  const min = (18.5 * height * height).toFixed(1)
  const max = (24.9 * height * height).toFixed(1)
  return `${min}–${max} кг`
}
