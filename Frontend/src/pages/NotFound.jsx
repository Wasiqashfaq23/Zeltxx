import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f4f7] px-6">
      <Card className="w-full max-w-sm border-[#e8e8ef] bg-white text-center shadow-sm">
        <CardContent className="p-8">
          <p className="text-8xl font-black text-[#4f46e5]">404</p>
          <h1 className="mt-2 text-xl font-semibold text-[#1a1a2e]">Page not found</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            The page you&apos;re looking for doesn&apos;t exist.
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

export default NotFound
