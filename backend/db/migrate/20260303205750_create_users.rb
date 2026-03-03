class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :name, null: false
      t.string :password_digest, null: false
      t.string :share_token, null: false
      t.string :timezone, default: "UTC"

      t.timestamps
    end
    add_index :users, :email, unique: true
    add_index :users, :share_token, unique: true
  end
end
