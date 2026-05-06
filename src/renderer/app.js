'use strict'

// ── State ──────────────────────────────────────────────────────────────────
let itemById = {}
let itemsExtra = {}
let recipeByResultId = {}
let jobs = []
let craftQueue = []
let prices = {}
let pendingRecipe = null
let pendingPriceItemId = null
let iconBaseUrl = ''
let activeJobId = ''

// ── DOM ────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id)
const searchInput    = $('search-input')
const searchClear    = $('search-clear')
const jobFilterBar   = $('job-filter-bar')
const resultMeta     = $('result-meta')
const searchResults  = $('search-results')
const craftQueueEl   = $('craft-queue')
const craftCount     = $('craft-count')
const craftEmpty     = $('craft-empty')
const btnClearAll    = $('btn-clear-all')
const shoppingList   = $('shopping-list')
const buyCount       = $('buy-count')
const shoppingEmpty  = $('shopping-empty')
const subcraftsToggle = $('subcrafts-toggle')

// ── Icon helpers ───────────────────────────────────────────────────────────
const iconUrl    = (iconId)  => `${iconBaseUrl}/${iconId}.png`
const jobIconUrl = (iconId)  => iconId > 0 ? `${iconBaseUrl}/job/${iconId}.png` : ''
let jobIconIdMap = {} // jobId → iconId

// ── Tooltip ────────────────────────────────────────────────────────────────
const STAT_ICONS = {
  health:    'assets/ui/stats/guide_health.png',
  earth:     'assets/ui/stats/guide_earth.png',
  fire:      'assets/ui/stats/guide_fire.png',
  air:       'assets/ui/stats/guide_wind.png',
  water:     'assets/ui/stats/guide_water.png',
  neutral:   'assets/ui/stats/guide_neutral.png',
  wisdom:    'assets/ui/stats/guide_wisdom.png',
  damage:    'assets/ui/stats/guide_damage.png',
  critDmg:   'assets/ui/stats/guide_CriticalDmg.png',
  pa:        'assets/ui/stats/guide_pa.png',
  pm:        'assets/ui/stats/guide_pm.png',
  range:     'assets/ui/stats/guide_po.png',
  initiative:'assets/ui/stats/guide_initiative.png',
  pods:      'assets/ui/stats/guide_pod.png',
  dodgePA:   'assets/ui/stats/guide_dodgePA.png',
  dodgePM:   'assets/ui/stats/guide_dodgePM.png',
  attackPA:  'assets/ui/stats/guide_attackPA.png',
  attackPM:  'assets/ui/stats/guide_attackPM.png',
  pushRes:   'assets/ui/stats/guide_pushRes.png',
  push:      'assets/ui/stats/guide_push.png',
  tacle:     'assets/ui/stats/guide_tacle.png',
  flee:      'assets/ui/stats/guide_flee.png',
  erosion:   'assets/ui/stats/guide_erosion.png',
  power:     'assets/ui/stats/guide_power.png',
  prosp:     'assets/ui/stats/guide_prospection.png',
  invoc:     'assets/ui/stats/guide_invocation.png',
}

function getStatIcon(desc) {
  const d = desc.toLowerCase()
  // Specific combos first
  if (d.includes('esquive pa'))                                    return STAT_ICONS.dodgePA
  if (d.includes('esquive pm'))                                    return STAT_ICONS.dodgePM
  if (d.includes('retrait pa') || d.includes('vol pa'))           return STAT_ICONS.attackPA
  if (d.includes('retrait pm') || d.includes('vol pm'))           return STAT_ICONS.attackPM
  if (d.includes('pousse') && d.includes('r'))                    return STAT_ICONS.pushRes
  if (d.includes('pousse') || d.includes('push'))                 return STAT_ICONS.push
  if (d.includes('critique'))                                      return STAT_ICONS.critDmg
  if (d.includes('puissance'))                                     return STAT_ICONS.power
  if (d.includes('portée') || d.includes('portee'))               return STAT_ICONS.range
  if (d.includes('initiative'))                                    return STAT_ICONS.initiative
  if (d.includes('pods') || d.includes('poids'))                  return STAT_ICONS.pods
  if (d.includes('érosion') || d.includes('erosion'))             return STAT_ICONS.erosion
  if (d.includes('prospection') || d.includes('prospec'))         return STAT_ICONS.prosp
  if (d.includes('invocation'))                                    return STAT_ICONS.invoc
  if (d.includes('tacle'))                                         return STAT_ICONS.tacle
  if (d.includes('fuite'))                                         return STAT_ICONS.flee
  if (d.includes('dommage') || d.includes('damage'))              return STAT_ICONS.damage
  // Stats vitales
  if (d.includes('vitalité') || d.includes('soin') || d.includes('vie')) return STAT_ICONS.health
  if (d.includes('sagesse'))                                       return STAT_ICONS.wisdom
  if (d.includes('force'))                                         return STAT_ICONS.earth
  if (d.includes('intelligence'))                                  return STAT_ICONS.fire
  if (d.includes('agilité'))                                       return STAT_ICONS.air
  if (d.includes('chance'))                                        return STAT_ICONS.water
  // Éléments (résistances, dommages élémentaires)
  if (d.includes('neutre'))                                        return STAT_ICONS.neutral
  if (d.includes('terre'))                                         return STAT_ICONS.earth
  if (d.includes('feu'))                                           return STAT_ICONS.fire
  if (d.includes(' air') || d.endsWith(' air'))                   return STAT_ICONS.air
  if (d.includes('eau'))                                           return STAT_ICONS.water
  // PA/PM (termes courts, en dernier)
  if (/\bpa\b/.test(d))                                           return STAT_ICONS.pa
  if (/\bpm\b/.test(d))                                           return STAT_ICONS.pm
  return null
}

function showTooltip(e, recipe) {
  const tooltip = $('item-tooltip')
  const item = itemById[recipe.resultId]
  const extra = itemsExtra[recipe.resultId] || {}

  tooltip.querySelector('.tooltip-name').textContent = recipe.resultName
  const metaParts = [`Niveau ${recipe.resultLevel}`]
  if (recipe._jobName) metaParts.push(recipe._jobName)
  tooltip.querySelector('.tooltip-meta').textContent = metaParts.join(' · ')
  tooltip.querySelector('.tooltip-icon').src = iconUrl(item?.iconId ?? 0)

  const priceEl = tooltip.querySelector('.tooltip-price')
  const unitPrice = prices[recipe.resultId]
  if (unitPrice) {
    priceEl.innerHTML = `${formatKamas(unitPrice)} ${kamasSvg}`
    priceEl.classList.remove('hidden')
  } else {
    priceEl.classList.add('hidden')
  }

  const effectsList = $('tooltip-effects')
  const effectsSection = $('tooltip-effects-section')
  effectsList.innerHTML = ''
  const effects = (extra.effects || []).filter(e => e.description)
  if (effects.length > 0) {
    effectsSection.classList.remove('hidden')
    for (const eff of effects) {
      const li = document.createElement('li')
      li.className = 'tooltip-effect-item'
      const iconSrc = getStatIcon(eff.description)
      li.innerHTML = iconSrc
        ? `<img class="tooltip-effect-icon" src="${iconSrc}" alt="" /><span>${eff.description}</span>`
        : `<span class="tooltip-effect-dot"></span><span>${eff.description}</span>`
      effectsList.appendChild(li)
    }
  } else {
    effectsSection.classList.add('hidden')
  }

  const descEl = $('tooltip-description')
  if (extra.description) {
    descEl.textContent = extra.description
    descEl.classList.remove('hidden')
  } else {
    descEl.classList.add('hidden')
  }

  tooltip.classList.remove('hidden')
  positionTooltip(e, tooltip)
}

function positionTooltip(e, tooltip) {
  const W = window.innerWidth, H = window.innerHeight
  const TW = tooltip.offsetWidth, TH = tooltip.offsetHeight
  let x = e.clientX + 18
  let y = e.clientY - 10
  if (x + TW > W - 8) x = e.clientX - TW - 18
  if (y + TH > H - 8) y = H - TH - 8
  if (y < 8) y = 8
  tooltip.style.left = x + 'px'
  tooltip.style.top  = y + 'px'
}

function hideTooltip() {
  $('item-tooltip').classList.add('hidden')
}

// ── Helpers ────────────────────────────────────────────────────────────────
const kamasSvg = `<img class="kamas-icon" src="assets/ui/kamas.png" alt="kamas" />`

function formatKamas(n) {
  return Math.round(n).toLocaleString('fr-FR')
}

// ── Queue persistence ──────────────────────────────────────────────────────
let _saveTimer = null
function scheduleQueueSave() {
  clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    window.api.saveQueue(craftQueue.map(e => ({ resultId: e.recipe.resultId, qty: e.qty })))
  }, 500)
}

// ── Prices persistence ─────────────────────────────────────────────────────
let _pricesTimer = null
function schedulePricesSave() {
  clearTimeout(_pricesTimer)
  _pricesTimer = setTimeout(() => {
    window.api.savePrices(prices)
  }, 500)
}

// ── Boot ───────────────────────────────────────────────────────────────────
async function init() {
  $('loading-msg').textContent = 'Chargement des données…'
  const minWait = new Promise(r => setTimeout(r, 3000))

  const port = await window.api.getIconPort()
  iconBaseUrl = `http://127.0.0.1:${port}`

  const data = await window.api.loadData()
  if (data.error) {
    $('loading-msg').textContent = data.error
    return
  }

  for (const item of data.items)   itemById[item.id] = item
  for (const r    of data.recipes) recipeByResultId[r.resultId] = r
  itemsExtra = data.items_extra || {}

  const jobById = {}
  for (const job of data.jobs) {
    jobById[job.id] = job
    jobIconIdMap[job.id] = job.iconId ?? -1
  }

  const recipeCountByJob = {}
  for (const r of data.recipes) recipeCountByJob[r.jobId] = (recipeCountByJob[r.jobId] || 0) + 1

  jobs = data.jobs
    .filter(j => j.name && (recipeCountByJob[j.id] || 0) > 0)
    .map(j => j.id === 1 ? { ...j, name: 'Divers' } : j)

  for (const r of data.recipes) r._jobName = jobById[r.jobId]?.name ?? ''

  buildJobFilter()

  const saved = await window.api.loadQueue()
  for (const { resultId, qty } of saved) {
    const recipe = recipeByResultId[resultId]
    if (recipe) craftQueue.push({ recipe, qty })
  }

  prices = await window.api.loadPrices()

  await minWait
  $('loading').classList.add('hidden')

  // Yield to the browser to paint the hidden loading screen before heavy DOM work
  await new Promise(r => requestAnimationFrame(r))
  renderCraftQueue()
  renderShoppingList()
  renderSearch()
  bindEvents()
}

// ── Job filter ─────────────────────────────────────────────────────────────
const chevronSvg = `<svg class="job-select-chevron" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`

function buildJobFilter() {
  const allJobs = [{ id: '', name: 'Tous les métiers', iconId: -1 }, ...jobs]

  const trigger = document.createElement('button')
  trigger.className = 'job-select-trigger'
  trigger.id = 'job-select-trigger'
  trigger.innerHTML = `<span class="job-select-icon"></span><span class="job-select-label">Tous les métiers</span>${chevronSvg}`

  const dropdown = document.createElement('div')
  dropdown.className = 'job-select-dropdown hidden'
  dropdown.id = 'job-select-dropdown'

  for (const job of allJobs) {
    const iconId = job.iconId ?? -1
    const iconHtml = iconId > 0
      ? `<img src="${jobIconUrl(iconId)}" alt="" onerror="this.style.display='none'" />`
      : `<span class="job-option-no-icon"></span>`
    const opt = document.createElement('div')
    opt.className = 'job-option' + (job.id === '' ? ' active' : '')
    opt.dataset.jobId = job.id
    opt.innerHTML = `${iconHtml}<span>${job.name}</span>`
    opt.addEventListener('click', () => setJobFilter(job.id, job.name, iconId))
    dropdown.appendChild(opt)
  }

  jobFilterBar.appendChild(trigger)
  jobFilterBar.appendChild(dropdown)

  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    jobFilterBar.classList.toggle('open')
    dropdown.classList.toggle('hidden')
  })

  document.addEventListener('click', () => {
    jobFilterBar.classList.remove('open')
    dropdown.classList.add('hidden')
  })
}

function setJobFilter(jobId, jobName, iconId) {
  activeJobId = String(jobId)

  const trigger = $('job-select-trigger')
  const iconHtml = iconId > 0
    ? `<img src="${jobIconUrl(iconId)}" alt="" />`
    : `<span class="job-select-icon"></span>`
  trigger.innerHTML = `${iconHtml}<span class="job-select-label">${jobName ?? 'Tous les métiers'}</span>${chevronSvg}`

  $('job-select-dropdown').querySelectorAll('.job-option').forEach(opt => {
    opt.classList.toggle('active', String(opt.dataset.jobId) === activeJobId)
  })

  jobFilterBar.classList.remove('open')
  $('job-select-dropdown').classList.add('hidden')
  renderSearch()
}

// ── Search ─────────────────────────────────────────────────────────────────
function getFiltered() {
  const q = searchInput.value.trim().toLowerCase()
  return Object.values(recipeByResultId).filter(r => {
    if (activeJobId && String(r.jobId) !== activeJobId) return false
    if (q && !r.resultName.toLowerCase().includes(q)) return false
    return true
  }).sort((a, b) => a.resultLevel - b.resultLevel || a.resultName.localeCompare(b.resultName, 'fr'))
}

function renderSearch() {
  const recipes = getFiltered()
  const q = searchInput.value.trim()
  searchClear.classList.toggle('hidden', !q)
  searchResults.innerHTML = ''

  const total = Object.keys(recipeByResultId).length
  resultMeta.textContent = recipes.length === total
    ? `${total} recettes`
    : `${recipes.length} résultat${recipes.length > 1 ? 's' : ''} sur ${total}`

  if (recipes.length === 0) {
    searchResults.innerHTML = `<li class="empty-state"><span>Aucun résultat pour « ${q} »</span></li>`
    return
  }

  const limit = 80
  for (const recipe of recipes.slice(0, limit)) {
    const item = itemById[recipe.resultId]
    const iconId = item?.iconId ?? 0
    const li = document.createElement('li')
    li.className = 'item-entry'
    li.innerHTML = `
      <img class="item-icon" src="${iconUrl(iconId)}" alt="" />
      <div class="item-info">
        <div class="item-name">${recipe.resultName}</div>
        <div class="item-meta">
          ${recipe.jobId !== 1 ? `<span class="item-meta-job">
            <img src="${jobIconUrl(jobIconIdMap[recipe.jobId] ?? -1)}" alt="" />
            ${recipe._jobName}
          </span>
          <span>·</span>` : ''}
          <span>${recipe.ingredientIds.length} ingrédient${recipe.ingredientIds.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      <span class="item-level">Nv ${recipe.resultLevel}</span>
    `
    li.addEventListener('click', () => openQtyModal(recipe))
    li.addEventListener('mouseenter', (e) => showTooltip(e, recipe))
    li.addEventListener('mousemove',  (e) => positionTooltip(e, $('item-tooltip')))
    li.addEventListener('mouseleave', hideTooltip)
    searchResults.appendChild(li)
  }

  if (recipes.length > limit) {
    const li = document.createElement('li')
    li.className = 'empty-state'
    li.innerHTML = `<span>+${recipes.length - limit} résultats — affinez la recherche</span>`
    searchResults.appendChild(li)
  }
}

// ── Qty modal ──────────────────────────────────────────────────────────────
function openQtyModal(recipe) {
  pendingRecipe = recipe
  const item = itemById[recipe.resultId]
  $('qty-modal-title').textContent = recipe.resultName
  $('qty-input').value = 1

  const preview = $('qty-item-preview')
  preview.innerHTML = `
    <img src="${iconUrl(item?.iconId ?? 0)}" alt="" />
    <div>
      <div class="qty-preview-name">${recipe.resultName}</div>
      <div class="qty-preview-meta">${recipe._jobName} · Niveau ${recipe.resultLevel}</div>
    </div>
  `

  $('qty-modal').classList.remove('hidden')
  setTimeout(() => { $('qty-input').focus(); $('qty-input').select() }, 50)
}

function closeQtyModal() {
  $('qty-modal').classList.add('hidden')
  pendingRecipe = null
}

function confirmQty() {
  if (!pendingRecipe) return
  const qty = Math.max(1, parseInt($('qty-input').value) || 1)
  addToCraftQueue(pendingRecipe, qty)
  closeQtyModal()
}

// ── Craft queue ────────────────────────────────────────────────────────────
function addToCraftQueue(recipe, qty) {
  const ex = craftQueue.find(e => e.recipe.resultId === recipe.resultId)
  if (ex) ex.qty += qty
  else craftQueue.push({ recipe, qty })
  renderCraftQueue()
  renderShoppingList()
  scheduleQueueSave()
}

function removeFromQueue(resultId) {
  craftQueue = craftQueue.filter(e => e.recipe.resultId !== resultId)
  renderCraftQueue()
  renderShoppingList()
  scheduleQueueSave()
}

function updateQty(resultId, delta) {
  const e = craftQueue.find(e => e.recipe.resultId === resultId)
  if (!e) return
  e.qty = Math.max(1, e.qty + delta)
  renderCraftQueue()
  renderShoppingList()
  scheduleQueueSave()
}

function setQty(resultId, val) {
  const e = craftQueue.find(e => e.recipe.resultId === resultId)
  if (!e) return
  e.qty = Math.max(1, val)
  renderShoppingList()
  scheduleQueueSave()
}

function renderCraftQueue() {
  craftQueueEl.innerHTML = ''
  const n = craftQueue.length
  craftCount.textContent = n
  craftCount.classList.toggle('zero', n === 0)
  craftEmpty.classList.toggle('hidden', n > 0)
  btnClearAll.classList.toggle('hidden', n === 0)

  for (const { recipe, qty } of craftQueue) {
    const item = itemById[recipe.resultId]
    const li = document.createElement('li')
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

// ── Shopping list ──────────────────────────────────────────────────────────
function computeShopping(autoSub) {
  const needed = {}
  function flatten(resultId, qty) {
    const r = recipeByResultId[resultId]
    if (!r) { needed[resultId] = (needed[resultId] || 0) + qty; return }
    for (let i = 0; i < r.ingredientIds.length; i++) {
      const id = r.ingredientIds[i]
      const q  = r.quantities[i] * qty
      if (autoSub && recipeByResultId[id]) flatten(id, q)
      else needed[id] = (needed[id] || 0) + q
    }
  }
  for (const { recipe, qty } of craftQueue) flatten(recipe.resultId, qty)

  return Object.entries(needed)
    .map(([id, qty]) => ({
      itemId: +id,
      qty,
      name: itemById[+id]?.name ?? `#${id}`,
      iconId: itemById[+id]?.iconId ?? 0,
      isCraftable: !!recipeByResultId[+id],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

function renderShoppingList() {
  shoppingList.innerHTML = ''
  const totalEl = $('shopping-total')

  if (!craftQueue.length) {
    buyCount.textContent = 0
    buyCount.classList.add('zero')
    shoppingEmpty.classList.remove('hidden')
    totalEl.classList.add('hidden')
    return
  }
  shoppingEmpty.classList.add('hidden')
  const items = computeShopping(subcraftsToggle.checked)
  buyCount.textContent = items.length
  buyCount.classList.toggle('zero', items.length === 0)

  let total = 0
  let pricedCount = 0

  for (const { itemId, name, qty, iconId, isCraftable } of items) {
    const unitPrice = prices[itemId]
    const lineTotal = unitPrice ? unitPrice * qty : null
    if (lineTotal !== null) { total += lineTotal; pricedCount++ }

    const priceHtml = lineTotal !== null
      ? `<span class="shopping-price">${formatKamas(lineTotal)} ${kamasSvg}</span>`
      : `<span class="shopping-price unset">—</span>`

    const li = document.createElement('li')
    li.className = 'shopping-entry' + (isCraftable ? ' is-craftable' : '')
    li.dataset.itemId = itemId
    li.dataset.name   = name
    li.dataset.iconId = iconId
    li.innerHTML = `
      <img class="shop-icon" src="${iconUrl(iconId)}" alt="" />
      <span class="shopping-name">${name}${isCraftable ? '<small>craftable</small>' : ''}</span>
      ${priceHtml}
      <span class="shopping-qty">${qty}</span>
    `
    shoppingList.appendChild(li)
  }

  if (pricedCount > 0) {
    const partial = pricedCount < items.length
      ? ` <span class="shopping-total-partial">(${pricedCount}/${items.length} items)</span>` : ''
    $('shopping-total-value').innerHTML = `${formatKamas(total)}${partial}`
    totalEl.classList.remove('hidden')
  } else {
    totalEl.classList.add('hidden')
  }
}

// ── Price modal ────────────────────────────────────────────────────────────
function openPriceModal(itemId, name, iconId) {
  pendingPriceItemId = itemId
  $('price-modal-title').textContent = name
  $('price-input').value = prices[itemId] ?? ''
  $('price-item-preview').innerHTML = `
    <img src="${iconUrl(iconId)}" alt="" />
    <div>
      <div class="qty-preview-name">${name}</div>
      <div class="qty-preview-meta">${prices[itemId] ? formatKamas(prices[itemId]) + ' kamas / unité' : 'Prix non défini'}</div>
    </div>
  `
  $('price-modal').classList.remove('hidden')
  setTimeout(() => { $('price-input').focus(); $('price-input').select() }, 50)
}

function closePriceModal() {
  $('price-modal').classList.add('hidden')
  pendingPriceItemId = null
}

function confirmPrice() {
  if (pendingPriceItemId === null) return
  const val = parseInt($('price-input').value)
  if (val > 0) prices[pendingPriceItemId] = val
  else delete prices[pendingPriceItemId]
  schedulePricesSave()
  renderShoppingList()
  closePriceModal()
}

function clearPrice() {
  if (pendingPriceItemId === null) return
  delete prices[pendingPriceItemId]
  schedulePricesSave()
  renderShoppingList()
  closePriceModal()
}

// ── Events ─────────────────────────────────────────────────────────────────
function bindEvents() {
  searchInput.addEventListener('input', renderSearch)
  searchClear.addEventListener('click', () => { searchInput.value = ''; renderSearch(); searchInput.focus() })
  subcraftsToggle.addEventListener('change', renderShoppingList)
$('btn-clear-all').addEventListener('click', () => { craftQueue = []; renderCraftQueue(); renderShoppingList(); scheduleQueueSave() })

  // Qty modal
  $('qty-cancel').addEventListener('click', closeQtyModal)
  $('qty-confirm').addEventListener('click', confirmQty)
  $('qty-inc').addEventListener('click', () => { $('qty-input').value = +$('qty-input').value + 1 })
  $('qty-dec').addEventListener('click', () => { $('qty-input').value = Math.max(1, +$('qty-input').value - 1) })
  $('qty-input').addEventListener('keydown', e => { if (e.key === 'Enter') confirmQty(); if (e.key === 'Escape') closeQtyModal() })
  $('qty-modal').addEventListener('click', e => { if (e.target === $('qty-modal')) closeQtyModal() })
  document.querySelectorAll('.qty-preset').forEach(btn => {
    btn.addEventListener('click', () => { $('qty-input').value = btn.dataset.val })
  })

  // Price modal
  $('price-confirm').addEventListener('click', confirmPrice)
  $('price-cancel').addEventListener('click', closePriceModal)
  $('price-clear').addEventListener('click', clearPrice)
  $('price-modal').addEventListener('click', e => { if (e.target === $('price-modal')) closePriceModal() })
  $('price-input').addEventListener('keydown', e => { if (e.key === 'Enter') confirmPrice(); if (e.key === 'Escape') closePriceModal() })

  // Shopping list — clic pour définir le prix
  shoppingList.addEventListener('click', e => {
    const entry = e.target.closest('.shopping-entry')
    if (!entry) return
    openPriceModal(+entry.dataset.itemId, entry.dataset.name, +entry.dataset.iconId)
  })

  // Craft queue delegation
  craftQueueEl.addEventListener('click', e => {
    const id = +e.target.closest('[data-id]')?.dataset.id
    if (!id) return
    if (e.target.closest('.btn-remove')) removeFromQueue(id)
    else if (e.target.dataset.action === 'dec') updateQty(id, -1)
    else if (e.target.dataset.action === 'inc') updateQty(id, +1)
  })
  craftQueueEl.addEventListener('change', e => {
    if (e.target.classList.contains('craft-qty')) setQty(+e.target.dataset.id, +e.target.value || 1)
  })


}

init()
