"use client";
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { setAuthToken } from '@/lib/api'
import { toast } from 'sonner'

export default function AuthCallback() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Handling auth callback...')
        
        // Get the session from the URL
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          toast.error('Authentication failed', {
            description: error.message || 'Something went wrong during authentication'
          })
          router.push('/')
          return
        }

        if (data.session) {
          console.log('Auth session found:', data.session)
          
          // Set the auth token for API requests
          if (data.session.access_token) {
            setAuthToken(data.session.access_token)
            localStorage.setItem('authToken', data.session.access_token)
          }

          // Show success message
          toast.success('Login berhasil!', {
            description: 'Anda telah berhasil masuk dengan Google. Selamat datang di DevDirect!'
          })

          // Redirect to dashboard for applicants or appropriate page for recruiters
          const userRole = data.session.user?.user_metadata?.role || 'applicant'
          
          if (userRole === 'applicant') {
            router.push('/dashboard')
          } else if (userRole === 'recruiter') {
            router.push('/recruiter/dashboard')
          } else {
            // Default to applicant dashboard
            router.push('/dashboard')
          }
        } else {
          console.log('No session found')
          toast.error('Authentication incomplete', {
            description: 'Unable to complete authentication. Please try again.'
          })
          router.push('/')
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        toast.error('Authentication error', {
          description: 'An unexpected error occurred during authentication'
        })
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold text-foreground">
            Menyelesaikan autentikasi...
          </h2>
          <p className="text-muted-foreground">
            Mohon tunggu sebentar while kami memproses login Anda
          </p>
        </div>
      </div>
    )
  }

  return null
}