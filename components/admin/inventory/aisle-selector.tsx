'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Loader } from 'lucide-react'
import { getAisles, createAisle } from '@/app/actions/shelf-actions'
import { toast } from 'sonner'

type Aisle = {
  id: string
  code: string
  name: string
  siteId: string
}

type AisleSelectorProps = {
  siteId: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function AisleSelector({ siteId, value, onChange, disabled }: AisleSelectorProps) {
  const [aisles, setAisles] = useState<Aisle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
  })

  const fetchAisles = async () => {
    if (!siteId) return
    
    setIsLoading(true)
    try {
      const result = await getAisles(siteId)
      if (result.success && result.data) {
        setAisles(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch aisles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAisles()
  }, [siteId])

  const handleCreateAisle = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Code and name are required')
      return
    }

    setIsCreating(true)
    try {
      const result = await createAisle({
        siteId,
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
      })

      if (result.success && result.data) {
        toast.success(result.message)
        setDialogOpen(false)
        setFormData({ code: '', name: '', description: '' })
        await fetchAisles()
        onChange(result.data.id)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to create aisle')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <Select
        value={value || 'none'}
        onValueChange={(val) => onChange(val === 'none' ? '' : val)}
        disabled={disabled || !siteId}
      >
        <SelectTrigger className='w-full'>
          <SelectValue placeholder={siteId ? "Select aisle" : "Select site first"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Aisle</SelectItem>
          {aisles.map((aisle) => (
            <SelectItem key={aisle.id} value={aisle.id}>
              {aisle.name} ({aisle.code})
            </SelectItem>
          ))}
          <div className="border-t mt-1 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={(e) => {
                e.preventDefault()
                setDialogOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Aisle
            </Button>
          </div>
        </SelectContent>
      </Select>

      {/* Create Aisle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Aisle</DialogTitle>
            <DialogDescription>
              Add a new aisle to organize shelves in this site
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aisle-code">
                Aisle Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="aisle-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="A1, B2, etc."
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aisle-name">
                Aisle Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="aisle-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Aisle A1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aisle-description">Description</Label>
              <Textarea
                id="aisle-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAisle} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Aisle
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
