class WeeklyDigest < ApplicationRecord
  belongs_to :user

  validates :week_start, presence: true,
            uniqueness: { scope: :user_id }

  before_create :generate_share_token

  scope :for_week, ->(date) { where(week_start: date.beginning_of_week(:monday)) }
  scope :recent, -> { order(week_start: :desc) }

  private

  def generate_share_token
    self.share_token ||= SecureRandom.urlsafe_base64(16)
  end
end
