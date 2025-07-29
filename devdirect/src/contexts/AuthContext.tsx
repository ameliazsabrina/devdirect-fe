"use client";
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getCurrentSession, getCurrentUser } from '@/lib/supabase'
import { setAuthToken, removeAuthToken } from '@/lib/api'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { session: initialSession } = await getCurrentSession()
        
        if (initialSession) {
          setSession(initialSession)
          setUser(initialSession.user)
          
          // Set the access token for API requests
          if (initialSession.access_token) {
            setAuthToken(initialSession.access_token)
            localStorage.setItem('authToken', initialSession.access_token)
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session)
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.access_token) {
          // Set token for API requests
          setAuthToken(session.access_token)
          localStorage.setItem('authToken', session.access_token)
        } else {
          // Remove token
          removeAuthToken()
          localStorage.removeItem('authToken')
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }
    } catch (error) {
      console.error('Sign out failed:', error)
      throw error
    }
  }

  const value = {
    user,
    session,
    loading,
    signOut: handleSignOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}