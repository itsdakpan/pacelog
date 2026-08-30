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

  test "defaults kudos_count to zero without clobbering an existing value" do
    activity = build
    activity.validate
    assert_equal 0, activity.kudos_count

    existing = build(kudos_count: 4)
    existing.validate
    assert_equal 4, existing.kudos_count
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

  test "records reports the biggest week" do
    biggest = Activity.records[:biggest_week]

    # long_ride (20km) sits in the previous week and outweighs the current
    # week's 5km morning_run.
    assert_equal 20.0, biggest[:distance_km]
    assert_equal (Time.current.beginning_of_week - 1.week).to_date.to_s, biggest[:week_start]
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
