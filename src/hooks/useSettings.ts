import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const DEFAULT_SYSTEM_PROMPT = 'Du bist ein hilfreicher Assistent.'

export function useSettings() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [isLoading, setIsLoading] = useState(true)

  const loadSettings = useCallback(async () => {
    setIsLoading(true)

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'system_prompt')
      .single()

    if (error) {
      console.error('Error loading settings:', error)
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT)
    } else {
      setSystemPrompt(data?.value || DEFAULT_SYSTEM_PROMPT)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const saveSystemPrompt = useCallback(async (newPrompt: string) => {
    const { error } = await supabase
      .from('settings')
      .upsert(
        { key: 'system_prompt', value: newPrompt },
        { onConflict: 'key' }
      )

    if (error) {
      console.error('Error saving settings:', error)
      return false
    }

    setSystemPrompt(newPrompt)
    return true
  }, [])

  return {
    systemPrompt,
    isLoading,
    saveSystemPrompt,
    loadSettings,
  }
}
