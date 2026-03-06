import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor para redirect on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ============================================
// AUTH
// ============================================
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) =>
    api.post('/auth/register', data),
}

// ============================================
// ORDERS
// ============================================
export const ordersApi = {
  list: (params?: { status?: string; page?: number; search?: string }) =>
    api.get('/orders', { params }),
  updateStatus: (orderId: string, status: string, kanbanColumnId?: string) =>
    api.patch('/orders', { orderId, status, kanbanColumnId }),
}

// ============================================
// CATALOG
// ============================================
export const catalogApi = {
  // Categories
  getCategories: () => api.get('/catalog/categories'),
  createCategory: (data: { name: string; description?: string }) =>
    api.post('/catalog/categories', data),

  // Products
  getProducts: (params?: { categoryId?: string; search?: string }) =>
    api.get('/catalog/products', { params }),
  createProduct: (data: any) =>
    api.post('/catalog/products', data),
}

// ============================================
// CUSTOMERS
// ============================================
export const customersApi = {
  list: (params?: { page?: number; search?: string }) =>
    api.get('/customers', { params }),
}

// ============================================
// CAMPAIGNS
// ============================================
export const campaignsApi = {
  list: () => api.get('/campaigns'),
  create: (data: any) => api.post('/campaigns', data),
}

// ============================================
// TENANT
// ============================================
export const tenantApi = {
  getSettings: () => api.get('/tenant'),
  updateSettings: (data: any) => api.patch('/tenant', data),
}

export default api
