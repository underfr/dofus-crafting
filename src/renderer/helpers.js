import { state } from './state.js'

export const $          = (id) => document.getElementById(id)
export const kamasSvg   = `<img class="kamas-icon" src="assets/ui/kamas.png" alt="kamas" />`
export const iconUrl    = (iconId) => `${state.iconBaseUrl}/${iconId}.png`
export const jobIconUrl = (iconId) => iconId > 0 ? `${state.iconBaseUrl}/job/${iconId}.png` : ''
export const formatKamas = (n) => Math.round(n).toLocaleString('fr-FR')
