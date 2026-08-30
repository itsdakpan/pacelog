class Api::V1::ActivitiesController < ApplicationController
  def index
    activities = Activity.order(started_at: :desc)
    render json: { activities: activities.map { |activity| serialize(activity) }, summary: summary_for(activities) }
  end

  def create
    activity = Activity.new(activity_params)

    if activity.save
      render json: { activity: serialize(activity) }, status: :created
    else
      render json: { errors: activity.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def kudos
    activity = Activity.find(params[:id])
    activity.increment!(:kudos_count)
    render json: { activity: serialize(activity) }
  end

  private

  def activity_params
    params.require(:activity).permit(:title, :activity_type, :started_at, :distance_km, :duration_minutes, :notes)
  end

  def serialize(activity)
    activity.as_json(only: %i[id title activity_type started_at distance_km duration_minutes notes kudos_count]).merge(pace_per_km: activity.pace_per_km)
  end

  def summary_for(activities)
    week_start = Time.current.beginning_of_week
    weekly = activities.select { |activity| activity.started_at >= week_start }
    { total_distance_km: activities.sum(&:distance_km).to_f.round(1), weekly_distance_km: weekly.sum(&:distance_km).to_f.round(1), activities_count: activities.size }
  end
end
