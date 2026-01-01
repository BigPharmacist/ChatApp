import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface SettingsDialogProps {
  systemPrompt: string
  onSave: (newPrompt: string) => Promise<boolean>
  disabled?: boolean
}

export function SettingsDialog({ systemPrompt, onSave, disabled }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState(systemPrompt)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setEditedPrompt(systemPrompt)
    }
  }, [open, systemPrompt])

  const handleSave = async () => {
    setIsSaving(true)
    const success = await onSave(editedPrompt)
    setIsSaving(false)
    if (success) {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" disabled={disabled}>
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Einstellungen</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="system-prompt" className="text-sm font-medium">
              System-Prompt
            </label>
            <Textarea
              id="system-prompt"
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              placeholder="Gib hier den System-Prompt ein..."
              className="min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Der System-Prompt definiert das Verhalten des Assistenten.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
