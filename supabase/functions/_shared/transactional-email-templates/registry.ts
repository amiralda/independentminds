import type { FC } from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: FC<unknown>
  subject: string | ((data: unknown) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string
}

// Import templates
import { template as adminBroadcast } from './admin-broadcast.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'admin-broadcast': adminBroadcast,
}
