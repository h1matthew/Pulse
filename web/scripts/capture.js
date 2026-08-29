/**
 * One-off screenshot capture for the FBLA presentation deck.
 * Logs in as the seeded demo judge account, walks every required feature,
 * and saves 1920x1080 PNGs into ../../assets/.
 *
 * Run: cd web && node scripts/capture.js
 */
const { chromium } = require('playwright')
const path = require('path')

const BASE = 'http://localhost:3000'
const OUT = path.resolve(__dirname, '../../assets')
const EMAIL = 'judge@pulse.demo'
const PASSWORD = process.env.DEMO_PASSWORD
if (!PASSWORD) {
  console.error('DEMO_PASSWORD is not set. Export it before running capture.js.')
  process.exit(1)
}

const shot = async (page, name) => {
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(OUT, name) })
  console.log('captured', name)
}

async function solvePuzzleCaptcha(page) {
  const captcha = page.locator('[data-testid="baanihali-captcha"]')
  await captcha.waitFor({ state: 'visible', timeout: 10000 })
  const bgSrc = await captcha.locator('img').first().getAttribute('src')
  const svg = decodeURIComponent(bgSrc.replace('data:image/svg+xml;utf8,', ''))
  const m = svg.match(/<rect\s+x="(\d+)"\s+y="74"/)
  const offset = Number(m[1])
  // move the slider via the native value setter so React registers the change
  await captcha.locator('input[type="range"]').evaluate((el, value) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value').set
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, offset)
  return captcha
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    geolocation: { latitude: 34.0286, longitude: -117.8103 }, // Diamond Bar, CA
    permissions: ['geolocation'],
  })
  const page = await context.newPage()

  const dismissTour = async () => {
    const skip = page.getByRole('button', { name: /skip tour/i })
    if (await skip.isVisible().catch(() => false)) {
      await skip.click()
      await page.waitForTimeout(500)
    }
  }

  // ---- 1. Home page + onboarding tour (in-app instructions) ----------------
  await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(1500)
  if (await page.getByRole('button', { name: /skip tour/i }).isVisible().catch(() => false)) {
    await shot(page, 'app-onboarding-tour.png')
  }
  await dismissTour()
  await shot(page, 'app-home.png')

  // ---- 2. Login (bot verification screenshot happens here) ----------------
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' }).catch(() => {})
  await dismissTour()
  const form = page.locator('form', { has: page.locator('input[type="password"]') }).first()
  await form.locator('input[type="email"]').fill(EMAIL)
  await form.locator('input[type="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: /verify captcha/i }).click()
  const captcha = await solvePuzzleCaptcha(page)
  await shot(page, 'app-bot-verification.png') // puzzle aligned, modal open
  await page.locator('button', { hasText: /^Verify$/ }).last().click()
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForURL((u) => !u.pathname.includes('login'), { timeout: 20000 })
    .catch(() => console.warn('login redirect not detected'))
  console.log('logged in, url:', page.url())

  // ---- 3. Discover: category sort ------------------------------------------
  await page.goto(`${BASE}/discover`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(4000) // let business cards + images load
  const foodChip = page.getByRole('button', { name: /food & drink/i }).first()
  if (await foodChip.isVisible().catch(() => false)) await foodChip.click()
  else {
    const tab = page.getByText(/food & drink/i).first()
    if (await tab.isVisible().catch(() => false)) await tab.click()
  }
  await page.waitForTimeout(1500)
  await shot(page, 'app-category-sort.png')

  // ---- 4. Discover: sort by rating (dropdown open) -------------------------
  await page.locator('[aria-label="Sort businesses by"]').click()
  await page.waitForTimeout(600)
  await shot(page, 'app-rating-sort.png') // options visible: Top rated etc.
  await page.getByRole('option', { name: /top rated/i }).click()
  await page.waitForTimeout(1000)

  // ---- 5. Review form on a business page -----------------------------------
  const res = await page.request.get(`${BASE}/api/businesses?limit=30`)
  const { businesses } = await res.json()
  const target = businesses.find(
    (b) => Array.isArray(b.photos) && b.photos.length > 0 && b.review_count > 0
  ) || businesses[0]
  await page.goto(`${BASE}/business/${target.id}`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(2500)
  const reviewsTab = page.getByRole('tab', { name: /reviews/i }).first()
  if (await reviewsTab.isVisible().catch(() => false)) await reviewsTab.click()
  await page.waitForTimeout(1000)
  const writeHeader = page.getByText('Write a Review').first()
  if (await writeHeader.isVisible().catch(() => false)) {
    await writeHeader.scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: 'Rate 4 stars' }).click()
    await page.locator('#review-content').fill(
      'Wonderful neighborhood spot — the owners greet you by name and the quality beats any chain. Highly recommend supporting them!'
    )
    await page.waitForTimeout(400)
  }
  await shot(page, 'app-review-form.png')

  // ---- 6. Bookmarks ---------------------------------------------------------
  await page.goto(`${BASE}/bookmarks`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(2500)
  await shot(page, 'app-bookmarks.png')

  // ---- 7. Deals -------------------------------------------------------------
  await page.goto(`${BASE}/deals`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(2500)
  await shot(page, 'app-deals.png')

  // ---- 8. Assistant (intelligent feature) ----------------------------------
  await page.goto(`${BASE}/assistant`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(1500)
  const input = page.getByPlaceholder(/ask about local businesses/i).last()
  await input.fill('Find me a cozy local coffee shop with wifi')
  await input.press('Enter')
  // wait for the streamed answer (Gemini); fall back to whatever rendered
  await page.waitForTimeout(15000)
  await shot(page, 'app-intelligent-feature.png')

  // ---- 9. Dashboard + customizable impact report ----------------------------
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(3000)
  await shot(page, 'app-dashboard.png')
  const reportBtn = page.getByRole('button', { name: /download my impact report/i })
  if (await reportBtn.isVisible().catch(() => false)) {
    await reportBtn.click()
    await page.waitForTimeout(2500)
    await shot(page, 'app-impact-report.png')
  } else {
    console.warn('report button not found')
  }

  await browser.close()
  console.log('all done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
