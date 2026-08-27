import { useState, useEffect } from 'react'
import { Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2, Clock, ListTodo, CheckSquare, MessageSquare, Send } from 'lucide-react'
import { getTasks, createTask, updateTask, addSubtask, toggleSubtask, addTaskComment, deleteTask } from '../../api/task'
import { useSocket } from '../../context/SocketContext'
import UserAvatar from '../ui/UserAvatar'
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

const PRIORITY_STYLES = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  high: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
}

const KanbanBoard = ({ projectId, members }) => {
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
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [newCommentText, setNewCommentText] = useState('')

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
      dueDate: dueDate || undefined
    })
      .then((res) => {
        setTasks((prev) => [res.data, ...prev.filter((t) => t._id !== res.data._id)])
        setTitle('')
        setDescription('')
        setPriority('medium')
        setAssignedTo('')
        setDueDate('')
        setCreateOpen(false)
      })
      .catch((err) => console.error(err))
  }

  const handleMoveStatus = (task, nextStatus, e) => {
    if (e) e.stopPropagation()
    updateTask(task._id, { status: nextStatus })
      .then((res) => {
        setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data : t)))
      })
      .catch((err) => console.error(err))
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

  if (loading) {
    return <div className="py-8 text-center text-sm text-[#9ca3af]">Loading board...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#1a1a2e] dark:text-slate-100">Project Tasks</h3>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#4f46e5] hover:bg-[#4338ca]"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const ColumnIcon = col.icon
          const colTasks = tasks.filter((t) => t.status === col.id)
          return (
            <div key={col.id} className="flex flex-col rounded-xl border border-[#e8e8ef] bg-[#f9f9fb] p-3 dark:bg-slate-900 dark:border-slate-800">
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
                        onClick={() => setSelectedTask(task)}
                        className="border-[#e8e8ef] bg-white p-3 shadow-xs hover:shadow-sm transition-all cursor-pointer dark:bg-slate-800 dark:border-slate-700"
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
    </div>
  )
}

export default KanbanBoard
