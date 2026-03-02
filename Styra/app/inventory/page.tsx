'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ModelStudio from '../../src/components/Inventory/ModelStudio'
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

  return <ModelStudio uid={user.uid} />
}
