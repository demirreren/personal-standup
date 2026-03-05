class User < ApplicationRecord
  has_secure_password

  has_many :checkins, dependent: :destroy
  has_many :daily_summaries, dependent: :destroy
  has_many :weekly_digests, dependent: :destroy

  validates :email, presence: true, uniqueness: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true, length: { maximum: 100 }
  validates :password, length: { minimum: 6 }, if: -> { password.present? }

  before_create :generate_share_token

  private

  def generate_share_token
    self.share_token ||= SecureRandom.urlsafe_base64(16)
  end
end
