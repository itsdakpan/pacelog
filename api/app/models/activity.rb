class Activity < ApplicationRecord
  ACTIVITY_TYPES = %w[run ride walk].freeze

  validates :title, :activity_type, :started_at, :distance_km, :duration_minutes, presence: true
  validates :activity_type, inclusion: { in: ACTIVITY_TYPES }
  validates :distance_km, numericality: { greater_than: 0 }
  validates :duration_minutes, numericality: { only_integer: true, greater_than: 0 }
  # Perceived effort, borrowed from the RPE scale. Optional on older entries.
  validates :effort, numericality: { only_integer: true, in: 1..10 }, allow_nil: true

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

  # Runs at or below this perceived effort count as easy. The 80/20 principle
  # holds that roughly four fifths of running should sit here.
  EASY_EFFORT_CEILING = 4
  EASY_TARGET_PERCENT = 80

  BLOCK_WEEKS = 4

  RACE_DISTANCES = [
    [ "5K", 5.0 ],
    [ "10K", 10.0 ],
    [ "Half marathon", 21.0975 ],
    [ "Marathon", 42.195 ]
  ].freeze

  # Riegel's endurance exponent: predicted time grows slightly faster than
  # distance, because nobody holds 5K pace for a marathon.
  RIEGEL_EXPONENT = 1.06

  # Shortest effort worth projecting from — below this, pace says more about
  # your sprint than your endurance.
  MIN_PREDICTION_DISTANCE_KM = 3.0

  def self.effort_split
    rated = where.not(effort: nil)
    return nil if rated.empty?

    easy = rated.where(effort: ..EASY_EFFORT_CEILING).count
    total = rated.count

    { easy: easy, hard: total - easy, rated: total,
      easy_percent: (easy.to_f / total * 100).round, target_percent: EASY_TARGET_PERCENT }
  end

  # Average pace over the last four weeks against the four before it. Weighted
  # by distance — a mean of per-run paces would let a short run count as much
  # as a long one.
  def self.pace_trend
    current = average_pace(BLOCK_WEEKS.weeks.ago, Time.current)
    return nil if current.nil?

    previous = average_pace((BLOCK_WEEKS * 2).weeks.ago, BLOCK_WEEKS.weeks.ago)

    {
      current_pace: current,
      previous_pace: previous,
      delta_seconds: previous && ((current - previous) * 60).round,
      weeks: BLOCK_WEEKS
    }
  end

  def self.average_pace(from, to)
    runs = where(activity_type: "run", started_at: from...to)
    distance = runs.sum(:distance_km)
    return nil if distance.zero?

    (runs.sum(:duration_minutes) / distance).to_f.round(2)
  end
  private_class_method :average_pace

  # Projects race times from your best recent run using Riegel's formula.
  def self.race_predictions
    basis = where(activity_type: "run")
            .where(started_at: (BLOCK_WEEKS * 3).weeks.ago..)
            .where("distance_km >= ?", MIN_PREDICTION_DISTANCE_KM)
            .min_by(&:pace_per_km)
    return nil if basis.nil?

    basis_seconds = basis.duration_minutes * 60.0
    basis_distance = basis.distance_km.to_f

    predictions = RACE_DISTANCES.map do |label, distance|
      { label: label, distance_km: distance,
        seconds: (basis_seconds * (distance / basis_distance)**RIEGEL_EXPONENT).round }
    end

    { basis: { title: basis.title, distance_km: basis_distance, started_at: basis.started_at },
      predictions: predictions }
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
