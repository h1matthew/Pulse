import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { EquationNodeView } from './EquationNodeView'

export interface EquationNodeAttributes {
  latex: string
  display: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    equationBlock: {
      setEquationBlock: (attributes?: Partial<EquationNodeAttributes>) => ReturnType
    }
  }
}

export const EquationNode = Node.create({
  name: 'equationBlock',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      latex: {
        default: 'E = mc^2',
      },
      display: {
        default: true,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="equation-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'equation-block' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(EquationNodeView)
  },

  addCommands() {
    return {
      setEquationBlock:
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
