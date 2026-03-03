class CreateCheckins < ActiveRecord::Migration[8.1]
  def change
    create_table :checkins do |t|
      t.references :user, null: false, foreign_key: true
      t.integer :checkin_type, null: false
      t.date :date, null: false
      t.text :body, null: false
      t.integer :energy

      t.timestamps
    end
    add_index :checkins, [ :user_id, :date, :checkin_type ], unique: true
  end
end
