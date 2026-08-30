class Activity < ApplicationRecord
  ACTIVITY_TYPES = %w[run ride walk].freeze

  validates :title, :activity_type, :started_at, :distance_km, :duration_minutes, presence: true
  validates :activity_type, inclusion: { in: ACTIVITY_TYPES }
  validates :distance_km, numericality: { greater_than: 0 }
  validates :duration_minutes, numericality: { only_integer: true, greater_than: 0 }

  WEEKS_IN_BLOCK = 12

  # Weekly buckets, oldest first, zero-filled so the chart has a bar for every
  # week — a gap in the data should read as a rest week, not a missing column.
  def self.weekly_series(weeks: WEEKS_IN_BLOCK)
    first_week = Time.current.beginning_of_week - (weeks - 1).weeks

    totals = where(started_at: first_week..)
             .pluck(:started_at, :distance_km)
             .group_by { |started_at, _| started_at.beginning_of_week.to_date }
             .transform_values { |rows| rows.sum { |_, distance| distance }.to_f.round(1) }

    Array.new(weeks) do |index|
      week = (first_week + index.weeks).to_date
      { week_start: week.to_s, distance_km: totals.fetch(week, 0.0) }
    end
  end

  # Consecutive weeks with at least one activity, counting back from now. A
  # current week with nothing logged yet does not break the streak — it has not
  # finished, so it cannot have failed.
  def self.current_streak_weeks
    active_weeks = pluck(:started_at).map { |started_at| started_at.beginning_of_week.to_date }.to_set
    return 0 if active_weeks.empty?

    this_week = Time.current.beginning_of_week.to_date
    cursor = active_weeks.include?(this_week) ? this_week : this_week - 1.week

    streak = 0
    while active_weeks.include?(cursor)
      streak += 1
      cursor -= 1.week
    end
    streak
  end

  def self.records
    runs = where(activity_type: "run")
    longest = runs.order(distance_km: :desc).first
    # Lowest minutes-per-km wins; done in SQL so it does not load every run.
    fastest = runs.where("distance_km > 0").order(Arel.sql("duration_minutes / distance_km ASC")).first
    {
      longest_run: longest && { title: longest.title, distance_km: longest.distance_km.to_f,
                                started_at: longest.started_at },
      fastest_pace: fastest && { title: fastest.title, pace_per_km: fastest.pace_per_km.to_f,
                                 started_at: fastest.started_at }
    }
  end

  def pace_per_km
    return nil if distance_km.blank? || distance_km.zero?

    (duration_minutes / distance_km).round(2)
  end
end
