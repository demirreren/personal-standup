require "test_helper"

class JwtServiceTest < ActiveSupport::TestCase
  test "encode returns a string token" do
    token = JwtService.encode(42)
    assert_kind_of String, token
    assert token.length > 20
  end

  test "decode returns the user_id" do
    token = JwtService.encode(42)
    payload = JwtService.decode(token)
    assert_equal 42, payload[:user_id]
  end

  test "decode returns nil for invalid token" do
    payload = JwtService.decode("garbage.token.here")
    assert_nil payload
  end

  test "decode returns nil for tampered token" do
    token = JwtService.encode(42)
    tampered = token[0..-4] + "xxx"
    payload = JwtService.decode(tampered)
    assert_nil payload
  end
end
