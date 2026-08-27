import { useState } from 'react'
import { GitBranch, GitCommit, GitPullRequest, Check, Sparkles } from 'lucide-react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

const WebhookSimulator = ({ projectId }) => {
  const [event, setEvent] = useState('push')
  const [authorName, setAuthorName] = useState('Alex Developer')
  const [meta, setMeta] = useState('fix(auth): fix session cookie handling & update tests')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSimulate = (e) => {
    e.preventDefault()
    setSending(true)
    setSuccess(false)

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    axios
      .post(`${API_URL}/api/webhooks/github/${projectId}`, {
        event,
        authorName,
        meta,
        type: event === 'push' ? 'commit' : 'review'
      }, { withCredentials: true })
      .then(() => {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      })
      .catch((err) => console.error(err))
      .finally(() => setSending(false))
  }

  return (
    <Card className="border-[#e8e8ef] bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <CardHeader className="border-b border-[#e8e8ef] px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-[#4f46e5]" />
          <CardTitle className="text-base font-semibold text-[#1a1a2e] dark:text-slate-100">
            GitHub Webhook Integration Simulator
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <p className="text-xs text-[#6b7280]">
          Test real-time automated contribution tracking by simulating incoming GitHub Webhook events.
          Events trigger live Socket.IO contribution feed updates and score additions!
        </p>

        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Event Type</Label>
              <Select value={event} onValueChange={setEvent}>
                <SelectTrigger className="mt-1 border-[#e8e8ef]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="push">Push Commit (4 pts)</SelectItem>
                  <SelectItem value="pull_request">Pull Request Review (3 pts)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="web-author">Author Name</Label>
              <Input
                id="web-author"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Developer Name"
                required
                className="mt-1 border-[#e8e8ef]"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="web-meta">Commit / Event Message</Label>
            <Input
              id="web-meta"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              placeholder="e.g. feat(api): add webhook endpoint"
              required
              className="mt-1 border-[#e8e8ef]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {success && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <Check className="h-4 w-4" /> Webhook processed & Socket feed updated!
              </span>
            )}
            <Button
              type="submit"
              disabled={sending}
              className="bg-[#4f46e5] hover:bg-[#4338ca] ml-auto"
            >
              {sending ? 'Triggering...' : 'Trigger Webhook Event'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default WebhookSimulator
