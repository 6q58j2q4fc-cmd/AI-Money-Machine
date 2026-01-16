CREATE TABLE `marketplace_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`walletAddress` varchar(42) NOT NULL,
	`username` varchar(50),
	`displayName` varchar(100),
	`email` varchar(320),
	`avatarUrl` text,
	`bio` text,
	`twitterHandle` varchar(50),
	`discordHandle` varchar(50),
	`websiteUrl` text,
	`isVerified` boolean DEFAULT false,
	`verifiedAt` timestamp,
	`totalPurchases` int DEFAULT 0,
	`totalSpent` decimal(18,8) DEFAULT '0',
	`nonce` varchar(64),
	`lastLoginAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_users_walletAddress_unique` UNIQUE(`walletAddress`)
);
--> statement-breakpoint
CREATE TABLE `nft_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerId` int NOT NULL,
	`buyerWallet` varchar(42) NOT NULL,
	`nftAssetId` int NOT NULL,
	`tokenId` varchar(100),
	`contractAddress` varchar(42),
	`purchasePrice` decimal(18,8) NOT NULL,
	`currency` varchar(10) DEFAULT 'ETH',
	`chain` varchar(50) DEFAULT 'ethereum',
	`txHash` varchar(66),
	`blockNumber` int,
	`gasUsed` varchar(50),
	`gasCost` varchar(50),
	`status` enum('pending','confirming','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`confirmations` int DEFAULT 0,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nft_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nftAssetId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_nft_collection` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nftAssetId` int NOT NULL,
	`acquiredAt` timestamp NOT NULL DEFAULT (now()),
	`acquiredPrice` decimal(18,8),
	`acquiredFrom` varchar(42),
	`purchaseId` int,
	`isListed` boolean DEFAULT false,
	`listPrice` decimal(18,8),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_nft_collection_id` PRIMARY KEY(`id`)
);
