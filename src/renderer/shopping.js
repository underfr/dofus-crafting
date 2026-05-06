import { state }                          from './state.js'
import { $, iconUrl, formatKamas, kamasSvg } from './helpers.js'
import { t }                               from './i18n.js'

let _pricesTimer = null

export function schedulePricesSave() {
  clearTimeout(_pricesTimer)
  _pricesTimer = setTimeout(() => window.api.savePrices(state.prices), 500)
}

export function computeShopping(autoSub) {
  const needed = {}
  function flatten(resultId, qty) {
    const r = state.recipeByResultId[resultId]
    if (!r) { needed[resultId] = (needed[resultId] || 0) + qty; return }
    for (let i = 0; i < r.ingredientIds.length; i++) {
      const id = r.ingredientIds[i]
      const q  = r.quantities[i] * qty
      if (autoSub && state.recipeByResultId[id]) flatten(id, q)
      else needed[id] = (needed[id] || 0) + q
    }
  }
  for (const { recipe, qty } of state.craftQueue) flatten(recipe.resultId, qty)

  return Object.entries(needed)
    .map(([id, qty]) => ({
      itemId:      +id,
      qty,
      name:        state.itemById[+id]?.name ?? `#${id}`,
      iconId:      state.itemById[+id]?.iconId ?? 0,
      isCraftable: !!state.recipeByResultId[+id],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

export function renderShoppingList() {
  const shoppingList  = $('shopping-list')
  const shoppingEmpty = $('shopping-empty')
  const buyCount      = $('buy-count')
  const totalEl       = $('shopping-total')

  shoppingList.innerHTML = ''

  if (!state.craftQueue.length) {
    buyCount.textContent = 0
    buyCount.classList.add('zero')
    shoppingEmpty.classList.remove('hidden')
    totalEl.classList.add('hidden')
    return
  }

  shoppingEmpty.classList.add('hidden')
  const autoSub = $('subcrafts-toggle').checked
  const items   = computeShopping(autoSub)
  buyCount.textContent = items.length
  buyCount.classList.toggle('zero', items.length === 0)

  let total = 0, pricedCount = 0

  for (const { itemId, name, qty, iconId, isCraftable } of items) {
    const unitPrice = state.prices[itemId]
    const lineTotal = unitPrice ? unitPrice * qty : null
    if (lineTotal !== null) { total += lineTotal; pricedCount++ }

    const priceHtml = lineTotal !== null
      ? `<span class="shopping-price">${formatKamas(lineTotal)} ${kamasSvg}</span>`
      : `<span class="shopping-price unset">—</span>`

    const li = document.createElement('li')
    li.className     = 'shopping-entry' + (isCraftable ? ' is-craftable' : '')
    li.dataset.itemId = itemId
    li.dataset.name   = name
    li.dataset.iconId = iconId
    li.innerHTML = `
      <img class="shop-icon" src="${iconUrl(iconId)}" alt="" />
      <span class="shopping-name">${name}${isCraftable ? `<small>${t('item.craftable')}</small>` : ''}</span>
      ${priceHtml}
      <span class="shopping-qty">${qty}</span>
    `
    shoppingList.appendChild(li)
  }

  if (pricedCount > 0) {
    const partial = pricedCount < items.length
      ? ` <span class="shopping-total-partial">${t('shopping.partial', { n: pricedCount, total: items.length })}</span>` : ''
    $('shopping-total-value').innerHTML = `${formatKamas(total)}${partial}`
    totalEl.classList.remove('hidden')
  } else {
    totalEl.classList.add('hidden')
  }
}
