import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { WorkedExampleNodeView } from './WorkedExampleNodeView'

export interface WorkedExampleStep {
  instruction: string
  hint?: string
  answer: string
}

export interface WorkedExampleNodeAttributes {
  content: string
  steps: WorkedExampleStep[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    workedExampleBlock: {
      setWorkedExampleBlock: (attributes?: Partial<WorkedExampleNodeAttributes>) => ReturnType
    }
  }
}

export const WorkedExampleNode = Node.create({
  name: 'workedExampleBlock',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      content: {
        default: 'Worked Example',
      },
      steps: {
        default: [{ instruction: 'Step 1', hint: '', answer: '' }],
      },
      difficulty: {
        default: 'beginner',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="worked-example-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'worked-example-block' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WorkedExampleNodeView)
  },

  addCommands() {
    return {
      setWorkedExampleBlock:
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
