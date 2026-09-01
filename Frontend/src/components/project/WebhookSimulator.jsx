import api from '../../api/axiosInstance'
import { backendUrl } from '../../config'
import { useState } from 'react'
import { GitBranch, GitCommit, RefreshCw, Check, ExternalLink, KeyRound, Copy, Loader2 } from 'lucide-react'
import { syncGitHubCommits } from '../../api/github'
import { generateWebhookSecret } from '../../api/projects'
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

const hmacSha256Hex = async (secret, message) => {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

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
  const [simResult, setSimResult] = useState(null)

  // Webhook secret management
  const [secret, setSecret] = useState('')
  const [generatingSecret, setGeneratingSecret] = useState(false)
  const [secretMsg, setSecretMsg] = useState('')

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
      setSyncMessage(
        err.response?.status === 403
          ? 'Not authorized — you must be a member of this project.'
          : err.response?.data?.message || 'Failed to sync GitHub commits'
      )
    } finally {
      setSyncing(false)
    }
  }

  const handleGenerateSecret = async () => {
    setGeneratingSecret(true)
    setSecretMsg('')
    try {
      const res = await generateWebhookSecret(projectId)
      setSecret(res.data.webhookSecret || '')
      setSecretMsg('Secret generated. It is shown once — copy it now.')
    } catch (err) {
      setSecretMsg(err.response?.data?.message || 'Could not generate secret')
    } finally {
      setGeneratingSecret(false)
    }
  }

  const handleCopySecret = async () => {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      setSecretMsg('Secret copied to clipboard.')
    } catch {
      setSecretMsg(secret)
    }
  }

  const handleSimulate = async (e) => {
    e.preventDefault()
    setSending(true)
    setSimResult(null)

    try {
      if (!secret) {
        setSimResult({ ok: false, message: 'Generate (or paste) the webhook secret first — the server verifies the signature.' })
        return
      }

      const payload = (() => {
        if (event === 'pull_request_review') {
          return {
            event,
            action: 'submitted',
            review: {
              state: 'approved',
              user: { login: authorName },
              html_url: 'https://github.com/example/repo/pull/1#pullrequestreview-1'
            }
          }
        }
        if (event === 'pull_request') {
          return {
            event,
            action: 'opened',
            pull_request: {
              number: 12,
              title: meta,
              user: { login: authorName },
              html_url: 'https://github.com/example/repo/pull/12'
            }
          }
        }
        if (event === 'pull_request_merged') {
          return {
            event,
            action: 'closed',
            pull_request: {
              number: 13,
              title: meta,
              merged: true,
              user: { login: authorName },
              html_url: 'https://github.com/example/repo/pull/13'
            }
          }
        }
        if (event === 'issues') {
          return {
            event,
            action: 'opened',
            issue: {
              number: 34,
              title: meta,
              user: { login: authorName },
              html_url: 'https://github.com/example/repo/issues/34'
            }
          }
        }
        return { event, authorName, meta, type: 'commit' }
      })()
      const raw = JSON.stringify(payload)
      const signature = await hmacSha256Hex(secret, raw)

      await api.post(`/api/webhooks/github/${projectId}`, raw, {
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': `sha256=${signature}`,
          'X-GitHub-Event': event
        }
      })
      setSimResult({ ok: true, message: 'Simulated webhook accepted and processed!' })
    } catch (err) {
      const status = err.response?.status
      setSimResult({
        ok: false,
        message:
          status === 401
            ? 'Signature rejected — the secret does not match the project webhook secret.'
            : status === 403
              ? 'No webhook secret configured for this project yet.'
              : err.response?.data?.error || err.response?.data?.message || 'Webhook simulation failed'
      })
    } finally {
      setSending(false)
    }
  }

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
            <p className={`text-sm font-medium ${syncMessage.includes('Failed') || syncMessage.includes('authorized') ? 'text-red-500' : 'text-emerald-500'}`}>
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
            <p className="font-mono text-blue-600 dark:text-blue-400 break-all select-all">
              {backendUrl}/api/webhooks/github/{projectId}
            </p>
          </div>

          {/* Webhook secret management */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5 text-blue-500" /> Webhook Secret (HMAC-SHA256)
              </span>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={handleGenerateSecret}
                disabled={generatingSecret}
                className="gap-1"
              >
                {generatingSecret ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                {generatingSecret ? 'Generating...' : 'Generate'}
              </Button>
            </div>
            {secret ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all font-mono text-xs text-blue-600 dark:text-blue-400 py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  {secret}
                </code>
                <Button size="icon-sm" variant="outline" onClick={handleCopySecret} title="Copy secret">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate a secret to allow signed webhook deliveries from GitHub. Paste the same value into the GitHub
                webhook &quot;Secret&quot; field.
              </p>
            )}
            {secretMsg && <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">{secretMsg}</p>}
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
                  <SelectItem value="pull_request">Pull Request Opened</SelectItem>
                  <SelectItem value="pull_request_merged">Pull Request Merged</SelectItem>
                  <SelectItem value="issues">Issue Opened</SelectItem>
                  <SelectItem value="pull_request_review">Review Submitted</SelectItem>
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
              disabled={sending || !secret}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Simulate Webhook Event'
              )}
            </Button>
          </form>

          {simResult && (
            <p className={`text-sm font-medium ${simResult.ok ? 'text-emerald-500' : 'text-red-500'}`}>
              {simResult.ok ? <Check className="inline h-4 w-4 mr-1" /> : null}
              {simResult.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default WebhookSimulator