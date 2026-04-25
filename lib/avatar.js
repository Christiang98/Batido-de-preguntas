const PALETTES = [
  { bg: 'rgba(232,25,44,0.18)',  fg: '#ff6b7a', border: 'rgba(232,25,44,0.35)' },
  { bg: 'rgba(240,180,41,0.18)', fg: '#ffd166', border: 'rgba(240,180,41,0.35)' },
  { bg: 'rgba(0,229,160,0.15)',  fg: '#00e5a0', border: 'rgba(0,229,160,0.3)' },
  { bg: 'rgba(99,102,241,0.18)', fg: '#a5b4fc', border: 'rgba(99,102,241,0.35)' },
  { bg: 'rgba(236,72,153,0.15)', fg: '#f9a8d4', border: 'rgba(236,72,153,0.3)' },
  { bg: 'rgba(14,165,233,0.15)', fg: '#7dd3fc', border: 'rgba(14,165,233,0.3)' },
  { bg: 'rgba(168,85,247,0.15)', fg: '#d8b4fe', border: 'rgba(168,85,247,0.3)' },
  { bg: 'rgba(34,197,94,0.15)',  fg: '#86efac', border: 'rgba(34,197,94,0.3)' },
]

export function getAvatarPalette(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % PALETTES.length
  return PALETTES[h]
}

export function initials(name) {
  return (name || '').trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
