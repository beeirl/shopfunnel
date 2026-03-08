DROP INDEX `session` ON `submission`;--> statement-breakpoint
ALTER TABLE `billing` MODIFY COLUMN `plan` enum('standard5K','standard25K','standard50K','standard100K','standard250K','standard500K','standard1M','standard2M');--> statement-breakpoint
ALTER TABLE `billing` MODIFY COLUMN `pending_plan` enum('standard5K','standard25K','standard50K','standard100K','standard250K','standard500K','standard1M','standard2M');--> statement-breakpoint
ALTER TABLE `submission` ADD CONSTRAINT `global_session` UNIQUE(`session_id`);