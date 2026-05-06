import { state }                from './state.js'
import { $, iconUrl }          from './helpers.js'
import { renderShoppingList }  from './shopping.js'

let _saveTimer = null

export function scheduleQueueSave() {
  clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    window.api.saveQueue(state.craftQueue.map(e => ({ resultId: e.recipe.resultId, qty: e.qty })))
  }, 500)
}

export function addToCraftQueue(recipe, qty) {
  const ex = state.craftQueue.find(e => e.recipe.resultId === recipe.resultId)
  if (ex) ex.qty += qty
  else state.craftQueue.push({ recipe, qty })
  renderCraftQueue()
  renderShoppingList()
  scheduleQueueSave()
}

export function removeFromQueue(resultId) {
  state.craftQueue = state.craftQueue.filter(e => e.recipe.resultId !== resultId)
  renderCraftQueue()
  renderShoppingList()
  scheduleQueueSave()
}

export function updateQty(resultId, delta) {
  const e = state.craftQueue.find(e => e.recipe.resultId === resultId)
  if (!e) return
  e.qty = Math.max(1, e.qty + delta)
  renderCraftQueue()
  renderShoppingList()
  scheduleQueueSave()
}

export function setQty(resultId, val) {
  const e = state.craftQueue.find(e => e.recipe.resultId === resultId)
  if (!e) return
  e.qty = Math.max(1, val)
  renderShoppingList()
  scheduleQueueSave()
}

export function renderCraftQueue() {
  const craftQueueEl = $('craft-queue')
  const craftCount   = $('craft-count')
  const craftEmpty   = $('craft-empty')
  const btnClearAll  = $('btn-clear-all')

  craftQueueEl.innerHTML = ''
  const n = state.craftQueue.length
  craftCount.textContent = n
  craftCount.classList.toggle('zero', n === 0)
  craftEmpty.classList.toggle('hidden', n > 0)
  btnClearAll.classList.toggle('hidden', n === 0)

  for (const { recipe, qty } of state.craftQueue) {
    const item = state.itemById[recipe.resultId]
    const li   = document.createElement('li')
    li.className = 'craft-entry'
    li.innerHTML = `
      <img class="craft-icon" src="${iconUrl(item?.iconId ?? 0)}" alt="" />
      <span class="craft-name">${recipe.resultName}</span>
      <div class="craft-qty-row">
        <button class="btn-qty" data-action="dec" data-id="${recipe.resultId}">−</button>
        <input class="craft-qty" type="number" value="${qty}" min="1" max="9999" data-id="${recipe.resultId}" />
        <button class="btn-qty" data-action="inc" data-id="${recipe.resultId}">+</button>
      </div>
      <button class="btn-remove" data-id="${recipe.resultId}" title="Retirer">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `
    craftQueueEl.appendChild(li)
  }
}
