/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ReviewVerificationProps {
  providerName?: string
  verifyUrl?: string
}

const ReviewVerification = ({
  providerName = 'the provider',
  verifyUrl = 'https://aytopus.com',
}: ReviewVerificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your review on Aytopus</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your review</Heading>
        <Text style={text}>
          Please confirm your review for <strong>{providerName}</strong> on Aytopus.
          Once confirmed, it will be published on their profile.
        </Text>
        <Button style={button} href={verifyUrl}>
          Confirm my review
        </Button>
        <Text style={footer}>
          If you didn't submit this review, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReviewVerification,
  subject: (data: ReviewVerificationProps) =>
    `Confirm your review for ${data?.providerName ?? 'the provider'}`,
  displayName: 'Review verification',
  previewData: {
    providerName: 'Jane Coach',
    verifyUrl: 'https://aytopus.com/verify-review?token=preview',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 25px' }
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
