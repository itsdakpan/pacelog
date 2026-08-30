namespace :pacelog do
  desc "Replace all activities with the deterministic demo data"
  task reset_demo: :environment do
    Rake::Task["db:seed"].reenable
    Rake::Task["db:seed"].invoke
  end
end
