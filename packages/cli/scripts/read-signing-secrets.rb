require "shellwords"
require "yaml"

secrets = YAML.load_file(ENV.fetch("SECRETS_FILE"))
team = ENV.fetch("TEAM_ID")

required = {
  "APP_STORE_CONNECT_API_KEY_KEY_ID" => "APP_STORE_CONNECT_API_#{team}_KEY_ID",
  "APP_STORE_CONNECT_API_KEY_ISSUER_ID" => "APP_STORE_CONNECT_API_#{team}_ISSUER_ID",
  "APP_STORE_CONNECT_API_KEY_KEY" => "APP_STORE_CONNECT_API_#{team}_KEY_CONTENT",
  "MATCH_PASSWORD" => "FASTLANE_MATCH_PASSWORD",
  "MATCH_S3_ACCESS_KEY" => "FASTLANE_MATCH_S3_ACCESS_KEY",
  "MATCH_S3_SECRET_ACCESS_KEY" => "FASTLANE_MATCH_S3_SECRET_ACCESS_KEY",
}

missing = required.values.reject { |key| secrets[key] && !secrets[key].to_s.empty? }
unless missing.empty?
  warn "missing required signing secret keys: #{missing.join(", ")}"
  exit 1
end

File.write(ENV.fetch("P8_FILE"), secrets.fetch("APP_STORE_CONNECT_API_#{team}_KEY_CONTENT").to_s.gsub("\\n", "\n"))
File.chmod(0o600, ENV.fetch("P8_FILE"))

File.open(ENV.fetch("ENV_FILE"), "w", 0o600) do |file|
  required.each do |env_name, secret_name|
    next if env_name == "APP_STORE_CONNECT_API_KEY_KEY"
    file.puts("export #{env_name}=#{Shellwords.escape(secrets.fetch(secret_name).to_s)}")
  end
end
