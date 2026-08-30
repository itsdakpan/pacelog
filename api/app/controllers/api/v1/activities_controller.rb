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

  def destroy
    Activity.find(params[:id]).destroy!
    head :no_content
  end


  private

  def activity_params
    params.require(:activity).permit(:title, :activity_type, :started_at, :distance_km, :duration_minutes, :notes, :effort)
  end

  def serialize(activity)
    activity.as_json(only: %i[id title activity_type started_at distance_km duration_minutes notes effort]).merge(pace_per_km: activity.pace_per_km)
  end

  # Aggregates come from SQL rather than the loaded collection so the summary
  # does not depend on every activity being in memory.
  def summary_for(_activities)
    {
      total_distance_km: Activity.sum(:distance_km).to_f.round(1),
      weekly_distance_km: Activity.where(started_at: Time.current.beginning_of_week..).sum(:distance_km).to_f.round(1),
      activities_count: Activity.count,
      current_streak_weeks: Activity.current_streak_weeks,
      records: Activity.records,
      weekly_series: Activity.weekly_series,
      pace_trend: Activity.pace_trend,
      race_predictions: Activity.race_predictions,
      effort_split: Activity.effort_split
    }
  end
end
