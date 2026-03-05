class ApplicationController < ActionController::API
  private

  def authenticate!
    token = request.headers["Authorization"]&.split(" ")&.last
    payload = JwtService.decode(token)

    if payload
      @current_user = User.find_by(id: payload[:user_id])
    end

    unless @current_user
      render json: { error: "Unauthorized" }, status: :unauthorized
      return
    end

    sync_timezone_from_header
  end

  def current_user
    @current_user
  end

  def user_timezone
    @current_user&.timezone.presence || "UTC"
  end

  def current_date
    Time.use_zone(user_timezone) { Time.zone.today }
  rescue ArgumentError
    Date.today
  end

  def sync_timezone_from_header
    tz = request.headers["X-Timezone"]
    return if tz.blank? || @current_user.nil?
    return if tz == @current_user.timezone

    Time.use_zone(tz) { nil }
    @current_user.update_column(:timezone, tz)
  rescue ArgumentError
    # invalid timezone identifier, ignore
  end
end
