import { state }                               from './state.js'
import { $, iconUrl, jobIconUrl }              from './helpers.js'
import { t }                                   from './i18n.js'
import { showTooltip, positionTooltip, hideTooltip } from './tooltip.js'
import { openQtyModal }                        from './modals.js'

export function getFiltered() {
  const q = $('search-input').value.trim().toLowerCase()
  return Object.values(state.recipeByResultId).filter(r => {
    if (state.activeJobId && String(r.jobId) !== state.activeJobId) return false
    if (q && !r.resultName.toLowerCase().includes(q)) return false
    return true
  }).sort((a, b) => a.resultLevel - b.resultLevel || a.resultName.localeCompare(b.resultName, 'fr'))
}

export function renderSearch() {
  const searchInput   = $('search-input')
  const searchClear   = $('search-clear')
  const searchResults = $('search-results')
  const resultMeta    = $('result-meta')

  const recipes = getFiltered()
  const q       = searchInput.value.trim()
  searchClear.classList.toggle('hidden', !q)
  searchResults.innerHTML = ''

  const total = Object.keys(state.recipeByResultId).length
  resultMeta.textContent = recipes.length === total
    ? t('search.total', { n: total })
    : t('search.results', { n: recipes.length, s: recipes.length > 1 ? 's' : '', total })

  if (recipes.length === 0) {
    searchResults.innerHTML = `<li class="empty-state"><span>${t('search.noResults', { q })}</span></li>`
    return
  }

  const limit = 80
  for (const recipe of recipes.slice(0, limit)) {
    const item   = state.itemById[recipe.resultId]
    const iconId = item?.iconId ?? 0
    const li     = document.createElement('li')
    li.className = 'item-entry'
    li.innerHTML = `
      <img class="item-icon" src="${iconUrl(iconId)}" alt="" />
      <div class="item-info">
        <div class="item-name">${recipe.resultName}</div>
        <div class="item-meta">
          ${recipe.jobId !== 1 ? `<span class="item-meta-job">
            <img src="${jobIconUrl(state.jobIconIdMap[recipe.jobId] ?? -1)}" alt="" />
            ${recipe._jobName}
          </span>
          <span>·</span>` : ''}
          <span>${t('item.ingredients', { n: recipe.ingredientIds.length, s: recipe.ingredientIds.length > 1 ? 's' : '' })}</span>
        </div>
      </div>
      <span class="item-level">${t('item.level', { n: recipe.resultLevel })}</span>
    `
    li.addEventListener('click',      ()  => openQtyModal(recipe))
    li.addEventListener('mouseenter', (e) => showTooltip(e, recipe))
    li.addEventListener('mousemove',  (e) => positionTooltip(e, $('item-tooltip')))
    li.addEventListener('mouseleave', hideTooltip)
    searchResults.appendChild(li)
  }

  if (recipes.length > limit) {
    const li = document.createElement('li')
    li.className = 'empty-state'
    li.innerHTML = `<span>${t('search.more', { n: recipes.length - limit })}</span>`
    searchResults.appendChild(li)
  }
}
