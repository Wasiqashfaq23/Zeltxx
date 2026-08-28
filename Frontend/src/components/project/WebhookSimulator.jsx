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
  const [repoUrl, setRepoUrl] = useState('')
  const [patToken, setPatToken] = useState('')
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
      const res = await syncGitHubCommits(projectId, { repoUrl, personalAccessToken: patToken })
      setSyncMessage(res.data.message || 'Synced GitHub commits successfully!')
      if (res.data.commits) {
        setSyncedCommits(res.data.commits)
      }
    } catch (err) {
      setSyncMessage(err.response?.data?.message || 'Failed to sync GitHub commits')
    } finally {
      setSyncing(false)
    }
  }

  const handleSimulate = (e) => {
    e.preventDefault()
    setSending(true)
    setSuccess(false)

    const rawUrl =
      import.meta.env.BACKEND_URL ||
      import.meta.env.VITE_BACKEND_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:5001'
    const API_URL = rawUrl.replace(/\/$/, '')
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

  const rawUrl =
    import.meta.env.BACKEND_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5001'
  const webhookEndpointUrl = `${rawUrl.replace(/\/$/, '')}/api/webhooks/github/${projectId}`

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
          <form onSubmit={handleSyncRealGitHub} className="space-y-4">
            <div>
              <Label htmlFor="github-repo-url" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                GitHub Repository (URL or owner/repo)
              </Label>
              <Input
                id="github-repo-url"
                type="text"
                placeholder="e.g. facebook/react or https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="github-pat" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Personal Access Token (PAT) <span className="text-xs text-slate-500 font-normal">(Optional, for private repos or higher rate limits)</span>
              </Label>
              <Input
                id="github-pat"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={patToken}
                onChange={(e) => setPatToken(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={syncing || !repoUrl}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing from GitHub API...' : 'Fetch & Sync Live Commits'}
            </Button>
          </form>

          {syncMessage && (
            <p className={`text-sm font-medium ${syncMessage.includes('Failed') || syncMessage.includes('error') ? 'text-red-500' : 'text-emerald-500'}`}>
              {syncMessage}
            </p>
          )}

          {syncedCommits.length > 0 && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 p-3 text-xs space-y-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Recently Synced Commits:</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {syncedCommits.map((c) => (
                  <div key={c._id || c.meta?.sha} className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-800 pb-1">
                    <span className="font-mono text-blue-600 dark:text-blue-400">[{c.meta?.sha}]</span>
                    <span className="truncate flex-1">{c.meta?.commitMsg}</span>
                    {c.meta?.url && (
                      <a href={c.meta.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GitHub Webhook Simulator Card */}
      <Card className="border-slate-200 bg-white shadow-xs dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              GitHub Webhook Event Simulator
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 p-3 text-xs space-y-1">
            <span className="text-slate-500 font-medium">Your Project Webhook URL:</span>
            <p className="font-mono text-blue-600 dark:text-blue-400 break-all select-all">{webhookEndpointUrl}</p>
          </div>

          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <Label htmlFor="webhook-event" className="text-sm font-medium text-slate-700 dark:text-slate-300">Event Type</Label>
              <Select value={event} onValueChange={setEvent}>
                <SelectTrigger id="webhook-event" className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="push">Push (Commit)</SelectItem>
                  <SelectItem value="pull_request">Pull Request (Review)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="webhook-author" className="text-sm font-medium text-slate-700 dark:text-slate-300">Author Name</Label>
              <Input
                id="webhook-author"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="mt-1"
                placeholder="Author display name"
              />
            </div>

            <div>
              <Label htmlFor="webhook-meta" className="text-sm font-medium text-slate-700 dark:text-slate-300">Message / Detail</Label>
              <Input
                id="webhook-meta"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                className="mt-1"
                placeholder="Commit message or PR summary"
              />
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2"
            >
              {success ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  Simulated Webhook Sent!
                </>
              ) : (
                'Simulate Webhook Event'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default WebhookSimulator
