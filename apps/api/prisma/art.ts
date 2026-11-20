/** Generador de «pinturas» para los datos de demostración: composiciones planas al estilo de los mockups. */

const named: Record<string, string> = {
  'Interior con ventana': '<rect width="100" height="100" fill="#B7C4B0"/><rect x="18" y="14" width="40" height="52" fill="#F4F1E8"/><rect x="24" y="20" width="28" height="40" fill="#7FA3C4"/><rect y="72" width="100" height="28" fill="#8B5E3C"/><circle cx="76" cy="62" r="9" fill="#C1440E"/>',
  Limonero: '<rect width="100" height="100" fill="#2F6B4F"/><path d="M8 92 C30 62 58 72 92 38" stroke="#A7D3A6" stroke-width="6" fill="none"/><circle cx="34" cy="38" r="14" fill="#F2B705"/><circle cx="64" cy="56" r="12" fill="#F2B705"/><circle cx="70" cy="24" r="8" fill="#F2B705"/>',
  Persiana: '<rect width="100" height="100" fill="#FF6B4A"/><rect y="14" width="100" height="10" fill="#FFF4E0"/><rect y="38" width="100" height="10" fill="#FFF4E0"/><rect y="62" width="100" height="10" fill="#FFF4E0"/><circle cx="68" cy="58" r="15" fill="#2340E8"/>',
  'Bañista': '<rect width="100" height="100" fill="#2340E8"/><path d="M50 14 C60 14 62 27 55 32 C70 39 72 59 62 61 L64 90 L54 90 L50 66 L46 90 L36 90 L38 61 C28 59 30 39 45 32 C38 27 40 14 50 14Z" fill="#FFF4E0"/>',
  'Marea ocre': '<rect width="100" height="100" fill="#C8962E"/><rect x="8" y="9" width="84" height="40" fill="#E7C27A"/><rect x="8" y="49" width="84" height="5" fill="#F0DDB0"/><rect x="8" y="54" width="84" height="37" fill="#8C3B1F"/>',
};

const palettes = [
  ['#C8962E', '#E7C27A', '#F0DDB0', '#8C3B1F', '#3E5C76'],
  ['#2340E8', '#FFF4E0', '#FF6B4A', '#F2B705', '#141414'],
  ['#1B7A50', '#A7D3A6', '#F4F1E8', '#C1440E', '#2F4858'],
  ['#7FA3C4', '#E8DCC4', '#3E5C76', '#D9481F', '#F4F1E8'],
  ['#8B5E3C', '#D9B38C', '#F2E6D0', '#4A6741', '#C1440E'],
  ['#5B3758', '#E09F7D', '#F6E7CB', '#2E294E', '#EF6F6C'],
  ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51'],
];

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function procedural(title: string, paletteIndex?: number): string {
  const r = rng(title);
  const p = palettes[paletteIndex ?? Math.floor(r() * palettes.length)];
  const pick = () => p[Math.floor(r() * p.length)];
  const kind = Math.floor(r() * 5);
  const bg = p[0];
  let s = `<rect width="100" height="100" fill="${bg}"/>`;
  if (kind === 0) {
    // franjas de horizonte (serie de mareas)
    let y = 6 + r() * 6;
    while (y < 92) {
      const h = 6 + r() * 26;
      s += `<rect x="7" y="${y.toFixed(1)}" width="86" height="${Math.min(h, 93 - y).toFixed(1)}" fill="${pick()}"/>`;
      y += h;
    }
  } else if (kind === 1) {
    // bodegón: mesa y frutas
    s += `<rect y="${60 + r() * 10}" width="100" height="40" fill="${p[3]}"/>`;
    for (let i = 0; i < 3; i++) s += `<circle cx="${20 + i * 25 + r() * 10}" cy="${55 + r() * 8}" r="${7 + r() * 7}" fill="${pick()}"/>`;
    s += `<rect x="${55 + r() * 10}" y="20" width="14" height="40" rx="3" fill="${p[2]}"/>`;
  } else if (kind === 2) {
    // ventana / interior
    s += `<rect x="${10 + r() * 30}" y="${10 + r() * 10}" width="${30 + r() * 20}" height="${40 + r() * 15}" fill="${p[2]}"/>`;
    s += `<rect x="${16 + r() * 30}" y="${16 + r() * 10}" width="${20 + r() * 10}" height="${30 + r() * 10}" fill="${p[1]}"/>`;
    s += `<rect y="${74 + r() * 6}" width="100" height="30" fill="${p[3]}"/>`;
    s += `<path d="M70 ${70 + r() * 4} C 66 50 82 46 78 30 C 90 42 86 60 80 ${70 + r() * 4} Z" fill="${p[4]}"/>`;
  } else if (kind === 3) {
    // sol y paisaje
    s += `<circle cx="${30 + r() * 40}" cy="${22 + r() * 15}" r="${10 + r() * 10}" fill="${p[3]}"/>`;
    s += `<path d="M0 ${60 + r() * 10} C 25 ${45 + r() * 10} 55 ${70 + r() * 8} 100 ${50 + r() * 10} L100 100 L0 100Z" fill="${p[1]}"/>`;
    s += `<path d="M0 ${78 + r() * 6} C 35 ${68 + r() * 8} 65 ${86 + r() * 6} 100 ${74 + r() * 6} L100 100 L0 100Z" fill="${p[4]}"/>`;
  } else {
    // recortes abstractos
    for (let i = 0; i < 5; i++) {
      const x = r() * 70, y = r() * 70, w = 15 + r() * 35, h = 15 + r() * 35;
      s += r() > 0.5
        ? `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${pick()}" transform="rotate(${(r() * 16 - 8).toFixed(1)} 50 50)"/>`
        : `<circle cx="${(x + 15).toFixed(1)}" cy="${(y + 15).toFixed(1)}" r="${(w / 2).toFixed(1)}" fill="${pick()}"/>`;
    }
  }
  return s;
}

/** Devuelve un SVG del tamaño indicado (px) con textura de pintura sutil. */
export function paintingSvg(title: string, widthCm: number, heightCm: number, paletteIndex?: number, px = 1400): string {
  const w = widthCm >= heightCm ? px : Math.round((px * widthCm) / heightCm);
  const h = widthCm >= heightCm ? Math.round((px * heightCm) / widthCm) : px;
  const body = named[title] ?? procedural(title, paletteIndex);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
  <defs><filter id="t" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${title.length}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.10 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
  <g>${body}</g><rect width="100" height="100" filter="url(#t)"/></svg>`;
}

export function avatarSvg(initials: string, bg: string, fg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect width="480" height="480" fill="${bg}"/><text x="240" y="300" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="200" fill="${fg}">${initials}</text></svg>`;
}
