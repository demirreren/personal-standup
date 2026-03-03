class Checkin < ApplicationRecord
  belongs_to :user

  enum :checkin_type, { morning: 0, evening: 1 }

  validates :checkin_type, presence: true
  validates :date, presence: true
  validates :body, presence: true
  validates :energy, inclusion: { in: 1..5 }, allow_nil: true
  validates :checkin_type, uniqueness: { scope: [ :user_id, :date ],
    message: "already exists for this date" }

  scope :for_date, ->(date) { where(date: date) }
  scope :for_range, ->(start_date, end_date) { where(date: start_date..end_date) }
  scope :mornings, -> { where(checkin_type: :morning) }
  scope :evenings, -> { where(checkin_type: :evening) }
  scope :recent, -> { order(date: :desc, checkin_type: :asc) }
end
