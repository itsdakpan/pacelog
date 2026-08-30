# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end
# Demo activities make the local dashboard useful immediately after setup, and
# back the weekly chart, streak and personal records. Deterministic on purpose:
# the production demo re-seeds nightly and should look the same each morning.
Activity.delete_all

rng = Random.new(20_260_830)

# Three build weeks then a down week, repeated, trending up. Index 11 is the
# current week. Kilometres.
weekly_volume = [ 18, 21, 24, 16, 26, 29, 32, 20, 34, 37, 28, 40 ]

easy_titles  = [ "Morning shakeout", "Riverside easy", "Canal loop", "Recovery jog", "Sunrise loop" ]
tempo_titles = [ "Park tempo", "Threshold repeats", "Progression run", "Track session" ]
long_titles  = [ "Long run", "Sunday long", "Trail long run", "Coast path long" ]
note_pool    = [ "Felt strong", "Legs heavy", "Cold and clear", "Easy effort", "Negative split", nil, nil ]

jitter = ->(value, spread) { (value * (1 + rng.rand(-spread..spread))).round(1) }

weekly_volume.each_with_index do |volume, week_index|
  week_start = Time.current.beginning_of_week - (11 - week_index).weeks

  # Paces drift a little faster across the block, so the trend has something
  # 真 to report: about 4% over twelve weeks.
  fitness = 1 - (week_index * 0.0035)

  long_km  = jitter.call(volume * 0.38, 0.08)
  tempo_km = jitter.call(volume * 0.22, 0.08)
  easy_km  = ((volume - long_km - tempo_km) / 2.0).round(1)

  sessions = [
    { day: 1, km: easy_km,  pace: 6.05, title: easy_titles.sample(random: rng),  type: "run", effort: 3 },
    { day: 3, km: tempo_km, pace: 5.05, title: tempo_titles.sample(random: rng), type: "run", effort: 8 },
    { day: 5, km: easy_km,  pace: 6.15, title: easy_titles.sample(random: rng),  type: "run", effort: 3 },
    { day: 6, km: long_km,  pace: 6.30, title: long_titles.sample(random: rng),  type: "run", effort: 5 }
  ]

  # Cross-training keeps the type badges from being uniformly "run".
  case week_index % 4
  when 1 then sessions << { day: 2, km: jitter.call(24, 0.15), pace: 2.6, title: "Recovery spin", type: "ride", effort: 2 }
  when 2 then sessions << { day: 0, km: jitter.call(4, 0.2), pace: 12.5, title: "Evening walk", type: "walk", effort: 1 }
  end

  sessions.each do |session|
    started_at = week_start + session[:day].days + rng.rand(6..8).hours + rng.rand(0..59).minutes
    next if started_at > Time.current # the current week is only partly run

    Activity.create!(
      title: session[:title],
      activity_type: session[:type],
      started_at: started_at,
      distance_km: session[:km],
      duration_minutes: (session[:km] * session[:pace] * fitness).round,
      notes: note_pool.sample(random: rng),
      effort: session[:effort]
    )
  end
end

puts "Seeded #{Activity.count} activities across #{weekly_volume.size} weeks."
