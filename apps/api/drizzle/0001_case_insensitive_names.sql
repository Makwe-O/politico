ALTER TABLE "offices" DROP CONSTRAINT "offices_name_unique";--> statement-breakpoint
ALTER TABLE "parties" DROP CONSTRAINT "parties_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "offices_name_lower_uq" ON "offices" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "parties_name_lower_uq" ON "parties" USING btree (lower("name"));