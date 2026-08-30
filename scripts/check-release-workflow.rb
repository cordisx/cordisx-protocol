require 'yaml'
require 'json'
require 'open3'

root = File.expand_path('..', __dir__)
release_source = File.read(File.join(root, '.github/workflows/release-beta.yml'))
workflow = YAML.safe_load(release_source, aliases: false)
abort 'release workflow name drifted' unless workflow['name'] == 'Release npm beta'

trigger = workflow['on'] || workflow[true]
abort 'release workflow must expose required workflow_dispatch version input' unless trigger.dig('workflow_dispatch', 'inputs', 'version', 'required')
abort 'release workflow OIDC permissions drifted' unless workflow.dig('permissions', 'id-token') == 'write' && workflow.dig('permissions', 'contents') == 'read'
publish = workflow.dig('jobs', 'publish')
abort 'release workflow release boundary drifted' unless publish['environment'] == 'npm-beta' && publish['if'] == "github.ref == 'refs/heads/main'"
runs = publish['steps'].map { |step| step['run'] }.compact
required_release_runs = [
  'npm install --global npm@12.0.2 --registry=https://registry.npmjs.org',
  'npm ci --ignore-scripts --registry=https://registry.npmjs.org',
  'npm run check',
  'npm run check:distribution',
  'npm publish --provenance --access public --tag beta --registry=https://registry.npmjs.org',
  'EXPECT_GIT_HEAD="${GITHUB_SHA}" npm run verify:registry-beta -- --version "${{ inputs.version }}"'
]
release_positions = required_release_runs.map do |required|
  index = runs.index(required)
  abort "release workflow omitted exact step: #{required}" if index.nil?
  index
end
abort 'release workflow command order drifted' unless release_positions == release_positions.sort && release_positions.uniq.length == release_positions.length

version_assertion = runs.find { |run| run.include?('${{ inputs.version }}') }
abort 'release workflow omitted the exact version assertion' unless version_assertion&.include?("node -p \"require('./package.json').version\"")
expected_version = JSON.parse(File.read(File.join(root, 'package.json')))['version']

def assert_shell_exit(command, root, expected_success)
  _stdout, _stderr, status = Open3.capture3('bash', '-n', '-c', command, chdir: root)
  abort 'release workflow version assertion is not valid Bash' unless status.success?
  _stdout, _stderr, status = Open3.capture3('bash', '-c', command, chdir: root)
  abort "release workflow version assertion #{expected_success ? 'failed' : 'accepted a mismatch'}" unless status.success? == expected_success
end

assert_shell_exit(version_assertion.gsub('${{ inputs.version }}', expected_version), root, true)
assert_shell_exit(version_assertion.gsub('${{ inputs.version }}', "#{expected_version}-mismatch"), root, false)

broken_plain_scalar = <<~YAML
  name: Release npm beta
  steps:
    - run: test "${{ inputs.version }}" = "$(node --input-type=module -e \"import manifest from './package.json' with { type: 'json' }; console.log(manifest.version)\")"
YAML
begin
  YAML.safe_load(broken_plain_scalar, aliases: false)
  abort 'workflow parser regression: the legacy unquoted JSON import scalar was accepted'
rescue Psych::SyntaxError
end

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
