puts "Seeding database..."

user = User.find_or_create_by!(email: "demo@standup.dev") do |u|
  u.name = "Demir"
  u.password = "password123"
  u.password_confirmation = "password123"
  u.timezone = "America/Toronto"
end

puts "Created user: #{user.email}"

today = Date.today
entries = [
  { days_ago: 6, morning: "Planning out the landing page redesign. Going to focus on the hero section and testimonials. Blocker: waiting on copy from the content team.", morning_energy: 4, evening: "Got the hero section done and responsive. Testimonials component is scaffolded but needs real data. Carrying over the copy integration.", evening_energy: 3 },
  { days_ago: 5, morning: "Finishing testimonials section and starting on the pricing page. Energy is good today.", morning_energy: 5, evening: "Testimonials done, pricing page layout complete. Need to wire up the Stripe integration tomorrow. Good day overall.", evening_energy: 4 },
  { days_ago: 4, morning: "Stripe integration day. Need to set up webhooks and handle subscription changes. Bit nervous about edge cases.", morning_energy: 3, evening: "Stripe webhooks working in test mode. Hit a snag with subscription upgrades but found a workaround. Mentally drained.", evening_energy: 2 },
  { days_ago: 3, morning: "Bug fixes from yesterday's Stripe work. Also need to write tests for the payment flow. Meeting with advisor at 2pm.", morning_energy: 3, evening: "Tests written and passing. Advisor meeting went well, got good feedback on the pricing model. Solid day.", evening_energy: 4 },
  { days_ago: 2, morning: "Working on the onboarding flow. Want to make it dead simple — connect bank, categorize first 10 transactions, done.", morning_energy: 4, evening: "Onboarding flow is live in staging. Three-step wizard feels clean. Need to add error handling for failed bank connections.", evening_energy: 4 },
  { days_ago: 1, morning: "Error handling and edge cases for onboarding. Also want to add a progress indicator. Blocker: the bank API docs are unclear on timeout behavior.", morning_energy: 3, evening: "Error handling done. Progress bar added. Couldn't figure out the timeout issue — going to ask in the API's Discord tomorrow.", evening_energy: 3 },
  { days_ago: 0, morning: "Fresh week. Going to tackle the timeout issue first thing, then move to the dashboard analytics feature. Feeling motivated.", morning_energy: 5 },
]

entries.each do |entry|
  date = today - entry[:days_ago].days

  Checkin.find_or_create_by!(user: user, date: date, checkin_type: :morning) do |c|
    c.body = entry[:morning]
    c.energy = entry[:morning_energy]
  end

  if entry[:evening]
    Checkin.find_or_create_by!(user: user, date: date, checkin_type: :evening) do |c|
      c.body = entry[:evening]
      c.energy = entry[:evening_energy]
    end
  end
end

puts "Created #{Checkin.count} check-ins"

paired_dates = user.checkins.mornings.pluck(:date) & user.checkins.evenings.pluck(:date)
paired_dates.each do |date|
  morning = user.checkins.mornings.find_by(date: date)
  evening = user.checkins.evenings.find_by(date: date)

  DailySummary.find_or_create_by!(user: user, date: date) do |s|
    s.ai_summary = "Planned: #{morning.body.split('.').first}. Outcome: #{evening.body.split('.').first}."
    s.tasks_planned = rand(2..5)
    s.tasks_completed = rand(1..4)
    s.carry_overs = evening.body.include?("Carry") || evening.body.include?("carry") ? evening.body.split(".").last.strip : nil
  end
end

puts "Created #{DailySummary.count} daily summaries"

week_start = today.beginning_of_week(:monday)
WeeklyDigest.find_or_create_by!(user: user, week_start: week_start) do |d|
  d.ai_digest = "This week was focused on shipping the frontend redesign and integrating Stripe payments. Strong start with design work, a challenging mid-week on payment edge cases, and a solid finish on the onboarding flow. Energy dipped during the Stripe integration but recovered well."
  d.wins = "- Completed landing page redesign with responsive hero and testimonials\n- Stripe webhooks working in test mode\n- Onboarding wizard shipped to staging in just one day"
  d.patterns = "Energy tends to dip on integration-heavy days. Most productive when working on UI/UX. Advisor meetings provide a good energy boost."
  d.blocker_patterns = "External API documentation has been a recurring friction point — both the content team delay and the bank API timeout issue."
  d.avg_energy = 3.6
  d.completion_rate = 86
end

puts "Created weekly digest"
puts "Done! Login with demo@standup.dev / password123"
