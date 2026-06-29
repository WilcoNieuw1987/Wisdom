import { GraphView } from "@/components/GraphView";

export const dynamic = "force-dynamic";

export default function GraphPage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-neutral-950">
      <GraphView />
    </main>
  );
}
