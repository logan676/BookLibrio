#!/usr/bin/env node

/**
 * BookLibrio One-Click Release Script
 *
 * Automates the entire release process:
 * 1. Bump version across all platforms
 * 2. Git add all changes
 * 3. Git commit with release message
 * 4. Create git tag
 * 5. Push to remote with tags
 *
 * Usage:
 *   node scripts/release.js patch   # Bug fix release
 *   node scripts/release.js minor   # New feature release
 *   node scripts/release.js major   # Breaking change release
 *   node scripts/release.js 1.2.3   # Specific version
 *
 * Options:
 *   --dry-run    Show what would happen without making changes
 *   --no-push    Don't push to remote (local release only)
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const ROOT = path.resolve(__dirname, '..')

// Colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
}

function log(msg, color = 'reset') {
  console.log(`${c[color]}${msg}${c.reset}`)
}

function exec(cmd, options = {}) {
  const { silent = false, dryRun = false } = options

  if (dryRun) {
    log(`  [dry-run] ${cmd}`, 'dim')
    return ''
  }

  if (!silent) {
    log(`  $ ${cmd}`, 'dim')
  }

  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    })
  } catch (error) {
    if (silent) {
      return error.stdout || ''
    }
    throw error
  }
}

function getCurrentVersion() {
  const versionFile = path.join(ROOT, 'version.json')
  try {
    const content = fs.readFileSync(versionFile, 'utf-8')
    return JSON.parse(content).version
  } catch {
    return '1.0.0'
  }
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number)

  switch (type) {
    case 'major': return `${major + 1}.0.0`
    case 'minor': return `${major}.${minor + 1}.0`
    case 'patch': return `${major}.${minor}.${patch + 1}`
    default: return type // Assume it's a specific version
  }
}

function isValidVersion(v) {
  return /^\d+\.\d+\.\d+$/.test(v)
}

function hasUncommittedChanges() {
  const status = exec('git status --porcelain', { silent: true })
  return status.trim().length > 0
}

function getCurrentBranch() {
  return exec('git branch --show-current', { silent: true }).trim()
}

async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(`${c.yellow}${question} (y/N): ${c.reset}`, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

async function main() {
  const args = process.argv.slice(2)

  // Parse options
  const dryRun = args.includes('--dry-run')
  const noPush = args.includes('--no-push')
  const filteredArgs = args.filter(a => !a.startsWith('--'))

  if (filteredArgs.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${c.bold}BookLibrio Release Script${c.reset}

${c.cyan}Usage:${c.reset}
  node scripts/release.js <version-type> [options]

${c.cyan}Version Types:${c.reset}
  patch         Bug fix release (1.0.0 → 1.0.1)
  minor         New feature release (1.0.0 → 1.1.0)
  major         Breaking change release (1.0.0 → 2.0.0)
  <version>     Specific version (e.g., 1.2.3)

${c.cyan}Options:${c.reset}
  --dry-run     Show what would happen without making changes
  --no-push     Create release locally without pushing to remote
  --help        Show this help message

${c.cyan}Examples:${c.reset}
  node scripts/release.js patch
  node scripts/release.js minor --dry-run
  node scripts/release.js 2.0.0 --no-push
`)
    process.exit(0)
  }

  const versionArg = filteredArgs[0]
  const currentVersion = getCurrentVersion()
  const newVersion = ['patch', 'minor', 'major'].includes(versionArg)
    ? bumpVersion(currentVersion, versionArg)
    : versionArg

  if (!isValidVersion(newVersion)) {
    log(`\n❌ Invalid version: ${newVersion}`, 'red')
    process.exit(1)
  }

  // Header
  console.log('')
  log('╔════════════════════════════════════════════════════╗', 'cyan')
  log('║         BookLibrio Release Script                  ║', 'cyan')
  log('╚════════════════════════════════════════════════════╝', 'cyan')
  console.log('')

  if (dryRun) {
    log('🔍 DRY RUN MODE - No changes will be made\n', 'yellow')
  }

  // Show release info
  log(`📦 Release Info:`, 'cyan')
  log(`   Current version: ${c.dim}${currentVersion}${c.reset}`)
  log(`   New version:     ${c.green}${newVersion}${c.reset}`)
  log(`   Branch:          ${c.dim}${getCurrentBranch()}${c.reset}`)
  log(`   Push to remote:  ${noPush ? c.yellow + 'No' : c.green + 'Yes'}${c.reset}`)
  console.log('')

  // Pre-flight checks
  log('🔍 Pre-flight checks...', 'cyan')

  // Check for uncommitted changes (warning only)
  if (hasUncommittedChanges()) {
    log('   ⚠️  You have uncommitted changes', 'yellow')
    const uncommittedOk = await confirm('   Continue anyway?')
    if (!uncommittedOk) {
      log('\n❌ Release cancelled', 'red')
      process.exit(1)
    }
  } else {
    log('   ✓ Working directory clean', 'green')
  }

  // Check branch
  const branch = getCurrentBranch()
  if (branch !== 'main' && branch !== 'master') {
    log(`   ⚠️  You are on branch '${branch}', not main/master`, 'yellow')
  } else {
    log(`   ✓ On ${branch} branch`, 'green')
  }

  console.log('')

  // Confirm release
  if (!dryRun) {
    const confirmed = await confirm(`🚀 Release v${newVersion}?`)
    if (!confirmed) {
      log('\n❌ Release cancelled', 'red')
      process.exit(1)
    }
  }

  console.log('')

  // Step 1: Bump version
  log('📝 Step 1: Bumping version...', 'cyan')
  if (dryRun) {
    exec(`node scripts/bump-version.js ${newVersion}`, { dryRun: true })
  } else {
    exec(`node scripts/bump-version.js ${newVersion}`)
  }

  // Step 2: Git add
  log('\n📝 Step 2: Staging changes...', 'cyan')
  exec('git add -A', { dryRun })

  // Step 3: Git commit
  log('\n📝 Step 3: Creating commit...', 'cyan')
  const commitMsg = `chore: release v${newVersion}`
  exec(`git commit -m "${commitMsg}"`, { dryRun })

  // Step 4: Create tag
  log('\n📝 Step 4: Creating tag...', 'cyan')
  exec(`git tag v${newVersion}`, { dryRun })

  // Step 5: Push (if not --no-push)
  if (!noPush) {
    log('\n📝 Step 5: Pushing to remote...', 'cyan')
    exec('git push', { dryRun })
    exec('git push --tags', { dryRun })
  } else {
    log('\n📝 Step 5: Skipped push (--no-push)', 'yellow')
  }

  // Success
  console.log('')
  log('╔════════════════════════════════════════════════════╗', 'green')
  log(`║  ✅ Successfully released v${newVersion.padEnd(26)}║`, 'green')
  log('╚════════════════════════════════════════════════════╝', 'green')
  console.log('')

  // Next steps
  log('📋 Next steps:', 'cyan')
  if (noPush) {
    log(`   1. Review changes: git log --oneline -5`, 'dim')
    log(`   2. Push when ready: git push && git push --tags`, 'dim')
  } else {
    log(`   1. Verify on GitHub: https://github.com/your-repo/releases`, 'dim')
    log(`   2. Deploy API: cd packages/api && fly deploy`, 'dim')
    log(`   3. Rebuild iOS in Xcode`, 'dim')
  }

  // Sentry info
  console.log('')
  log('🔍 Sentry releases created:', 'cyan')
  log(`   • booklibrio-api@${newVersion}`, 'dim')
  log(`   • booklibrio-ios@${newVersion}+{build}`, 'dim')
  log(`   • booklibrio-android@${newVersion}+{versionCode}`, 'dim')
  log(`   • booklibrio-web@${newVersion}`, 'dim')
  log(`   • booklibrio-mobile@${newVersion}+{build}`, 'dim')

  console.log('')
}

main().catch((error) => {
  log(`\n❌ Release failed: ${error.message}`, 'red')
  process.exit(1)
})
