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
  const [timerEnd, setTimerEnd] = useState(null)
  const [usedDinamicas, setUsedDinamicas] = useState([])
  const [pairHistory, setPairHistory] = useState({})
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)

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
        setTimerEnd(g.timerEnd || null)
      } else {
        setGroups([]); setDinamica(null); setTimerEnd(null)
      }
    }))

    return () => unsubs.forEach(u => u())
  }, [authed])

  useEffect(() => {
    if (!timerEnd) { setTimeLeft(null); return }
    const tick = () => {
      const left = Math.max(0, Math.round((timerEnd - Date.now()) / 1000))
      setTimeLeft(left)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timerEnd])

  function login(e) {
    e.preventDefault()
    if (password === ADMIN_PASS) { setAuthed(true); setPwError('') }
    else setPwError('Contraseña incorrecta.')
  }

  async function generateGroups() {
    if (participants.length < 2) { alert('Necesitas al menos 2 participantes.'); return }
    setLoading(true)
    try {
      const names = participants.map(p => p.name)
      const { groups: rawGroups, newPairHistory } = makeGroupsWithRotation(names, groupSize, pairHistory)
      const list = rawGroups.map(g => ({ members: Array.isArray(g) ? g : g.members || [] }))
      const din = getRandomDinamica(usedDinamicas)
      const newUsed = [...usedDinamicas, din.id]
      const round = (session?.round || 0) + 1

      await set(ref(db, 'groups'), {
        list: groupsToFirebase(list),
        dinamica: din,
        usedDinamicas: newUsed,
        pairHistory: newPairHistory,
        timerEnd: null,
        timerRunning: false,
        timerDuration: null,
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

  async function startTimer() {
    const end = Date.now() + timerMinutes * 60 * 1000
    await set(ref(db, 'groups/timerEnd'), end)
    await set(ref(db, 'groups/timerDuration'), timerMinutes * 60)
    await set(ref(db, 'groups/timerRunning'), true)
  }

  async function addTime(mins) {
    const base = (timerEnd && timerEnd > Date.now()) ? timerEnd : Date.now()
    const newEnd = base + mins * 60 * 1000
    await set(ref(db, 'groups/timerEnd'), newEnd)
    await set(ref(db, 'groups/timerRunning'), true)
  }

  async function removeTime(mins) {
    if (!timerEnd) return
    const newEnd = Math.max(Date.now() + 10000, timerEnd - mins * 60 * 1000)
    await set(ref(db, 'groups/timerEnd'), newEnd)
  }

  async function stopTimer() {
    await set(ref(db, 'groups/timerEnd'), null)
    await set(ref(db, 'groups/timerRunning'), false)
  }

  async function backToWaiting() {
    if (!confirm('¿Volver a la sala de espera?')) return
    await set(ref(db, 'session'), { status: 'waiting', round: session?.round || 0 })
    await remove(ref(db, 'groups'))
    setGroups([]); setDinamica(null); setTimerEnd(null); setTab('participants')
  }

  async function resetAll() {
    if (!confirm('¿Borrar TODO y resetear? Esta acción no se puede deshacer.')) return
    await remove(ref(db, 'participants'))
    await remove(ref(db, 'groups'))
    await set(ref(db, 'session'), { status: 'waiting', round: 0 })
    setGroups([]); setParticipants([]); setDinamica(null)
    setPairHistory({}); setUsedDinamicas([]); setTimerEnd(null)
    setTab('participants')
  }

  async function removeParticipant(id) {
    await remove(ref(db, `participants/${id}`))
  }

  const timerRunning = timerEnd && timerEnd > Date.now()
  const timerDisplay = timeLeft != null
    ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
    : null

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
                    {[2,3,4,5,6,7,8,9,10].map(n => (
                      <option key={n} value={n}>{n} personas</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="config-label">Tiempo de ronda</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={timerMinutes}
                      onChange={e => setTimerMinutes(Math.max(1, Number(e.target.value)))}
                      style={{ width: '60px' }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>min</span>
                  </div>
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

            {/* Timer control panel */}
            <div className="card mb1">
              <div className="section-label mb05">⏱ Control del tiempo</div>

              {timerDisplay && timeLeft > 0 ? (
                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--head)', color: timeLeft <= 60 ? 'var(--red2)' : 'var(--gold2)', letterSpacing: '2px' }}>
                    {timerDisplay}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>tiempo restante</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', marginBottom: '0.75rem', color: 'var(--muted)', fontSize: '13px' }}>
                  Timer detenido — inicialo cuando el grupo esté listo
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem' }}>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={timerMinutes}
                  onChange={e => setTimerMinutes(Math.max(1, Number(e.target.value)))}
                  style={{ width: '60px' }}
                />
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>min</span>
                <button className="btn btn-gold" style={{ flex: 1, padding: '8px' }} onClick={startTimer}>
                  ▶ {timerRunning ? 'Reiniciar' : 'Iniciar'} timer
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: '13px', padding: '7px 4px' }} onClick={() => addTime(1)}>+1 min</button>
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: '13px', padding: '7px 4px' }} onClick={() => addTime(5)}>+5 min</button>
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: '13px', padding: '7px 4px' }} onClick={() => removeTime(1)}>−1 min</button>
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: '13px', padding: '7px 4px' }} onClick={() => removeTime(5)}>−5 min</button>
                <button className="btn btn-danger" style={{ flex: 1, fontSize: '13px', padding: '7px 4px' }} onClick={stopTimer}>⏹ Detener</button>
              </div>
            </div>

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
