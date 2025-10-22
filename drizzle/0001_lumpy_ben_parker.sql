CREATE TABLE `certificates` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`certificateName` varchar(255) NOT NULL,
	`certificateKey` text NOT NULL,
	`certificateUrl` text NOT NULL,
	`certificatePassword` text NOT NULL,
	`cnpj` varchar(14),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `csvUploads` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`csvKey` text NOT NULL,
	`csvUrl` text NOT NULL,
	`totalKeys` int NOT NULL,
	`processedKeys` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csvUploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `downloadHistory` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`csvUploadId` varchar(64) NOT NULL,
	`certificateId` varchar(64) NOT NULL,
	`accessKey` varchar(44) NOT NULL,
	`status` enum('pending','success','failed','not_found') NOT NULL DEFAULT 'pending',
	`xmlKey` text,
	`xmlUrl` text,
	`errorMessage` text,
	`downloadedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `downloadHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `downloadSessions` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`csvUploadId` varchar(64) NOT NULL,
	`certificateId` varchar(64) NOT NULL,
	`totalKeys` int NOT NULL,
	`processedKeys` int DEFAULT 0,
	`successCount` int DEFAULT 0,
	`failureCount` int DEFAULT 0,
	`status` enum('in_progress','completed','failed') NOT NULL DEFAULT 'in_progress',
	`createdAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `downloadSessions_id` PRIMARY KEY(`id`)
);
