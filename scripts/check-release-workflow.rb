require 'yaml'

root = File.expand_path('..', __dir__)
legacy_path = File.join(root, '.github/workflows/release-beta.yml')
release_path = File.join(root, '.github/workflows/release.yml')
abort 'legacy beta-specific release workflow still exists' if File.exist?(legacy_path)
abort 'generic release workflow is missing' unless File.exist?(release_path)

release_source = File.read(release_path)
abort 'release workflow hardcodes a concrete prerelease version' if release_source.match?(/[0-9]+\.[0-9]+\.[0-9]+-[0-9A-Za-z]/)
workflow = YAML.safe_load(release_source, aliases: false)
abort 'release workflow name drifted' unless workflow['name'] == 'Release npm package'

trigger = workflow['on'] || workflow[true]
abort 'release workflow must trigger only from v<semver> tag pushes' unless trigger == { 'push' => { 'tags' => ['v*'] } }
abort 'release workflow OIDC permissions drifted' unless workflow.dig('permissions', 'id-token') == 'write' && workflow.dig('permissions', 'contents') == 'read'
abort 'release workflow concurrency drifted' unless workflow.dig('concurrency', 'group') == 'protocol-npm-release-${{ github.ref_name }}' && workflow.dig('concurrency', 'cancel-in-progress') == false

publish = workflow.dig('jobs', 'publish')
abort 'release workflow environment drifted' unless publish['environment'] == 'npm-release'
steps = publish['steps']
checkout = steps.find { |step| step['uses'] == 'actions/checkout@v7' }
setup_node = steps.find { |step| step['uses'] == 'actions/setup-node@v7' }
abort 'release workflow checkout must use the triggering tag ref' unless checkout&.dig('with', 'ref') == '${{ github.ref }}' && checkout.dig('with', 'fetch-depth') == 0
abort 'release workflow Node version drifted' unless setup_node&.dig('with', 'node-version') == 24

runs = steps.map { |step| step['run'] }.compact.map(&:chomp)
required_release_runs = [
  'node scripts/resolve-release.mjs --tag "$GITHUB_REF_NAME" --github-output "$GITHUB_OUTPUT"',
  "test \"$(git rev-parse \"refs/tags/${{ steps.release.outputs.git_tag }}^{commit}\")\" = \"$(git rev-parse HEAD)\"\ngit fetch --no-tags origin main\ngit merge-base --is-ancestor HEAD origin/main",
  'npm install --global npm@12.0.2 --registry=https://registry.npmjs.org',
  'npm ci --ignore-scripts --registry=https://registry.npmjs.org',
  'npm run check',
  'npm run check:distribution',
  'EXPECT_GIT_HEAD="$(git rev-parse HEAD)" node scripts/publish-registry-release.mjs --version "${{ steps.release.outputs.version }}" --tag "${{ steps.release.outputs.npm_tag }}"'
]
release_positions = required_release_runs.map do |required|
  index = runs.index(required)
  abort "release workflow omitted exact step: #{required}" if index.nil?
  index
end
abort 'release workflow command order drifted' unless release_positions == release_positions.sort && release_positions.uniq.length == release_positions.length

check_source = File.read(File.join(root, '.github/workflows/check.yml'))
check_workflow = YAML.safe_load(check_source, aliases: false)
abort 'check workflow name drifted' unless check_workflow['name'] == 'Check'

check_trigger = check_workflow['on'] || check_workflow[true]
abort 'check workflow must run for pull requests' unless check_trigger.key?('pull_request')
abort 'check workflow must run for pushes to main' unless check_trigger.dig('push', 'branches') == ['main']
abort 'check workflow permissions drifted' unless check_workflow.dig('permissions', 'contents') == 'read'

conformance = check_workflow.dig('jobs', 'conformance')
abort 'check workflow conformance job drifted' unless conformance&.fetch('runs-on', nil) == 'ubuntu-latest'
steps = conformance['steps']
checkout = steps.find { |step| step['uses'] == 'actions/checkout@v7' }
setup_node = steps.find { |step| step['uses'] == 'actions/setup-node@v7' }
exact_head = '${{ github.event.pull_request.head.sha || github.sha }}'
abort 'check workflow checkout is not exact-head pinned' unless checkout&.dig('with', 'ref') == exact_head
abort 'check workflow Node version drifted' unless setup_node&.dig('with', 'node-version') == 22

check_runs = steps.map { |step| step['run'] }.compact
required_check_runs = [
  "test \"$(git rev-parse HEAD)\" = \"#{exact_head}\"",
  'npm install --global npm@12.0.2 --registry=https://registry.npmjs.org',
  'test "$(npm --version)" = "12.0.2"',
  'npm ci',
  'npm run check',
  'npm run check:distribution'
]
positions = required_check_runs.map do |required|
  index = check_runs.index(required)
  abort "check workflow omitted exact step: #{required}" if index.nil?
  index
end
abort 'check workflow command order drifted' unless positions == positions.sort && positions.uniq.length == positions.length

puts 'Workflow YAML gate: all checks passed'
