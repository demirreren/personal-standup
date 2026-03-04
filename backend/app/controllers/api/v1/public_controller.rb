module Api
  module V1
    class PublicController < ApplicationController
      def weekly_digest
        digest = WeeklyDigest.find_by!(share_token: params[:share_token])
        user = digest.user

        render json: {
          digest: {
            week_start: digest.week_start,
            ai_digest: digest.ai_digest,
            wins: digest.wins,
            patterns: digest.patterns,
            avg_energy: digest.avg_energy,
            completion_rate: digest.completion_rate
          },
          user: {
            name: user.name
          }
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Digest not found" }, status: :not_found
      end
    end
  end
end
