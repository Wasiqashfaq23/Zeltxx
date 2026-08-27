import { useState } from 'react'
import { GitBranch, GitCommit, RefreshCw, Check, ExternalLink } from 'lucide-react'
import axios from 'axios'
import { syncGitHubCommits } from '../../api/github'
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
  // Real GitHub API Sync State
  const [repoUrl, setRepoUrl] = useState('https://github.com/Wasiqashfaq23/Zeltxx')
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [syncedCommits, setSyncedCommits] = useState([])

  // Webhook Simulator State
  const [event, setEvent] = useState('push')
  const [authorName, setAuthorName] = useState('Alex Developer')
  const [meta, setMeta] = useState('fix(auth): fix session cookie handling & update tests')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSyncRealGitHub = async (e) => {
    e.preventDefault()
    if (!repoUrl) return
    setSyncing(true)
    setSyncMessage('')

    try {
      const res = await syncGitHubCommits(projectId, { repoUrl })
      setSyncMessage(res.data.message || 'Synced GitHub commits successfully!')
      setSyncedCommits(res.data.commits || [])
    } catch (err) {
      console.error(err)
      setSyncMessage(err.response?.data?.message || 'Failed to sync GitHub repository commits')
    } finally {
      setSyncing(false)
    }
  }

  const handleSimulate = (e) => {
    e.preventDefault()
    setSending(true)
    setSuccess(false)

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
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

  const webhookEndpointUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/webhooks/github/${projectId}`

  return (
    <div className="space-y-6">
      {/* Real GitHub Commit Sync */}
      <Card className="border-slate-200 bg-white shadow-xs dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCommit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Sync Real GitHub Commits directly
              </CardTitle>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
              Live GitHub REST API
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Connect any public or private GitHub repository (e.g. <code className="text-blue-600 dark:text-blue-400">owner/repo</code> or <code className="text-blue-600 dark:text-blue-400">https://github.com/facebook/react</code>).
            Zeltxx will fetch real commits, extract authors & messages, and auto-log score points onto your leaderboard!
          </p>

          <form onSubmit={handleSyncRealGitHub} className="space-y-4">
            <div>
              <Label htmlFor="gh-repo" className="text-slate-700 dark:text-slate-300 font-medium">GitHub Repository URL or Name</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="gh-repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="e.g. Wasiqashfaq23/Zeltxx or https://github.com/facebook/react"
                  required
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={syncing}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5 px-4"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Fetching Commits...' : 'Fetch & Sync Commits'}
                </Button>
              </div>
            </div>

            {syncMessage && (
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                {syncMessage}
              </div>
            )}

            {syncedCommits.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recently Synced Real GitHub Commits:</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {syncedCommits.map((c) => (
                    <div key={c._id || c.meta?.sha} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mr-2">[{c.meta?.sha}]</span>
                        <span className="text-slate-800 dark:text-slate-200">{c.meta?.commitMsg}</span>
                      </div>
                      {c.meta?.url && (
                        <a href={c.meta.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-slate-400 hover:text-blue-600">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* GitHub Webhook Listener & Simulator */}
      <Card className="border-slate-200 bg-white shadow-xs dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              GitHub Webhook Payload Listener & Simulator
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/80 dark:border-slate-700 space-y-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Your Project Webhook Listener URL:</p>
            <code className="block p-2 rounded bg-slate-200 dark:bg-slate-950 text-xs font-mono text-blue-700 dark:text-blue-400 break-all select-all">
              {webhookEndpointUrl}
            </code>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              Add this payload URL in GitHub Settings &rarr; Webhooks to auto-log every git push!
            </p>
          </div>

          <form onSubmit={handleSimulate} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 dark:text-slate-300 font-medium">Event Type</Label>
                <Select value={event} onValueChange={setEvent}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">Push Commit (4 pts)</SelectItem>
                    <SelectItem value="pull_request">Pull Request Review (3 pts)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="web-author" className="text-slate-700 dark:text-slate-300 font-medium">Author Name</Label>
                <Input
                  id="web-author"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Developer Name"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="web-meta" className="text-slate-700 dark:text-slate-300 font-medium">Commit / Event Message</Label>
              <Input
                id="web-meta"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                placeholder="e.g. feat(api): add webhook endpoint"
                required
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {success && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4" /> Webhook payload processed & Live Activity Feed updated!
                </span>
              )}
              <Button
                type="submit"
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium ml-auto"
              >
                {sending ? 'Triggering...' : 'Simulate Webhook Payload'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default WebhookSimulator
