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

function getStatIcon(desc) {
  const d = desc.toLowerCase()
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
  if (d.includes('vitalité') || d.includes('soin') || d.includes('vie')) return STAT_ICONS.health
  if (d.includes('sagesse'))                                       return STAT_ICONS.wisdom
  if (d.includes('force'))                                         return STAT_ICONS.earth
  if (d.includes('intelligence'))                                  return STAT_ICONS.fire
  if (d.includes('agilité'))                                       return STAT_ICONS.air
  if (d.includes('chance'))                                        return STAT_ICONS.water
  if (d.includes('neutre'))                                        return STAT_ICONS.neutral
  if (d.includes('terre'))                                         return STAT_ICONS.earth
  if (d.includes('feu'))                                           return STAT_ICONS.fire
  if (d.includes(' air') || d.endsWith(' air'))                   return STAT_ICONS.air
  if (d.includes('eau'))                                           return STAT_ICONS.water
  if (/\bpa\b/.test(d))                                           return STAT_ICONS.pa
  if (/\bpm\b/.test(d))                                           return STAT_ICONS.pm
  return null
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

  const priceEl    = tooltip.querySelector('.tooltip-price')
  const unitPrice  = state.prices[recipe.resultId]
  if (unitPrice) {
    priceEl.innerHTML = `${formatKamas(unitPrice)} ${kamasSvg}`
    priceEl.classList.remove('hidden')
  } else {
    priceEl.classList.add('hidden')
  }

  const effectsList   = $('tooltip-effects')
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
