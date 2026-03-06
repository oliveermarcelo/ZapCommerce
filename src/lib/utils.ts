import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ShadCN class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatar moeda BRL
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Formatar número de pedido
export function formatOrderNumber(num: number): string {
  return `#${String(num).padStart(3, '0')}`
}

// Gerar slug a partir de texto
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Formatar telefone BR
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 13) { // Com +55
    return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
  }
  return phone
}

// Normalizar número WhatsApp (55XXXXXXXXXXX)
export function normalizeWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned
  }
  return cleaned
}

// Formatar data relativa
export function timeAgo(date: Date | string): string {
  const now = new Date()
  const past = new Date(date)
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (seconds < 60) return 'agora'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  return past.toLocaleDateString('pt-BR')
}

// Validar CNPJ
export function isValidCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, '')
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false

  let sum = 0
  let weight = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  for (let i = 0; i < 12; i++) sum += parseInt(cnpj[i]) * weight[i]
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (parseInt(cnpj[12]) !== digit) return false

  sum = 0
  weight = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  for (let i = 0; i < 13; i++) sum += parseInt(cnpj[i]) * weight[i]
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (parseInt(cnpj[13]) !== digit) return false

  return true
}

// Validar CPF
export function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '')
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i)
  let digit = 11 - (sum % 11)
  if (digit > 9) digit = 0
  if (parseInt(cpf[9]) !== digit) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i)
  digit = 11 - (sum % 11)
  if (digit > 9) digit = 0
  if (parseInt(cpf[10]) !== digit) return false

  return true
}

// Checar se está dentro do horário de funcionamento
export function isWithinBusinessHours(businessHours: Record<string, { open: string; close: string }> | null): boolean {
  if (!businessHours) return true // Sem horário = sempre aberto

  const now = new Date()
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const today = days[now.getDay()]
  const schedule = businessHours[today]

  if (!schedule) return false // Dia não configurado = fechado

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return currentTime >= schedule.open && currentTime <= schedule.close
}

// Calcular distância entre dois pontos (Haversine)
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371 // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
