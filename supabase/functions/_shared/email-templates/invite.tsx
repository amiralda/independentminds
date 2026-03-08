/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join Independent Minds! 🎓</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://wkvattbvybvgaeobtidl.supabase.co/storage/v1/object/public/email-assets/logo.svg"
          width="60"
          height="60"
          alt="Independent Minds"
          style={{ margin: '0 0 20px' }}
        />
        <Heading style={h1}>You're invited! 🎉</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>Independent Minds</strong>
          </Link>
          . Click the button below to accept and start learning smart.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept Invitation
        </Button>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
        <Text style={brand}>Independent Minds EDU — Learn Smart. Grow Every Day.</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1e2738',
  margin: '0 0 20px',
  fontFamily: "'Fredoka', Arial, sans-serif",
}
const text = {
  fontSize: '14px',
  color: '#686e78',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const link = { color: '#1F3B73', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1F3B73',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
  fontFamily: "'Fredoka', Arial, sans-serif",
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const brand = { fontSize: '11px', color: '#b0b0b0', margin: '10px 0 0', fontStyle: 'italic' as const }
