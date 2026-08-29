import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pulse Assistant | Local Business Directory",
  description:
    "Ask Pulse Assistant about local businesses near you, missions, deals, and what your check-ins add up to.",
};

export default function AssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
