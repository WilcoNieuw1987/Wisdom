-- AlterTable: voeg cluster-kolom toe aan Note
ALTER TABLE "Note" ADD COLUMN "cluster" TEXT;

-- CreateIndex
CREATE INDEX "Note_cluster_idx" ON "Note"("cluster");

-- CreateTable: verbindingen tussen notities
CREATE TABLE "NoteConnection" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NoteConnection_fromId_toId_key" ON "NoteConnection"("fromId", "toId");
CREATE INDEX "NoteConnection_fromId_idx" ON "NoteConnection"("fromId");
CREATE INDEX "NoteConnection_toId_idx" ON "NoteConnection"("toId");

-- AddForeignKey
ALTER TABLE "NoteConnection" ADD CONSTRAINT "NoteConnection_fromId_fkey"
    FOREIGN KEY ("fromId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteConnection" ADD CONSTRAINT "NoteConnection_toId_fkey"
    FOREIGN KEY ("toId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
