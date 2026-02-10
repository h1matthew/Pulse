import type { JSONContent } from '@tiptap/core'
import type { DbContentBlock, ContentBlockType } from '@/types/admin'

/**
 * Convert database content blocks to TipTap editor JSON
 */
export function contentBlocksToEditor(blocks: DbContentBlock[]): JSONContent {
  const sortedBlocks = [...blocks].sort((a, b) => a.order_index - b.order_index)

  const content: JSONContent[] = sortedBlocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return {
          type: 'heading',
          attrs: { level: 2 },
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        }

      case 'subheading':
        return {
          type: 'heading',
          attrs: { level: 3 },
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        }

      case 'text':
        return {
          type: 'paragraph',
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        }

      case 'equation':
        return {
          type: 'equationBlock',
          attrs: {
            latex: block.content || 'E = mc^2',
            display: true,
          },
        }

      case 'video':
        return {
          type: 'videoBlock',
          attrs: {
            compositionId: block.video_composition_id || null,
            description: block.content || 'Video block',
          },
        }

      case 'callout':
        return {
          type: 'calloutBlock',
          attrs: {
            content: block.content || '',
            type: 'info',
          },
        }

      case 'list':
        return {
          type: 'bulletList',
          content: (block.items || []).map((item) => ({
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: item }],
              },
            ],
          })),
        }

      case 'image':
        return {
          type: 'imageBlock',
          attrs: {
            src: block.image_url || '',
            alt: block.image_alt || '',
            caption: block.content || '',
          },
        }

      case 'worked-example':
        return {
          type: 'workedExampleBlock',
          attrs: {
            content: block.content || 'Worked Example',
            steps: block.steps || [{ instruction: 'Step 1', hint: '', answer: '' }],
            difficulty: block.difficulty || 'beginner',
          },
        }

      case 'practice-problem':
        return {
          type: 'practiceProblemBlock',
          attrs: {
            content: block.content || 'Practice Problem',
            answer: block.answer || '',
            hints: block.hints || [],
            difficulty: block.difficulty || 'beginner',
            revealMode: block.reveal_mode || 'click',
            inputPlaceholder: block.input_placeholder || 'Enter your answer...',
          },
        }

      default:
        // Fallback for unknown types
        return {
          type: 'paragraph',
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        }
    }
  })

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  }
}

/**
 * Content block for database insertion (without generated fields)
 */
type NewContentBlock = {
  lesson_id: string
  type: ContentBlockType
  content: string
  order_index: number
  items: string[] | null
  steps: { instruction: string; hint?: string; answer: string }[] | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  reveal_mode: 'click' | 'input' | 'hints' | null
  answer: string | null
  hints: string[] | null
  input_placeholder: string | null
  video_composition_id: string | null
  image_url: string | null
  image_alt: string | null
}

/**
 * Convert TipTap editor JSON to database content blocks
 */
export function editorToContentBlocks(
  doc: JSONContent,
  lessonId: string,
  _existingBlocks: DbContentBlock[] = []
): NewContentBlock[] {
  const content = doc.content || []
  const blocks: NewContentBlock[] = []

  content.forEach((node, index) => {
    const baseBlock: Omit<NewContentBlock, 'type' | 'content'> = {
      lesson_id: lessonId,
      order_index: index,
      items: null,
      steps: null,
      difficulty: null,
      reveal_mode: null,
      answer: null,
      hints: null,
      input_placeholder: null,
      video_composition_id: null,
      image_url: null,
      image_alt: null,
    }

    switch (node.type) {
      case 'heading': {
        const level = node.attrs?.level || 2
        const text = getTextContent(node)
        blocks.push({
          ...baseBlock,
          type: (level === 2 ? 'heading' : 'subheading') as ContentBlockType,
          content: text,
        })
        break
      }

      case 'paragraph': {
        const text = getTextContent(node)
        if (text.trim()) {
          blocks.push({
            ...baseBlock,
            type: 'text' as ContentBlockType,
            content: text,
          })
        }
        break
      }

      case 'equationBlock': {
        blocks.push({
          ...baseBlock,
          type: 'equation' as ContentBlockType,
          content: node.attrs?.latex || '',
        })
        break
      }

      case 'videoBlock': {
        blocks.push({
          ...baseBlock,
          type: 'video' as ContentBlockType,
          content: node.attrs?.description || '',
          video_composition_id: node.attrs?.compositionId || null,
        })
        break
      }

      case 'calloutBlock': {
        blocks.push({
          ...baseBlock,
          type: 'callout' as ContentBlockType,
          content: node.attrs?.content || '',
        })
        break
      }

      case 'bulletList':
      case 'orderedList': {
        const items = (node.content || []).map((listItem) => getTextContent(listItem))
        blocks.push({
          ...baseBlock,
          type: 'list' as ContentBlockType,
          content: '',
          items,
        })
        break
      }

      case 'imageBlock': {
        blocks.push({
          ...baseBlock,
          type: 'image' as ContentBlockType,
          content: node.attrs?.caption || '',
          image_url: node.attrs?.src || null,
          image_alt: node.attrs?.alt || null,
        })
        break
      }

      case 'workedExampleBlock': {
        blocks.push({
          ...baseBlock,
          type: 'worked-example' as ContentBlockType,
          content: node.attrs?.content || '',
          steps: node.attrs?.steps || [],
          difficulty: node.attrs?.difficulty || null,
        })
        break
      }

      case 'practiceProblemBlock': {
        blocks.push({
          ...baseBlock,
          type: 'practice-problem' as ContentBlockType,
          content: node.attrs?.content || '',
          answer: node.attrs?.answer || null,
          hints: node.attrs?.hints || null,
          difficulty: node.attrs?.difficulty || null,
          reveal_mode: node.attrs?.revealMode || null,
          input_placeholder: node.attrs?.inputPlaceholder || null,
        })
        break
      }
    }
  })

  return blocks
}

/**
 * Extract text content from a TipTap node
 */
function getTextContent(node: JSONContent): string {
  if (!node.content) return ''

  return node.content
    .map((child) => {
      if (child.type === 'text') {
        return child.text || ''
      }
      return getTextContent(child)
    })
    .join('')
}

/**
 * Convert AI-generated structured blocks to TipTap format
 */
export function generatedBlocksToEditor(
  blocks: Array<{
    type: string
    content?: string
    latex?: string
    description?: string
    items?: string[]
    calloutType?: string
  }>
): JSONContent {
  const content: JSONContent[] = blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return {
          type: 'heading',
          attrs: { level: 2 },
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        }

      case 'subheading':
        return {
          type: 'heading',
          attrs: { level: 3 },
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        }

      case 'text':
        return {
          type: 'paragraph',
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        }

      case 'equation':
        return {
          type: 'equationBlock',
          attrs: {
            latex: block.latex || block.content || 'E = mc^2',
            display: true,
          },
        }

      case 'video':
        return {
          type: 'videoBlock',
          attrs: {
            compositionId: null,
            description: block.description || block.content || 'Animation placeholder',
          },
        }

      case 'callout':
        return {
          type: 'calloutBlock',
          attrs: {
            content: block.content || '',
            type: block.calloutType || 'info',
          },
        }

      case 'list':
        return {
          type: 'bulletList',
          content: (block.items || []).map((item) => ({
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: item }],
              },
            ],
          })),
        }

      default:
        return {
          type: 'paragraph',
          content: block.content ? [{ type: 'text', text: block.content }] : [],
        }
    }
  })

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  }
}
