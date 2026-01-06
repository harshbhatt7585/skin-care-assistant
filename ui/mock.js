const SAMPLE_AUTO_PROMPT = 'Please send product links and shopping options for this plan.'
const SAMPLE_SUMMARY = 'Focus today: calm cheek redness, rebuild barrier strength, keep the T-zone matte but comfortable.'
const SAMPLE_ANALYSIS_HTML = `
  <p><strong>Scan readout</strong></p>
  <ul>
    <li>Mild sensitivity through the cheeks + nose; look for fragrance-free hydration.</li>
    <li>T-zone is a touch oilier with a few clogged pores — clarify without stripping.</li>
    <li>Overall tone looks even with light post-acne shadowing on the jaw.</li>
  </ul>
  <p><strong>AM ritual</strong></p>
  <ol>
    <li>Rinse with a creamy cleanser or micellar water to avoid over-cleansing.</li>
    <li>Mist or pat on a copper peptide essence for anti-inflammatory support.</li>
    <li>Follow with a gel-cream rich in glycerin + beta glucan to lock in water.</li>
    <li>Spot treat congestion with a 2% salicylic serum, only on the T-zone.</li>
    <li>Seal with a mineral SPF 40 that includes zinc oxide for redness control.</li>
  </ol>
  <p><strong>PM ritual</strong></p>
  <ol>
    <li>Double cleanse on makeup days (balm + low-foam gel).</li>
    <li>Use a pH-balanced exfoliating toner (mandelic + polyhydroxy) twice weekly.</li>
    <li>Apply an azelaic 10% serum to brighten and keep pores clear.</li>
    <li>Layer a barrier-repair cream with ceramides + cholesterol; press, don’t rub.</li>
    <li>Finish with a drop of squalane over dry patches if you need extra slip.</li>
  </ol>
  <p>Patch test everything along the jaw before committing.</p>
`

const SAMPLE_PRODUCTS_HTML = `
  <p>Shop the lab-approved picks:</p>
  <ul>
    <li>
      <p>Glow Recipe Watermelon Pink Juice</p>
      <p>Oil-free gel moisturizer that soothes flare-ups.<br /><a href="#">Shop Sephora &rarr;</a></p>
      <img src="https://dummyimage.com/400x400/162430/ffffff&text=Glow+Recipe" alt="Glow Recipe moisturizer" />
    </li>
    <li>
      <p>Skinfix Barrier+ Triple Lipid Cream</p>
      <p>Strengthens barrier overnight without heaviness.<br /><a href="#">Skinfix.com &rarr;</a></p>
      <img src="https://dummyimage.com/400x400/10202b/ffffff&text=Skinfix" alt="Skinfix Barrier+ cream" />
    </li>
    <li>
      <p>Paula's Choice 2% BHA Liquid</p>
      <p>T-zone only exfoliant to smooth texture.<br /><a href="#">Paulaschoice.com &rarr;</a></p>
      <img src="https://dummyimage.com/400x400/0f1a26/ffffff&text=BHA" alt="Paula's Choice BHA" />
    </li>
    <li>
      <p>Tula Copper Peptide Drops</p>
      <p>Lightweight essence to calm and plump.<br /><a href="#">Ulta Beauty &rarr;</a></p>
      <img src="https://dummyimage.com/400x400/122030/ffffff&text=Peptides" alt="Tula serum" />
    </li>
  </ul>
  <p><em>Always patch test before a full-face application.</em></p>
`

const SAMPLE_FOLLOW_UPS = [
  `
    <p><strong>Layering tweak</strong></p>
    <ol>
      <li>Apply actives (BHA or azelaic) first, let them dry 60 seconds.</li>
      <li>Press in gel moisturizer while the skin is still slightly damp.</li>
      <li>Top with cream only where you feel tightness. This keeps the T-zone light.</li>
    </ol>
    <p>Always patch test.</p>
  `,
  `
    <p><strong>Travel routine</strong></p>
    <ul>
      <li>Swap cleansing balm for micellar pads during flights.</li>
      <li>Pack silicone-free moisturizer so it layers well with any SPF you pick up.</li>
      <li>Mist with thermal water mid-flight, then seal with squalane while skin is damp.</li>
    </ul>
    <p>Patch test if you grab new products on the go.</p>
  `,
]

const SAMPLE_PHOTO = './sample-face.svg'

const state = getInitialState()
let replyIndex = 0
const timers = []

const elements = {
  status: document.querySelector('[data-status]'),
  heroSummary: document.querySelector('[data-hero-summary]'),
  heroSummaryText: document.querySelector('[data-summary]'),
  resetBtn: document.querySelector('[data-reset]'),
  analysisBanner: document.querySelector('[data-analysis-banner]'),
  uploadPanel: document.querySelector('[data-upload-panel]'),
  chatLayout: document.querySelector('[data-chat-layout]'),
  photoPreview: document.querySelector('[data-photo-preview]'),
  photoSummary: document.querySelector('[data-photo-summary]'),
  messages: document.querySelector('[data-messages]'),
  chatForm: document.querySelector('[data-chat-form]'),
  chatInput: document.querySelector('[data-chat-input]'),
  sendBtn: document.querySelector('[data-send]'),
  uploadError: document.querySelector('[data-error]'),
  fileInput: document.querySelector('[data-photo-input]'),
  sampleBtn: document.querySelector('[data-sample-photo]'),
}

function getInitialState() {
  return {
    photo: null,
    status: 'Upload a clear photo to begin.',
    analysisSummary: '',
    messages: [],
    isLoading: false,
    error: '',
  }
}

function resetState() {
  clearTimers()
  const fresh = getInitialState()
  Object.assign(state, fresh)
  replyIndex = 0
  if (elements.fileInput) {
    elements.fileInput.value = ''
  }
  render()
}

function clearTimers() {
  while (timers.length) {
    const id = timers.pop()
    window.clearTimeout(id)
  }
}

function schedule(fn, delay) {
  const id = window.setTimeout(() => {
    timers.splice(timers.indexOf(id), 1)
    fn()
  }, delay)
  timers.push(id)
}

function render() {
  elements.status.textContent = state.status

  if (state.photo) {
    elements.heroSummary.classList.remove('hidden')
    elements.photoPreview.src = state.photo
    elements.photoPreview.alt = 'Uploaded skin preview'
    elements.photoSummary.textContent =
      state.analysisSummary || 'Photo ready — chatting through details.'
  } else {
    elements.heroSummary.classList.add('hidden')
    elements.photoPreview.removeAttribute('src')
    elements.photoSummary.textContent = 'Photo ready — chatting through details.'
  }

  elements.heroSummaryText.textContent =
    state.analysisSummary || 'Photo ready — chatting through details.'

  elements.resetBtn.classList.toggle('hidden', !state.photo)
  elements.uploadPanel.classList.toggle('hidden', Boolean(state.photo))
  elements.chatLayout.classList.toggle('hidden', !state.photo)

  const showBanner = state.status.startsWith('Analyzing face')
  elements.analysisBanner.classList.toggle('hidden', !showBanner)
  if (showBanner) {
    elements.analysisBanner.querySelector('p').textContent = state.status
  }

  if (state.error) {
    elements.uploadError.textContent = state.error
    elements.uploadError.classList.remove('hidden')
  } else {
    elements.uploadError.textContent = ''
    elements.uploadError.classList.add('hidden')
  }

  renderMessages()
  updateSendButton()
}

function renderMessages() {
  elements.messages.innerHTML = ''

  state.messages.forEach((message) => {
    const bubble = document.createElement('article')
    bubble.className = message.role === 'user' ? 'bubble bubble--user' : 'bubble'

    if (message.role === 'user') {
      bubble.innerHTML = `<p>${escapeHtml(message.content)}</p>`
    } else {
      bubble.innerHTML = message.html
    }

    elements.messages.appendChild(bubble)
  })

  if (state.isLoading) {
    const typing = document.createElement('p')
    typing.className = 'typing'
    typing.textContent = 'Assistant is thinking…'
    elements.messages.appendChild(typing)
  }

  elements.messages.scrollTop = elements.messages.scrollHeight
}

function updateSendButton() {
  const hasInput = Boolean(elements.chatInput.value.trim())
  elements.sendBtn.disabled = !state.photo || state.isLoading || !hasInput
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const dataUrl = await readFileAsDataUrl(file)
    beginMockRun(dataUrl)
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Unable to read that file.'
    render()
  }
}

function beginMockRun(photoSource) {
  clearTimers()
  state.photo = photoSource
  state.messages = []
  state.error = ''
  state.isLoading = true
  state.analysisSummary = 'Photo uploaded — reading your skin profile...'
  state.status = 'Analyzing face…'
  render()
  simulateAutoRun()
}

function simulateAutoRun() {
  schedule(() => {
    state.status = 'Connecting with the cosmetist...'
    render()
  }, 900)

  schedule(() => {
    state.status = 'Pulling live product matches...'
    state.analysisSummary = 'Gathering live shopping picks...'
    state.messages.push({ role: 'user', content: SAMPLE_AUTO_PROMPT })
    render()
  }, 1700)

  schedule(() => {
    state.messages.push({ role: 'assistant', html: SAMPLE_ANALYSIS_HTML })
    render()
  }, 2500)

  schedule(() => {
    state.messages.push({ role: 'assistant', html: SAMPLE_PRODUCTS_HTML })
    state.status = 'Done. Ask anything else or upload again to iterate.'
    state.analysisSummary = SAMPLE_SUMMARY
    state.isLoading = false
    render()
  }, 3200)
}

function handleSend(event) {
  event.preventDefault()
  if (!state.photo || state.isLoading) return

  const text = elements.chatInput.value.trim()
  if (!text) return

  state.messages.push({ role: 'user', content: text })
  elements.chatInput.value = ''
  render()
  respondWithMockReply()
}

function respondWithMockReply() {
  state.isLoading = true
  render()

  schedule(() => {
    const html = SAMPLE_FOLLOW_UPS[replyIndex % SAMPLE_FOLLOW_UPS.length]
    replyIndex += 1
    state.messages.push({ role: 'assistant', html })
    state.isLoading = false
    state.status = 'Reply delivered — keep experimenting.'
    render()
  }, 1200)
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read that file.'))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unexpected file format.'))
        return
      }
      resolve(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function escapeHtml(input) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

if (elements.chatForm) {
  elements.chatForm.addEventListener('submit', handleSend)
}

if (elements.chatInput) {
  elements.chatInput.addEventListener('input', updateSendButton)
}

if (elements.fileInput) {
  elements.fileInput.addEventListener('change', handleFileChange)
}

if (elements.resetBtn) {
  elements.resetBtn.addEventListener('click', resetState)
}

if (elements.sampleBtn) {
  elements.sampleBtn.addEventListener('click', () => beginMockRun(SAMPLE_PHOTO))
}

render()
