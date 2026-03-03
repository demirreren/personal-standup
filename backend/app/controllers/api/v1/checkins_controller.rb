module Api
  module V1
    class CheckinsController < ApplicationController
      before_action :authenticate!

      def index
        checkins = current_user.checkins

        if params[:date]
          checkins = checkins.for_date(Date.parse(params[:date]))
        elsif params[:start_date] && params[:end_date]
          checkins = checkins.for_range(
            Date.parse(params[:start_date]),
            Date.parse(params[:end_date])
          )
        else
          checkins = checkins.where(date: 30.days.ago.to_date..Date.today)
        end

        render json: { checkins: checkins.recent.map { |c| checkin_json(c) } }
      end

      def create
        checkin = current_user.checkins.new(checkin_params)
        checkin.date ||= Date.today

        if checkin.save
          render json: { checkin: checkin_json(checkin) }, status: :created
        else
          render json: { errors: checkin.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        checkin = current_user.checkins.find(params[:id])
        if checkin.update(checkin_params)
          render json: { checkin: checkin_json(checkin) }
        else
          render json: { errors: checkin.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def today
        today_checkins = current_user.checkins.for_date(Date.today)
        render json: {
          morning: today_checkins.mornings.first&.then { |c| checkin_json(c) },
          evening: today_checkins.evenings.first&.then { |c| checkin_json(c) }
        }
      end

      private

      def checkin_params
        params.permit(:checkin_type, :date, :body, :energy)
      end

      def checkin_json(checkin)
        {
          id: checkin.id,
          checkin_type: checkin.checkin_type,
          date: checkin.date,
          body: checkin.body,
          energy: checkin.energy,
          created_at: checkin.created_at
        }
      end
    end
  end
end
