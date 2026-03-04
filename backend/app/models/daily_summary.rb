class DailySummary < ApplicationRecord
  belongs_to :user

  validates :date, presence: true,
            uniqueness: { scope: :user_id }

  scope :for_date, ->(date) { where(date: date) }
  scope :for_range, ->(start_date, end_date) { where(date: start_date..end_date) }
  scope :recent, -> { order(date: :desc) }
end
