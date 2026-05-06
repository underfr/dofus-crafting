import { state }                          from './state.js'
import { $, iconUrl, formatKamas, kamasSvg } from './helpers.js'
import { t }                               from './i18n.js'

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

// Maps characteristic IDs (language-independent) to icon keys.
// IDs verified against actual game data from items_extra.json.
const CHARACTERISTIC_ICON_MAP = {
  1:   'pa',        // PA
  10:  'earth',     // Force
  11:  'health',    // Vitalité
  12:  'wisdom',    // Sagesse
  13:  'water',     // Chance
  14:  'air',       // Agilité
  15:  'fire',      // Intelligence
  16:  'damage',    // Dommage
  18:  'critDmg',   // Critique
  19:  'range',     // Portée
  23:  'pm',        // PM
  25:  'power',     // Puissance
  26:  'invoc',     // Invocation
  27:  'dodgePA',   // Esquive PA
  28:  'dodgePM',   // Esquive PM
  33:  'earth',     // Résistance Terre %
  34:  'fire',      // Résistance Feu %
  35:  'water',     // Résistance Eau %
  36:  'air',       // Résistance Air %
  37:  'neutral',   // Résistance Neutre %
  40:  'pods',      // Pods
  44:  'initiative',// Initiative
  48:  'prosp',     // Prospection
  49:  'health',    // Soin
  54:  'earth',     // Résistance Terre
  55:  'fire',      // Résistance Feu
  56:  'water',     // Résistance Eau
  57:  'air',       // Résistance Air
  58:  'neutral',   // Résistance Neutre
  78:  'flee',      // Fuite
  79:  'tacle',     // Tacle
  82:  'attackPA',  // Retrait PA
  83:  'attackPM',  // Retrait PM
  84:  'push',      // Dommage Poussée
  85:  'pushRes',   // Résistance Poussée
  86:  'critDmg',   // Dommage Critiques
  87:  'critDmg',   // Résistance Critiques
  88:  'earth',     // Dommage Terre
  89:  'fire',      // Dommage Feu
  90:  'water',     // Dommage Eau
  91:  'air',       // Dommage Air
  92:  'neutral',   // Dommage Neutre
  120: 'range',     // Dommages distance
  121: 'range',     // Résistance distance
  122: 'damage',    // Dommages d'armes
  123: 'damage',    // Dommages aux sorts
  124: 'damage',    // Résistance mêlée
  125: 'damage',    // Dommages mêlée
}

// Maps baseEffectId to icon keys — weapon on-hit effects (IDs from actual game data).
const BASE_EFFECT_ICON_MAP = {
  14:  'neutral',  // dommages Neutre
  36:  'pm',       // retire PM sur frappe
  37:  'pa',       // retire PA sur frappe
  53:  'water',    // dommages Eau
  54:  'earth',    // dommages Terre
  55:  'fire',     // dommages Feu
  56:  'air',      // dommages Air
  57:  'neutral',  // vol Neutre
  58:  'fire',     // vol Feu
  59:  'air',      // vol Air
  60:  'earth',    // vol Terre
  61:  'water',    // vol Eau
  65:  'fire',     // soins Feu
  88:  'health',   // dommages % PV du lanceur
  108: 'pa',       // retire PA (ex: Baguette Larvesque)
  469: 'damage',   // dommages du meilleur élément
  475: 'damage',   // vol du meilleur élément
  488: 'pm',       // retire PM
  511: 'push',     // repousse de # case
  535: 'push',     // attire de # case
  539: 'pm',       // vole PM
}

// baseEffectIds that belong to the weapon-attack section of the tooltip
const WEAPON_BASE_EFFECT_IDS = new Set([
  13,          // vole Kamas
  14,          // dommages Neutre
  36,          // retire PM sur frappe
  37,          // retire PA sur frappe
  53, 54, 55, 56,          // dommages eau/terre/feu/air
  57, 58, 59, 60, 61,      // vol neutre/feu/air/terre/eau
  65,          // soins Feu
  88,          // dommages % PV
  108,         // retire PA
  324,         // arme de chasse
  469,         // dommages meilleur élément
  475,         // vol meilleur élément
  488,         // retire PM
  511,         // repousse
  535,         // attire
  539,         // vole PM
])

function getStatIcon(eff) {
  if (eff.characteristic) {
    const key = CHARACTERISTIC_ICON_MAP[eff.characteristic]
    if (key) return STAT_ICONS[key]
  }
  const key = BASE_EFFECT_ICON_MAP[eff.baseEffectId]
  return key ? STAT_ICONS[key] : null
}

function renderEffectList(ul, effects) {
  ul.innerHTML = ''
  for (const eff of effects) {
    const li = document.createElement('li')
    li.className = 'tooltip-effect-item'
    const iconSrc = getStatIcon(eff)
    li.innerHTML = iconSrc
      ? `<img class="tooltip-effect-icon" src="${iconSrc}" alt="" /><span>${eff.description}</span>`
      : `<span class="tooltip-effect-dot"></span><span>${eff.description}</span>`
    ul.appendChild(li)
  }
}

export function showTooltip(e, recipe) {
  const tooltip = $('item-tooltip')
  const item    = state.itemById[recipe.resultId]
  const extra   = state.itemsExtra[recipe.resultId] || {}

  tooltip.querySelector('.tooltip-name').textContent = recipe.resultName
  const metaParts = [t('item.levelFull', { n: recipe.resultLevel })]
  if (recipe._jobName) metaParts.push(recipe._jobName)
  tooltip.querySelector('.tooltip-meta').textContent = metaParts.join(' · ')
  tooltip.querySelector('.tooltip-icon').src = iconUrl(item?.iconId ?? 0)

  const priceEl   = tooltip.querySelector('.tooltip-price')
  const unitPrice = state.prices[recipe.resultId]
  if (unitPrice) {
    priceEl.innerHTML = `${formatKamas(unitPrice)} ${kamasSvg}`
    priceEl.classList.remove('hidden')
  } else {
    priceEl.classList.add('hidden')
  }

  const allEffects  = (extra.effects || []).filter(e => e.description)
  const weaponEffects = allEffects.filter(e => WEAPON_BASE_EFFECT_IDS.has(e.baseEffectId))
  const statEffects   = allEffects.filter(e => !WEAPON_BASE_EFFECT_IDS.has(e.baseEffectId))

  // Weapon attack section
  const weaponSection = $('tooltip-weapon-section')
  if (weaponEffects.length > 0) {
    renderEffectList($('tooltip-weapon-effects'), weaponEffects)
    weaponSection.classList.remove('hidden')
  } else {
    weaponSection.classList.add('hidden')
  }

  // Item stat effects section
  const effectsSection = $('tooltip-effects-section')
  if (statEffects.length > 0) {
    renderEffectList($('tooltip-effects'), statEffects)
    effectsSection.classList.remove('hidden')
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

export function positionTooltip(e, tooltip) {
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

export function hideTooltip() {
  $('item-tooltip').classList.add('hidden')
}
