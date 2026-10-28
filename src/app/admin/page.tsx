'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Eye,
  FileText,
  Film,
  Loader2,
  LogOut,
  Newspaper,
  Pencil,
  Pin,
  Plus,
  ShieldAlert,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

interface NewsItem {
  id: string
  type: string
  title: string
  content: string | null
  youtubeId: string | null
  youtubeUrl: string | null
  imageUrl: string | null
  category: string
  author: string
  isPublished: boolean
  pinned: boolean
  createdAt: string
  updatedAt: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuth, setIsAuth] = useState(false)
  const [username, setUsername] = useState('')
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formType, setFormType] = useState<'youtube' | 'press_release'>('youtube')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formCategory, setFormCategory] = useState('gempa')
  const [formPublished, setFormPublished] = useState(true)
  const [formPinned, setFormPinned] = useState(false)

  // Cek auth saat load
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' })
      const json = await res.json()
      if (json.authenticated) {
        setIsAuth(true)
        setUsername(json.user.username)
        fetchNews()
      } else {
        router.push('/admin/login')
      }
    } catch {
      router.push('/admin/login')
    } finally {
      setAuthChecked(true)
    }
  }

  const fetchNews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/news?admin=true&limit=100', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        setNews(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logout berhasil')
    router.push('/admin/login')
  }

  const openCreateDialog = () => {
    setEditingNews(null)
    setFormType('youtube')
    setFormTitle('')
    setFormContent('')
    setFormYoutubeUrl('')
    setFormImageUrl('')
    setFormCategory('gempa')
    setFormPublished(true)
    setFormPinned(false)
    setDialogOpen(true)
  }

  const openEditDialog = (n: NewsItem) => {
    setEditingNews(n)
    setFormType(n.type as 'youtube' | 'press_release')
    setFormTitle(n.title)
    setFormContent(n.content || '')
    setFormYoutubeUrl(n.youtubeUrl || '')
    setFormImageUrl(n.imageUrl || '')
    setFormCategory(n.category)
    setFormPublished(n.isPublished)
    setFormPinned(n.pinned)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      toast.error('Judul wajib diisi')
      return
    }
    if (formType === 'youtube' && !formYoutubeUrl.trim()) {
      toast.error('URL YouTube wajib diisi')
      return
    }
    if (formType === 'press_release' && !formContent.trim()) {
      toast.error('Konten siaran pers wajib diisi')
      return
    }

    setSaving(true)
    try {
      const body = {
        type: formType,
        title: formTitle,
        content: formContent,
        youtubeUrl: formYoutubeUrl,
        imageUrl: formImageUrl,
        category: formCategory,
        isPublished: formPublished,
        pinned: formPinned,
      }

      const res = await fetch(
        editingNews ? `/api/news/${editingNews.id}` : '/api/news',
        {
          method: editingNews ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      const json = await res.json()

      if (json.success) {
        toast.success(editingNews ? 'Berita diperbarui' : 'Berita dibuat')
        setDialogOpen(false)
        fetchNews()
      } else {
        toast.error(json.error || 'Gagal menyimpan')
      }
    } catch (e) {
      console.error(e)
      toast.error('Gagal menyimpan berita')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/news/${deleteId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Berita dihapus')
        setDeleteId(null)
        fetchNews()
      } else {
        toast.error(json.error || 'Gagal menghapus')
      }
    } catch (e) {
      console.error(e)
      toast.error('Gagal menghapus berita')
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!isAuth) return null

  const youtubeCount = news.filter((n) => n.type === 'youtube').length
  const pressCount = news.filter((n) => n.type === 'press_release').length
  const publishedCount = news.filter((n) => n.isPublished).length

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button size="sm" variant="outline" className="border-slate-300">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <Link href="/berita">
              <Button size="sm" variant="outline" className="border-slate-300">
                <Eye className="h-4 w-4 mr-1" />
                Lihat Berita
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-[11px] text-slate-500">
                  Login sebagai: <span className="font-semibold">{username}</span>
                </p>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleLogout} className="border-red-300 text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatBox icon={<Newspaper className="h-5 w-5" />} label="Total Berita" value={news.length} color="#0891b2" />
          <StatBox icon={<Film className="h-5 w-5" />} label="Video YouTube" value={youtubeCount} color="#dc2626" />
          <StatBox icon={<FileText className="h-5 w-5" />} label="Siaran Pers" value={pressCount} color="#0ea5e9" />
          <StatBox icon={<CheckCircle2 className="h-5 w-5" />} label="Terpublikasi" value={publishedCount} color="#16a34a" />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Kelola Berita</h2>
          <Button onClick={openCreateDialog} className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white">
            <Plus className="h-4 w-4 mr-1" />
            Tambah Berita
          </Button>
        </div>

        {/* News list */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
          </div>
        ) : news.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="text-center py-12">
              <Newspaper className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Belum ada berita</p>
              <p className="text-sm text-slate-400 mt-1">Klik "Tambah Berita" untuk membuat berita pertama</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {news.map((n) => (
              <Card key={n.id} className="border-slate-200 bg-white shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="h-14 w-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    {n.imageUrl ? (
                       
                      <img src={n.imageUrl} alt={n.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {n.type === 'youtube' ? <Film className="h-6 w-6 text-slate-400" /> : <FileText className="h-6 w-6 text-slate-400" />}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: n.type === 'youtube' ? '#dc2626' : '#0891b2', color: n.type === 'youtube' ? '#dc2626' : '#0891b2' }}>
                        {n.type === 'youtube' ? 'YouTube' : 'Siaran Pers'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{n.category}</Badge>
                      {n.pinned && (
                        <Badge className="bg-red-600 text-[10px]">
                          <Pin className="h-3 w-3 mr-0.5" />Pin
                        </Badge>
                      )}
                      {!n.isPublished && (
                        <Badge variant="outline" className="text-[10px] border-slate-400 text-slate-500">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-slate-900 truncate">{n.title}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {n.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(n)} className="h-8 w-8 p-0">
                      <Pencil className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(n.id)} className="h-8 w-8 p-0 hover:bg-red-50">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNews ? 'Edit Berita' : 'Tambah Berita Baru'}</DialogTitle>
            <DialogDescription>
              {editingNews ? 'Perbarui informasi berita' : 'Buat berita gempa baru (YouTube atau Siaran Pers)'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Type */}
            <div className="space-y-2">
              <Label>Tipe Berita</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormType('youtube')}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    formType === 'youtube' ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Film className="h-5 w-5 text-red-600 mb-1" />
                  <p className="font-semibold text-sm">Video YouTube</p>
                  <p className="text-[11px] text-slate-500">Embed video berita gempa</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('press_release')}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    formType === 'press_release' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <FileText className="h-5 w-5 text-cyan-600 mb-1" />
                  <p className="font-semibold text-sm">Siaran Pers</p>
                  <p className="text-[11px] text-slate-500">Tulis berita gempa</p>
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Judul Berita *</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={formType === 'youtube' ? 'contoh: Gempa M6.2 Guncang Sulawesi' : 'contoh: Siaran Pers BMKG - Gempa Terkini'}
                required
              />
            </div>

            {/* YouTube URL (jika type youtube) */}
            {formType === 'youtube' && (
              <div className="space-y-2">
                <Label htmlFor="youtube">URL YouTube *</Label>
                <Input
                  id="youtube"
                  value={formYoutubeUrl}
                  onChange={(e) => setFormYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Format: youtube.com/watch?v=... atau youtu.be/... atau youtube.com/shorts/...
                </p>
                {/* Preview */}
                {formYoutubeUrl && (() => {
                  const match = formYoutubeUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
                  const ytId = match?.[1]
                  return ytId ? (
                    <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 max-w-sm">
                      { }
                      <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : null
                })()}
              </div>
            )}

            {/* Content (jika press_release) */}
            {formType === 'press_release' && (
              <div className="space-y-2">
                <Label htmlFor="content">Isi Siaran Pers *</Label>
                <Textarea
                  id="content"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Tulis isi siaran pers di sini... (gunakan Enter untuk paragraf baru)"
                  rows={8}
                  required
                />
              </div>
            )}

            {/* Image URL (opsional) */}
            <div className="space-y-2">
              <Label htmlFor="image">URL Gambar Thumbnail (opsional)</Label>
              <Input
                id="image"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://... (kosongkan untuk auto-thumbnail YouTube)"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gempa">Gempa</SelectItem>
                  <SelectItem value="tsunami">Tsunami</SelectItem>
                  <SelectItem value="edukasi">Edukasi</SelectItem>
                  <SelectItem value="umum">Umum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={formPublished} onCheckedChange={setFormPublished} id="published" />
                <Label htmlFor="published" className="cursor-pointer">Publikasikan</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formPinned} onCheckedChange={setFormPinned} id="pinned" />
                <Label htmlFor="pinned" className="cursor-pointer">
                  <Pin className="h-3 w-3 inline mr-1" />
                  Sematkan
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : editingNews ? (
                  'Simpan Perubahan'
                ) : (
                  'Buat Berita'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Berita?</DialogTitle>
            <DialogDescription>
              Berita akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              <Trash2 className="h-4 w-4 mr-1" />
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20', color }}>
          {icon}
        </div>
        <div>
          <p className="text-[11px] text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
