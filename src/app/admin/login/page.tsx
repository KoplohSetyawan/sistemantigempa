'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, Lock, ShieldAlert, User } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error('Username dan password wajib diisi')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json()

      if (json.success) {
        toast.success('Login berhasil!')
        router.push('/admin')
      } else {
        toast.error(json.error || 'Login gagal')
      }
    } catch (e) {
      console.error(e)
      toast.error('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block mb-4">
          <Button size="sm" variant="outline" className="border-slate-300">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali ke Dashboard
          </Button>
        </Link>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg mx-auto mb-3">
              <ShieldAlert className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-xl text-slate-900">Login Admin</CardTitle>
            <CardDescription className="text-slate-500">
              PS-212 Sistem Anti Gempa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 border-slate-300"
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 border-slate-300"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Login
                  </>
                )}
              </Button>
            </form>

            {/* Demo credentials hint */}
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
              <p className="font-semibold mb-1">🔑 Kredensial Demo:</p>
              <p>Username: <code className="bg-blue-100 px-1.5 py-0.5 rounded">admin</code></p>
              <p>Password: <code className="bg-blue-100 px-1.5 py-0.5 rounded">gempa212</code></p>
              <p className="mt-1 text-blue-600">
                Untuk produksi, set env <code>ADMIN_USERNAME</code> & <code>ADMIN_PASSWORD</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
