CREATE TABLE "interaction_events" (
	"interaction_event_id" bigserial PRIMARY KEY NOT NULL,
	"interaction_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"role" text NOT NULL,
	"event_family" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"stream_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"interaction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_prompt" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"assistant_summary" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interaction_events" ADD CONSTRAINT "interaction_events_interaction_id_interactions_interaction_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."interactions"("interaction_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "interaction_events_interaction_seq_idx" ON "interaction_events" USING btree ("interaction_id","seq");--> statement-breakpoint
CREATE INDEX "interaction_events_interaction_created_at_idx" ON "interaction_events" USING btree ("interaction_id","created_at");--> statement-breakpoint
CREATE INDEX "interaction_events_event_family_idx" ON "interaction_events" USING btree ("interaction_id","event_family");--> statement-breakpoint
CREATE INDEX "interactions_started_at_idx" ON "interactions" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interactions_status_idx" ON "interactions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "interactions_running_browser_idx" ON "interactions" USING btree ((metadata->>'browserId')) WHERE status = 'running';