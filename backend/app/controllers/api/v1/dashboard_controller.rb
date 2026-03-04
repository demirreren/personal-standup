module Api
  module V1
    class DashboardController < ApplicationController
      before_action :authenticate!

      def stats
        checkins = current_user.checkins
        today = Date.today

        current_streak = calculate_streak(checkins, today)
        total_days = checkins.select(:date).distinct.count
        avg_energy = checkins.where.not(energy: nil).average(:energy)&.round(1)

        morning_count = checkins.mornings.count
        evening_count = checkins.evenings.count
        paired_days = checkins.mornings
          .where(date: checkins.evenings.select(:date))
          .select(:date).distinct.count
        completion_rate = morning_count > 0 ? (paired_days.to_f / morning_count * 100).round(0) : 0

        render json: {
          stats: {
            current_streak: current_streak,
            total_days: total_days,
            avg_energy: avg_energy || 0,
            completion_rate: completion_rate,
            total_checkins: checkins.count,
            member_since: current_user.created_at.to_date
          }
        }
      end

      def trends
        days = (params[:days] || 30).to_i
        start_date = days.days.ago.to_date
        checkins = current_user.checkins.for_range(start_date, Date.today)

        energy_by_day = checkins.where.not(energy: nil)
          .group(:date)
          .average(:energy)
          .transform_values { |v| v.round(1) }

        checkins_by_day = checkins.group(:date, :checkin_type).count

        daily_data = (start_date..Date.today).map do |date|
          morning = checkins_by_day[[date, "morning"]] || 0
          evening = checkins_by_day[[date, "evening"]] || 0
          {
            date: date,
            has_morning: morning > 0,
            has_evening: evening > 0,
            energy: energy_by_day[date],
            completed: morning > 0 && evening > 0
          }
        end

        render json: { trends: daily_data }
      end

      private

      def calculate_streak(checkins, from_date)
        streak = 0
        date = from_date

        loop do
          break unless checkins.for_date(date).exists?
          streak += 1
          date -= 1.day
        end

        streak
      end
    end
  end
end
