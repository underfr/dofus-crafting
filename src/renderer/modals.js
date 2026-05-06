import { state }                              from './state.js'
import { $, iconUrl, formatKamas }            from './helpers.js'
import { t }                                  from './i18n.js'
import { addToCraftQueue, renderCraftQueue }  from './queue.js'
import { renderShoppingList, schedulePricesSave } from './shopping.js'

let pendingRecipe      = null
let pendingPriceItemId = null

// ── Qty modal ──────────────────────────────────────────────────────────────

export function openQtyModal(recipe) {
  pendingRecipe = recipe
  const item = state.itemById[recipe.resultId]
  $('qty-modal-title').textContent = recipe.resultName
  $('qty-input').value = 1
  $('qty-item-preview').innerHTML = `
    <img src="${iconUrl(item?.iconId ?? 0)}" alt="" />
    <div>
      <div class="qty-preview-name">${recipe.resultName}</div>
      <div class="qty-preview-meta">${recipe._jobName} · ${t('item.levelFull', { n: recipe.resultLevel })}</div>
    </div>
  `
  $('qty-modal').classList.remove('hidden')
  setTimeout(() => { $('qty-input').focus(); $('qty-input').select() }, 50)
}

export function closeQtyModal() {
  $('qty-modal').classList.add('hidden')
  pendingRecipe = null
}

export function confirmQty() {
  if (!pendingRecipe) return
  const qty = Math.max(1, parseInt($('qty-input').value) || 1)
  addToCraftQueue(pendingRecipe, qty)
  closeQtyModal()
}

// ── Price modal ────────────────────────────────────────────────────────────

export function openPriceModal(itemId, name, iconId) {
  pendingPriceItemId = itemId
  $('price-modal-title').textContent = name
  $('price-input').value = state.prices[itemId] ?? ''
  $('price-item-preview').innerHTML = `
    <img src="${iconUrl(iconId)}" alt="" />
    <div>
      <div class="qty-preview-name">${name}</div>
      <div class="qty-preview-meta">${state.prices[itemId] ? formatKamas(state.prices[itemId]) + ' ' + t('price.perUnit') : t('price.notDefined')}</div>
    </div>
  `
  $('price-modal').classList.remove('hidden')
  setTimeout(() => { $('price-input').focus(); $('price-input').select() }, 50)
}

export function closePriceModal() {
  $('price-modal').classList.add('hidden')
  pendingPriceItemId = null
}

export function confirmPrice() {
  if (pendingPriceItemId === null) return
  const val = parseInt($('price-input').value)
  if (val > 0) state.prices[pendingPriceItemId] = val
  else delete state.prices[pendingPriceItemId]
  schedulePricesSave()
  renderShoppingList()
  closePriceModal()
}

export function clearPrice() {
  if (pendingPriceItemId === null) return
  delete state.prices[pendingPriceItemId]
  schedulePricesSave()
  renderShoppingList()
  closePriceModal()
}
