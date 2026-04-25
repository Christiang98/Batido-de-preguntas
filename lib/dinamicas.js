export const DINAMICAS = [
  { id: "foto",       name: "Foto del celular",                    emoji: "📸", desc: "Elegí una foto de tu celu que sientas que es importante para vos y compartí el por qué.", duration: 5 },
  { id: "amistad",    name: "Lo valoro en alguien",                emoji: "🤝", desc: "Decí qué valorás más en una amistad o en un compañero.", duration: 6 },
  { id: "mapa",       name: "Mapa del año",                        emoji: "🗺️", desc: "Compartí con tu grupo cómo venís transitando este 2026 hasta el momento.", duration: 5 },
  { id: "Viaje",      name: "Ese lugar especial",                  emoji: "🌟", desc: "Nombrá un lugar que marcó tu vida y contá por qué.", duration: 6 },
  { id: "recuerdo",   name: "Recuerdo feliz",                      emoji: "💭", desc: "Compartí un recuerdo que siempre te saque una sonrisa.", duration: 6 },
  { id: "boton",      name: "Botón mágico",                        emoji: "🔴", desc: "Si apretaras un botón y cambiara algo del mundo, ¿qué cambiarías?", duration: 5 },
  { id: "serie",      name: "Personaje que sos",                   emoji: "🎬", desc: "Decí qué personaje de peli o serie sentís que te representa y por qué.", duration: 6 },
  { id: "pregunta",   name: "Pregunta misteriosa",                 emoji: "❓", desc: "Poné una pregunta en un papel. Una vez que estés con tu grupo, mezclen todas y saquen una al azar.", duration: 5 },
  { id: "gracias",    name: "Algo que agradezco",                  emoji: "🙏", desc: "Compartí algo simple por lo que hoy estés agradecido.", duration: 5 },
  { id: "musica",     name: "Tema que te define",                  emoji: "🎶", desc: "Nombrá una canción que sentís que te representa.", duration: 5 },
  { id: "orgullo",    name: "Algo de lo que me siento orgulloso",  emoji: "🏆", desc: "Compartí algo que hayas logrado y que valorés mucho.", duration: 6 },
  { id: "mentor",     name: "Persona que admiro",                  emoji: "👏", desc: "Nombrá una persona que admires y contá por qué.", duration: 5 },
  { id: "futuro2",    name: "Sueño pendiente",                     emoji: "✨", desc: "¿Qué sueño importante te gustaría cumplir algún día?", duration: 6 },
  { id: "huella",     name: "Cómo quiero ser recordado",           emoji: "🌍", desc: "¿Qué huella te gustaría dejar en los demás?", duration: 7 },
  { id: "limite",     name: "Algo que aprendí a soltar",           emoji: "🍂", desc: "Contá algo que antes cargabas y hoy aprendiste a dejar ir.", duration: 7 },
  { id: "fortaleza",  name: "Mi mayor fortaleza",                  emoji: "💪", desc: "¿Qué cualidad tuya sentís que más te ayuda en la vida?", duration: 6 },
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

export function makeGroupsWithRotation(participants, size, pairHistory = {}) {
  const n = participants.length;
  if (n < 2) return { groups: [participants], newPairHistory: pairHistory };

  let bestGroups = null;
  let bestScore = Infinity;

  const attempts = Math.min(200, Math.max(50, n * 10));

  for (let attempt = 0; attempt < attempts; attempt++) {
    const shuffled = shuffleArray(participants);
    const groups = [];
    for (let i = 0; i < shuffled.length; i += size) {
      groups.push(shuffled.slice(i, i + size));
    }

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
    if (bestScore === 0) break;
  }

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
