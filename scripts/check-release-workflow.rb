require 'yaml'
require 'json'
require 'open3'

root = File.expand_path('..', __dir__)
source = File.read(File.join(root, '.github/workflows/release-beta.yml'))
workflow = YAML.safe_load(source, aliases: false)
abort 'release workflow name drifted' unless workflow['name'] == 'Release npm beta'

trigger = workflow['on'] || workflow[true]
abort 'release workflow must expose required workflow_dispatch version input' unless trigger.dig('workflow_dispatch', 'inputs', 'version', 'required')
abort 'release workflow OIDC permissions drifted' unless workflow.dig('permissions', 'id-token') == 'write' && workflow.dig('permissions', 'contents') == 'read'
publish = workflow.dig('jobs', 'publish')
abort 'release workflow release boundary drifted' unless publish['environment'] == 'npm-beta' && publish['if'] == "github.ref == 'refs/heads/main'"
runs = publish['steps'].map { |step| step['run'] }.compact
['npm run check', 'npm run check:distribution', 'npm publish --provenance --access public --tag beta', 'npm run verify:registry-beta'].each do |required|
  abort "release workflow omitted #{required}" unless runs.any? { |run| run.include?(required) }
end

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

puts 'Release workflow YAML gate: all checks passed'
