import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Model {
  id: string
  name: string
}

interface ModelSelectorProps {
  models: Model[]
  selectedModel: string
  onModelChange: (model: string) => void
  disabled?: boolean
}

export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  disabled,
}: ModelSelectorProps) {
  return (
    <Select value={selectedModel} onValueChange={onModelChange} disabled={disabled}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Modell wählen" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
