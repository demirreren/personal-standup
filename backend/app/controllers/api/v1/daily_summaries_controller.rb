module Api
  module V1
    class DailySummariesController < ApplicationController
      before_action :authenticate!

      def index
        summaries = current_user.daily_summaries

        if params[:date]
          summaries = summaries.for_date(Date.parse(params[:date]))
        elsif params[:start_date] && params[:end_date]
          summaries = summaries.for_range(
            Date.parse(params[:start_date]),
            Date.parse(params[:end_date])
          )
        else
          summaries = summaries.where(date: 30.days.ago.to_date..Date.today)
        end

        render json: { daily_summaries: summaries.recent.map { |s| summary_json(s) } }
      end

      def generate
        date = params[:date] ? Date.parse(params[:date]) : Date.today
        checkins = current_user.checkins.for_date(date)

        if checkins.empty?
          render json: { error: "No check-ins found for #{date}" }, status: :not_found
          return
        end

        summary = AiService.generate_daily_summary(checkins)
        daily_summary = current_user.daily_summaries.find_or_initialize_by(date: date)
        daily_summary.assign_attributes(summary)

        if daily_summary.save
          render json: { daily_summary: summary_json(daily_summary) }, status: :created
        else
          render json: { errors: daily_summary.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def summary_json(summary)
        {
          id: summary.id,
          date: summary.date,
          ai_summary: summary.ai_summary,
          tasks_planned: summary.tasks_planned,
          tasks_completed: summary.tasks_completed,
          carry_overs: summary.carry_overs,
          created_at: summary.created_at
        }
      end
    end
  end
end
