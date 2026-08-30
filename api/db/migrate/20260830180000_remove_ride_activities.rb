class RemoveRideActivities < ActiveRecord::Migration[7.2]
  def up
    execute "DELETE FROM activities WHERE activity_type = 'ride'"
  end

  def down
    # Deleted activity data cannot be reconstructed.
  end
end
