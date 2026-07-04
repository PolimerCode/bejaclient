// Generates NSIS installer sidebar BMP (164x314) and header BMP (150x57)
// Uses jimp — already in devDependencies
const Jimp = require('jimp')
const path = require('path')

const ROOT     = path.resolve(__dirname, '..')
const LOGO     = path.join(ROOT, 'resources', 'icon.png')
const OUT_DIR  = path.join(ROOT, 'resources', 'installer')

const BG       = 0x111316FF  // deep dark
const SURFACE  = 0x1a1c1eff  // card surface
const ACCENT   = 0x3eb8ffFF  // blue accent
const WHITE    = 0xffffffff
const MUTED    = 0x333639ff

async function generateSidebar() {
  // 164x314 — Welcome/Finish page sidebar
  const W = 164, H = 314
  const img = new Jimp(W, H, BG)

  // Subtle vertical accent bar on right edge
  for (let y = 0; y < H; y++) {
    img.setPixelColor(MUTED, W - 1, y)
  }

  // Top gradient strip (accent color fade)
  for (let x = 0; x < W - 1; x++) {
    const alpha = Math.round((1 - x / (W - 1)) * 60)
    const c = Jimp.rgbaToInt(62, 184, 255, alpha)
    img.setPixelColor(c, x, 0)
    img.setPixelColor(c, x, 1)
  }

  // Bottom accent strip
  for (let x = 0; x < W - 1; x++) {
    img.setPixelColor(ACCENT, x, H - 2)
    img.setPixelColor(ACCENT, x, H - 1)
  }

  // Load + composite BC logo (white inverted), 56x56, centered at y=90
  const logo = await Jimp.read(LOGO)
  logo.resize(56, 56)
  logo.greyscale()
  logo.invert()
  // Make dark pixels transparent so only white logo shows on dark bg
  logo.scan(0, 0, logo.bitmap.width, logo.bitmap.height, (x, y, idx) => {
    const r = logo.bitmap.data[idx]
    if (r < 60) logo.bitmap.data[idx + 3] = 0  // transparent for dark pixels
  })

  const logoX = Math.floor((W - 56) / 2)
  img.composite(logo, logoX, 72)

  // "BejaClient" text using bitmap font (two lines for balance)
  const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
  const font14 = await Jimp.loadFont(Jimp.FONT_SANS_14_BLACK)

  const line1 = 'Beja'
  const line2 = 'Client'
  const w1 = Jimp.measureText(font32, line1)
  const w2 = Jimp.measureText(font32, line2)

  img.print(font32, Math.floor((W - w1) / 2), 142, line1)
  img.print(font32, Math.floor((W - w2) / 2), 174, line2)

  // BETA badge — small accent bar
  const badgeW = 46, badgeH = 14, badgeX = Math.floor((W - badgeW) / 2), badgeY = 214
  for (let bx = badgeX; bx < badgeX + badgeW; bx++) {
    for (let by = badgeY; by < badgeY + badgeH; by++) {
      img.setPixelColor(0xcc0000ff, bx, by)
    }
  }
  const fontBeta = await Jimp.loadFont(Jimp.FONT_SANS_8_WHITE)
  const betaText = 'BETA'
  const betaW = Jimp.measureText(fontBeta, betaText)
  img.print(fontBeta, Math.floor(badgeX + (badgeW - betaW) / 2), badgeY + 3, betaText)

  await img.writeAsync(path.join(OUT_DIR, 'sidebar.bmp'))
  console.log('[installer-bmp] sidebar.bmp written (164x314)')
}

async function generateWelcomeTopImage() {
  // 493x58 — top banner for welcome/finish pages (replaces white MUI header area)
  const W = 493, H = 58
  const img = new Jimp(W, H, BG)

  // Right side lighter panel
  for (let x = W - 120; x < W; x++) {
    for (let y = 0; y < H; y++) {
      img.setPixelColor(SURFACE, x, y)
    }
  }

  // Bottom border line
  for (let x = 0; x < W; x++) {
    img.setPixelColor(ACCENT, x, H - 1)
  }

  // Logo on right side, centered vertically
  const logo = await Jimp.read(LOGO)
  logo.resize(36, 36)
  logo.greyscale()
  logo.invert()
  logo.scan(0, 0, logo.bitmap.width, logo.bitmap.height, (x, y, idx) => {
    const r = logo.bitmap.data[idx]
    if (r < 60) logo.bitmap.data[idx + 3] = 0
  })
  img.composite(logo, W - 78, 11)

  await img.writeAsync(path.join(OUT_DIR, 'header.bmp'))
  console.log('[installer-bmp] header.bmp written (493x58)')
}

;(async () => {
  try {
    await generateSidebar()
    await generateWelcomeTopImage()
    console.log('[installer-bmp] Done.')
  } catch (e) {
    console.error('[installer-bmp] Failed:', e)
    process.exit(1)
  }
})()
