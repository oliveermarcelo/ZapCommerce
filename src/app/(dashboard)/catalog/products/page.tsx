"use client"

import React, { useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency, slugify } from '@/lib/utils'
import {
  Plus, Search, MoreVertical, Edit, Trash2, Eye, EyeOff,
  GripVertical, Package, ImagePlus, X, Save, Loader2
} from 'lucide-react'
import type { Product, Category } from '@/types'

// Mock data
const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Lanches', slug: 'lanches', position: 0, isActive: true },
  { id: 'cat-2', name: 'Bebidas', slug: 'bebidas', position: 1, isActive: true },
  { id: 'cat-3', name: 'Combos', slug: 'combos', position: 2, isActive: true },
]

const mockProducts: Product[] = [
  { id: 'p1', name: 'X-Burguer Especial', slug: 'x-burguer-especial', price: 28.90, position: 0, isActive: true, categoryId: 'cat-1', stockEnabled: false, description: 'Pão, hambúrguer, queijo, alface, tomate e maionese' },
  { id: 'p2', name: 'X-Bacon', slug: 'x-bacon', price: 32.90, position: 1, isActive: true, categoryId: 'cat-1', stockEnabled: false, description: 'Pão, hambúrguer, queijo, bacon crocante' },
  { id: 'p3', name: 'Coca-Cola 600ml', slug: 'coca-cola-600', price: 7.50, position: 0, isActive: true, categoryId: 'cat-2', stockEnabled: true, stockQuantity: 48 },
  { id: 'p4', name: 'Combo Família', slug: 'combo-familia', price: 89.90, promotionalPrice: 79.90, position: 0, isActive: true, categoryId: 'cat-3', stockEnabled: false },
  { id: 'p5', name: 'Hot Dog Completo', slug: 'hot-dog-completo', price: 18.50, position: 2, isActive: false, categoryId: 'cat-1', stockEnabled: false },
]

export default function ProductsPage() {
  const [products, setProducts] = useState(mockProducts)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !selectedCategory || p.categoryId === selectedCategory
    return matchSearch && matchCategory
  })

  const toggleActive = (id: string) => {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, isActive: !p.isActive } : p
    ))
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setShowModal(true)
  }

  const openNew = () => {
    setEditingProduct(null)
    setShowModal(true)
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {products.length} produtos cadastrados
          </p>
        </div>
        <Button variant="whatsapp" className="gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {mockCategories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="whitespace-nowrap"
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid gap-3">
        {filtered.map(product => {
          const category = mockCategories.find(c => c.id === product.categoryId)
          return (
            <Card
              key={product.id}
              className={cn(
                "border-0 shadow-sm hover:shadow-md transition-all",
                !product.isActive && "opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <div className="cursor-grab text-slate-300 hover:text-slate-400 hidden sm:block">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Image placeholder */}
                  <div className="h-14 w-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-slate-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{product.name}</h3>
                      {!product.isActive && (
                        <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {category?.name}
                      </Badge>
                      {product.description && (
                        <p className="text-xs text-muted-foreground truncate hidden sm:block">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    {product.promotionalPrice ? (
                      <>
                        <p className="text-xs text-muted-foreground line-through">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="text-sm font-bold text-emerald-600">
                          {formatCurrency(product.promotionalPrice)}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(product.price)}
                      </p>
                    )}
                    {product.stockEnabled && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Estoque: {product.stockQuantity}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => toggleActive(product.id)}
                      className="h-8 w-8"
                      title={product.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {product.isActive ? (
                        <Eye className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => openEdit(product)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filtered.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">Nenhum produto encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? 'Tente outra busca' : 'Cadastre seu primeiro produto'}
              </p>
              {!search && (
                <Button variant="whatsapp" size="sm" className="mt-4 gap-2" onClick={openNew}>
                  <Plus className="h-4 w-4" /> Cadastrar produto
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          categories={mockCategories}
          onClose={() => setShowModal(false)}
          onSave={(product) => {
            if (editingProduct) {
              setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...product } : p))
            } else {
              setProducts(prev => [...prev, { ...product, id: `p-${Date.now()}`, position: prev.length } as Product])
            }
            setShowModal(false)
          }}
        />
      )}
    </DashboardLayout>
  )
}

// ============================================
// Product Modal (Create/Edit)
// ============================================
function ProductModal({
  product,
  categories,
  onClose,
  onSave,
}: {
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSave: (data: Partial<Product>) => void
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    promotionalPrice: product?.promotionalPrice?.toString() || '',
    categoryId: product?.categoryId || categories[0]?.id || '',
    stockEnabled: product?.stockEnabled || false,
    stockQuantity: product?.stockQuantity?.toString() || '',
    isActive: product?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // TODO: API call
    await new Promise(r => setTimeout(r, 500))
    onSave({
      name: form.name,
      slug: slugify(form.name),
      description: form.description || undefined,
      price: parseFloat(form.price),
      promotionalPrice: form.promotionalPrice ? parseFloat(form.promotionalPrice) : undefined,
      categoryId: form.categoryId,
      stockEnabled: form.stockEnabled,
      stockQuantity: form.stockEnabled ? parseInt(form.stockQuantity) : undefined,
      isActive: form.isActive,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">
            {product ? 'Editar produto' : 'Novo produto'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Image Upload */}
          <div className="flex justify-center">
            <div className="h-28 w-28 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-whatsapp hover:bg-whatsapp/5 transition-colors">
              <ImagePlus className="h-6 w-6 text-slate-300 mb-1" />
              <span className="text-[10px] text-muted-foreground">Adicionar foto</span>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Nome do produto *</Label>
            <Input
              placeholder="Ex: X-Burguer Especial"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <textarea
              placeholder="Descreva o produto..."
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.price}
                  onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preço promocional</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.promotionalPrice}
                  onChange={(e) => setForm(f => ({ ...f, promotionalPrice: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
            <div>
              <Label>Controle de estoque</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Ativar para produtos com estoque limitado</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, stockEnabled: !f.stockEnabled }))}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                form.stockEnabled ? "bg-whatsapp" : "bg-slate-300"
              )}
            >
              <span className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                form.stockEnabled ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>

          {form.stockEnabled && (
            <div className="space-y-2">
              <Label>Quantidade em estoque</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.stockQuantity}
                onChange={(e) => setForm(f => ({ ...f, stockQuantity: e.target.value }))}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3 rounded-b-2xl">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="whatsapp"
            className="flex-1 gap-2"
            onClick={handleSave}
            disabled={!form.name || !form.price || saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {product ? 'Salvar' : 'Cadastrar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
