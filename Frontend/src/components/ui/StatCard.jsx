import { Card, CardContent } from '@/components/ui/card'

const StatCard = ({ label, value }) => {
  return (
    <Card className="border-[#e8e8ef] bg-white shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-[#6b7280]">{label}</p>
        <p className="mt-2 text-3xl font-bold text-[#1a1a2e]">{value}</p>
      </CardContent>
    </Card>
  )
}

export default StatCard
