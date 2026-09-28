const sharp = require('sharp');
const fs = require('fs');

const LOGO = 'src/assets/yealead.png';
const OUT = 'public/icons';
const BG = '#f86635';

fs.mkdirSync(OUT, { recursive: true });

(async () => {
  for (const size of [192, 512]) {
    const logoSize = Math.round(size * 0.7);
    const logo = await sharp(LOGO)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(`${OUT}/icon-${size}.png`);

    console.log(`✅ ${OUT}/icon-${size}.png`);
  }
})();