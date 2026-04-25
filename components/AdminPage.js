import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { db } from '../lib/firebase'
import { ref, onValue, set, get, remove } from 'firebase/database'
import { getAvatarPalette, initials } from '../lib/avatar'
import { DINAMICAS, getRandomDinamica, makeGroupsWithRotation } from '../lib/dinamicas'

const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'siemprelisto'

function Avatar({ name, size = 'normal' }) {
  const p = getAvatarPalette(name)
  return (
    <div
      className={size === 'sm' ? 'av av-sm' : 'av'}
      style={{ background: p.bg, color: p.fg, borderColor: p.border }}
    >
      {initials(name)}
    </div>
  )
}

function groupsToFirebase(groups) {
  const obj = {}
  groups.forEach((g, i) => { obj[`g${i}`] = { members: g.members || g } })
  return obj
}

function groupsFromFirebase(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(g => ({ members: g.members || g }))
  return Object.keys(raw).sort().map(k => ({ members: raw[k].members || [] }))
}

export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [tab, setTab] = useState('participants')
  const [participants, setParticipants] = useState([])
  const [session, setSession] = useState(null)
  const [groups, setGroups] = useState([])
  const [dinamica, setDinamica] = useState(null)
  const [groupSize, setGroupSize] = useState(3)
  const [timerMinutes, setTimerMinutes] = useState(5)
  const [usedDinamicas, setUsedDinamicas] = useState([])
  const [pairHistory, setPairHistory] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authed) return
    const unsubs = []

    unsubs.push(onValue(ref(db, 'participants'), snap => {
      if (snap.exists()) setParticipants(Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })))
      else setParticipants([])
    }))

    unsubs.push(onValue(ref(db, 'session'), snap => {
      if (snap.exists()) setSession(snap.val())
    }))

    unsubs.push(onValue(ref(db, 'groups'), snap => {
      if (snap.exists()) {
        const g = snap.val()
        setGroups(groupsFromFirebase(g.list))
        setDinamica(g.dinamica || null)
        setUsedDinamicas(g.usedDinamicas || [])
        setPairHistory(g.pairHistory || {})
      } else {
        setGroups([]); setDinamica(null)
      }
    }))

    return () => unsubs.forEach(u => u())
  }, [authed])

  function login(e) {
    e.preventDefault()
    if (password === ADMIN_PASS) { setAuthed(true); setPwError('') }
    else setPwError('Contraseña incorrecta.')
  }

  async function generateGroups() {
    if (participants.length < 2) { alert('Necesitás al menos 2 participantes.'); return }
    setLoading(true)
    try {
      const names = participants.map(p => p.name)
      const { groups: rawGroups, newPairHistory } = makeGroupsWithRotation(names, groupSize, pairHistory)
      const list = rawGroups.map(g => ({ members: Array.isArray(g) ? g : g.members || [] }))
      const din = getRandomDinamica(usedDinamicas)
      const newUsed = [...usedDinamicas, din.id]
      const round = (session?.round || 0) + 1
      const timerEnd = Date.now() + timerMinutes * 60 * 1000

      await set(ref(db, 'groups'), {
        list: groupsToFirebase(list),
        dinamica: din,
        usedDinamicas: newUsed,
        pairHistory: newPairHistory,
        timerEnd,
        count: list.length
      })
      await set(ref(db, 'session'), { status: 'active', round })
      setTab('groups')
    } catch (err) {
      alert('Error al generar grupos: ' + err.message)
      console.error(err)
    }
    setLoading(false)
  }

  async function backToWaiting() {
    if (!confirm('¿Volver a la sala de espera?')) return
    await set(ref(db, 'session'), { status: 'waiting', round: session?.round || 0 })
    await remove(ref(db, 'groups'))
    setGroups([]); setDinamica(null); setTab('participants')
  }

  async function resetAll() {
    if (!confirm('¿Borrar TODO y resetear? Esta acción no se puede deshacer.')) return
    await remove(ref(db, 'participants'))
    await remove(ref(db, 'groups'))
    await set(ref(db, 'session'), { status: 'waiting', round: 0 })
    setGroups([]); setParticipants([]); setDinamica(null)
    setPairHistory({}); setUsedDinamicas([])
    setTab('participants')
  }

  async function removeParticipant(id) {
    await remove(ref(db, `participants/${id}`))
  }

  if (!authed) return (
    <>
      <Head>
        <title>Animador — Batallón PCB</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#080c14" />
      </Head>
      <div className="page">
        <div className="shield-hero fu">
          <img src="/escudo.png" alt="Escudo" />
          <div className="hero-battalion">Panel del<br/>Animador</div>
          <div className="hero-motto">Acceso restringido</div>
        </div>

        <form onSubmit={login} className="fu fu1 btn-stack">
          <input
            type="password"
            placeholder="Contraseña..."
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {pwError && <div style={{ fontSize: '13px', color: 'var(--red2)', fontWeight: 600 }}>⚠ {pwError}</div>}
          <button type="submit" className="btn btn-red">Entrar →</button>
        </form>

        <button className="btn btn-ghost fu fu2 mt1" onClick={() => router.push('/')}>
          ← Volver
        </button>
      </div>
    </>
  )

  const isActive = session?.status === 'active'

  return (
    <>
      <Head>
        <title>Animador — Batallón PCB</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#080c14" />
      </Head>
      <div className="page">

        <div className="header fu">
          <img src="/escudo.png" alt="Escudo" className="header-shield" />
          <div className="header-text">
            <div className="header-title">Panel Animador</div>
            <div className="header-sub">Batallón PCB</div>
          </div>
          <div className={`chip ${isActive ? 'chip-gold' : 'chip-green'}`}>
            {isActive ? `⚡ Ronda ${session.round}` : '● Esperando'}
          </div>
        </div>

        <div className="tabs fu fu1">
          <button className={`tab-btn ${tab === 'participants' ? 'on' : ''}`} onClick={() => setTab('participants')}>
            Participantes ({participants.length})
          </button>
          <button className={`tab-btn ${tab === 'groups' ? 'on' : ''}`} onClick={() => setTab('groups')}>
            Grupos ({groups.length})
          </button>
        </div>

        {tab === 'participants' && (
          <div className="fu">
            <div className="counter-block mb1">
              <span className="counter-label">Exploradores anotados</span>
              <span className="counter-num">{participants.length}</span>
            </div>

            <div className="card mb1">
              {participants.length === 0 && (
                <div className="empty">
                  <div className="empty-icon">📋</div>
                  Esperando que se anoten...
                </div>
              )}
              {participants.map(p => (
                <div key={p.id} className="person-row">
                  <Avatar name={p.name} />
                  <span className="person-name">{p.name}</span>
                  <button
                    onClick={() => removeParticipant(p.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = 'var(--red2)'}
                    onMouseLeave={e => e.target.style.color = 'var(--muted)'}
                  >×</button>
                </div>
              ))}
            </div>

            <div className="card mb1">
              <div className="section-label mb05">Configuración de ronda</div>
              <div className="config-grid">
                <div>
                  <div className="config-label">Tamaño del grupo</div>
                  <select value={groupSize} onChange={e => setGroupSize(Number(e.target.value))}>
                    <option value={2}>2 personas</option>
                    <option value={3}>3 personas</option>
                    <option value={4}>4 personas</option>
                    <option value={5}>5 personas</option>
                  </select>
                </div>
                <div>
                  <div className="config-label">Tiempo</div>
                  <select value={timerMinutes} onChange={e => setTimerMinutes(Number(e.target.value))}>
                    <option value={3}>3 min</option>
                    <option value={5}>5 min</option>
                    <option value={7}>7 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                  </select>
                </div>
              </div>

              {Object.keys(pairHistory).length > 0 && (
                <div className="rotation-info">
                  ✓ Rotación inteligente activa — grupos sin repetir compañeros
                </div>
              )}
            </div>

            <div className="btn-stack">
              <button className="btn btn-gold" onClick={generateGroups} disabled={loading}>
                {loading ? 'Generando...' : isActive ? '🔄 Nueva ronda' : '⚡ Arrancar actividad'}
              </button>
              <button className="btn btn-danger" onClick={resetAll}>
                🗑 Resetear todo
              </button>
            </div>
          </div>
        )}

        {tab === 'groups' && (
          <div className="fu">
            {dinamica && (
              <div className="card-gold mb1">
                <div className="section-label mb05">Dinámica activa</div>
                <div className="din-emoji">{dinamica.emoji}</div>
                <div className="din-name">{dinamica.name}</div>
                <div className="din-desc">{dinamica.desc}</div>
              </div>
            )}

            {groups.length === 0 ? (
              <div className="card">
                <div className="empty">
                  <div className="empty-icon">👥</div>
                  Todavía no generaste grupos.<br/>Andá a "Participantes" y arrancá.
                </div>
              </div>
            ) : (
              groups.map((g, i) => (
                <div key={i} className="group-admin-card">
                  <div className="group-num">Grupo {i + 1} · {(g.members || []).length} personas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {(g.members || []).map((m, j) => (
                      <div key={j} className="person-row" style={{ padding: '7px 0' }}>
                        <Avatar name={m} />
                        <span className="person-name">{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            <div className="btn-stack mt1">
              <button className="btn btn-gold" onClick={generateGroups} disabled={loading}>
                {loading ? 'Generando...' : '🔄 Nueva ronda'}
              </button>
              <button className="btn btn-ghost" onClick={backToWaiting}>
                ⏹ Volver a sala de espera
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
