'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  ArrowLeft,
  Calendar,
  ExternalLink,
  Film,
  FileText,
  Newspaper,
  Pin,
  ShieldAlert,
  User,
  Waves,
} from 'lucide-react'

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

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  gempa: { label: 'Gempa', color: '#dc2626' },
  tsunami: { label: 'Tsunami', color: '#ea580c' },
  edukasi: { label: 'Edukasi', color: '#0891b2' },
  umum: { label: 'Umum', color: '#64748b' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BeritaPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<NewsItem | null>(null)

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/news?limit=50', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        setNews(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const youtubeNews = news.filter((n) => n.type === 'youtube')
  const pressNews = news.filter((n) => n.type === 'press_release')
  const pinnedNews = news.filter((n) => n.pinned)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800">
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
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Newspaper className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Berita Gempa</h1>
                <p className="text-[11px] text-slate-500">PS-212 Sistem Anti Gempa</p>
              </div>
            </div>
          </div>
          <Link href="/admin/login">
            <Button size="sm" variant="outline" className="border-slate-300">
              <ShieldAlert className="h-4 w-4 mr-1" />
              Admin
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Pinned news */}
        {pinnedNews.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1">
              <Pin className="h-4 w-4 text-red-500" />
              Berita Tersemat
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pinnedNews.map((n) => (
                <NewsCard key={n.id} news={n} onPlay={setSelectedVideo} />
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="all">Semua ({news.length})</TabsTrigger>
            <TabsTrigger value="youtube">
              <Film className="h-4 w-4 mr-1" />
              YouTube ({youtubeNews.length})
            </TabsTrigger>
            <TabsTrigger value="press">
              <FileText className="h-4 w-4 mr-1" />
              Siaran Pers ({pressNews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {loading ? (
              <LoadingState />
            ) : news.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {news.map((n) => (
                  <NewsCard key={n.id} news={n} onPlay={setSelectedVideo} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="youtube" className="mt-4">
            {loading ? (
              <LoadingState />
            ) : youtubeNews.length === 0 ? (
              <EmptyState type="YouTube" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {youtubeNews.map((n) => (
                  <NewsCard key={n.id} news={n} onPlay={setSelectedVideo} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="press" className="mt-4">
            {loading ? (
              <LoadingState />
            ) : pressNews.length === 0 ? (
              <EmptyState type="Siaran Pers" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pressNews.map((n) => (
                  <PressReleaseCard key={n.id} news={n} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 truncate pr-2">{selectedVideo.title}</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedVideo(null)}
                className="flex-shrink-0"
              >
                ✕
              </Button>
            </div>
            <div className="aspect-video bg-black">
              {selectedVideo.youtubeId && (
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                  title={selectedVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            <div className="p-3 text-sm text-slate-600">
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {selectedVideo.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(selectedVideo.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4 text-xs text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Activity className="h-4 w-4 text-red-500" />
            PS-212 Sistem Anti Gempa
          </span>
          <span>Berita dikelola oleh Admin</span>
        </div>
      </footer>
    </div>
  )
}

function NewsCard({ news, onPlay }: { news: NewsItem; onPlay: (n: NewsItem) => void }) {
  const cat = CATEGORY_LABELS[news.category] || CATEGORY_LABELS.umum

  return (
    <Card className="border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-100 cursor-pointer group" onClick={() => news.youtubeId && onPlay(news)}>
        {news.imageUrl ? (
           
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              // Fallback ke thumbnail default YouTube
              if (news.youtubeId) {
                ;(e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${news.youtubeId}/hqdefault.jpg`
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-200">
            {news.type === 'youtube' ? <Film className="h-10 w-10 text-slate-400" /> : <FileText className="h-10 w-10 text-slate-400" />}
          </div>
        )}
        {/* Play button overlay untuk YouTube */}
        {news.type === 'youtube' && news.youtubeId && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="h-14 w-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <svg className="h-7 w-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <Badge
            className="text-[10px]"
            style={{ backgroundColor: news.type === 'youtube' ? '#dc2626' : '#0891b2', color: '#fff' }}
          >
            {news.type === 'youtube' ? '📹 YouTube' : '📄 Siaran Pers'}
          </Badge>
        </div>
        {news.pinned && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-red-600 text-[10px]">
              <Pin className="h-3 w-3 mr-1" />
              Pin
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: cat.color, color: cat.color }}>
            {cat.label}
          </Badge>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(news.createdAt)}
          </span>
        </div>
        <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 mb-1">{news.title}</h3>
        {news.content && (
          <p className="text-xs text-slate-500 line-clamp-2">{news.content}</p>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <User className="h-3 w-3" />
            {news.author}
          </span>
          {news.type === 'youtube' && news.youtubeUrl && (
            <a
              href={news.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-red-600 hover:underline flex items-center gap-0.5"
            >
              YouTube <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PressReleaseCard({ news }: { news: NewsItem }) {
  const cat = CATEGORY_LABELS[news.category] || CATEGORY_LABELS.umum

  return (
    <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-cyan-600 text-[10px]">
            <FileText className="h-3 w-3 mr-1" />
            Siaran Pers
          </Badge>
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: cat.color, color: cat.color }}>
            {cat.label}
          </Badge>
          {news.pinned && (
            <Badge className="bg-red-600 text-[10px]">
              <Pin className="h-3 w-3 mr-1" />
              Pin
            </Badge>
          )}
        </div>
        <CardTitle className="text-base text-slate-900">{news.title}</CardTitle>
        <CardDescription className="text-xs text-slate-500 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {news.author}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(news.createdAt)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {news.content && (
          <div className="prose prose-sm max-w-none">
            {news.content.split('\n').map((line, i) => (
              <p key={i} className="text-sm text-slate-700 leading-relaxed mb-2 whitespace-pre-wrap">
                {line}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="border-slate-200">
          <Skeleton className="aspect-video w-full rounded-none bg-slate-200" />
          <CardContent className="p-3">
            <Skeleton className="h-3 w-20 bg-slate-200 mb-2" />
            <Skeleton className="h-4 w-full bg-slate-200 mb-1" />
            <Skeleton className="h-4 w-2/3 bg-slate-200" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState({ type }: { type?: string }) {
  return (
    <div className="text-center py-16">
      <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
        <Newspaper className="h-8 w-8 text-slate-400" />
      </div>
      <p className="text-slate-600 font-medium">
        Belum ada berita{type ? ` ${type}` : ''}
      </p>
      <p className="text-sm text-slate-400 mt-1">
        Admin belum menerbitkan berita. Silakan kembali nanti.
      </p>
    </div>
  )
}
