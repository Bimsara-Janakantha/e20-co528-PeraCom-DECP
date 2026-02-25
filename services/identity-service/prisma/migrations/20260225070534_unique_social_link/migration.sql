/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `social_links` will be added. If there are existing duplicate values, this will fail.
  - Made the column `start_date` on table `projects` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "start_date" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "social_links_url_key" ON "social_links"("url");
