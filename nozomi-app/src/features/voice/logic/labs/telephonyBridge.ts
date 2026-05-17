/**
 * Phase 8 — SIP/RTP telephony bridge (server-side).
 * The PWA does not host SIP; a separate service converts μ-law RTP ↔ text events
 * and calls the same conversation engine via HTTP/WebSocket.
 */

export type TelephonyBridgeConfig = {
  webhookUrl: string
  sharedSecret: string
}

export function isTelephonyBridgeConfigured(
  cfg: TelephonyBridgeConfig | undefined,
): boolean {
  return !!(cfg?.webhookUrl?.trim() && cfg?.sharedSecret?.trim())
}

/** Placeholder for future Twilio ConversationRelay-style message schema. */
export type TelephonyTextPrompt = {
  type: 'prompt'
  text: string
  callSid: string
}

export type TelephonySpeakToken = {
  type: 'speak'
  token: string
  last: boolean
}
