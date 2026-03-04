# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_03_205801) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "checkins", force: :cascade do |t|
    t.text "body", null: false
    t.integer "checkin_type", null: false
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.integer "energy"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "date", "checkin_type"], name: "index_checkins_on_user_id_and_date_and_checkin_type", unique: true
    t.index ["user_id"], name: "index_checkins_on_user_id"
  end

  create_table "daily_summaries", force: :cascade do |t|
    t.text "ai_summary"
    t.text "carry_overs"
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.integer "tasks_completed", default: 0
    t.integer "tasks_planned", default: 0
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id", "date"], name: "index_daily_summaries_on_user_id_and_date", unique: true
    t.index ["user_id"], name: "index_daily_summaries_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "name", null: false
    t.string "password_digest", null: false
    t.string "share_token", null: false
    t.string "timezone", default: "UTC"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["share_token"], name: "index_users_on_share_token", unique: true
  end

  create_table "weekly_digests", force: :cascade do |t|
    t.text "ai_digest"
    t.float "avg_energy"
    t.text "blocker_patterns"
    t.float "completion_rate"
    t.datetime "created_at", null: false
    t.text "patterns"
    t.string "share_token", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.date "week_start", null: false
    t.text "wins"
    t.index ["share_token"], name: "index_weekly_digests_on_share_token", unique: true
    t.index ["user_id", "week_start"], name: "index_weekly_digests_on_user_id_and_week_start", unique: true
    t.index ["user_id"], name: "index_weekly_digests_on_user_id"
  end

  add_foreign_key "checkins", "users"
  add_foreign_key "daily_summaries", "users"
  add_foreign_key "weekly_digests", "users"
end
