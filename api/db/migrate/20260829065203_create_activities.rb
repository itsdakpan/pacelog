class CreateActivities < ActiveRecord::Migration[7.2]
  def change
    create_table :activities do |t|
      t.string :title
      t.string :activity_type
      t.datetime :started_at
      t.decimal :distance_km
      t.integer :duration_minutes
      t.text :notes
      t.integer :kudos_count

      t.timestamps
    end
  end
end
