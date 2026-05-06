import { state }        from './state.js'
import { $, jobIconUrl } from './helpers.js'
import { t }             from './i18n.js'
import { renderSearch }  from './search.js'

const chevronSvg = `<svg class="job-select-chevron" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`

export function buildJobFilter() {
  const jobFilterBar = $('job-filter-bar')
  const allJobs = [{ id: '', name: t('jobs.all'), iconId: -1 }, ...state.jobs]

  const trigger = document.createElement('button')
  trigger.className = 'job-select-trigger'
  trigger.id        = 'job-select-trigger'
  trigger.innerHTML = `<span class="job-select-icon"></span><span class="job-select-label">${t('jobs.all')}</span>${chevronSvg}`

  const dropdown = document.createElement('div')
  dropdown.className = 'job-select-dropdown hidden'
  dropdown.id        = 'job-select-dropdown'

  for (const job of allJobs) {
    const iconId   = job.iconId ?? -1
    const iconHtml = iconId > 0
      ? `<img src="${jobIconUrl(iconId)}" alt="" onerror="this.style.display='none'" />`
      : `<span class="job-option-no-icon"></span>`
    const opt = document.createElement('div')
    opt.className    = 'job-option' + (job.id === '' ? ' active' : '')
    opt.dataset.jobId = job.id
    const label = job.id === '' ? t('jobs.all') : job.name
    opt.innerHTML = `${iconHtml}<span>${label}</span>`
    opt.addEventListener('click', () => setJobFilter(job.id, label, iconId))
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

export function setJobFilter(jobId, jobName, iconId) {
  state.activeJobId = String(jobId)

  const trigger  = $('job-select-trigger')
  const iconHtml = iconId > 0
    ? `<img src="${jobIconUrl(iconId)}" alt="" />`
    : `<span class="job-select-icon"></span>`
  trigger.innerHTML = `${iconHtml}<span class="job-select-label">${jobName ?? t('jobs.all')}</span>${chevronSvg}`

  $('job-select-dropdown').querySelectorAll('.job-option').forEach(opt => {
    opt.classList.toggle('active', String(opt.dataset.jobId) === state.activeJobId)
  })

  $('job-filter-bar').classList.remove('open')
  $('job-select-dropdown').classList.add('hidden')
  renderSearch()
}
