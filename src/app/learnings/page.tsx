import { prisma } from "@/lib/prisma";
import { LearningsView } from "@/components/LearningsView";

export const dynamic = "force-dynamic";

export default async function LearningsPage() {
  const learnings = await prisma.learning.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return <LearningsView learnings={learnings} />;
}
