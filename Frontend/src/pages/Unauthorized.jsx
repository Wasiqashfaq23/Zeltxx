import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const Unauthorized = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f4f7] px-6">
      <Card className="w-full max-w-sm border-[#e8e8ef] bg-white text-center shadow-sm">
        <CardContent className="p-8">
          <Lock className="mx-auto h-12 w-12 text-[#dc2626]" />
          <h1 className="mt-4 text-xl font-semibold text-[#1a1a2e]">Access Denied</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            You don&apos;t have permission to view this page.
          </p>
          <Button
            className="mt-6 bg-[#4f46e5] hover:bg-[#4338ca]"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Unauthorized
