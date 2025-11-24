'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createShelf, getSites } from '@/app/actions/shelf-actions'
import { toast } from 'sonner'
import { useCurrentSite } from '@/hooks/use-current-site'
import { AisleSelector } from '@/components/admin/inventory/aisle-selector'

type Site = {
  id: string
  code: string
  name: string
  type: string
}

type Aisle = {
  id: string
  code: string
  name: string
  siteId: string
}

export default function NewShelfPage() {
  const router = useRouter()
  const { siteId } = useCurrentSite()
  const [isLoading, setIsLoading] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [currentSiteName, setCurrentSiteName] = useState<string>('')
  const [formData, setFormData] = useState({
    siteId: '',
    aisleId: '',
    code: '',
    name: '',
    description: '',
    level: '',
    position: '',
    maxWeight: '',
    maxVolume: '',
    isActive: true,
    isAccessible: true,
    notes: '',
  })

  useEffect(() => {
    const fetchSites = async () => {
      const result = await getSites()
      if (result.success && result.data) {
        setSites(result.data)
        
        // Set the active site from site context
        if (siteId) {
          const site = result.data.find(s => s.id === siteId)
          if (site) {
            setFormData(prev => ({ ...prev, siteId: siteId }))
            setCurrentSiteName(site.name)
          }
        }
      }
    }
    fetchSites()
  }, [siteId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate that we have a site
    if (!formData.siteId) {
      toast.error('Please wait for site to load')
      return
    }
    
    setIsLoading(true)

    try {
      const result = await createShelf({
        siteId: formData.siteId,
        aisleId: formData.aisleId || undefined,
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        level: formData.level ? parseInt(formData.level) : undefined,
        position: formData.position ? parseInt(formData.position) : undefined,
        maxWeight: formData.maxWeight ? parseFloat(formData.maxWeight) : undefined,
        maxVolume: formData.maxVolume ? parseFloat(formData.maxVolume) : undefined,
        isActive: formData.isActive,
        isAccessible: formData.isAccessible,
        notes: formData.notes || undefined,
      })

      if (result.success) {
        toast.success(result.message)
        router.push('/admin/inventory/shelves')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('An error occurred while creating shelf')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6 gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Add New Shelf</h1>
          </div>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.siteId}>
            {isLoading ? (
              <>Creating...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Shelf
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Location Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Location Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteId">
                  Site <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-muted">
                  <span className="text-sm font-medium">{currentSiteName || 'Loading site...'}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Site is automatically selected from the site switcher
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aisleId">Aisle (Optional)</Label>
                <AisleSelector
                  siteId={formData.siteId}
                  value={formData.aisleId}
                  onChange={(value) => setFormData({ ...formData, aisleId: value })}
                  disabled={!formData.siteId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">
                  Shelf Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="A1-S1-L1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Shelf Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Shelf A1-S1-L1"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Physical Attributes */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Physical Attributes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2">
                <Label htmlFor="level">Level (1=Bottom, 2=Middle, 3=Top)</Label>
                <Input
                  id="level"
                  type="number"
                  min="1"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position in Aisle</Label>
                <Input
                  id="position"
                  type="number"
                  min="1"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxWeight">Max Weight (kg)</Label>
                <Input
                  id="maxWeight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxWeight}
                  onChange={(e) => setFormData({ ...formData, maxWeight: e.target.value })}
                  placeholder="100.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxVolume">Max Volume (m³)</Label>
                <Input
                  id="maxVolume"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxVolume}
                  onChange={(e) => setFormData({ ...formData, maxVolume: e.target.value })}
                  placeholder="10.00"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2">
                <Label htmlFor="isActive">Active Status</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isAccessible">Accessibility</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="isAccessible"
                    checked={formData.isAccessible}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isAccessible: checked })
                    }
                  />
                  <Label htmlFor="isAccessible" className="cursor-pointer">
                    {formData.isAccessible ? 'Accessible' : 'Blocked'}
                  </Label>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
