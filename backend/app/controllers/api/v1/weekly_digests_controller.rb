module Api
  module V1
    class WeeklyDigestsController < ApplicationController
      before_action :authenticate!

      def index
        digests = current_user.weekly_digests.recent

        if params[:week]
          week_start = Date.parse(params[:week]).beginning_of_week(:monday)
          digests = digests.for_week(week_start)
        else
          digests = digests.limit(12)
        end

        render json: { weekly_digests: digests.map { |d| digest_json(d) } }
      end

      def generate
        week_start = if params[:week]
          Date.parse(params[:week]).beginning_of_week(:monday)
        else
          current_date.beginning_of_week(:monday)
        end
        week_end = week_start + 6.days

        checkins = current_user.checkins.for_range(week_start, week_end)
        summaries = current_user.daily_summaries.for_range(week_start, week_end)

        if checkins.empty?
          render json: { error: "No check-ins found for this week" }, status: :not_found
          return
        end

        digest_data = AiService.generate_weekly_digest(checkins, summaries)
        digest = current_user.weekly_digests.find_or_initialize_by(week_start: week_start)
        digest.assign_attributes(digest_data)

        if digest.save
          render json: { weekly_digest: digest_json(digest) }, status: :created
        else
          render json: { errors: digest.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def digest_json(digest)
        {
          id: digest.id,
          week_start: digest.week_start,
          ai_digest: digest.ai_digest,
          wins: digest.wins,
          patterns: digest.patterns,
          blocker_patterns: digest.blocker_patterns,
          avg_energy: digest.avg_energy,
          completion_rate: digest.completion_rate,
          share_token: digest.share_token,
          created_at: digest.created_at
        }
      end
    end
  end
end
