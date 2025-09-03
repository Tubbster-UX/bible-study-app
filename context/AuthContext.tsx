
import { supabase } from '@/utils/supabase'
import React, { createContext, useContext, useEffect, useState } from 'react'

type User = any
type Profile = any

const AuthContext = createContext<
  | {
      user: User | null
      profile: Profile | null
      loading: boolean
      signOut: () => Promise<void>
      refreshProfile: () => Promise<void>
    }
  | undefined
>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string | undefined) {
    if (!userId) return setProfile(null)
    try {
      // Use maybeSingle() so an empty result doesn't throw PGRST116.
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (error) {
        console.log('fetchProfile error', error)
        setProfile(null)
      } else if (!data) {
        // No profile row yet for this user.
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.log('fetchProfile exception', err)
      setProfile(null)
    }
  }

  async function refreshProfile() {
    await fetchProfile(user?.id)
  }

  useEffect(() => {
    let mounted = true

    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      const currentUser = data.session?.user ?? null
      setUser(currentUser)
      if (currentUser) await fetchProfile(currentUser.id)
      setLoading(false)
    })()

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }
    })
    const subscription = data?.subscription

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
