import { state }                                    from './state.js'
import { $ }                                        from './helpers.js'
import { getI18nLang, setI18nLang, applyI18n }      from './i18n.js'
import { buildJobFilter }                           from './jobs.js'
import { buildLangSelector }                        from './lang.js'
import { renderSearch }                             from './search.js'
import { renderCraftQueue, scheduleQueueSave, removeFromQueue, updateQty, setQty } from './queue.js'
import { renderShoppingList }                       from './shopping.js'
import {
  closeQtyModal, confirmQty,
  openPriceModal, closePriceModal, confirmPrice, clearPrice,
} from './modals.js'

// ── Boot ───────────────────────────────────────────────────────────────────

async function init() {
  $('loading-msg').textContent = 'Chargement des données…'
  const minWait = new Promise(r => setTimeout(r, 3000))

  const port = await window.api.getIconPort()
  state.iconBaseUrl = `http://127.0.0.1:${port}`

  const availableLangs = await window.api.getLanguages()
  if (!availableLangs.includes(getI18nLang())) setI18nLang(availableLangs[0] || 'fr')

  const data = await window.api.loadData(getI18nLang())
  if (data.error) {
    $('loading-msg').textContent = data.error
    return
  }

  for (const item of data.items)   state.itemById[item.id]            = item
  for (const r    of data.recipes) state.recipeByResultId[r.resultId] = r
  state.itemsExtra = data.items_extra || {}

  const jobById = {}
  for (const job of data.jobs) {
    jobById[job.id]           = job
    state.jobIconIdMap[job.id] = job.iconId ?? -1
  }

  const recipeCountByJob = {}
  for (const r of data.recipes) recipeCountByJob[r.jobId] = (recipeCountByJob[r.jobId] || 0) + 1

  state.jobs = data.jobs.filter(j => j.name && (recipeCountByJob[j.id] || 0) > 0)

  for (const r of data.recipes) r._jobName = jobById[r.jobId]?.name ?? ''

  buildJobFilter()
  buildLangSelector(availableLangs)
  applyI18n()

  const saved = await window.api.loadQueue()
  for (const { resultId, qty } of saved) {
    const recipe = state.recipeByResultId[resultId]
    if (recipe) state.craftQueue.push({ recipe, qty })
  }

  state.prices = await window.api.loadPrices()

  await minWait
  $('loading').classList.add('hidden')

  await new Promise(r => requestAnimationFrame(r))
  renderCraftQueue()
  renderShoppingList()
  renderSearch()
  bindEvents()
}

// ── Events ─────────────────────────────────────────────────────────────────

function bindEvents() {
  const searchInput = $('search-input')
  const searchClear = $('search-clear')

  searchInput.addEventListener('input', renderSearch)
  searchClear.addEventListener('click', () => {
    searchInput.value = ''
    renderSearch()
    searchInput.focus()
  })

  $('subcrafts-toggle').addEventListener('change', renderShoppingList)
  $('btn-clear-all').addEventListener('click', () => {
    state.craftQueue = []
    renderCraftQueue()
    renderShoppingList()
    scheduleQueueSave()
  })

  // Qty modal
  $('qty-cancel').addEventListener('click', closeQtyModal)
  $('qty-confirm').addEventListener('click', confirmQty)
  $('qty-inc').addEventListener('click', () => { $('qty-input').value = +$('qty-input').value + 1 })
  $('qty-dec').addEventListener('click', () => { $('qty-input').value = Math.max(1, +$('qty-input').value - 1) })
  $('qty-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmQty()
    if (e.key === 'Escape') closeQtyModal()
  })
  $('qty-modal').addEventListener('click', e => { if (e.target === $('qty-modal')) closeQtyModal() })
  document.querySelectorAll('.qty-preset').forEach(btn => {
    btn.addEventListener('click', () => { $('qty-input').value = btn.dataset.val })
  })

  // Price modal
  $('price-confirm').addEventListener('click', confirmPrice)
  $('price-cancel').addEventListener('click', closePriceModal)
  $('price-clear').addEventListener('click', clearPrice)
  $('price-modal').addEventListener('click', e => { if (e.target === $('price-modal')) closePriceModal() })
  $('price-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmPrice()
    if (e.key === 'Escape') closePriceModal()
  })

  // Shopping list — click to set price
  $('shopping-list').addEventListener('click', e => {
    const entry = e.target.closest('.shopping-entry')
    if (!entry) return
    openPriceModal(+entry.dataset.itemId, entry.dataset.name, +entry.dataset.iconId)
  })

  // Craft queue delegation
  $('craft-queue').addEventListener('click', e => {
    const id = +e.target.closest('[data-id]')?.dataset.id
    if (!id) return
    if (e.target.closest('.btn-remove'))        removeFromQueue(id)
    else if (e.target.dataset.action === 'dec') updateQty(id, -1)
    else if (e.target.dataset.action === 'inc') updateQty(id, +1)
  })
  $('craft-queue').addEventListener('change', e => {
    if (e.target.classList.contains('craft-qty')) setQty(+e.target.dataset.id, +e.target.value || 1)
  })
}

init()
