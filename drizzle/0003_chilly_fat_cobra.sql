CREATE TABLE `automation_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`articlesPerCycle` int NOT NULL DEFAULT 3,
	`cycleIntervalHours` int NOT NULL DEFAULT 24,
	`targetNiches` json,
	`autoPublish` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`totalArticlesGenerated` int NOT NULL DEFAULT 0,
	`totalRevenue` decimal(10,2) DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `automation_settings_userId_unique` UNIQUE(`userId`)
);
