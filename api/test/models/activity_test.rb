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

  test "pace_per_km divides duration by distance" do
    assert_equal 6.0, build(distance_km: 5.0, duration_minutes: 30).pace_per_km
    assert_equal 4.5, build(distance_km: 10.0, duration_minutes: 45).pace_per_km
  end

  test "pace_per_km is nil when distance is missing or zero" do
    assert_nil build(distance_km: nil).pace_per_km
    assert_nil build(distance_km: 0).pace_per_km
  end
end
