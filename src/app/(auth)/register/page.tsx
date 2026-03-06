"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/hooks/use-store'
import { BUSINESS_TYPE_CONFIG, type BusinessType } from '@/types'
import { MessageCircle, Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const businessTypes = Object.entries(BUSINESS_TYPE_CONFIG) as [BusinessType, typeof BUSINESS_TYPE_CONFIG[BusinessType]][]

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    businessName: '',
    businessType: 'GENERIC' as BusinessType,
  })

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || data.errors?.map((e: any) => e.message).join(', ') || 'Erro ao cadastrar')
        return
      }

      setAuth(data.data.user, data.data.tenant, data.data.token)
      router.push('/dashboard')
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2325D366' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-whatsapp shadow-lg shadow-whatsapp/20">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Zap<span className="text-whatsapp">Commerce</span>
          </h1>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all",
                step >= s
                  ? "bg-whatsapp text-white"
                  : "bg-slate-700 text-slate-500"
              )}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={cn("w-12 h-0.5", step > s ? "bg-whatsapp" : "bg-slate-700")} />}
            </div>
          ))}
        </div>

        <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-xl shadow-2xl">
          {/* STEP 1: Tipo de negócio */}
          {step === 1 && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-white">Qual seu tipo de negócio?</CardTitle>
                <CardDescription className="text-slate-400">
                  Vamos personalizar tudo para você
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto scrollbar-thin pr-1">
                  {businessTypes.map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => updateForm('businessType', type)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all hover:scale-[1.02]",
                        form.businessType === type
                          ? "border-whatsapp bg-whatsapp/10 text-white"
                          : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600"
                      )}
                    >
                      <span className="text-2xl">{config.icon}</span>
                      <span className="text-xs font-medium leading-tight">{config.label}</span>
                    </button>
                  ))}
                </div>

                <Button
                  variant="whatsapp"
                  className="w-full mt-4 h-11"
                  onClick={() => setStep(2)}
                >
                  Continuar <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </>
          )}

          {/* STEP 2: Dados do estabelecimento */}
          {step === 2 && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-white">
                  {BUSINESS_TYPE_CONFIG[form.businessType].icon} Dados do estabelecimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Nome do estabelecimento</Label>
                  <Input
                    placeholder="Ex: Lanchonete do João"
                    value={form.businessName}
                    onChange={(e) => updateForm('businessName', e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-whatsapp"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">WhatsApp do estabelecimento</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={form.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-whatsapp"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 border-slate-600 text-slate-300" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                  </Button>
                  <Button
                    variant="whatsapp"
                    className="flex-1"
                    onClick={() => form.businessName && form.phone ? setStep(3) : setError('Preencha todos os campos')}
                  >
                    Continuar <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* STEP 3: Dados pessoais */}
          {step === 3 && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-white">Crie sua conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-300">Seu nome</Label>
                  <Input
                    placeholder="Nome completo"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-whatsapp"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Email</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-whatsapp"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Senha</Label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-whatsapp"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 border-slate-600 text-slate-300" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                  </Button>
                  <Button
                    variant="whatsapp"
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Criar conta
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-sm text-slate-500 mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="text-whatsapp hover:underline font-medium">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}
