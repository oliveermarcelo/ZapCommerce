"use client"

import React, { useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, slugify } from '@/lib/utils'
import {
  Plus, GripVertical, Edit, Trash2, Eye, EyeOff, Tag,
  Save, X, Loader2, FolderOpen
} from 'lucide-react'
import type { Category } from '@/types'

const mockCategories: (Category & { productsCount: number })[] = [
  { id: 'cat-1', name: 'Lanches', slug: 'lanches', position: 0, isActive: true, productsCount: 8 },
  { id: 'cat-2', name: 'Pizzas', slug: 'pizzas', position: 1, isActive: true, productsCount: 12 },
  { id: 'cat-3', name: 'Bebidas', slug: 'bebidas', position: 2, isActive: true, productsCount: 15 },
  { id: 'cat-4', name: 'Sobremesas', slug: 'sobremesas', position: 3, isActive: true, productsCount: 5 },
  { id: 'cat-5', name: 'Combos', slug: 'combos', position: 4, isActive: true, productsCount: 4 },
  { id: 'cat-6', name: 'Porções', slug: 'porcoes', position: 5, isActive: false, productsCount: 3 },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState(mockCategories)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)

  const startEdit = (cat: typeof mockCategories[0]) => {
    setEditId(cat.id)
    setEditName(cat.name)
  }

  const saveEdit = () => {
    if (!editName.trim()) return
    setCategories(prev => prev.map(c =>
      c.id === editId ? { ...c, name: editName, slug: slugify(editName) } : c
    ))
    setEditId(null)
  }

  const addCategory = () => {
    if (!newName.trim()) return
    const newCat = {
      id: `cat-${Date.now()}`,
      name: newName,
      slug: slugify(newName),
      position: categories.length,
      isActive: true,
      productsCount: 0,
    }
    setCategories(prev => [...prev, newCat])
    setNewName('')
    setShowNew(false)
  }

  const toggleActive = (id: string) => {
    setCategories(prev => prev.map(c =>
      c.id === id ? { ...c, isActive: !c.isActive } : c
    ))
  }

  const deleteCategory = (id: string) => {
    const cat = categories.find(c => c.id === id)
    if (cat && cat.productsCount > 0) {
      alert('Não é possível excluir uma categoria com produtos. Mova os produtos primeiro.')
      return
    }
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Categorias</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Organize seus produtos em categorias
            </p>
          </div>
          <Button variant="whatsapp" className="gap-2" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> Nova categoria
          </Button>
        </div>

        {/* New category form */}
        {showNew && (
          <Card className="mb-4 border-whatsapp/30 bg-whatsapp/5 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Input
                placeholder="Nome da categoria"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                autoFocus
                className="flex-1"
              />
              <Button variant="whatsapp" size="sm" onClick={addCategory} disabled={!newName.trim()}>
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowNew(false); setNewName('') }}>
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Categories list */}
        <div className="space-y-2">
          {categories.map(cat => (
            <Card
              key={cat.id}
              className={cn(
                "border-0 shadow-sm transition-all",
                !cat.isActive && "opacity-60"
              )}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="cursor-grab text-slate-300 hover:text-slate-400">
                  <GripVertical className="h-5 w-5" />
                </div>

                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Tag className="h-5 w-5 text-slate-400" />
                </div>

                {editId === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      autoFocus
                      className="flex-1"
                    />
                    <Button variant="whatsapp" size="sm" onClick={saveEdit}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {cat.productsCount} {cat.productsCount === 1 ? 'produto' : 'produtos'}
                      </p>
                    </div>

                    {!cat.isActive && (
                      <Badge variant="secondary" className="text-[10px]">Inativa</Badge>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => toggleActive(cat.id)}
                        className="h-8 w-8"
                      >
                        {cat.isActive ? (
                          <Eye className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-slate-400" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(cat)} className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => deleteCategory(cat.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          {categories.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FolderOpen className="h-12 w-12 text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-500">Nenhuma categoria</p>
                <Button variant="whatsapp" size="sm" className="mt-4 gap-2" onClick={() => setShowNew(true)}>
                  <Plus className="h-4 w-4" /> Criar categoria
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
