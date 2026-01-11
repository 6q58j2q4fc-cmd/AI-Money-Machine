CREATE TABLE `cj_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`advertiserId` varchar(50) NOT NULL,
	`advertiserName` varchar(200) NOT NULL,
	`category` varchar(100),
	`productName` varchar(500),
	`productUrl` text,
	`affiliateUrl` text NOT NULL,
	`imageUrl` text,
	`price` decimal(10,2),
	`commission` varchar(100),
	`epc` decimal(10,4),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cj_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cj_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cid` varchar(50) NOT NULL,
	`websiteId` varchar(50),
	`apiToken` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cj_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topicId` int,
	`title` varchar(500) NOT NULL,
	`keywords` json,
	`targetProducts` json,
	`status` enum('pending','generating','ready','published','failed') NOT NULL DEFAULT 'pending',
	`generatedArticleId` int,
	`priority` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publishing_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`articleId` int NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`status` enum('pending','processing','published','failed') NOT NULL DEFAULT 'pending',
	`publishedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `publishing_queue_id` PRIMARY KEY(`id`)
);
