module Api
  module V1
    class AuthController < ApplicationController
      def register
        user = User.new(register_params)

        if user.save
          token = JwtService.encode(user.id)
          render json: { user: user_json(user), token: token }, status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def login
        user = User.find_by(email: params[:email]&.downcase&.strip)

        if user&.authenticate(params[:password])
          token = JwtService.encode(user.id)
          render json: { user: user_json(user), token: token }
        else
          render json: { error: "Invalid email or password" }, status: :unauthorized
        end
      end

      def me
        authenticate!
        return unless current_user

        render json: { user: user_json(current_user) }
      end

      private

      def register_params
        params.permit(:email, :name, :password, :password_confirmation, :timezone)
          .tap { |p| p[:email] = p[:email]&.downcase&.strip }
      end

      def user_json(user)
        {
          id: user.id,
          email: user.email,
          name: user.name,
          timezone: user.timezone,
          share_token: user.share_token,
          created_at: user.created_at
        }
      end
    end
  end
end
