class CreateDailySummaries < ActiveRecord::Migration[8.1]
  def change
    create_table :daily_summaries do |t|
      t.references :user, null: false, foreign_key: true
      t.date :date, null: false
      t.text :ai_summary
      t.integer :tasks_planned, default: 0
      t.integer :tasks_completed, default: 0
      t.text :carry_overs

      t.timestamps
    end
    add_index :daily_summaries, [ :user_id, :date ], unique: true
  end
end
