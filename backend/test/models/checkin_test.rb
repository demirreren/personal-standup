require "test_helper"

class CheckinTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(
      name: "Test User",
      email: "checkin-test-#{SecureRandom.hex(4)}@example.com",
      password: "secure123",
      password_confirmation: "secure123"
    )
  end

  def morning_attrs
    { user: @user, checkin_type: :morning, date: Date.today, today_plan: "Ship the feature" }
  end

  def evening_attrs
    { user: @user, checkin_type: :evening, date: Date.today, what_happened: "Shipped it" }
  end

  test "valid morning checkin saves" do
    checkin = Checkin.new(morning_attrs)
    assert checkin.valid?, checkin.errors.full_messages.join(", ")
  end

  test "valid evening checkin saves" do
    checkin = Checkin.new(evening_attrs)
    assert checkin.valid?, checkin.errors.full_messages.join(", ")
  end

  test "morning checkin requires today_plan" do
    checkin = Checkin.new(morning_attrs.merge(today_plan: nil))
    assert_not checkin.valid?
    assert_includes checkin.errors[:today_plan], "can't be blank"
  end

  test "evening checkin requires what_happened" do
    checkin = Checkin.new(evening_attrs.merge(what_happened: nil))
    assert_not checkin.valid?
    assert_includes checkin.errors[:what_happened], "can't be blank"
  end

  test "evening checkin does not require today_plan" do
    checkin = Checkin.new(evening_attrs)
    assert checkin.valid?
  end

  test "prevents duplicate checkin_type per user per day" do
    Checkin.create!(morning_attrs)
    duplicate = Checkin.new(morning_attrs)
    assert_not duplicate.valid?
    assert duplicate.errors[:checkin_type].any?
  end

  test "allows morning and evening on same day" do
    Checkin.create!(morning_attrs)
    evening = Checkin.new(evening_attrs)
    assert evening.valid?
  end

  test "feeling must be between 0 and 10" do
    checkin = Checkin.new(morning_attrs.merge(feeling: 11))
    assert_not checkin.valid?
    assert checkin.errors[:feeling].any?
  end

  test "feeling can be nil" do
    checkin = Checkin.new(morning_attrs.merge(feeling: nil))
    assert checkin.valid?
  end

  test "feeling accepts valid value" do
    checkin = Checkin.new(morning_attrs.merge(feeling: 7))
    assert checkin.valid?
  end

  test "enforces text field max length" do
    long_text = "x" * 2001
    checkin = Checkin.new(morning_attrs.merge(today_plan: long_text))
    assert_not checkin.valid?
    assert checkin.errors[:today_plan].any?
  end

  test "scopes return correct results" do
    m = Checkin.create!(morning_attrs)
    e = Checkin.create!(evening_attrs)

    assert_includes @user.checkins.mornings, m
    assert_not_includes @user.checkins.mornings, e
    assert_includes @user.checkins.evenings, e
    assert_includes @user.checkins.for_date(Date.today), m
    assert_includes @user.checkins.for_date(Date.today), e
  end
end
