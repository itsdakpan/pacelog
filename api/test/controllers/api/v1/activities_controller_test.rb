require "test_helper"

class Api::V1::ActivitiesControllerTest < ActionDispatch::IntegrationTest
  test "index returns activities newest first with a summary" do
    get api_v1_activities_url

    assert_response :success
    assert_equal "application/json", response.media_type

    body = JSON.parse(response.body)
    titles = body["activities"].map { |activity| activity["title"] }
    assert_equal [ "Morning run", "Long ride" ], titles

    assert_equal 25.0, body["summary"]["total_distance_km"]
    assert_equal 5.0, body["summary"]["weekly_distance_km"]
    assert_equal 2, body["summary"]["activities_count"]
  end

  test "index serialises the derived pace" do
    get api_v1_activities_url

    morning = JSON.parse(response.body)["activities"].find { |a| a["title"] == "Morning run" }
    assert_equal 6.0, morning["pace_per_km"].to_f
  end

  test "index serialises started_at so the client can show a date" do
    get api_v1_activities_url

    morning = JSON.parse(response.body)["activities"].find { |a| a["title"] == "Morning run" }
    assert morning.key?("started_at"), "started_at must be serialised"
    assert_equal activities(:morning_run).started_at.iso8601(3), Time.parse(morning["started_at"]).utc.iso8601(3)
  end

  test "index summary carries the streak, records and weekly series" do
    get api_v1_activities_url

    summary = JSON.parse(response.body)["summary"]

    assert_equal 2, summary["current_streak_weeks"]
    assert_equal 12, summary["weekly_series"].size
    assert_equal %w[week_start distance_km], summary["weekly_series"].first.keys
    assert_equal "Morning run", summary.dig("records", "longest_run", "title")
    assert_equal 20.0, summary.dig("records", "biggest_week", "distance_km")
  end

  test "create persists a valid activity and returns it" do
    assert_difference "Activity.count", 1 do
      post api_v1_activities_url, params: {
        activity: {
          title: "Tempo run", activity_type: "run", distance_km: "8.0",
          duration_minutes: "40", started_at: Time.current.iso8601
        }
      }, as: :json
    end

    assert_response :created
    activity = JSON.parse(response.body)["activity"]
    assert_equal "Tempo run", activity["title"]
    assert_equal 0, activity["kudos_count"]
    assert_equal 5.0, activity["pace_per_km"].to_f
  end

  test "create rejects a blank activity with 422 and error messages" do
    assert_no_difference "Activity.count" do
      post api_v1_activities_url, params: {
        activity: { title: "", activity_type: "run", distance_km: "", duration_minutes: "" }
      }, as: :json
    end

    assert_response :unprocessable_entity
    assert_equal "application/json", response.media_type

    errors = JSON.parse(response.body)["errors"]
    # The frontend surfaces these directly, so they must be present and human readable.
    assert_includes errors, "Title can't be blank"
    assert(errors.any? { |message| message.start_with?("Distance km") })
    assert(errors.any? { |message| message.start_with?("Duration minutes") })
  end

  test "create rejects an unknown activity type" do
    post api_v1_activities_url, params: {
      activity: {
        title: "Swim", activity_type: "swim", distance_km: "1.0",
        duration_minutes: "30", started_at: Time.current.iso8601
      }
    }, as: :json

    assert_response :unprocessable_entity
    assert_includes JSON.parse(response.body)["errors"], "Activity type is not included in the list"
  end

  test "create rejects a non integer duration" do
    post api_v1_activities_url, params: {
      activity: {
        title: "Odd run", activity_type: "run", distance_km: "5.0",
        duration_minutes: "30.5", started_at: Time.current.iso8601
      }
    }, as: :json

    assert_response :unprocessable_entity
  end

  test "destroy removes the activity and returns no content" do
    activity = activities(:morning_run)

    assert_difference "Activity.count", -1 do
      delete api_v1_activity_url(activity)
    end

    assert_response :no_content
    assert_nil Activity.find_by(id: activity.id)
  end

  test "destroy on a missing activity responds 404 rather than a 500" do
    delete api_v1_activity_url(id: 0)

    assert_response :not_found
  end

  test "kudos increments the counter and returns the updated activity" do
    activity = activities(:morning_run)

    post api_v1_kudos_activity_url(activity)

    assert_response :success
    assert_equal 2, JSON.parse(response.body)["activity"]["kudos_count"]
    assert_equal 2, activity.reload.kudos_count
  end

  test "unkudos decrements the counter" do
    activity = activities(:morning_run) # starts at 1

    delete api_v1_unkudos_activity_url(activity)

    assert_response :success
    assert_equal 0, JSON.parse(response.body)["activity"]["kudos_count"]
    assert_equal 0, activity.reload.kudos_count
  end

  test "unkudos never drives the counter below zero" do
    activity = activities(:long_ride) # starts at 0

    delete api_v1_unkudos_activity_url(activity)

    assert_response :success
    assert_equal 0, activity.reload.kudos_count
  end

  test "kudos on a missing activity responds 404 rather than a 500" do
    post api_v1_kudos_activity_url(id: 0)

    assert_response :not_found
  end
end
