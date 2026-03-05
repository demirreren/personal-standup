class JwtService
  SECRET = ENV.fetch("JWT_SECRET") { Rails.application.credentials.secret_key_base || "dev-secret-key" }
  EXPIRY = 7.days

  def self.encode(user_id)
    payload = {
      user_id: user_id,
      exp: EXPIRY.from_now.to_i
    }
    JWT.encode(payload, SECRET, "HS256")
  end

  def self.decode(token)
    decoded = JWT.decode(token, SECRET, true, algorithm: "HS256")
    decoded.first.symbolize_keys
  rescue JWT::DecodeError, JWT::ExpiredSignature
    nil
  end
end
