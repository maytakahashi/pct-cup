-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_teamId_fkey`;

-- DropIndex
DROP INDEX `User_teamId_fkey` ON `User`;

-- AlterTable
ALTER TABLE `User` ALTER COLUMN `role` DROP DEFAULT,
    MODIFY `teamId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
