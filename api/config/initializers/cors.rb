# The static frontend and Rails API may be deployed on different origins.
# FRONTEND_ORIGINS accepts a comma-separated allowlist; never use a wildcard,
# since writes and deletes are available without authentication in this demo.
frontend_origins = ENV.fetch(
  "FRONTEND_ORIGINS",
  "http://localhost:5173,http://127.0.0.1:5173"
).split(",").map(&:strip).reject(&:empty?)

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*frontend_origins)
    resource "/api/*", headers: :any, methods: %i[get post delete options]
  end
end
