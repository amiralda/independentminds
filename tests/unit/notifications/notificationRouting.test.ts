import { describe, it, expect } from 'vitest';

type Ch = 'telegram' | 'whatsapp' | 'both';
const sendTg = (c: Ch) => c === 'telegram' || c === 'both';
const sendWA = (c: Ch) => c === 'whatsapp' || c === 'both';
const e164 = (p: string) => /^\+[1-9]\d{7,14}$/.test(p);

describe('Channel routing', () => {
  it('telegram-only → Telegram only', () => {
    expect(sendTg('telegram')).toBe(true);
    expect(sendWA('telegram')).toBe(false);
  });
  it('whatsapp-only → WhatsApp only', () => {
    expect(sendTg('whatsapp')).toBe(false);
    expect(sendWA('whatsapp')).toBe(true);
  });
  it('both → both channels', () => {
    expect(sendTg('both')).toBe(true);
    expect(sendWA('both')).toBe(true);
  });
});

describe('E.164 validation', () => {
  it('valid US number', () =>
    expect(e164('+15551234567')).toBe(true));
  it('valid Haiti number', () =>
    expect(e164('+50912345678')).toBe(true));
  it('rejects no plus', () =>
    expect(e164('15551234567')).toBe(false));
  it('rejects too short', () =>
    expect(e164('+123')).toBe(false));
  it('rejects +0 prefix', () =>
    expect(e164('+01234567890')).toBe(false));
});
