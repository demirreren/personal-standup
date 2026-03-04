require "net/http"
require "json"

class AiService
  API_URL = "https://api.openai.com/v1/chat/completions"
  MODEL = "gpt-4o-mini"

  def self.generate_daily_summary(checkins)
    morning = checkins.find { |c| c.morning? }
    evening = checkins.find { |c| c.evening? }

    prompt = build_daily_prompt(morning, evening)
    response = chat(prompt, system: "You are a concise productivity coach. Respond in JSON only.")

    parsed = JSON.parse(response)
    {
      ai_summary: parsed["summary"],
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

  def self.generate_weekly_digest(checkins, summaries)
    prompt = build_weekly_prompt(checkins, summaries)
    response = chat(prompt, system: "You are a thoughtful productivity coach. Respond in JSON only.")

    parsed = JSON.parse(response)
    energies = checkins.filter_map(&:energy)
    morning_dates = checkins.select(&:morning?).map(&:date).uniq
    evening_dates = checkins.select(&:evening?).map(&:date).uniq
    paired = (morning_dates & evening_dates).size

    {
      ai_digest: parsed["digest"],
      wins: parsed["wins"],
      patterns: parsed["patterns"],
      blocker_patterns: parsed["blocker_patterns"],
      avg_energy: energies.any? ? (energies.sum.to_f / energies.size).round(1) : nil,
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
      parts << "Morning check-in (energy: #{morning.energy || 'not set'}):\n#{morning.body}"
    end
    if evening
      parts << "Evening check-out (energy: #{evening.energy || 'not set'}):\n#{evening.body}"
    end

    <<~PROMPT
      Analyze this person's daily check-ins and return a JSON object with:
      - "summary": A 2-3 sentence summary of their day highlighting what went well and what carried over
      - "tasks_planned": estimated number of tasks they mentioned planning (integer)
      - "tasks_completed": estimated number they completed (integer)
      - "carry_overs": a brief note on what didn't get done, or null if everything was completed

      #{parts.join("\n\n")}
    PROMPT
  end

  def self.build_weekly_prompt(checkins, summaries)
    days = checkins.group_by(&:date).sort_by(&:first).map do |date, day_checkins|
      morning = day_checkins.find(&:morning?)
      evening = day_checkins.find(&:evening?)
      summary = summaries.find { |s| s.date == date }

      day_str = "## #{date} (#{date.strftime('%A')})\n"
      day_str += "Morning: #{morning.body}\n" if morning
      day_str += "Evening: #{evening.body}\n" if evening
      day_str += "Summary: #{summary.ai_summary}\n" if summary&.ai_summary
      day_str
    end

    <<~PROMPT
      Analyze this person's week of daily check-ins and return a JSON object with:
      - "digest": A 3-4 sentence narrative of their week — what they focused on, how they progressed, overall arc
      - "wins": A bulleted list (as a string) of their top 3 accomplishments
      - "patterns": Notable patterns you see (e.g. "energy dips on Wednesdays", "most productive in mornings")
      - "blocker_patterns": Recurring blockers or themes that held them back, or null if none

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
    '{"summary":"AI summary not available — set OPENAI_API_KEY to enable.","tasks_planned":0,"tasks_completed":0,"carry_overs":null,"digest":"Weekly digest not available — set OPENAI_API_KEY to enable.","wins":null,"patterns":null,"blocker_patterns":null}'
  end
end
