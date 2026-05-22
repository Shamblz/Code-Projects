import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = resolve(__dirname, '..', 'public');

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.4" r="0.8">
      <stop offset="0%" stop-color="#16584a"/>
      <stop offset="60%" stop-color="#0b3d2e"/>
      <stop offset="100%" stop-color="#06251c"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f5d976"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#a8841f"/>
    </linearGradient>
    <radialGradient id="goldRim" cx="0.5" cy="0.4" r="0.6">
      <stop offset="0%" stop-color="#f5d976"/>
      <stop offset="100%" stop-color="#a8841f"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative chip on the left -->
  <g transform="translate(220 315)">
    <circle r="220" fill="url(#goldRim)"/>
    <g fill="#0b3d2e">
      <rect x="-10" y="-218" width="20" height="38" rx="4"/>
      <rect x="-10" y="180" width="20" height="38" rx="4"/>
      <rect x="-218" y="-10" width="38" height="20" rx="4"/>
      <rect x="180" y="-10" width="38" height="20" rx="4"/>
    </g>
    <circle r="170" fill="#0b3d2e"/>
    <circle r="170" fill="none" stroke="#d4af37" stroke-width="2" opacity="0.7"/>
    <text y="78" text-anchor="middle"
          font-family="Georgia, serif" font-size="230" font-weight="900"
          fill="url(#gold)"
          stroke="#7a5f12" stroke-width="2">A</text>
  </g>

  <!-- Gold double border around the canvas -->
  <rect x="20" y="20" width="1160" height="590" fill="none" stroke="#d4af37" stroke-width="3" rx="20"/>
  <rect x="32" y="32" width="1136" height="566" fill="none" stroke="#d4af37" stroke-width="1" rx="14" opacity="0.5"/>

  <!-- Text block on the right -->
  <g transform="translate(490 200)">
    <text font-family="Georgia, serif" font-size="22" fill="#d4af37" letter-spacing="6">TEXAS HOLD'EM · CHIP COMPANION</text>
    <text y="110" font-family="Georgia, serif" font-size="118" font-weight="900" fill="url(#gold)">Athena</text>
    <text y="220" font-family="Georgia, serif" font-size="118" font-weight="900" fill="#f5e8c7">Chips</text>
    <text y="290" font-family="Georgia, serif" font-size="26" fill="#f5e8c7" opacity="0.85">Bring your own deck.</text>
    <text y="328" font-family="Georgia, serif" font-size="26" fill="#f5e8c7" opacity="0.85">We'll handle the chips.</text>
  </g>
</svg>`;

await sharp(Buffer.from(ogSvg))
  .resize(1200, 630)
  .png()
  .toFile(resolve(PUB, 'og.png'));

console.log('  ✓ og.png (1200x630)');
