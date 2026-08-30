class Activity < ApplicationRecord
  ACTIVITY_TYPES = %w[run ride walk].freeze

  validates :title, :activity_type, :started_at, :distance_km, :duration_minutes, presence: true
  validates :activity_type, inclusion: { in: ACTIVITY_TYPES }
  validates :distance_km, numericality: { greater_than: 0 }
  validates :duration_minutes, numericality: { only_integer: true, greater_than: 0 }

  before_validation :set_defaults

  def pace_per_km
    return nil if distance_km.blank? || distance_km.zero?

    (duration_minutes / distance_km).round(2)
  end

  private

  def set_defaults
    self.kudos_count ||= 0
  end
end
