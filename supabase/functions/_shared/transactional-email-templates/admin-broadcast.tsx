import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'

interface AdminBroadcastProps {
  title?: string
  body?: string
  recipientName?: string
}

const AdminBroadcastEmail: React.FC<AdminBroadcastProps> = ({
  title = 'Notification',
  body = '',
  recipientName = 'there',
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#f4f4f5', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff' }}>
          <div style={{ background: '#1A365D', padding: '24px 32px', textAlign: 'center' as const }}>
            <h1 style={{ color: '#fff', margin: 0, fontSize: 20 }}>Independent Minds EDU</h1>
          </div>
          <div style={{ padding: 32 }}>
            <h2 style={{ color: '#1A365D', margin: '0 0 16px' }}>{title}</h2>
            <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>
              {body}
            </p>
            <div style={{ marginTop: 32, textAlign: 'center' as const }}>
              <a
                href="https://independentmindsedu.com"
                style={{
                  display: 'inline-block',
                  background: '#1D9E75',
                  color: '#fff',
                  padding: '14px 32px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Go to Dashboard →
              </a>
            </div>
          </div>
          <div style={{ padding: '20px 32px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', textAlign: 'center' as const }}>
            <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>
              Independent Minds EDU — Empowering diaspora families worldwide
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}

export const template: TemplateEntry = {
  component: AdminBroadcastEmail,
  subject: (data: AdminBroadcastProps) => data.title || 'Notification from Independent Minds EDU',
  displayName: 'Admin Broadcast',
  previewData: {
    title: 'New Feature Available!',
    body: 'We have just launched a new feature that we think you will love.',
    recipientName: 'Dad',
  },
}
