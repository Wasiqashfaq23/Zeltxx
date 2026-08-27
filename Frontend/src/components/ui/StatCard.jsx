import { Card, CardContent } from '@/components/ui/card'

const StatCard = ({ label, value }) => {
  return (
    <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      </CardContent>
    </Card>
  )
}

export default StatCard
