require "net/http"
require "json"

class AiService
  API_URL = "https://api.openai.com/v1/chat/completions"
  MODEL = "gpt-4o-mini"

  def self.generate_daily_summary(checkins)
    morning = checkins.find { |c| c.morning? }
    evening = checkins.find { |c| c.evening? }

    prompt = build_daily_prompt(morning, evening)
    response = chat(prompt, system: "You are a perceptive personal coach. You spot patterns and blind spots. Respond in JSON only.")

    parsed = JSON.parse(response)
    {
      ai_summary: parsed["insight"],
      tasks_planned: parsed["tasks_planned"] || 0,
      tasks_completed: parsed["tasks_completed"] || 0,
      carry_overs: parsed["carry_overs"]
    }
  rescue JSON::ParserError
    {
      ai_summary: response,
      tasks_planned: 0,
      tasks_completed: 0,
      carry_overs: nil
    }
  end

  def self.generate_nudge(user, current_checkin)
    recent_checkins = user.checkins
      .where("date >= ?", 14.days.ago.to_date)
      .order(date: :desc, checkin_type: :asc)
      .limit(30)

    return nil if recent_checkins.size < 3

    prompt = build_nudge_prompt(recent_checkins, current_checkin)
    response = chat(prompt, system: "You are a pattern-spotting AI for a personal standup app. Be concise, insightful, and non-judgmental. Respond in JSON only.")

    parsed = JSON.parse(response)
    nudge_text = parsed["nudge"]
    nudge_text.present? && nudge_text != "null" ? nudge_text : nil
  rescue JSON::ParserError, StandardError
    nil
  end

  def self.generate_weekly_digest(checkins, summaries)
    prompt = build_weekly_prompt(checkins, summaries)
    response = chat(prompt, system: "You are a thoughtful personal coach who spots patterns across work and life. Respond in JSON only.")

    parsed = JSON.parse(response)
    feelings = checkins.filter_map(&:feeling)
    morning_dates = checkins.select(&:morning?).map(&:date).uniq
    evening_dates = checkins.select(&:evening?).map(&:date).uniq
    paired = (morning_dates & evening_dates).size

    {
      ai_digest: parsed["digest"],
      wins: parsed["wins"],
      patterns: parsed["patterns"],
      blocker_patterns: parsed["blocker_patterns"],
      avg_energy: feelings.any? ? (feelings.sum.to_f / feelings.size).round(0) : nil,
      completion_rate: morning_dates.any? ? (paired.to_f / morning_dates.size * 100).round(0) : nil
    }
  rescue JSON::ParserError
    {
      ai_digest: response,
      wins: nil,
      patterns: nil,
      blocker_patterns: nil,
      avg_energy: nil,
      completion_rate: nil
    }
  end

  private

  def self.build_daily_prompt(morning, evening)
    parts = []
    if morning
      parts << "Morning standup (feeling: #{morning.feeling || 'not set'}/100):"
      parts << "  Yesterday: #{morning.yesterday}" if morning.yesterday.present?
      parts << "  Plan for today: #{morning.today_plan}" if morning.today_plan.present?
      parts << "  Blockers: #{morning.blockers}" if morning.blockers.present?
    end
    if evening
      parts << "Evening reflection (feeling: #{evening.feeling || 'not set'}/100):"
      parts << "  What happened: #{evening.what_happened}" if evening.what_happened.present?
      parts << "  Carrying over: #{evening.carry_over}" if evening.carry_over.present?
    end

    <<~PROMPT
      Analyze this person's daily standup and return a JSON object with:
      - "insight": A 1-2 sentence observation about their day. Don't just summarize — notice something useful: a gap between plan and reality, a pattern, a win worth acknowledging, or a blocker that needs attention. Be specific.
      - "tasks_planned": estimated number of things they mentioned planning (integer)
      - "tasks_completed": estimated number they completed based on evening check-in (integer)
      - "carry_overs": a brief note on what didn't get done, or null if everything was completed

      #{parts.join("\n")}
    PROMPT
  end

  def self.build_nudge_prompt(recent_checkins, current_checkin)
    history = recent_checkins.map do |c|
      if c.morning?
        line = "#{c.date} morning (feeling: #{c.feeling || '?'}): plan=#{c.today_plan}"
        line += ", blockers=#{c.blockers}" if c.blockers.present?
        line += ", yesterday=#{c.yesterday}" if c.yesterday.present?
        line
      else
        line = "#{c.date} evening (feeling: #{c.feeling || '?'}): happened=#{c.what_happened}"
        line += ", carry_over=#{c.carry_over}" if c.carry_over.present?
        line
      end
    end

    current = if current_checkin.morning?
      parts = ["feeling: #{current_checkin.feeling || '?'}", "plan: #{current_checkin.today_plan}"]
      parts << "blockers: #{current_checkin.blockers}" if current_checkin.blockers.present?
      "Morning standup — #{parts.join(', ')}"
    else
      parts = ["feeling: #{current_checkin.feeling || '?'}", "happened: #{current_checkin.what_happened}"]
      parts << "carry_over: #{current_checkin.carry_over}" if current_checkin.carry_over.present?
      "Evening reflection — #{parts.join(', ')}"
    end

    <<~PROMPT
      You're a pattern-spotting AI. Below is a user's recent standup history (last 2 weeks) and what they just checked in with today.

      Your job: look for a NON-OBVIOUS pattern, insight, or nudge. Return a JSON object with:
      - "nudge": A single concise sentence (max 25 words). This should surface something the user likely hasn't noticed — recurring blockers, feeling trends, forgotten goals, day-of-week patterns, plan-vs-reality gaps. If there's nothing genuinely worth noting, return "nudge": null.

      Rules:
      - Don't summarize what they just said. They already know that.
      - Don't be generic ("Great job!" or "Keep it up!"). Be specific.
      - Reference actual data from their history.
      - This covers work AND personal life (gym, health, personal goals are all fair game).

      Recent history:
      #{history.join("\n")}

      Today's check-in:
      #{current}
    PROMPT
  end

  def self.build_weekly_prompt(checkins, summaries)
    days = checkins.group_by(&:date).sort_by(&:first).map do |date, day_checkins|
      morning = day_checkins.find(&:morning?)
      evening = day_checkins.find(&:evening?)
      summary = summaries.find { |s| s.date == date }

      day_str = "## #{date} (#{date.strftime('%A')})\n"
      if morning
        day_str += "Morning (feeling #{morning.feeling || '?'}/100): plan=#{morning.today_plan}"
        day_str += ", blockers=#{morning.blockers}" if morning.blockers.present?
        day_str += ", yesterday=#{morning.yesterday}" if morning.yesterday.present?
        day_str += "\n"
      end
      if evening
        day_str += "Evening (feeling #{evening.feeling || '?'}/100): happened=#{evening.what_happened}"
        day_str += ", carry_over=#{evening.carry_over}" if evening.carry_over.present?
        day_str += "\n"
      end
      day_str += "AI insight: #{summary.ai_summary}\n" if summary&.ai_summary
      day_str
    end

    <<~PROMPT
      Analyze this person's week of personal standups (covering work AND personal life) and return a JSON object with:
      - "digest": A 3-4 sentence narrative of their week. Focus on the arc: what they were trying to do, how it actually went, and what shifted. Note plan-vs-reality gaps and feeling trends.
      - "wins": Top 3 accomplishments across work and personal life (as a bulleted string)
      - "patterns": Notable patterns — feeling trends by day-of-week, recurring behaviors, productivity patterns, personal goal consistency. Be specific with data.
      - "blocker_patterns": Recurring blockers or things they keep avoiding/carrying over. null if none.

      #{days.join("\n")}
    PROMPT
  end

  def self.chat(prompt, system: nil)
    api_key = ENV.fetch("OPENAI_API_KEY", nil)
    unless api_key
      return fallback_response(prompt)
    end

    uri = URI(API_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.read_timeout = 30

    messages = []
    messages << { role: "system", content: system } if system
    messages << { role: "user", content: prompt }

    request = Net::HTTP::Post.new(uri)
    request["Authorization"] = "Bearer #{api_key}"
    request["Content-Type"] = "application/json"
    request.body = {
      model: MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    }.to_json

    response = http.request(request)
    body = JSON.parse(response.body)

    if response.code.to_i != 200
      Rails.logger.error("OpenAI error: #{body}")
      return fallback_response(prompt)
    end

    body.dig("choices", 0, "message", "content")&.strip
  end

  def self.fallback_response(prompt)
    '{"insight":"AI insights not available — set OPENAI_API_KEY to enable.","nudge":null,"tasks_planned":0,"tasks_completed":0,"carry_overs":null,"digest":"Weekly digest not available — set OPENAI_API_KEY to enable.","wins":null,"patterns":null,"blocker_patterns":null}'
  end
end
