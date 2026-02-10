import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { PracticeProblemNodeView } from './PracticeProblemNodeView'

export interface PracticeProblemNodeAttributes {
  content: string
  answer: string
  hints: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  revealMode: 'click' | 'input' | 'hints'
  inputPlaceholder: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    practiceProblemBlock: {
      setPracticeProblemBlock: (attributes?: Partial<PracticeProblemNodeAttributes>) => ReturnType
    }
  }
}

export const PracticeProblemNode = Node.create({
  name: 'practiceProblemBlock',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      content: {
        default: 'Practice Problem',
      },
      answer: {
        default: '',
      },
      hints: {
        default: [],
      },
      difficulty: {
        default: 'beginner',
      },
      revealMode: {
        default: 'click',
      },
      inputPlaceholder: {
        default: 'Enter your answer...',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="practice-problem-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'practice-problem-block' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PracticeProblemNodeView)
  },

  addCommands() {
    return {
      setPracticeProblemBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          })
        },
    }
  },
})
