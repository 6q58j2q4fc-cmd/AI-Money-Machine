CREATE TABLE `nft_collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`description` text,
	`coverImage` text,
	`nftCount` int DEFAULT 0,
	`floorPrice` decimal(18,8) DEFAULT '0',
	`totalVolume` decimal(18,8) DEFAULT '0',
	`viewCount` int DEFAULT 0,
	`isFeatured` boolean DEFAULT false,
	`featuredAt` timestamp,
	`category` varchar(100),
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nft_collections_id` PRIMARY KEY(`id`)
);
