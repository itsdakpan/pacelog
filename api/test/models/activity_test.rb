require "test_helper"

class ActivityTest < ActiveSupport::TestCase
  def build(**overrides)
    Activity.new({
      title: "Morning run", activity_type: "run", started_at: Time.current,
      distance_km: 5.0, duration_minutes: 30
    }.merge(overrides))
  end

  test "a complete activity is valid" do
    assert_predicate build, :valid?
  end

  test "requires the core fields" do
    %i[title activity_type started_at distance_km duration_minutes].each do |field|
      activity = build(field => nil)
      assert_predicate activity, :invalid?, "expected a missing #{field} to be invalid"
      assert_includes activity.errors.attribute_names, field
    end
  end

  test "rejects an activity type outside the known list" do
    assert_predicate build(activity_type: "swim"), :invalid?
    Activity::ACTIVITY_TYPES.each do |type|
      assert_predicate build(activity_type: type), :valid?, "expected #{type} to be allowed"
    end
  end

  test "rejects a non positive distance" do
    assert_predicate build(distance_km: 0), :invalid?
    assert_predicate build(distance_km: -1), :invalid?
  end

  test "rejects a non positive or fractional duration" do
    assert_predicate build(duration_minutes: 0), :invalid?
    assert_predicate build(duration_minutes: -5), :invalid?
    assert_predicate build(duration_minutes: 30.5), :invalid?
  end

  test "weekly_series returns one bucket per week, zero-filled, oldest first" do
    series = Activity.weekly_series(weeks: 4)

    assert_equal 4, series.size
    assert_equal series.map { |w| w[:week_start] }.sort, series.map { |w| w[:week_start] }
    assert_equal Time.current.beginning_of_week.to_date.to_s, series.last[:week_start]
    # morning_run sits in the current week; long_ride is three days before it.
    assert_equal 5.0, series.last[:distance_km]
    assert(series.all? { |w| w[:distance_km].is_a?(Float) }, "weeks with no activity must be 0.0, not nil")
  end

  test "current_streak_weeks counts consecutive active weeks back from now" do
    # Fixtures put one activity in the current week and one in the previous week.
    assert_equal 2, Activity.current_streak_weeks
  end

  test "current_streak_weeks is zero when there are no activities" do
    Activity.delete_all
    assert_equal 0, Activity.current_streak_weeks
  end

  test "current_streak_weeks tolerates a current week with nothing logged yet" do
    Activity.where("started_at >= ?", Time.current.beginning_of_week).delete_all
    # The previous week still counts; the streak is not broken by an unstarted week.
    assert_equal 1, Activity.current_streak_weeks
  end

  test "records reports the longest run, not the longest ride" do
    # long_ride is 20km, morning_run is 5km. A ride must never win "longest run".
    assert_equal "Morning run", Activity.records[:longest_run][:title]
  end

  test "records reports the fastest run by pace" do
    Activity.create!(title: "Speedwork", activity_type: "run", started_at: Time.current,
                     distance_km: 5.0, duration_minutes: 20)

    assert_equal "Speedwork", Activity.records[:fastest_pace][:title]
    assert_equal 4.0, Activity.records[:fastest_pace][:pace_per_km]
  end

  test "effort must be a whole number from 1 to 10 when given" do
    assert_predicate build(effort: nil), :valid?, "effort is optional"
    assert_predicate build(effort: 1), :valid?
    assert_predicate build(effort: 10), :valid?
    assert_predicate build(effort: 0), :invalid?
    assert_predicate build(effort: 11), :invalid?
    assert_predicate build(effort: 5.5), :invalid?
  end

  test "pace_trend compares the last four weeks with the four before" do
    Activity.delete_all
    # Recent block: 5km in 25 min = 5:00/km. Earlier block: 5km in 30 min = 6:00/km.
    Activity.create!(title: "Recent", activity_type: "run", started_at: 1.week.ago, distance_km: 5, duration_minutes: 25)
    Activity.create!(title: "Older", activity_type: "run", started_at: 6.weeks.ago, distance_km: 5, duration_minutes: 30)

    trend = Activity.pace_trend

    assert_equal 5.0, trend[:current_pace]
    assert_equal 6.0, trend[:previous_pace]
    assert_equal(-60, trend[:delta_seconds]) # a minute per km faster
  end

  test "pace_trend has no delta without a previous block to compare" do
    Activity.delete_all
    Activity.create!(title: "Only", activity_type: "run", started_at: 1.week.ago, distance_km: 5, duration_minutes: 25)

    trend = Activity.pace_trend

    assert_equal 5.0, trend[:current_pace]
    assert_nil trend[:delta_seconds]
  end

  test "pace_trend is nil with no recent runs" do
    Activity.delete_all
    assert_nil Activity.pace_trend
  end

  test "race_predictions projects longer distances from the best recent run" do
    Activity.delete_all
    # 10km in 50 minutes — a 5:00/km effort.
    Activity.create!(title: "Time trial", activity_type: "run", started_at: 1.week.ago, distance_km: 10, duration_minutes: 50)

    result = Activity.race_predictions

    assert_equal "Time trial", result[:basis][:title]
    assert_equal 10.0, result[:basis][:distance_km]

    five_k = result[:predictions].find { |p| p[:label] == "5K" }
    # Riegel: 3000s * (5/10)^1.06 = 1439s, comfortably under half of 50 minutes.
    assert_in_delta 1439, five_k[:seconds], 2

    marathon = result[:predictions].find { |p| p[:label] == "Marathon" }
    assert_operator marathon[:seconds], :>, 3000 * 2
  end

  test "race_predictions ignores rides and very short efforts" do
    Activity.delete_all
    Activity.create!(title: "Fast spin", activity_type: "ride", started_at: 1.week.ago, distance_km: 20, duration_minutes: 40)
    Activity.create!(title: "Sprint", activity_type: "run", started_at: 1.week.ago, distance_km: 1, duration_minutes: 3)

    assert_nil Activity.race_predictions
  end

  test "pace_per_km divides duration by distance" do
    assert_equal 6.0, build(distance_km: 5.0, duration_minutes: 30).pace_per_km
    assert_equal 4.5, build(distance_km: 10.0, duration_minutes: 45).pace_per_km
  end

  test "pace_per_km is nil when distance is missing or zero" do
    assert_nil build(distance_km: nil).pace_per_km
    assert_nil build(distance_km: 0).pace_per_km
  end
end
