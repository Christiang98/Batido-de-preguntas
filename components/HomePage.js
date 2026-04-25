import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { db } from '../lib/firebase'
import { ref, push, get, set } from 'firebase/database'

export default function HomePage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleJoin(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Ingresá tu nombre primero'); return }
    setLoading(true); setError('')
    try {
      const sessionRef = ref(db, 'session')
      const snap = await get(sessionRef)
      if (!snap.exists()) await set(sessionRef, { status: 'waiting', round: 0 })

      const participantsRef = ref(db, 'participants')
      const pSnap = await get(participantsRef)
      let participantId

      if (pSnap.exists()) {
        const entries = Object.entries(pSnap.val())
        const existing = entries.find(([, v]) => v.name.toLowerCase() === trimmed.toLowerCase())
        if (existing) {
          participantId = existing[0]
        } else {
          const newRef = await push(participantsRef, { name: trimmed, joinedAt: Date.now() })
          participantId = newRef.key
        }
      } else {
        const newRef = await push(participantsRef, { name: trimmed, joinedAt: Date.now() })
        participantId = newRef.key
      }

      localStorage.setItem('explorador_name', trimmed)
      localStorage.setItem('explorador_id', participantId)
      router.push('/sala')
    } catch (err) {
      setError('Error al conectarse. Revisá tu conexión.')
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>Batallón PCB — Actividades</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#080c14" />
      </Head>
      <div className="page">
        <div className="shield-hero fu">
          <img src="/escudo.png" alt="Escudo Batallón" />
          <div className="hero-battalion">Batallón<br/>Pablo César Barton</div>
          <div className="hero-motto">Siempre Listos</div>
        </div>

        <div className="fu fu1" style={{ marginBottom: '1.75rem' }}>
          <div className="display-title">Bienvenid@s</div>
          <div className="body-text mt05">Anotate para participar en la actividad de hoy.</div>
        </div>

        <form onSubmit={handleJoin} className="fu fu2" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            placeholder="Tu nombre completo..."
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            maxLength={40}
            autoFocus
            autoComplete="off"
          />
          {error && <div style={{ fontSize: '13px', color: 'var(--red2)', fontWeight: 600 }}>⚠ {error}</div>}
          <button type="submit" className="btn btn-red" disabled={loading}>
            {loading ? 'Uniéndose...' : 'Unirse a la actividad →'}
          </button>
        </form>

        <div className="fu fu3" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <hr />
          <div className="body-text mb05">Panel de administración</div>
          <button className="btn btn-ghost" onClick={() => router.push('/admin')}>
            Entrar como Administrador
          </button>
        </div>
      </div>
    </>
  )
}
