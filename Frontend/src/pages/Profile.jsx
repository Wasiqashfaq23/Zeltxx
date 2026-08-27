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
          <h1 className="text-2xl font-bold text-[#1a1a2e] dark:text-slate-100">Account Settings</h1>
          <p className="text-sm text-[#6b7280]">Manage your profile and status visible to teammates</p>
        </div>

        <Card className="border-[#e8e8ef] bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-[#e8e8ef] px-6 py-4 dark:border-slate-800">
            <CardTitle className="text-base font-semibold text-[#1a1a2e] dark:text-slate-100">
              Profile & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f4f4f7] dark:bg-slate-800">
              <UserAvatar user={{ ...user, statusText }} size="lg" />
              <div>
                <h3 className="text-lg font-bold text-[#1a1a2e] dark:text-slate-100">{user?.name}</h3>
                <p className="text-xs text-[#6b7280]">{user?.email}</p>
                {statusText && (
                  <Badge variant="secondary" className="mt-2 bg-indigo-50 text-[#4f46e5] border-indigo-200">
                    {statusText}
                  </Badge>
                )}
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="prof-name">Display Name</Label>
                <Input
                  id="prof-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 border-[#e8e8ef]"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="prof-status">Custom Status</Label>
                  <span className="text-xs text-[#9ca3af]">Shown on member stacks</span>
                </div>
                <Input
                  id="prof-status"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="e.g. ⚡ In deep work"
                  className="mt-1 border-[#e8e8ef]"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {STATUS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStatusText(preset)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-[#e8e8ef] bg-[#fafafa] hover:bg-[#f4f4f7] text-[#6b7280] transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="prof-bio">Bio</Label>
                <textarea
                  id="prof-bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell your team what you're working on..."
                  className="mt-1 w-full rounded-md border border-[#e8e8ef] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5] dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {success && (
                  <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                    <Check className="h-4 w-4" /> Profile saved successfully!
                  </span>
                )}
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#4f46e5] hover:bg-[#4338ca] ml-auto"
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
