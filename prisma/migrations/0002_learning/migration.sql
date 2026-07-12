-- CreateTable: gestructureerde learnings
CREATE TABLE "Learning" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "insight" TEXT NOT NULL DEFAULT '',
    "evidence" TEXT,
    "action" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Algemeen',
    "tags" TEXT NOT NULL DEFAULT '',
    "source" TEXT,
    "cluster" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Learning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Learning_category_idx" ON "Learning"("category");
CREATE INDEX "Learning_cluster_idx" ON "Learning"("cluster");
CREATE INDEX "Learning_date_idx" ON "Learning"("date");
