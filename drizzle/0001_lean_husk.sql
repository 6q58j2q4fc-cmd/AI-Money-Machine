CREATE TABLE `affiliate_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`url` text NOT NULL,
	`shortCode` varchar(50) NOT NULL,
	`category` varchar(100) NOT NULL,
	`program` varchar(100),
	`commission` varchar(50),
	`clicks` int NOT NULL DEFAULT 0,
	`conversions` int NOT NULL DEFAULT 0,
	`revenue` decimal(10,2) DEFAULT '0.00',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`articleId` int,
	`affiliateLinkId` int,
	`eventType` enum('view','click','conversion','share') NOT NULL,
	`source` varchar(100),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `article_affiliate_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`affiliateLinkId` int NOT NULL,
	`anchorText` varchar(200),
	`position` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_affiliate_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`slug` varchar(500) NOT NULL,
	`content` text,
	`excerpt` text,
	`status` enum('draft','review','published','archived') NOT NULL DEFAULT 'draft',
	`metaTitle` varchar(70),
	`metaDescription` varchar(160),
	`keywords` json,
	`focusKeyword` varchar(100),
	`views` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`estimatedRevenue` decimal(10,2) DEFAULT '0.00',
	`seoScore` int DEFAULT 0,
	`readabilityScore` int DEFAULT 0,
	`topicId` int,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topicId` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trending_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`category` varchar(100) NOT NULL,
	`source` varchar(100) NOT NULL,
	`popularityScore` int NOT NULL DEFAULT 0,
	`searchVolume` varchar(50),
	`competition` enum('low','medium','high') DEFAULT 'medium',
	`keywords` json,
	`savedByUser` boolean DEFAULT false,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trending_topics_id` PRIMARY KEY(`id`)
);
