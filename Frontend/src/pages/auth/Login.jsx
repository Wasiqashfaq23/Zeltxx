import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Loader from '../../components/ui/Loader'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { googleAuthUrl } from '../../config'

import { LogoIcon } from '../../components/ui/ZeltxxLogo'

const Login = () => {
  const { user, loading } = useAuth()

  if (loading) return <Loader />
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090d16] px-4 sm:px-6 py-8 text-slate-100">
      <Card className="w-full max-w-sm border-slate-800 bg-slate-900 shadow-md">
        <CardContent className="p-5 sm:p-8">
          <div className="flex flex-col items-center">
            <LogoIcon className="h-14 w-14" />
            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">zeltxx</h1>
            <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
              The project management platform that doesn&apos;t slow you down
            </p>
          </div>

          <Separator className="my-6 bg-[#e8e8ef]" />

          <a
            href={googleAuthUrl}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#e8e8ef] bg-white px-4 py-3 text-sm font-medium text-[#1a1a2e] transition-colors hover:bg-[#f4f4f7]"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            Sign in with Google
          </a>

          <p className="mt-4 text-center text-xs text-[#9ca3af]">
            By signing in you agree to our terms of service
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
