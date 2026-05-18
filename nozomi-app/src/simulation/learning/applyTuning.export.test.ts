import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SimulatedConversation } from '../types'
import { persistTuningArtifactsToDisk } from './persistTuningArtifacts.node'

const exportPath = process.env.SIM_EXPORT_FILE
  ? resolve(process.env.SIM_EXPORT_FILE)
  : resolve(process.cwd(), 'simulation-export.json')

describe('apply simulation insights export', () => {
  it.skipIf(!existsSync(exportPath))(
    'writes tuning from dashboard export JSON',
    async () => {
      const raw = readFileSync(exportPath, 'utf8')
      const parsed = JSON.parse(raw) as
        | SimulatedConversation[]
        | { conversations: SimulatedConversation[] }
      const conversations = Array.isArray(parsed)
        ? parsed
        : parsed.conversations

      expect(conversations.length).toBeGreaterThan(0)

      const tuning = await persistTuningArtifactsToDisk(conversations)
      expect(tuning).not.toBeNull()
      expect(tuning!.avoidJpContains.length).toBeGreaterThan(0)
    },
  )
})
