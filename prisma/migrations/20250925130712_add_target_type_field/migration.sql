/*
  Warnings:

  - Added the required column `targetId` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetType` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Attachment" ADD COLUMN     "targetId" TEXT NOT NULL,
ADD COLUMN     "targetType" "public"."AttachmentTarget" NOT NULL;
