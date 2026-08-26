'use client';

import dynamic from 'next/dynamic';

// The chat pulls in react-markdown, KaTeX and framer-motion (~160 KB gzipped).
// Loading it on demand keeps that off every route's initial payload.
const ChatWidget = dynamic(() => import('./ChatWidget').then((m) => m.ChatWidget), {
  ssr: false,
});

export function ChatWidgetLazy() {
  return <ChatWidget />;
}
