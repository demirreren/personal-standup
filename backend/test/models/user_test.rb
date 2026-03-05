require "test_helper"

class UserTest < ActiveSupport::TestCase
  def valid_attrs
    { name: "Demir", email: "demir@example.com", password: "secure123", password_confirmation: "secure123" }
  end

  test "valid user saves successfully" do
    user = User.new(valid_attrs)
    assert user.valid?, user.errors.full_messages.join(", ")
  end

  test "requires name" do
    user = User.new(valid_attrs.merge(name: ""))
    assert_not user.valid?
    assert_includes user.errors[:name], "can't be blank"
  end

  test "requires email" do
    user = User.new(valid_attrs.merge(email: ""))
    assert_not user.valid?
    assert_includes user.errors[:email], "can't be blank"
  end

  test "rejects invalid email format" do
    user = User.new(valid_attrs.merge(email: "not-an-email"))
    assert_not user.valid?
    assert user.errors[:email].any?
  end

  test "enforces unique email" do
    User.create!(valid_attrs)
    duplicate = User.new(valid_attrs.merge(name: "Other"))
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:email], "has already been taken"
  end

  test "rejects short password" do
    user = User.new(valid_attrs.merge(password: "abc", password_confirmation: "abc"))
    assert_not user.valid?
    assert user.errors[:password].any?
  end

  test "enforces name max length" do
    user = User.new(valid_attrs.merge(name: "a" * 101))
    assert_not user.valid?
    assert user.errors[:name].any?
  end

  test "generates share_token on create" do
    user = User.create!(valid_attrs)
    assert_not_nil user.share_token
    assert user.share_token.length > 10
  end

  test "authenticates with correct password" do
    user = User.create!(valid_attrs)
    assert user.authenticate("secure123")
  end

  test "rejects incorrect password" do
    user = User.create!(valid_attrs)
    assert_not user.authenticate("wrong")
  end
end
