import { useState, useEffect } from 'react'
import { User, Sparkles, Check, Smile } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../api/auth'
import Layout from '../components/layout/Layout'
import UserAvatar from '../components/ui/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const STATUS_PRESETS = [
  '⚡ In deep work',
  '🚀 Shipping v2',
  '💬 Available for chat',
  '☕ Coffee break',
  '🌴 On vacation'
]

const Profile = () => {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [statusText, setStatusText] = useState(user?.statusText || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setStatusText(user.statusText || '')
      setBio(user.bio || '')
    }
  }, [user])

  const handleSave = (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    updateProfile({ name, statusText, bio })
      .then(() => {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      })
      .catch((err) => console.error(err))
      .finally(() => setSaving(false))
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Account Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your profile and status visible to teammates</p>
        </div>

        <Card className="border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Profile & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <UserAvatar user={{ ...user, statusText }} size="lg" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{user?.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                {statusText && (
                  <Badge variant="secondary" className="mt-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800">
                    {statusText}
                  </Badge>
                )}
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <Label htmlFor="prof-name" className="text-slate-700 dark:text-slate-300 font-medium">Display Name</Label>
                <Input
                  id="prof-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="prof-status" className="text-slate-700 dark:text-slate-300 font-medium">Custom Status</Label>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Shown on member stacks</span>
                </div>
                <Input
                  id="prof-status"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="e.g. ⚡ In deep work"
                  className="mt-1"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStatusText(preset)}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-blue-950/80 dark:hover:border-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="prof-bio" className="text-slate-700 dark:text-slate-300 font-medium">Bio</Label>
                <textarea
                  id="prof-bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell your team what you're working on..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {success && (
                  <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-4 w-4" /> Profile saved successfully!
                  </span>
                )}
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 ml-auto"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default Profile
