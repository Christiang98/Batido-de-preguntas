import dynamic from 'next/dynamic'

const SalaPage = dynamic(() => import('../components/SalaPage'), { ssr: false })

export default function Sala() {
  return <SalaPage />
}
