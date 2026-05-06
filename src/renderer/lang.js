import { state }                            from './state.js'
import { $ }                               from './helpers.js'
import { t, setI18nLang, getI18nLang, applyI18n } from './i18n.js'
import { renderSearch }                    from './search.js'
import { renderCraftQueue }                from './queue.js'
import { renderShoppingList }              from './shopping.js'
import { buildJobFilter }                  from './jobs.js'

export function buildLangSelector(availableLangs) {
  const container = $('lang-selector')
  container.innerHTML = ''
  for (const lang of availableLangs) {
    const btn = document.createElement('button')
    btn.className    = 'lang-btn' + (lang === getI18nLang() ? ' active' : '')
    btn.textContent  = lang.toUpperCase()
    btn.dataset.lang = lang
    btn.addEventListener('click', () => setLanguage(lang))
    container.appendChild(btn)
  }
}

export async function setLanguage(lang) {
  if (lang === getI18nLang()) return
  setI18nLang(lang)
  localStorage.setItem('lang', lang)

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang)
  })
  applyI18n()

  const data = await window.api.loadData(lang)
  if (data.error) return

  state.itemById         = {}
  state.recipeByResultId = {}
  for (const item of data.items)   state.itemById[item.id]               = item
  for (const r    of data.recipes) state.recipeByResultId[r.resultId]    = r
  state.itemsExtra = data.items_extra || {}

  const jobById = {}
  for (const job of data.jobs) jobById[job.id] = job
  for (const r of data.recipes) r._jobName = jobById[r.jobId]?.name ?? ''

  state.craftQueue = state.craftQueue.map(({ recipe, qty }) => {
    const r = state.recipeByResultId[recipe.resultId]
    return r ? { recipe: r, qty } : null
  }).filter(Boolean)

  $('job-filter-bar').innerHTML = ''
  state.jobs = data.jobs
    .filter(j => j.name && Object.values(state.recipeByResultId).some(r => r.jobId === j.id))
  state.activeJobId = ''
  buildJobFilter()

  renderSearch()
  renderCraftQueue()
  renderShoppingList()
}
