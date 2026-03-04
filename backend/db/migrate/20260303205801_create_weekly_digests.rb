class CreateWeeklyDigests < ActiveRecord::Migration[8.1]
  def change
    create_table :weekly_digests do |t|
      t.references :user, null: false, foreign_key: true
      t.date :week_start, null: false
      t.text :ai_digest
      t.text :wins
      t.text :patterns
      t.text :blocker_patterns
      t.float :avg_energy
      t.float :completion_rate
      t.string :share_token, null: false

      t.timestamps
    end
    add_index :weekly_digests, [ :user_id, :week_start ], unique: true
    add_index :weekly_digests, :share_token, unique: true
  end
end
