import dynamic from 'next/dynamic'

// Deshabilita SSR para esta página — Firebase y localStorage requieren el browser
const AdminPage = dynamic(() => import('../components/AdminPage'), { ssr: false })

export default function Admin() {
  return <AdminPage />
}
