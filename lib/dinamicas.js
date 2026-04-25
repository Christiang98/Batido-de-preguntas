export const DINAMICAS = [
  { id: "foto",      name: "Foto del celular",          emoji: "📸", desc: "Mostrá la última foto de tu celu y contá por qué está ahí.", duration: 5 },
  { id: "verdades",  name: "Tres verdades y una mentira", emoji: "🎭", desc: "Decí 4 cosas de vos mismo. El grupo adivina cuál es la mentira.", duration: 7 },
  { id: "talento",   name: "Talento oculto",             emoji: "🌟", desc: "Tenés 60 segundos para 'vender' un talento ridículo o inesperado.", duration: 5 },
  { id: "mapa",      name: "Mapa de historias",          emoji: "🗺️", desc: "Nombrá un lugar que marcó tu vida y contá por qué en 1 minuto.", duration: 6 },
  { id: "superpoder",name: "Superpoder inútil",          emoji: "🦸", desc: "¿Qué superpoder tendrías y por qué nunca lo usarías?", duration: 5 },
  { id: "cancion",   name: "Canción del momento",        emoji: "🎵", desc: "Tarareá o describí la canción que más escuchaste esta semana.", duration: 5 },
  { id: "infancia",  name: "De pequeño soñaba con...",   emoji: "✨", desc: "Contá qué querías ser de grande cuando eras chico y por qué.", duration: 6 },
  { id: "miedo",     name: "Mi miedo ridículo",          emoji: "😅", desc: "Compartí algo de lo que tenés miedo que sea gracioso o inesperado.", duration: 5 },
];

export function getRandomDinamica(usedIds = []) {
  const available = DINAMICAS.filter(d => !usedIds.includes(d.id));
  const pool = available.length > 0 ? available : DINAMICAS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Smart rotation: maximiza que cada persona conozca gente nueva cada ronda.
 * Usa un historial de pares para evitar repetir compañeros.
 * 
 * @param {string[]} participants - lista de nombres
 * @param {number} size - tamaño de grupo
 * @param {Object} pairHistory - { "A|B": count } cuántas veces estuvieron juntos
 * @returns {{ groups: string[][], newPairHistory: Object }}
 */
export function makeGroupsWithRotation(participants, size, pairHistory = {}) {
  const n = participants.length;
  if (n < 2) return { groups: [participants], newPairHistory: pairHistory };

  // Intentar varias permutaciones y elegir la que minimiza pares repetidos
  let bestGroups = null;
  let bestScore = Infinity;

  const attempts = Math.min(200, Math.max(50, n * 10));

  for (let attempt = 0; attempt < attempts; attempt++) {
    const shuffled = shuffleArray(participants);
    const groups = [];
    for (let i = 0; i < shuffled.length; i += size) {
      groups.push(shuffled.slice(i, i + size));
    }

    // Score: suma de veces que estos pares ya se juntaron
    let score = 0;
    for (const group of groups) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const key = [group[i], group[j]].sort().join('|');
          score += (pairHistory[key] || 0);
        }
      }
    }

    if (score < bestScore) {
      bestScore = score;
      bestGroups = groups;
    }
    if (bestScore === 0) break; // perfecto, no hay repetidos
  }

  // Actualizar historial de pares
  const newPairHistory = { ...pairHistory };
  for (const group of bestGroups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = [group[i], group[j]].sort().join('|');
        newPairHistory[key] = (newPairHistory[key] || 0) + 1;
      }
    }
  }

  return { groups: bestGroups, newPairHistory };
}
