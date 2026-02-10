import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { VideoNodeView } from './VideoNodeView'

export interface VideoNodeAttributes {
  compositionId: string | null
  description: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoBlock: {
      setVideoBlock: (attributes?: Partial<VideoNodeAttributes>) => ReturnType
    }
  }
}

export const VideoNode = Node.create({
  name: 'videoBlock',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      compositionId: {
        default: null,
      },
      description: {
        default: 'Click to configure video',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="video-block"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'video-block' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView)
  },

  addCommands() {
    return {
      setVideoBlock:
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
