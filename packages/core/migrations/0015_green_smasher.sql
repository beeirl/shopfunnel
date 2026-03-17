ALTER TABLE `funnel_variant_draft` ADD `edited_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `funnel_variant` DROP COLUMN `has_draft`;