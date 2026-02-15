import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pulse Assistant | AI-Powered Local Business Discovery",
  description:
    "Chat with Pulse Assistant to discover amazing local businesses and understand your community impact. Get personalized recommendations powered by AI.",
};

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {children}
    </div>
  );
}
