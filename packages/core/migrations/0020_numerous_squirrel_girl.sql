CREATE TABLE `lead` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`submission_id` char(30) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	CONSTRAINT `lead_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `submission` UNIQUE(`workspace_id`,`submission_id`)
);
--> statement-breakpoint
ALTER TABLE `integration` MODIFY COLUMN `provider` enum('shopify','meta_pixel','klaviyo') NOT NULL;--> statement-breakpoint
CREATE INDEX `email` ON `lead` (`workspace_id`,`email`);--> statement-breakpoint
CREATE INDEX `phone` ON `lead` (`workspace_id`,`phone`);