import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = resolve(__dirname, '..', 'public');

const SIZES = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
];

const svg = await readFile(resolve(PUB, 'icon.svg'));

for (const { name, size, maskable } of SIZES) {
  let input = svg;
  if (maskable) {
    // For maskable, add ~10% safe-zone padding around the icon
    const inner = Math.round(size * 0.78);
    const buf = await sharp(svg).resize(inner, inner).png().toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 6, g: 37, b: 28, alpha: 1 },
      },
    })
      .composite([{ input: buf, gravity: 'center' }])
      .png()
      .toFile(resolve(PUB, name));
    console.log(`  ✓ ${name} (maskable ${size}x${size})`);
    continue;
  }
  await sharp(input).resize(size, size).png().toFile(resolve(PUB, name));
  console.log(`  ✓ ${name} (${size}x${size})`);
}

// favicon.ico (32x32 single-frame PNG works in modern browsers; .ico fallback)
await sharp(svg).resize(32, 32).png().toFile(resolve(PUB, 'favicon-32.png'));
console.log('  ✓ favicon-32.png');

console.log('\nIcons generated in public/');
