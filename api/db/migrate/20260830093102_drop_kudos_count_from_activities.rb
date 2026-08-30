class DropKudosCountFromActivities < ActiveRecord::Migration[7.2]
  def change
    remove_column :activities, :kudos_count, :integer
  end
end
