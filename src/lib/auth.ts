import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'

export interface TokenPayload extends JWTPayload {
  userId: string
  email: string
  isSuperAdmin: boolean
  tenantId?: string
  role?: string
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!)

export async function signToken(payload: Omit<TokenPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '7d')
    .sign(JWT_SECRET)
}

export async function signRefreshToken(payload: { userId: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES_IN || '30d')
    .sign(JWT_REFRESH_SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as TokenPayload
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET)
  return payload as { userId: string }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value

  if (!token) return null

  try {
    return await verifyToken(token)
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<TokenPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireTenant(): Promise<TokenPayload & { tenantId: string }> {
  const session = await requireAuth()
  if (!session.tenantId) {
    throw new Error('No tenant selected')
  }
  return session as TokenPayload & { tenantId: string }
}

export async function requireSuperAdmin(): Promise<TokenPayload> {
  const session = await requireAuth()
  if (!session.isSuperAdmin) {
    throw new Error('Forbidden: Super Admin only')
  }
  return session
}
