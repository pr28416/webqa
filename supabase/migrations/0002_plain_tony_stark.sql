CREATE TABLE "tests" (
	"test_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "test_id" uuid;--> statement-breakpoint
CREATE INDEX "tests_created_at_idx" ON "tests" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_test_id_tests_test_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("test_id") ON DELETE set null ON UPDATE no action;