export interface Conversation {
  id: string
  user_id: string
  lesson_id: string | null
  module_id: string | null
  title: string
  message_count: number
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'model'
  content: string
  created_at: string
}

export interface ConversationWithMessages extends Conversation {
  messages: ChatMessage[]
}

// Context transferred from ExplainTooltip to AskAIPanel
export interface ExplainContext {
  selectedText: string
  explanation: string
}
