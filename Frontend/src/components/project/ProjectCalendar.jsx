import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { getTasks } from '../../api/task'
import UserAvatar from '../ui/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const ProjectCalendar = ({ projectId }) => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTasks(projectId)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return <div className="py-8 text-center text-sm text-[#9ca3af]">Loading calendar...</div>
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const overdue = tasks.filter((t) => t.dueDate && t.dueDate.split('T')[0] < todayStr && t.status !== 'done')
  const dueToday = tasks.filter((t) => t.dueDate && t.dueDate.split('T')[0] === todayStr)
  const upcoming = tasks.filter((t) => t.dueDate && t.dueDate.split('T')[0] > todayStr)
  const noDate = tasks.filter((t) => !t.dueDate)

  const GROUPS = [
    { id: 'overdue', title: 'Overdue Tasks', tasks: overdue, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'today', title: 'Due Today', tasks: dueToday, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'upcoming', title: 'Upcoming Deadlines', tasks: upcoming, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'nodate', title: 'Unscheduled Tasks', tasks: noDate, color: 'text-gray-600', bg: 'bg-gray-50' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-5 w-5 text-[#4f46e5]" />
        <h3 className="text-base font-semibold text-[#1a1a2e] dark:text-slate-100">
          Project Timeline & Deadlines
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GROUPS.map((group) => (
          <Card key={group.id} className="border-[#e8e8ef] bg-white shadow-xs dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#e8e8ef] px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${group.bg} ${group.color}`}>
                  {group.title}
                </span>
              </div>
              <Badge variant="secondary" className="bg-[#f4f4f7] text-[#6b7280]">
                {group.tasks.length}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3 min-h-[140px]">
              {group.tasks.length === 0 ? (
                <p className="text-xs text-[#9ca3af] py-4 text-center">No tasks in this group</p>
              ) : (
                group.tasks.map((task) => (
                  <div
                    key={task._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#e8e8ef] bg-[#fafafa] hover:bg-white transition-all dark:bg-slate-800 dark:border-slate-700"
                  >
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-[#1a1a2e] dark:text-slate-100">{task.title}</h4>
                      {task.dueDate && (
                        <p className="text-[11px] text-[#6b7280] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <UserAvatar user={task.assignedTo} size="xs" />
                      <Badge
                        variant="secondary"
                        className={
                          task.status === 'done'
                            ? 'bg-emerald-100 text-emerald-700 text-[10px]'
                            : 'bg-indigo-100 text-indigo-700 text-[10px]'
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default ProjectCalendar
