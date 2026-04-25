import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { db } from '../lib/firebase'
import { ref, onValue } from 'firebase/database'
import { getAvatarPalette, initials } from '../lib/avatar'

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

function Timer({ timerEnd, totalDuration }) {
  const [left, setLeft] = useState(null)
  useEffect(() => {
    if (!timerEnd) return
    const tick = () => setLeft(Math.max(0, Math.round((timerEnd - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timerEnd])
  if (left === null || left <= 0) return null

  const mins = Math.floor(left / 60)
  const secs = left % 60
  const m1 = Math.floor(mins / 10)
  const m2 = mins % 10
  const s1 = Math.floor(secs / 10)
  const s2 = secs % 10
  const urgent = left <= 60
  const pct = totalDuration ? Math.min(100, (left / totalDuration) * 100) : null

  return (
    <div className={`timer-display si ${urgent ? 'urgent' : 'normal'}`}>
      <div className="timer-track">
        <span className="timer-digit">{m1}</span>
        <span className="timer-digit">{m2}</span>
        <span className="timer-colon">:</span>
        <span className="timer-digit">{s1}</span>
        <span className="timer-digit">{s2}</span>
      </div>
      <div className="timer-label">
        <span className="timer-sub">tiempo restante</span>
      </div>
      {pct !== null && (
        <div className="timer-bar-wrap">
          <div
            className="timer-bar"
            style={{
              width: `${pct}%`,
              background: urgent
                ? 'linear-gradient(90deg, var(--red), var(--red2))'
                : 'linear-gradient(90deg, var(--gold), var(--gold2))'
            }}
          />
        </div>
      )}
    </div>
  )
}

function groupsFromFirebase(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(g => ({ members: g.members || g }))
  return Object.keys(raw).sort().map(k => ({ members: raw[k].members || [] }))
}

export default function SalaPage() {
  const router = useRouter()
  const [myName, setMyName] = useState('')
  const [participants, setParticipants] = useState([])
  const [session, setSession] = useState(null)
  const [groups, setGroups] = useState([])
  const [dinamica, setDinamica] = useState(null)
  const [myGroup, setMyGroup] = useState(null)
  const [timerEnd, setTimerEnd] = useState(null)
  const [timerDuration, setTimerDuration] = useState(null)

  useEffect(() => {
    const name = localStorage.getItem('explorador_name')
    if (!name) { router.push('/'); return }
    setMyName(name)
    const unsubs = []

    unsubs.push(onValue(ref(db, 'participants'), snap => {
      if (snap.exists()) setParticipants(Object.values(snap.val()).map(p => p.name))
      else setParticipants([])
    }))

    unsubs.push(onValue(ref(db, 'session'), snap => {
      if (snap.exists()) setSession(snap.val())
    }))

    unsubs.push(onValue(ref(db, 'groups'), snap => {
      if (snap.exists()) {
        const g = snap.val()
        const list = groupsFromFirebase(g.list)
        setGroups(list)
        setDinamica(g.dinamica || null)
        setTimerEnd(g.timerEnd || null)
        setTimerDuration(g.timerDuration || null)
        setMyGroup(list.find(gr => (gr.members || []).includes(name)) || null)
      } else {
        setGroups([]); setMyGroup(null); setDinamica(null); setTimerEnd(null); setTimerDuration(null)
      }
    }))

    return () => unsubs.forEach(u => u())
  }, [])

  function leave() {
    localStorage.removeItem('explorador_name')
    localStorage.removeItem('explorador_id')
    router.push('/')
  }

  const isActive = session?.status === 'active'

  return (
    <>
      <Head>
        <title>Sala — Batallón PCB</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#080c14" />
      </Head>
      <div className="page">
        <div className="header fu">
          <img src="/escudo.png" alt="Escudo" className="header-shield" />
          <div className="header-text">
            <div className="header-title">Hola, {myName}!</div>
            <div className="header-sub">Batallón PCB</div>
          </div>
          <button onClick={leave} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--body)', fontWeight: 500, flexShrink: 0 }}>
            Salir
          </button>
        </div>

        {!isActive && (
          <>
            <div className="fu fu1" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <div className="chip chip-green"><div className="live-dot" /> En vivo</div>
              </div>
              <div className="display-title">Sala de<br/>espera</div>
              <div className="body-text mt05">El animador va a arrancar la actividad pronto.</div>
            </div>
            <div className="counter-block fu fu2">
              <span className="counter-label">Exploradores anotados</span>
              <span className="counter-num">{participants.length}</span>
            </div>
            <div className="card fu fu3">
              {participants.length === 0 && (
                <div className="empty"><div className="empty-icon">👥</div>Esperando participantes...</div>
              )}
              {participants.map((p, i) => (
                <div key={i} className="person-row">
                  <Avatar name={p} />
                  <span className="person-name">{p}</span>
                  {p === myName && <span className="person-you">vos</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {isActive && (
          <>
            <div className="fu fu1" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <div className="round-badge">⚡ Ronda {session?.round}</div>
            </div>
            <Timer timerEnd={timerEnd} totalDuration={timerDuration} />
            {myGroup ? (
              <div className="card-my-group fu fu2">
                <div className="section-label" style={{ color: 'var(--gold2)', marginBottom: '0.85rem' }}>✦ Tu grupo</div>
                {(myGroup.members || []).map((m, i) => (
                  <div key={i} className="person-row">
                    <Avatar name={m} />
                    <span className="person-name">{m}</span>
                    {m === myName && <span className="person-you">vos</span>}
                  </div>
                ))}
                {dinamica && (
                  <div className="din-box">
                    <div className="din-emoji">{dinamica.emoji}</div>
                    <div className="din-name">{dinamica.name}</div>
                    <div className="din-desc">{dinamica.desc}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card fu fu2">
                <div className="empty"><div className="empty-icon">🔍</div>No encontramos tu grupo.<br/>Avisale al animador.</div>
              </div>
            )}
            {groups.length > 0 && (
              <div className="fu fu3 mt1">
                <div className="section-label mb05">Todos los grupos</div>
                {groups.map((g, i) => (
                  <div key={i} className="group-admin-card">
                    <div className="group-num">Grupo {i + 1} · {(g.members || []).length} personas</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                      {(g.members || []).map((m, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: m === myName ? 'var(--gold2)' : 'var(--muted)', fontWeight: m === myName ? 600 : 400 }}>
                          <Avatar name={m} size="sm" />{m}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
