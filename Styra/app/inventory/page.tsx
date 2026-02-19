'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AddProduct from '../../src/components/Inventory/AddProduct'
import Loader from '../../src/components/Loader/Loader'
import { useAuthSession } from '../../src/hooks/useAuthSession'

export default function InventoryPage() {
  const router = useRouter()
  const { user, checking } = useAuthSession()

  useEffect(() => {
    if (!checking && !user) {
      router.replace('/signin')
    }
  }, [checking, user, router])

  if (checking || !user) {
    return (
      <div className="page auth-checking" aria-busy="true" aria-live="polite">
        <div className="global-loader">
          <Loader />
        </div>
      </div>
    )
  }

  return <AddProduct uid={user.uid} isOpen onClose={() => router.push('/home')} />
}
