# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end
# Demo activities make the local dashboard useful immediately after setup.
Activity.delete_all

[
  { title: "Sunrise loop", activity_type: "run", started_at: 1.day.ago, distance_km: 5.2, duration_minutes: 31, notes: "Easy effort", kudos_count: 4 },
  { title: "Park tempo", activity_type: "run", started_at: 3.days.ago, distance_km: 7.0, duration_minutes: 39, notes: "Felt strong", kudos_count: 7 },
  { title: "Evening recovery", activity_type: "walk", started_at: 5.days.ago, distance_km: 3.4, duration_minutes: 42, notes: "Recovery day", kudos_count: 2 }
].each { |attributes| Activity.create!(attributes) }
