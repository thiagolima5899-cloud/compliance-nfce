CREATE TABLE `accessConfigs` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`cnpj` varchar(14) NOT NULL,
	`apiKey` text NOT NULL,
	`apiKeyExpiresAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accessConfigs_id` PRIMARY KEY(`id`)
);
