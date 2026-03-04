class UpdateCheckinsForStructuredStandup < ActiveRecord::Migration[8.1]
  def change
    change_table :checkins do |t|
      t.integer :feeling
      t.text :yesterday
      t.text :today_plan
      t.text :blockers
      t.text :what_happened
      t.text :carry_over
    end

    change_column_null :checkins, :body, true
  end
end
