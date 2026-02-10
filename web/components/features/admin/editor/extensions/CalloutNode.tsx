import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CalloutNodeView } from './CalloutNodeView'

export type CalloutType = 'info' | 'warning' | 'tip' | 'important'

export interface CalloutNodeAttributes {
  content: string
  type: CalloutType
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    calloutBlock: {
      setCalloutBlock: (attributes?: Partial<CalloutNodeAttributes>) => ReturnType
    }
  }
}

export const CalloutNode = Node.create({
  name: 'calloutBlock',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      content: {
        default: 'Enter callout text...',
      },
      type: {
        default: 'info' as CalloutType,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout-block' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView)
  },

  addCommands() {
    return {
      setCalloutBlock:
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
