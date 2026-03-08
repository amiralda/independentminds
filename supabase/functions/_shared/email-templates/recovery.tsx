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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your Independent Minds password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://wkvattbvybvgaeobtidl.supabase.co/storage/v1/object/public/email-assets/logo.svg"
          width="60"
          height="60"
          alt="Independent Minds"
          style={{ margin: '0 0 20px' }}
        />
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for Independent Minds. Click the button below to choose a new password.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
        </Text>
        <Text style={brand}>Independent Minds EDU — Learn Smart. Grow Every Day.</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
