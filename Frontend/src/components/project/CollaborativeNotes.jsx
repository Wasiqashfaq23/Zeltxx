import { useState, useEffect, useRef } from 'react'
import { FileText, CheckCircle, RefreshCw } from 'lucide-react'
import { updateProjectNotes } from '../../api/projects'
import { useSocket } from '../../context/SocketContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CollaborativeNotes = ({ projectId, initialNotes }) => {
  const socket = useSocket()
  const [notes, setNotes] = useState(initialNotes || '')
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'saving'
  const [lastEditor, setLastEditor] = useState('')
  const saveTimeoutRef = useRef(null)

  useEffect(() => {
    setNotes(initialNotes || '')
  }, [initialNotes])

  useEffect(() => {
    if (!socket || !projectId) return

    const handleNoteChange = ({ notes: newNotes, updatedBy }) => {
      setNotes(newNotes)
      setSaveStatus('saved')
      if (updatedBy) setLastEditor(updatedBy)
    }

    socket.on('note_change', handleNoteChange)
    return () => {
      socket.off('note_change', handleNoteChange)
    }
  }, [socket, projectId])

  const handleChange = (e) => {
    const val = e.target.value
    setNotes(val)
    setSaveStatus('saving')

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      updateProjectNotes(projectId, { notes: val })
        .then(() => setSaveStatus('saved'))
        .catch((err) => console.error(err))
    }, 800)
  }

  return (
    <Card className="border-[#e8e8ef] bg-white shadow-sm flex flex-col h-[550px]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#e8e8ef] px-5 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#4f46e5]" />
          <CardTitle className="text-base font-semibold text-[#1a1a2e]">
            Collaborative Scratchpad
          </CardTitle>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {saveStatus === 'saving' ? (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <RefreshCw className="h-3 w-3 animate-spin" /> Saving...
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle className="h-3 w-3" /> Saved live
            </span>
          )}
          {lastEditor && (
            <span className="text-[#9ca3af] hidden sm:inline">
              (Last edited by {lastEditor})
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <textarea
          value={notes}
          onChange={handleChange}
          placeholder="Type shared project notes, meeting action items, or scratchpad ideas here... All team members see edits live!"
          className="w-full flex-1 p-5 text-sm leading-relaxed border-0 resize-none focus:outline-none bg-[#fafafa] text-[#1a1a2e] font-mono"
        />
      </CardContent>
    </Card>
  )
}

export default CollaborativeNotes
