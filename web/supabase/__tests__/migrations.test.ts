import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('AI Chat Migration', () => {
  const file = path.join(
    __dirname,
    '..',
    'migrations',
    '20260120000000_ai_chat_tables.sql'
  )

  it('migration file exists', () => {
    expect(fs.existsSync(file)).toBe(true)
  })

  it('creates ai_chat_conversations table', () => {
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('CREATE TABLE IF NOT EXISTS ai_chat_conversations')
  })

  it('creates ai_chat_messages table', () => {
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('CREATE TABLE IF NOT EXISTS ai_chat_messages')
  })
})

describe('Reset Script', () => {
  const file = path.join(__dirname, '..', 'reset.sql')

  it('drops ai_chat_messages table', () => {
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('ai_chat_messages')
  })

  it('drops ai_chat_conversations table', () => {
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('ai_chat_conversations')
  })

  it('drops AI chat triggers', () => {
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('update_conversation_on_message_trigger')
    expect(content).toContain('auto_title_conversation_trigger')
  })

  it('drops AI chat functions', () => {
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('update_conversation_on_message')
    expect(content).toContain('auto_title_conversation')
  })
})
