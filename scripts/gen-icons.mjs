// Renders the PWA icons from the brand mark: `node scripts/gen-icons.mjs`.
import { writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const PULSE = 'M4.5 13h3.2l2-5.2 3.4 9.4 2.3-6.2h4.1'
// Regular: rounded tile. Maskable: full-bleed background with the mark inside the 80% safe zone.
const regular = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" rx="6" fill="#d9601a"/><path d="${PULSE}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#d9601a"/><g transform="translate(3.6 3.6) scale(0.7)"><path d="${PULSE}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`

const render = (svg, size, file) =>
  writeFileSync(file, new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng())

render(regular, 192, 'public/icons/icon-192.png')
render(regular, 512, 'public/icons/icon-512.png')
render(maskable, 512, 'public/icons/maskable-512.png')
render(maskable, 180, 'public/icons/apple-touch-icon.png')
console.log('icons written')
