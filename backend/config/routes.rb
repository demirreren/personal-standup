Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post "auth/register", to: "auth#register"
      post "auth/login", to: "auth#login"
      get "auth/me", to: "auth#me"

      resources :checkins, only: [ :index, :create, :update ]
      get "checkins/today", to: "checkins#today"

      get "daily_summaries", to: "daily_summaries#index"
      post "daily_summaries/generate", to: "daily_summaries#generate"
      post "daily_summaries/nudge", to: "daily_summaries#nudge"

      get "weekly_digests", to: "weekly_digests#index"
      post "weekly_digests/generate", to: "weekly_digests#generate"

      get "dashboard/stats", to: "dashboard#stats"
      get "dashboard/trends", to: "dashboard#trends"

      get "public/weekly/:share_token", to: "public#weekly_digest"
    end
  end
end
