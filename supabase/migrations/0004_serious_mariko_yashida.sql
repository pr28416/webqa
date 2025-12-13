ALTER TABLE "tests" ALTER COLUMN "title" SET DEFAULT 'Untitled Test';--> statement-breakpoint
ALTER TABLE "tests" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tests" ALTER COLUMN "instructions" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "tests" ALTER COLUMN "instructions" DROP NOT NULL;