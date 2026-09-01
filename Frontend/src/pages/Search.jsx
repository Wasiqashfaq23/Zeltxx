import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, FolderGit2, CheckSquare, StickyNote, Link2, ArrowRight } from 'lucide-react'
import { globalSearch } from '../api/search'
import Layout from '../components/layout/Layout'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'
import UserAvatar from '../components/ui/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const STATUS_STYLES = {
  todo: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
}

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState({ projects: [], tasks: [], notes: [], resources: [] })
  const [loading, setLoading] = useState(false)

  const q = searchParams.get('q') || ''

  useEffect(() => {
    if (!q.trim()) {
      setResults({ projects: [], tasks: [], notes: [], resources: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    globalSearch(q.trim())
      .then((res) => setResults(res.data || { projects: [], tasks: [], notes: [], resources: [] }))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [q])

  const handleSubmit = (e) => {
    e.preventDefault()
    setSearchParams(query.trim() ? { q: query.trim() } : {})
  }

  const total = results.projects.length + results.tasks.length + results.notes.length + results.resources.length
  const sections = []

  if (results.projects.length) {
    sections.push({
      key: 'projects',
      icon: <FolderGit2 className="h-4 w-4" />,
      title: `Projects (${results.projects.length})`,
      items: results.projects.map((p) => (
        <button
          key={p._id}
          onClick={() => navigate(`/projects/${p._id}`)}
          className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
        >
          <FolderGit2 className="h-5 w-5 shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{p.name}</p>
            {p.description && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{p.description}</p>}
          </div>
          <Badge variant="secondary" className="shrink-0">{p.members?.length || 0} members</Badge>
        </button>
      ))
    })
  }

  if (results.tasks.length) {
    sections.push({
      key: 'tasks',
      icon: <CheckSquare className="h-4 w-4" />,
      title: `Tasks (${results.tasks.length})`,
      items: results.tasks.map((t) => (
        <button
          key={t._id}
          onClick={() => navigate(`/projects/${t.project?._id || ''}?tab=kanban`)}
          className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
        >
          <UserAvatar user={t.assignedTo || { name: '?' }} size="xs" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{t.title}</p>
            {t.description && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{t.description}</p>}
            <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{t.project?.name}</p>
          </div>
          <Badge className={`shrink-0 capitalize ${STATUS_STYLES[t.status] || STATUS_STYLES.todo}`}>{t.status?.replace('_', ' ')}</Badge>
        </button>
      ))
    })
  }

  if (results.notes.length) {
    sections.push({
      key: 'notes',
      icon: <StickyNote className="h-4 w-4" />,
      title: `Project Notes (${results.notes.length})`,
      items: results.notes.map((n) => (
        <button
          key={n.projectId}
          onClick={() => navigate(`/projects/${n.projectId}?tab=notes`)}
          className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
        >
          <StickyNote className="h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{n.projectName}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{n.snippet}</p>
          </div>
        </button>
      ))
    })
  }

  if (results.resources.length) {
    sections.push({
      key: 'resources',
      icon: <Link2 className="h-4 w-4" />,
      title: `Docs & Links (${results.resources.length})`,
      items: results.resources.map((r) => (
        <a
          key={r._id}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
        >
          <Link2 className="h-5 w-5 shrink-0 text-violet-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{r.title}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.project?.name}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
        </a>
      ))
    })
  }

  return (
    <Layout>
      <form onSubmit={handleSubmit} className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your projects, tasks, notes and resources..."
            className="pl-9"
          />
        </div>
        <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
          Search
        </Button>
      </form>

      {!q.trim() ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          message="Type something above to search across everything you have access to."
        />
      ) : loading ? (
        <Loader />
      ) : total === 0 ? (
        <EmptyState icon={<Search className="h-6 w-6" />} message={`No matches for "${q}"`} />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {sections.map((section) => (
            <Card key={section.key} className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="border-b border-slate-200 px-4 sm:px-5 py-3.5 dark:border-slate-800">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  {section.icon}
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 divide-y divide-slate-100 dark:divide-slate-800">
                {section.items}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default SearchPage