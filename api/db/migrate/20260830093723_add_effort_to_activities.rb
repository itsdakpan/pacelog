class AddEffortToActivities < ActiveRecord::Migration[7.2]
  def change
    # Perceived effort, 1 (very easy) to 10 (maximal). Nullable: older entries
    # have none, and it stays optional on the form.
    add_column :activities, :effort, :integer
  end
end
