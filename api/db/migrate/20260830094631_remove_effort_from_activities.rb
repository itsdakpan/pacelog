class RemoveEffortFromActivities < ActiveRecord::Migration[7.2]
  def change
    remove_column :activities, :effort, :integer
  end
end
