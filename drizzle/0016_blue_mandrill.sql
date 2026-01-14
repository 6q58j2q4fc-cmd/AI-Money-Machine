CREATE TABLE `marketplace_api_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`marketplace` varchar(50) NOT NULL,
	`apiKey` varchar(500),
	`apiSecret` varchar(500),
	`isEnabled` boolean DEFAULT true,
	`autoSync` boolean DEFAULT true,
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_api_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nft_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nftAssetId` int NOT NULL,
	`priceAtSave` varchar(50),
	`notifyOnPriceChange` boolean DEFAULT true,
	`notifyOnSale` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nft_favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nft_price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nftAssetId` int NOT NULL,
	`price` varchar(50) NOT NULL,
	`currency` varchar(10) DEFAULT 'ETH',
	`marketplace` varchar(50),
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nft_price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nft_royalties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nftAssetId` int NOT NULL,
	`royaltyPercentage` varchar(10) DEFAULT '2.5',
	`recipientAddress` varchar(100),
	`onChainEnforced` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nft_royalties_id` PRIMARY KEY(`id`)
);
