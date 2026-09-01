import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2, Clock, ListTodo, CheckSquare, MessageSquare, Send, Rocket, Lock, Timer, Repeat, Paperclip, File, Upload, ExternalLink, Loader2 } from 'lucide-react'
import { getTasks, createTask, updateTask, addSubtask, toggleSubtask, addTaskComment, deleteTask, trackTaskTime, addTaskAttachment, deleteTaskAttachment, toggleTaskCommentReaction } from '../../api/task'
import { getSprints, createSprint, deleteSprint } from '../../api/sprints'
import { useSocket } from '../../context/SocketContext'
import UserAvatar from '../ui/UserAvatar'
import BurndownChart from '../charts/BurndownChart'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

const COLUMNS = [
  { id: 'todo', title: 'To Do', icon: ListTodo, color: 'text-slate-600', bg: 'bg-slate-100' },
  { id: 'in_progress', title: 'In Progress', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'done', title: 'Completed', icon: CheckCircle2, color: 'text-slate-900', bg: 'bg-slate-200' }
]

const EMOJIS = ['👍', '❤️', '🔥']
const PRIORITY_STYLES = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  high: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
}

const KanbanBoard = ({ projectId, members, isAdmin = false, currentUserId }) => {
  const socket = useSocket()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [taskSprint, setTaskSprint] = useState('')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newCommentText, setNewCommentText] = useState('')
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [sprints, setSprints] = useState([])
  const [sprintFilter, setSprintFilter] = useState('all')
  const [sprintOpen, setSprintOpen] = useState(false)
  const [sprintName, setSprintName] = useState('')
  const [sprintGoal, setSprintGoal] = useState('')
  const [sprintStart, setSprintStart] = useState('')
  const [sprintEnd, setSprintEnd] = useState('')
  const [blockedBy, setBlockedBy] = useState([])
  const [movingError, setMovingError] = useState('')
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timeMinutes, setTimeMinutes] = useState('')
  const [timeNote, setTimeNote] = useState('')
  const [recurrence, setRecurrence] = useState('none')
  const [uploading, setUploading] = useState(false)

  const handleUploadAttachment = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selectedTask || uploading) return
    setUploading(true)
    addTaskAttachment(selectedTask._id, file)
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)))
        setSelectedTask(res.data)
      })
      .catch((err) => console.error(err))
      .finally(() => setUploading(false))
  }

  const handleDeleteAttachment = (attId) => {
    if (!selectedTask) return
    deleteTaskAttachment(selectedTask._id, attId)
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)))
        setSelectedTask(res.data)
      })
      .catch((err) => console.error(err))
  }

  const totalLoggedMinutes = (task) =>
    ((task?.timeEntries || []).reduce((sum, e) => sum + (e.durationMinutes || 0), 0))

  const formatMinutes = (mins) => {
    const m = Math.round(mins || 0)
    if (m < 60) return `${m}m`
    return `${Math.floor(m / 60)}h ${m % 60}m`
  }

  const fetchSprints = useCallback(() => {
    getSprints(projectId)
      .then((res) => setSprints(res.data?.sprints || []))
      .catch((err) => console.error(err))
  }, [projectId])

  useEffect(() => {
    fetchSprints()
  }, [fetchSprints])

  useEffect(() => {
    getTasks(projectId)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    if (!socket || !projectId) return

    const handleCreated = (task) => {
      setTasks((prev) => [task, ...prev.filter((t) => t._id !== task._id)])
    }
    const handleUpdated = (task) => {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)))
      setSelectedTask((prev) => (prev?._id === task._id ? task : prev))
    }
    const handleDeleted = (taskId) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId))
      setSelectedTask((prev) => (prev?._id === taskId ? null : prev))
    }

    socket.on('task_created', handleCreated)
    socket.on('task_updated', handleUpdated)
    socket.on('task_deleted', handleDeleted)

    return () => {
      socket.off('task_created', handleCreated)
      socket.off('task_updated', handleUpdated)
      socket.off('task_deleted', handleDeleted)
    }
  }, [socket, projectId])

  const handleCreate = (e) => {
    e.preventDefault()
    createTask(projectId, {
      title,
      description,
      priority,
      assignedTo: assignedTo || undefined,
      dueDate: dueDate || undefined,
      sprint: taskSprint === 'none' || !taskSprint ? undefined : taskSprint
    })
      .then((res) => {
        setTasks((prev) => [res.data, ...prev.filter((t) => t._id !== res.data._id)])
        setTitle('')
        setDescription('')
        setPriority('medium')
        setAssignedTo('')
        setDueDate('')
        setTaskSprint('')
        setCreateOpen(false)
      })
      .catch((err) => console.error(err))
  }

  const handleCreateSprint = (e) => {
    e.preventDefault()
    if (!sprintName.trim() || !sprintStart || !sprintEnd) return
    createSprint(projectId, {
      name: sprintName.trim(),
      goal: sprintGoal.trim(),
      startDate: sprintStart,
      endDate: sprintEnd
    })
      .then(() => {
        setSprintName('')
        setSprintGoal('')
        setSprintStart('')
        setSprintEnd('')
        setSprintOpen(false)
        fetchSprints()
      })
      .catch((err) => alert(err.response?.data?.message || 'Failed to create sprint'))
  }

  const handleToggleBlocker = (taskId) => {
    if (!selectedTask) return
    const next = blockedBy.includes(taskId)
      ? blockedBy.filter((x) => x !== taskId)
      : [...blockedBy, taskId]
    setBlockedBy(next)
    updateTask(selectedTask._id, { blockedBy: next })
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)))
        setSelectedTask(res.data)
      })
      .catch((err) => {
        setBlockedBy(blockedBy)
        console.error(err)
      })
  }

  const handleDeleteSprint = (sprintId, e) => {
    e.stopPropagation()
    e.preventDefault()
    deleteSprint(sprintId)
      .then(() => {
        fetchSprints()
        if (sprintFilter === sprintId) setSprintFilter('all')
      })
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    if (selectedTask) {
      setBlockedBy((selectedTask.blockedBy || []).map((b) => b._id || b))
      setMovingError('')
      setTimerRunning(false)
      setTimerSeconds(0)
      setTimeMinutes('')
      setTimeNote('')
      setRecurrence(selectedTask.recurrence || 'none')
    }
  }, [selectedTask])

  const handleChangeRecurrence = (value) => {
    if (!selectedTask) return
    updateTask(selectedTask._id, { recurrence: value })
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)))
        setSelectedTask(res.data)
      })
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    if (!timerRunning) return
    const interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [timerRunning])

  const handleTrackTime = (minutes, note) => {
    if (!selectedTask || !minutes || minutes <= 0) return
    trackTaskTime(selectedTask._id, { durationMinutes: minutes, note: note || '' })
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)))
        setSelectedTask(res.data)
        setTimeMinutes('')
        setTimeNote('')
        setTimerRunning(false)
        setTimerSeconds(0)
      })
      .catch((err) => console.error(err))
  }

  const handleTimerStop = () => {
    const minutes = Math.round(timerSeconds / 60)
    if (minutes >= 1) {
      handleTrackTime(minutes, `Timed session (${formatMinutes(minutes)})`)
    } else {
      setTimerRunning(false)
      setTimerSeconds(0)
    }
  }

  const handleChangeTaskSprint = (sprintId) => {
    if (!selectedTask) return
    updateTask(selectedTask._id, { sprint: sprintId === 'none' ? null : sprintId })
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)))
        setSelectedTask(res.data)
      })
      .catch((err) => console.error(err))
  }

  const handleMoveStatus = (task, nextStatus, e) => {
    if (e) e.stopPropagation()
    if (task.status === nextStatus) return
    setMovingError('')
    updateTask(task._id, { status: nextStatus })
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data : t)))
      })
      .catch((err) => {
        const msg = err.response?.data?.message || ''
        if (msg) setMovingError(msg)
        console.error(err)
      })
  }

  const handleDragStart = (task) => {
    setDraggingId(task._id)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverCol(null)
  }

  const handleDrop = (colId, e) => {
    e.preventDefault()
    if (draggingId) {
      const task = tasks.find((t) => t._id === draggingId)
      if (task && task.status !== colId) handleMoveStatus(task, colId)
    }
    setDraggingId(null)
    setDragOverCol(null)
  }

  const handleDeleteTask = (taskId, e) => {
    if (e) e.stopPropagation()
    deleteTask(taskId)
      .then(() => {
        setTasks((prev) => prev.filter((t) => t._id !== taskId))
      })
      .catch((err) => console.error(err))
  }

  const handleAddSubtask = (e) => {
    e.preventDefault()
    if (!newSubtaskTitle.trim() || !selectedTask) return
    addSubtask(selectedTask._id, { title: newSubtaskTitle.trim() })
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)))
        setSelectedTask(res.data)
        setNewSubtaskTitle('')
      })
      .catch((err) => console.error(err))
  }

  const handleToggleSubtask = (subtaskId) => {
    if (!selectedTask) return
    toggleSubtask(selectedTask._id, subtaskId)
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)))
        setSelectedTask(res.data)
      })
      .catch((err) => console.error(err))
  }

  const handleAddComment = (e) => {
    e.preventDefault()
    if (!newCommentText.trim() || !selectedTask) return
    addTaskComment(selectedTask._id, { text: newCommentText.trim() })
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)))
        setSelectedTask(res.data)
        setNewCommentText('')
      })
      .catch((err) => console.error(err))
  }

  const handleReactToComment = (commentId, emoji) => {
    if (!selectedTask) return
    toggleTaskCommentReaction(selectedTask._id, commentId, emoji)
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)))
        setSelectedTask(res.data)
      })
      .catch((err) => console.error(err))
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-[#9ca3af]">Loading board...</div>
  }

  const selectedSprint = sprints.find((s) => s._id === sprintFilter)

  const matchesSprintFilter = (t) => {
    const taskSprintId = t.sprint?._id || t.sprint || null
    if (sprintFilter === 'all') return true
    if (sprintFilter === 'backlog') return !taskSprintId
    return taskSprintId === sprintFilter
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[#1a1a2e] dark:text-slate-100">Project Tasks</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select value={sprintFilter} onValueChange={setSprintFilter}>
              <SelectTrigger size="sm" className="h-8 border-[#e8e8ef] text-xs">
                <SelectValue placeholder="All tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tasks</SelectItem>
                <SelectItem value="backlog">Backlog (no sprint)</SelectItem>
                {sprints.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setSprintOpen(true)}
              variant="outline"
              size="sm"
              className="border-[#e8e8ef] text-[#6b7280] dark:border-slate-700 dark:text-slate-300"
            >
              <Rocket className="h-4 w-4" />
              New Sprint
            </Button>
          )}
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#4f46e5] hover:bg-[#4338ca]"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {movingError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          {movingError}
        </div>
      )}

      {selectedSprint && (
        <Card className="border-[#e8e8ef] bg-white shadow-xs dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#1a1a2e] dark:text-slate-100 flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-[#4f46e5]" />
                  {selectedSprint.name}
                  <Badge variant="secondary" className="text-[10px]">{selectedSprint.done}/{selectedSprint.total} done</Badge>
                </h3>
                {selectedSprint.goal && (
                  <p className="mt-0.5 text-xs text-[#6b7280] dark:text-slate-400">{selectedSprint.goal}</p>
                )}
                <p className="text-[11px] text-[#9ca3af]">
                  {new Date(selectedSprint.startDate).toLocaleDateString()} → {new Date(selectedSprint.endDate).toLocaleDateString()}
                </p>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Delete sprint"
                  onClick={(e) => handleDeleteSprint(selectedSprint._id, e)}
                  className="hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <BurndownChart sprintId={selectedSprint._id} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const ColumnIcon = col.icon
          const colTasks = tasks.filter((t) => t.status === col.id && matchesSprintFilter(t))
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverCol(col.id)
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(col.id, e)}
              className={`flex flex-col rounded-xl border p-3 dark:bg-slate-900 dark:border-slate-800 transition-colors ${
                dragOverCol === col.id ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-950/40' : 'border-[#e8e8ef] bg-[#f9f9fb]'
              }`}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md ${col.bg}`}>
                    <ColumnIcon className={`h-4 w-4 ${col.color}`} />
                  </div>
                  <span className="text-sm font-semibold text-[#1a1a2e] dark:text-slate-100">{col.title}</span>
                </div>
                <Badge variant="secondary" className="bg-white text-[#6b7280] border border-[#e8e8ef]">
                  {colTasks.length}
                </Badge>
              </div>

              <div className="flex-1 space-y-3 min-h-[250px]">
                {colTasks.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[#e8e8ef] text-xs text-[#9ca3af]">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const subtasks = task.subtasks || []
                    const completedSubtasks = subtasks.filter((s) => s.completed).length
                    const commentsCount = (task.comments || []).length
                    return (
                      <Card
                        key={task._id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation()
                          handleDragStart(task)
                        }}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedTask(task)}
                        className={`border-[#e8e8ef] bg-white p-3 shadow-xs hover:shadow-sm transition-all cursor-pointer dark:bg-slate-800 dark:border-slate-700 ${
                          draggingId === task._id ? 'opacity-50' : ''
                        }`}
                      >
                        <CardContent className="p-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-[#1a1a2e] line-clamp-2 dark:text-slate-100">
                              {task.title}
                            </h4>
                            <Badge variant="secondary" className={`text-[10px] uppercase font-bold shrink-0 ${PRIORITY_STYLES[task.priority]}`}>
                              {task.priority}
                            </Badge>
                          </div>

                          {task.description && (
                            <p className="text-xs text-[#6b7280] line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[11px] text-[#9ca3af]">
                            {task.sprint && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950/70 dark:text-violet-300">
                                <Rocket className="h-3 w-3" />
                                {task.sprint.name}
                              </span>
                            )}
                            {(task.blockedBy || []).length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                                <Lock className="h-3 w-3" />
                                Blocked
                              </span>
                            )}
                            {totalLoggedMinutes(task) > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300">
                                <Timer className="h-3 w-3" />
                                {formatMinutes(totalLoggedMinutes(task))}
                              </span>
                            )}
                            {task.recurrence && task.recurrence !== 'none' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 capitalize">
                                <Repeat className="h-3 w-3" />
                                {task.recurrence}
                              </span>
                            )}
                            {(task.attachments || []).length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                                <Paperclip className="h-3 w-3" />
                                {(task.attachments || []).length}
                              </span>
                            )}
                            {subtasks.length > 0 && (
                              <span className="flex items-center gap-1">
                                <CheckSquare className="h-3 w-3" />
                                {completedSubtasks}/{subtasks.length}
                              </span>
                            )}
                            {commentsCount > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {commentsCount}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f5] dark:border-slate-700">
                            <div className="flex items-center gap-2">
                              {task.assignedTo ? (
                                <UserAvatar user={task.assignedTo} size="xs" />
                              ) : (
                                <span className="text-[11px] text-[#9ca3af]">Unassigned</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {col.id !== 'todo' && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Move left"
                                  onClick={(e) =>
                                    handleMoveStatus(
                                      task,
                                      col.id === 'done' ? 'in_progress' : 'todo',
                                      e
                                    )
                                  }
                                >
                                  <ArrowLeft className="h-3.5 w-3.5 text-[#6b7280]" />
                                </Button>
                              )}
                              {col.id !== 'done' && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Move right"
                                  onClick={(e) =>
                                    handleMoveStatus(
                                      task,
                                      col.id === 'todo' ? 'in_progress' : 'done',
                                      e
                                    )
                                  }
                                >
                                  <ArrowRight className="h-3.5 w-3.5 text-[#4f46e5]" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Delete task"
                                onClick={(e) => handleDeleteTask(task._id, e)}
                                className="hover:text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Task Detail Modal */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        {selectedTask && (
          <DialogContent className="border-[#e8e8ef] bg-white max-w-lg dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 pr-4">
                <DialogTitle className="text-base font-bold text-[#1a1a2e] dark:text-slate-100">
                  {selectedTask.title}
                </DialogTitle>
                <Badge variant="secondary" className={`text-[10px] uppercase font-bold ${PRIORITY_STYLES[selectedTask.priority]}`}>
                  {selectedTask.priority}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {selectedTask.description && (
                <p className="text-[#6b7280] leading-relaxed">{selectedTask.description}</p>
              )}

              <div className="flex items-center gap-2 border-t border-[#e8e8ef] pt-3 dark:border-slate-800">
                <Rocket className="h-4 w-4 text-[#4f46e5]" />
                <Label className="font-semibold text-[#1a1a2e] dark:text-slate-100">Sprint</Label>
                <div className="w-44 ml-auto">
                  <Select
                    value={selectedTask.sprint?._id || selectedTask.sprint || 'none'}
                    onValueChange={handleChangeTaskSprint}
                  >
                    <SelectTrigger size="sm" className="h-7 border-[#e8e8ef] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Backlog (no sprint)</SelectItem>
                      {sprints.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-[#e8e8ef] pt-3 dark:border-slate-800">
                <Repeat className="h-4 w-4 text-emerald-500" />
                <Label className="font-semibold text-[#1a1a2e] dark:text-slate-100">Repeat</Label>
                <div className="w-40 ml-auto">
                  <Select value={recurrence} onValueChange={handleChangeRecurrence}>
                    <SelectTrigger size="sm" className="h-7 border-[#e8e8ef] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Does not repeat</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-[#e8e8ef] pt-3 dark:border-slate-800">
                <h4 className="font-semibold text-[#1a1a2e] dark:text-slate-100 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-500" />
                  Depends on (blocked by) ({blockedBy.length})
                </h4>
                <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto">
                  {tasks.filter((t) => t._id !== selectedTask._id).length === 0 ? (
                    <p className="text-[11px] text-[#9ca3af]">No other tasks to depend on</p>
                  ) : (
                    tasks
                      .filter((t) => t._id !== selectedTask._id)
                      .map((t) => (
                        <label
                          key={t._id}
                          className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-colors ${
                            blockedBy.includes(t._id) ? 'bg-amber-50 dark:bg-amber-950/40' : 'hover:bg-[#f4f4f7] dark:hover:bg-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={blockedBy.includes(t._id)}
                            onChange={() => handleToggleBlocker(t._id)}
                            className="rounded text-amber-500"
                          />
                          <span className={`truncate text-xs ${t.status === 'done' ? 'text-[#9ca3af] line-through' : 'text-[#1a1a2e] dark:text-slate-200'}`}>
                            {t.title}
                          </span>
                          {t.status !== 'done' && (
                            <span className="ml-auto text-[10px] text-amber-500">open</span>
                          )}
                        </label>
                      ))
                  )}
                </div>
              </div>

              {/* Time Tracking */}
              <div className="border-t border-[#e8e8ef] pt-3 dark:border-slate-800">
                <h4 className="font-semibold text-[#1a1a2e] dark:text-slate-100 flex items-center gap-1.5">
                  <Timer className="h-4 w-4 text-cyan-500" />
                  Time Tracking ({formatMinutes(totalLoggedMinutes(selectedTask))})
                </h4>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-lg border border-[#e8e8ef] bg-[#fafafa] p-2 dark:bg-slate-800 dark:border-slate-700">
                    <Timer className="h-4 w-4 text-[#4f46e5]" />
                    <span className="font-mono text-xs tabular-nums text-[#1a1a2e] dark:text-slate-200">
                      {String(Math.floor(timerSeconds / 3600)).padStart(2, '0')}:
                      {String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0')}:
                      {String(timerSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                  {timerRunning ? (
                    <Button size="xs" className="bg-rose-600 hover:bg-rose-700" onClick={handleTimerStop}>
                      Stop
                    </Button>
                  ) : (
                    <Button size="xs" className="bg-[#4f46e5]" onClick={() => setTimerRunning(true)}>
                      Start
                    </Button>
                  )}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleTrackTime(parseInt(timeMinutes, 10), timeNote)
                  }}
                  className="mt-2 flex items-center gap-2"
                >
                  <Input
                    type="number"
                    min="1"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(e.target.value)}
                    placeholder="Minutes"
                    className="h-7 w-24 text-xs border-[#e8e8ef]"
                  />
                  <Input
                    value={timeNote}
                    onChange={(e) => setTimeNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="h-7 flex-1 text-xs border-[#e8e8ef]"
                  />
                  <Button type="submit" size="xs" className="bg-[#4f46e5]" disabled={!parseInt(timeMinutes, 10)}>
                    Log
                  </Button>
                </form>
                {(selectedTask.timeEntries || []).length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto rounded-lg border border-[#e8e8ef] bg-[#fafafa] p-2 dark:bg-slate-800 dark:border-slate-700">
                    {(selectedTask.timeEntries || []).slice().reverse().map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px]">
                        <span className="font-medium text-[#4f46e5]">{entry.user?.name || 'Member'}:</span>
                        <span className="font-mono text-[#1a1a2e] dark:text-slate-200">{formatMinutes(entry.durationMinutes)}</span>
                        {entry.note && <span className="truncate text-[#9ca3af]">— {entry.note}</span>}
                        <span className="ml-auto shrink-0 text-[10px] text-[#9ca3af]">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attachments */}
              <div className="border-t border-[#e8e8ef] pt-3 dark:border-slate-800">
                <h4 className="font-semibold text-[#1a1a2e] dark:text-slate-100 flex items-center gap-1.5">
                  <Paperclip className="h-4 w-4 text-blue-500" />
                  Attachments ({(selectedTask.attachments || []).length})
                </h4>
                <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#e8e8ef] bg-[#fafafa] px-3 py-3 text-xs font-medium text-[#6b7280] transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Click to attach a file (max 10 MB)
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleUploadAttachment}
                    disabled={uploading}
                  />
                </label>
                {(selectedTask.attachments || []).length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {(selectedTask.attachments || []).slice().reverse().map((att) => (
                      <div
                        key={att._id}
                        className="flex items-center gap-2 rounded-lg border border-[#e8e8ef] bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        <File className="h-4 w-4 shrink-0 text-blue-500" />
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 flex-1 truncate font-medium text-[#4f46e5] hover:underline"
                        >
                          {att.name}
                        </a>
                        <span className="hidden sm:inline text-[10px] text-[#9ca3af] shrink-0">
                          {att.size ? `${Math.round(att.size / 1024)} KB` : ''} · {att.uploadedBy?.name || 'Member'}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-[#9ca3af]" />
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att._id)}
                          className="ml-1 text-slate-400 hover:text-rose-600"
                          title="Remove attachment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subtasks Checklist */}
              <div className="space-y-2 border-t border-[#e8e8ef] pt-3 dark:border-slate-800">
                <h4 className="font-semibold text-[#1a1a2e] dark:text-slate-100 flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-[#4f46e5]" />
                  Subtasks Checklist ({(selectedTask.subtasks || []).filter((s) => s.completed).length}/{(selectedTask.subtasks || []).length})
                </h4>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(selectedTask.subtasks || []).map((sub) => (
                    <label key={sub._id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[#f4f4f7] cursor-pointer dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        checked={sub.completed}
                        onChange={() => handleToggleSubtask(sub._id)}
                        className="rounded text-[#4f46e5]"
                      />
                      <span className={sub.completed ? 'line-through text-[#9ca3af]' : 'text-[#1a1a2e] dark:text-slate-200'}>
                        {sub.title}
                      </span>
                    </label>
                  ))}
                </div>

                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-2">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a subtask..."
                    className="h-7 text-xs border-[#e8e8ef]"
                  />
                  <Button type="submit" size="xs" className="bg-[#4f46e5]">Add</Button>
                </form>
              </div>

              {/* Task Comments */}
              <div className="space-y-2 border-t border-[#e8e8ef] pt-3 dark:border-slate-800">
                <h4 className="font-semibold text-[#1a1a2e] dark:text-slate-100 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-[#4f46e5]" />
                  Task Discussion ({(selectedTask.comments || []).length})
                </h4>

                <div className="space-y-2 max-h-40 overflow-y-auto bg-[#fafafa] p-3 rounded-lg dark:bg-slate-800">
                  {(selectedTask.comments || []).length === 0 ? (
                    <p className="text-[11px] text-[#9ca3af] text-center py-2">No comments on this task yet</p>
                  ) : (
                    (selectedTask.comments || []).map((cmt, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <UserAvatar user={cmt.user} size="xs" />
                        <div className="bg-white p-2 rounded-md border border-[#e8e8ef] flex-1 dark:bg-slate-900 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-[#4f46e5] text-[11px]">{cmt.user?.name || 'Member'}</span>
                            <span className="text-[10px] text-[#9ca3af]">{new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[#1a1a2e] dark:text-slate-200">{cmt.text}</p>
                          <div className="mt-1.5 flex items-center gap-1">
                            {EMOJIS.map((emoji) => {
                              const reactions = cmt.reactions || []
                              const count = reactions.filter((r) => r.emoji === emoji).length
                              const reactedByMe = reactions.some(
                                (r) => String(r.user?._id || r.user) === String(currentUserId) && r.emoji === emoji
                              )
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleReactToComment(cmt._id, emoji)}
                                  className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors ${
                                    reactedByMe
                                      ? 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300'
                                      : 'border-[#e8e8ef] bg-white text-[#6b7280] hover:bg-[#f4f4f7] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  {count > 0 && <span>{count}</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex items-center gap-2 mt-2">
                  <Input
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="h-8 text-xs border-[#e8e8ef]"
                  />
                  <Button type="submit" size="xs" className="bg-[#4f46e5]">
                    <Send className="h-3 w-3" />
                  </Button>
                </form>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Create Task Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-[#e8e8ef] bg-white dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement authentication middleware"
                required
                className="mt-1 border-[#e8e8ef]"
              />
            </div>

            <div>
              <Label htmlFor="task-desc">Description</Label>
              <Input
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details..."
                className="mt-1 border-[#e8e8ef]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-1 w-full border-[#e8e8ef]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assignee</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger className="mt-1 w-full border-[#e8e8ef]">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {(members || []).map((m) => (
                      <SelectItem key={m.user._id} value={m.user._id}>
                        {m.user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Sprint</Label>
                <Select value={taskSprint} onValueChange={setTaskSprint}>
                  <SelectTrigger className="mt-1 w-full border-[#e8e8ef]">
                    <SelectValue placeholder="Backlog" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Backlog (no sprint)</SelectItem>
                    {sprints.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 border-[#e8e8ef]"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Sprint Modal */}
      <Dialog open={sprintOpen} onOpenChange={setSprintOpen}>
        <DialogContent className="border-[#e8e8ef] bg-white dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-[#4f46e5]" />
              Create Sprint
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSprint} className="space-y-4">
            <div>
              <Label htmlFor="sprint-name">Sprint name</Label>
              <Input
                id="sprint-name"
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                placeholder="e.g. Sprint 12 – Mobile polish"
                required
                className="mt-1 border-[#e8e8ef]"
              />
            </div>
            <div>
              <Label htmlFor="sprint-goal">Goal</Label>
              <Input
                id="sprint-goal"
                value={sprintGoal}
                onChange={(e) => setSprintGoal(e.target.value)}
                placeholder="Optional sprint goal"
                className="mt-1 border-[#e8e8ef]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sprint-start">Start date</Label>
                <Input
                  id="sprint-start"
                  type="date"
                  value={sprintStart}
                  onChange={(e) => setSprintStart(e.target.value)}
                  className="mt-1 border-[#e8e8ef]"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sprint-end">End date</Label>
                <Input
                  id="sprint-end"
                  type="date"
                  value={sprintEnd}
                  onChange={(e) => setSprintEnd(e.target.value)}
                  className="mt-1 border-[#e8e8ef]"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSprintOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Create Sprint
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default KanbanBoard
