/*
  Warnings:

  - The values [seconday] on the enum `linkEnum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "linkEnum_new" AS ENUM ('secondary', 'primary');
ALTER TABLE "Contact" ALTER COLUMN "linkPrecedence" DROP DEFAULT;
ALTER TABLE "Contact" ALTER COLUMN "linkPrecedence" TYPE "linkEnum_new" USING ("linkPrecedence"::text::"linkEnum_new");
ALTER TYPE "linkEnum" RENAME TO "linkEnum_old";
ALTER TYPE "linkEnum_new" RENAME TO "linkEnum";
DROP TYPE "linkEnum_old";
ALTER TABLE "Contact" ALTER COLUMN "linkPrecedence" SET DEFAULT 'primary';
COMMIT;
