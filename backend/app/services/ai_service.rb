require "net/http"
require "json"

class AiService
  API_URL = "https://api.openai.com/v1/chat/completions"
  MODEL = "gpt-4o-mini"

  def self.generate_daily_summary(checkins, name = nil)
    morning = checkins.find { |c| c.morning? }
    evening = checkins.find { |c| c.evening? }

    prompt = build_daily_prompt(morning, evening, name)
    response = chat(prompt, system: "You are a blunt, slightly quirky personal coach talking directly to #{name || 'the user'}. Be honest and specific, talk in second person (you/your), and let your personality show — use things like :) or a dry joke when it fits. No fluff, no generic praise, no em dashes. Respond in JSON only.")

    parsed = JSON.parse(response)
    {
      ai_summary: format_daily_plan(parsed),
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

    name = user.name
    prompt = build_nudge_prompt(recent_checkins, current_checkin, name)
    response = chat(prompt, system: "You are a blunt, slightly quirky coach talking to #{name}. Speak in second person (you/your), be specific and honest, and let your personality show with things like :) or a dry observation. No sugarcoating, no generic advice, no em dashes. Respond in JSON only.")

    parsed = JSON.parse(response)
    nudge_text = parsed["nudge"]
    nudge_text.present? && nudge_text != "null" ? nudge_text : nil
  rescue JSON::ParserError, StandardError
    nil
  end

  def self.generate_weekly_digest(checkins, summaries)
    prompt = build_weekly_prompt(checkins, summaries)
    response = chat(prompt, system: "You are a blunt, slightly quirky coach recapping someone's week. Talk directly to them in second person (you/your), be specific, and let personality show with things like :) or dry humor. No sugarcoating, no em dashes. Respond in JSON only.")

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

  def self.build_daily_prompt(morning, evening, name = nil)
    person = name || "this person"
    parts = []
    if morning
      parts << "Morning standup (feeling: #{morning.feeling || 'not set'}/10):"
      parts << "  Yesterday: #{morning.yesterday}" if morning.yesterday.present?
      parts << "  Plan for today: #{morning.today_plan}" if morning.today_plan.present?
      parts << "  Blockers: #{morning.blockers}" if morning.blockers.present?
    end
    if evening
      parts << "Evening reflection (feeling: #{evening.feeling || 'not set'}/10):"
      parts << "  What happened: #{evening.what_happened}" if evening.what_happened.present?
      parts << "  Carrying over: #{evening.carry_over}" if evening.carry_over.present?
    end

    <<~PROMPT
      Here is #{person}'s standup for today. Return a JSON object with:
      - "diagnosis": one blunt sentence (max 20 words) about the most important reality today
      - "priority": one specific thing they should prioritize in the next 2-4 hours
      - "first_step": one tiny concrete step they can do in 5-10 minutes to start that priority
      - "if_then": one fallback rule in this format: "If X happens, then do Y."
      - "tasks_planned": estimated number of tasks they planned (integer)
      - "tasks_completed": estimated number completed based on evening check-in (integer)
      - "carry_overs": brief note on what didn't get done, or null if everything was completed

      Rules:
      - Don't just paraphrase their words.
      - Be specific enough that they can act immediately.
      - Keep each field concise and direct.

      #{parts.join("\n")}
    PROMPT
  end

  def self.build_nudge_prompt(recent_checkins, current_checkin, user_name = nil)
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
      Here's #{user_name || 'this person'}'s standup history for the last 2 weeks and their check-in today. Spot a NON-OBVIOUS pattern and call it out directly.

      Return a JSON object with:
      - "nudge": One blunt sentence (max 25 words) addressed directly to them using "you". Surface something they likely haven't noticed — recurring blockers, feeling trends, forgotten goals, day-of-week dips, plan-vs-reality gaps. If there's genuinely nothing worth saying, return "nudge": null.

      Rules:
      - Don't echo what they just said. They know what they wrote.
      - No cheerleading. No "Great job!" Be specific and direct.
      - Reference real data from their history.
      - Work AND personal life are fair game.

      Recent history:
      #{history.join("\n")}

      Today's check-in:
      #{current}
    PROMPT
  end

  def self.format_daily_plan(parsed)
    diagnosis = parsed["diagnosis"].presence || parsed["insight"].presence || "Your day needs a clearer main target."
    priority = parsed["priority"].presence || "Choose one meaningful task and protect time for it."
    first_step = parsed["first_step"].presence || "Write the first tiny action and start a 10-minute timer."
    if_then = parsed["if_then"].presence || "If you get distracted, then do just the first 5 minutes."

    [
      "Reality check: #{diagnosis}",
      "Focus now: #{priority}",
      "First step: #{first_step}",
      "Fallback: #{if_then}"
    ].join("\n")
  end

  def self.build_weekly_prompt(checkins, summaries)
    days = checkins.group_by(&:date).sort_by(&:first).map do |date, day_checkins|
      morning = day_checkins.find(&:morning?)
      evening = day_checkins.find(&:evening?)
      summary = summaries.find { |s| s.date == date }

      day_str = "## #{date} (#{date.strftime('%A')})\n"
      if morning
        day_str += "Morning (feeling #{morning.feeling || '?'}/10): plan=#{morning.today_plan}"
        day_str += ", blockers=#{morning.blockers}" if morning.blockers.present?
        day_str += ", yesterday=#{morning.yesterday}" if morning.yesterday.present?
        day_str += "\n"
      end
      if evening
        day_str += "Evening (feeling #{evening.feeling || '?'}/10): happened=#{evening.what_happened}"
        day_str += ", carry_over=#{evening.carry_over}" if evening.carry_over.present?
        day_str += "\n"
      end
      day_str += "AI insight: #{summary.ai_summary}\n" if summary&.ai_summary
      day_str
    end

    <<~PROMPT
      Here's someone's week of standups. Write everything addressed directly to them using "you"/"your". Be honest and specific — no fluff.

      Return a JSON object with:
      - "digest": 3-4 sentences narrating their week directly to them. Cover what they set out to do, how it actually went, and what shifted. Call out plan-vs-reality gaps and energy trends.
      - "wins": Top 3 real accomplishments from work and personal life (as a bulleted string)
      - "patterns": Notable patterns — energy by day-of-week, recurring behaviors, productivity trends. Be specific, use their actual data.
      - "blocker_patterns": Recurring blockers or things they kept avoiding/carrying over. null if none.

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

    raw = body.dig("choices", 0, "message", "content")&.strip
    raw&.gsub(/\A```(?:json)?\s*/, "")&.gsub(/\s*```\z/, "")
  end

  def self.fallback_response(prompt)
    '{"insight":"AI insights not available — set OPENAI_API_KEY to enable.","nudge":null,"tasks_planned":0,"tasks_completed":0,"carry_overs":null,"digest":"Weekly digest not available — set OPENAI_API_KEY to enable.","wins":null,"patterns":null,"blocker_patterns":null}'
  end
end
