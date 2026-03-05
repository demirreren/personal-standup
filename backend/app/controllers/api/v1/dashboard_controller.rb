module Api
  module V1
    class DashboardController < ApplicationController
      before_action :authenticate!

      def stats
        checkins = current_user.checkins
        today = current_date

        current_streak = calculate_streak(checkins, today)
        total_days = checkins.select(:date).distinct.count
        avg_feeling = checkins.where.not(feeling: nil).average(:feeling)&.round(0)

        morning_count = checkins.mornings.count
        paired_days = checkins.mornings
          .where(date: checkins.evenings.select(:date))
          .select(:date).distinct.count
        completion_rate = morning_count > 0 ? (paired_days.to_f / morning_count * 100).round(0) : 0

        render json: {
          stats: {
            current_streak: current_streak,
            total_days: total_days,
            avg_feeling: avg_feeling || 0,
            completion_rate: completion_rate,
            total_checkins: checkins.count,
            member_since: current_user.created_at.to_date
          }
        }
      end

      def trends
        days = (params[:days] || 30).to_i
        start_date = days.days.ago.to_date
        checkins = current_user.checkins.for_range(start_date, current_date)

        feeling_by_day = checkins.where.not(feeling: nil)
          .group(:date)
          .average(:feeling)
          .transform_values { |v| v.round(0) }

        checkins_by_day = checkins.group(:date, :checkin_type).count

        daily_data = (start_date..current_date).map do |date|
          morning = checkins_by_day[[date, "morning"]] || 0
          evening = checkins_by_day[[date, "evening"]] || 0
          {
            date: date,
            has_morning: morning > 0,
            has_evening: evening > 0,
            feeling: feeling_by_day[date],
            completed: morning > 0 && evening > 0
          }
        end

        render json: { trends: daily_data }
      end

      private

      def calculate_streak(checkins, from_date)
        dates_with_checkins = checkins
          .where(date: (from_date - 365.days)..from_date)
          .distinct.pluck(:date)
          .sort
          .reverse

        streak = 0
        expected = from_date
        dates_with_checkins.each do |d|
          break if d != expected
          streak += 1
          expected -= 1.day
        end

        streak
      end
    end
  end
end
