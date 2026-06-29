import { prisma } from "@/lib/prisma";
import { SwipeView } from "@/components/SwipeView";

export const dynamic = "force-dynamic";

export default async function SwipePage() {
  const notes = await prisma.note.findMany({
    where: { archived: false },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return <SwipeView initialNotes={notes} />;
}
