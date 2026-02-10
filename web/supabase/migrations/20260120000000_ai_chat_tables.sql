-- AI Chat Conversations table
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id TEXT,
  module_id TEXT,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own conversations" ON ai_chat_conversations;
CREATE POLICY "Users manage own conversations" ON ai_chat_conversations
  FOR ALL USING (auth.uid() = user_id);

-- AI Chat Messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_chat_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own messages" ON ai_chat_messages;
CREATE POLICY "Users manage own messages" ON ai_chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_chat_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user ON ai_chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lesson ON ai_chat_conversations(lesson_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON ai_chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON ai_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON ai_chat_messages(created_at);

-- Auto-update message count and updated_at trigger
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_chat_conversations
  SET
    message_count = (SELECT COUNT(*) FROM ai_chat_messages WHERE conversation_id = NEW.conversation_id),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_conversation_on_message_trigger ON ai_chat_messages;

CREATE TRIGGER update_conversation_on_message_trigger
  AFTER INSERT ON ai_chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Auto-update title from first user message if still default
CREATE OR REPLACE FUNCTION auto_title_conversation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE ai_chat_conversations
    SET title = LEFT(NEW.content, 50)
    WHERE id = NEW.conversation_id
      AND title = 'New Conversation'
      AND message_count = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_title_conversation_trigger ON ai_chat_messages;

CREATE TRIGGER auto_title_conversation_trigger
  BEFORE INSERT ON ai_chat_messages
  FOR EACH ROW EXECUTE FUNCTION auto_title_conversation();
