import { test, expect } from '@playwright/test'

test('routes shows elapsed and moving time', async ({ page }) => {
  await page.goto('/apps/routes/')
  await expect(page.getByTestId('stat-distance')).toHaveText('4.02 km')
  await expect(page.getByTestId('stat-elapsed')).toHaveText('—')
  await expect(page.getByTestId('stat-moving')).toHaveText('—')
  await page.getByTestId('sample').selectOption('samples/riverside-loop.gpx')
  await expect(page.getByTestId('stat-distance')).toHaveText('9.11 km')
  await expect(page.getByTestId('stat-elapsed')).toHaveText('—')

  const pt = (lon, t) => `<trkpt lat="0" lon="${lon}"><time>2026-01-01T00:0${t}:00Z</time></trkpt>`
  const gpx = `<gpx><trk><trkseg>${pt(0, 0)}${pt(0.001, 1)}${pt(0.001, 2)}</trkseg></trk></gpx>`
  await page.getByTestId('file').setInputFiles({ name: 'timed.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(gpx) })
  await expect(page.locator('#route-name')).toHaveText('timed')
  await expect(page.getByTestId('stat-elapsed')).toHaveText('0:02:00')
  await expect(page.getByTestId('stat-moving')).toHaveText('0:01:00')
})
