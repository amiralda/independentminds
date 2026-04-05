import type { FC } from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: FC<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

// Import templates
import { template as adminBroadcast } from './admin-broadcast.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'admin-broadcast': adminBroadcast,
}
