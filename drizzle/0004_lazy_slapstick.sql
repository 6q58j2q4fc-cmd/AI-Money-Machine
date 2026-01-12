CREATE TABLE `content_generation_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`articleId` int,
	`topic` varchar(500) NOT NULL,
	`category` varchar(100),
	`keywords` json,
	`contentType` enum('article','listicle','review','comparison','how_to','news') NOT NULL DEFAULT 'article',
	`targetLength` int DEFAULT 1500,
	`views` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`conversions` int NOT NULL DEFAULT 0,
	`revenue` decimal(10,2) DEFAULT '0.00',
	`wasSuccessful` boolean DEFAULT false,
	`successReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_generation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_learning` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`learningType` enum('topic','headline','keyword','cta','link_placement','content_length','category') NOT NULL,
	`learningKey` varchar(500) NOT NULL,
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`conversions` int NOT NULL DEFAULT 0,
	`revenue` decimal(10,2) DEFAULT '0.00',
	`ctr` decimal(5,4) DEFAULT '0.0000',
	`conversionRate` decimal(5,4) DEFAULT '0.0000',
	`revenuePerClick` decimal(10,4) DEFAULT '0.0000',
	`performanceScore` int NOT NULL DEFAULT 0,
	`timesUsed` int NOT NULL DEFAULT 1,
	`lastUsedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `performance_learning_id` PRIMARY KEY(`id`)
);
