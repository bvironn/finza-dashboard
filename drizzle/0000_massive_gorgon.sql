CREATE TABLE `categorias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `categorias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `configuracion` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`anio` int NOT NULL DEFAULT 2025,
	`iva` decimal(5,2) NOT NULL DEFAULT '21.00',
	`moneda` varchar(5) NOT NULL DEFAULT '€',
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configuracion_id` PRIMARY KEY(`id`),
	CONSTRAINT `configuracion_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `entidades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `entidades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gastos_fijos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`concepto` varchar(255) NOT NULL,
	`monto_anual` decimal(12,2),
	`monto_mensual` decimal(12,2),
	`entidad_id` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gastos_fijos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ingresos_fijos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`concepto` varchar(255) NOT NULL,
	`monto_anual` decimal(12,2),
	`monto_mensual` decimal(12,2),
	`entidad_id` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ingresos_fijos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permisos_subusuario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuario_id` int NOT NULL,
	`ver_dashboard` boolean NOT NULL DEFAULT true,
	`ver_transacciones` boolean NOT NULL DEFAULT true,
	`crear_transacciones` boolean NOT NULL DEFAULT false,
	`editar_transacciones` boolean NOT NULL DEFAULT false,
	`eliminar_transacciones` boolean NOT NULL DEFAULT false,
	`ver_catalogo` boolean NOT NULL DEFAULT true,
	`editar_catalogo` boolean NOT NULL DEFAULT false,
	`ver_gastos_fijos` boolean NOT NULL DEFAULT true,
	`editar_gastos_fijos` boolean NOT NULL DEFAULT false,
	`ver_ingresos_fijos` boolean NOT NULL DEFAULT true,
	`editar_ingresos_fijos` boolean NOT NULL DEFAULT false,
	`ver_configuracion` boolean NOT NULL DEFAULT false,
	CONSTRAINT `permisos_subusuario_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subcategorias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `subcategorias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transacciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`categoria_id` int NOT NULL,
	`subcategoria_id` int NOT NULL,
	`entidad_id` int NOT NULL,
	`tipo` enum('GASTO','INGRESO') NOT NULL,
	`monto` decimal(12,2) NOT NULL,
	`fecha` date NOT NULL,
	`notas` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transacciones_id` PRIMARY KEY(`id`),
	CONSTRAINT `monto_positivo` CHECK(`transacciones`.`monto` > 0)
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`rol` enum('ADMIN','USER','SUB_USER') NOT NULL DEFAULT 'USER',
	`activo` boolean NOT NULL DEFAULT true,
	`parent_id` int,
	`max_sub_users` int NOT NULL DEFAULT 3,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usuarios_id` PRIMARY KEY(`id`),
	CONSTRAINT `usuarios_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `categorias` ADD CONSTRAINT `categorias_user_id_usuarios_id_fk` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `configuracion` ADD CONSTRAINT `configuracion_user_id_usuarios_id_fk` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entidades` ADD CONSTRAINT `entidades_user_id_usuarios_id_fk` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gastos_fijos` ADD CONSTRAINT `gastos_fijos_user_id_usuarios_id_fk` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gastos_fijos` ADD CONSTRAINT `gastos_fijos_entidad_id_entidades_id_fk` FOREIGN KEY (`entidad_id`) REFERENCES `entidades`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ingresos_fijos` ADD CONSTRAINT `ingresos_fijos_user_id_usuarios_id_fk` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ingresos_fijos` ADD CONSTRAINT `ingresos_fijos_entidad_id_entidades_id_fk` FOREIGN KEY (`entidad_id`) REFERENCES `entidades`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permisos_subusuario` ADD CONSTRAINT `permisos_subusuario_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subcategorias` ADD CONSTRAINT `subcategorias_user_id_usuarios_id_fk` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transacciones` ADD CONSTRAINT `transacciones_user_id_usuarios_id_fk` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transacciones` ADD CONSTRAINT `transacciones_categoria_id_categorias_id_fk` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transacciones` ADD CONSTRAINT `transacciones_subcategoria_id_subcategorias_id_fk` FOREIGN KEY (`subcategoria_id`) REFERENCES `subcategorias`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transacciones` ADD CONSTRAINT `transacciones_entidad_id_entidades_id_fk` FOREIGN KEY (`entidad_id`) REFERENCES `entidades`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_user_fecha` ON `transacciones` (`user_id`,`fecha`);--> statement-breakpoint
CREATE INDEX `idx_fecha` ON `transacciones` (`fecha`);--> statement-breakpoint
CREATE INDEX `idx_tipo` ON `transacciones` (`tipo`);--> statement-breakpoint
CREATE INDEX `idx_categoria` ON `transacciones` (`categoria_id`);--> statement-breakpoint
CREATE INDEX `idx_subcategoria` ON `transacciones` (`subcategoria_id`);--> statement-breakpoint
CREATE INDEX `idx_entidad` ON `transacciones` (`entidad_id`);