import { pgTable, index, pgPolicy, uuid, text, timestamp, integer, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const spotMeSettings = pgTable("spot_me_settings", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: text("user_id").notNull().unique(),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: timestamp("google_token_expiry", { withTimezone: true, mode: 'string' }),
  googleEmail: text("google_email"),
  maxWalkMinutes: integer("max_walk_minutes").notNull().default(25),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
  index("idx_spot_me_settings_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
  pgPolicy("spot_me_settings_rls_select", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
  pgPolicy("spot_me_settings_rls_insert", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(user_id = (select current_setting('app.current_user_id')))` }),
  pgPolicy("spot_me_settings_rls_update", { as: "permissive", for: "update", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
  pgPolicy("spot_me_settings_rls_delete", { as: "permissive", for: "delete", to: ["public"], using: sql`(user_id = (select current_setting('app.current_user_id')))` }),
])
