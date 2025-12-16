#!/usr/bin/env node

/**
 * BookLibrio Full-Stack Version Management Tool
 *
 * Syncs version numbers across all platforms:
 * - Root package.json
 * - packages/api/package.json
 * - packages/web/package.json
 * - packages/shared/package.json
 * - packages/mobile/package.json
 * - packages/mobile/app.json
 * - packages/ios/BookLibrio.xcodeproj/project.pbxproj
 * - packages/android/app/build.gradle.kts
 * - version.json
 *
 * Usage:
 *   node scripts/bump-version.js patch   # 1.0.0 → 1.0.1
 *   node scripts/bump-version.js minor   # 1.0.0 → 1.1.0
 *   node scripts/bump-version.js major   # 1.0.0 → 2.0.0
 *   node scripts/bump-version.js 1.2.3   # Set specific version
 *   node scripts/bump-version.js --check # Check version consistency
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Helper functions
function safeReadFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  try {
    return fs.readFileSync(fullPath, 'utf-8')
  } catch {
    return null
  }
}

function safeWriteFile(relativePath, content) {
  const fullPath = path.join(ROOT, relativePath)
  try {
    fs.writeFileSync(fullPath, content, 'utf-8')
    return true
  } catch (error) {
    log(`  Failed to write ${relativePath}: ${error}`, 'red')
    return false
  }
}

function updatePackageJson(content, version) {
  const json = JSON.parse(content)
  json.version = version
  return JSON.stringify(json, null, 2) + '\n'
}

function extractPackageJsonVersion(content) {
  try {
    return JSON.parse(content).version
  } catch {
    return null
  }
}

// Version file definitions
const versionFiles = [
  // version.json (source of truth)
  {
    path: 'version.json',
    update: (content, version, buildNumber) => {
      const [major, minor, patch] = version.split('.').map(Number)
      const versionCode = major * 10000 + minor * 100 + patch
      let json = {}
      try { json = JSON.parse(content) } catch {}
      return JSON.stringify(
        {
          ...json,
          version,
          buildNumber,
          releaseDate: new Date().toISOString().split('T')[0],
          platforms: {
            ios: { marketingVersion: version, buildNumber },
            android: { versionName: version, versionCode },
            api: version,
            web: version,
            mobile: version,
          },
        },
        null,
        2
      ) + '\n'
    },
    extract: (content) => {
      try { return JSON.parse(content).version } catch { return null }
    },
  },

  // Root package.json
  {
    path: 'package.json',
    update: (content, version) => updatePackageJson(content, version),
    extract: (content) => extractPackageJsonVersion(content),
  },

  // API package.json
  {
    path: 'packages/api/package.json',
    update: (content, version) => updatePackageJson(content, version),
    extract: (content) => extractPackageJsonVersion(content),
  },

  // Web package.json
  {
    path: 'packages/web/package.json',
    update: (content, version) => updatePackageJson(content, version),
    extract: (content) => extractPackageJsonVersion(content),
  },

  // Shared package.json
  {
    path: 'packages/shared/package.json',
    update: (content, version) => updatePackageJson(content, version),
    extract: (content) => extractPackageJsonVersion(content),
  },

  // Mobile package.json
  {
    path: 'packages/mobile/package.json',
    update: (content, version) => updatePackageJson(content, version),
    extract: (content) => extractPackageJsonVersion(content),
  },

  // Mobile app.json (Expo)
  {
    path: 'packages/mobile/app.json',
    update: (content, version, buildNumber) => {
      const json = JSON.parse(content)
      json.expo = json.expo || {}
      json.expo.version = version
      // Also update iOS and Android build numbers
      if (json.expo.ios) {
        json.expo.ios.buildNumber = String(buildNumber)
      }
      if (json.expo.android) {
        const [major, minor, patch] = version.split('.').map(Number)
        json.expo.android.versionCode = major * 10000 + minor * 100 + patch
      }
      return JSON.stringify(json, null, 2) + '\n'
    },
    extract: (content) => {
      try {
        const json = JSON.parse(content)
        return json.expo?.version || json.version
      } catch { return null }
    },
  },

  // iOS Xcode project
  {
    path: 'packages/ios/BookLibrio.xcodeproj/project.pbxproj',
    update: (content, version, buildNumber) => {
      return content
        .replace(/MARKETING_VERSION = [\d.]+;/g, `MARKETING_VERSION = ${version};`)
        .replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`)
    },
    extract: (content) => {
      const match = content.match(/MARKETING_VERSION = ([\d.]+);/)
      return match ? match[1] : null
    },
  },

  // Android build.gradle.kts
  {
    path: 'packages/android/app/build.gradle.kts',
    update: (content, version) => {
      const [major, minor, patch] = version.split('.').map(Number)
      const versionCode = major * 10000 + minor * 100 + patch
      return content
        .replace(/versionCode = \d+/, `versionCode = ${versionCode}`)
        .replace(/versionName = "[^"]+"/, `versionName = "${version}"`)
    },
    extract: (content) => {
      const match = content.match(/versionName = "([^"]+)"/)
      return match ? match[1] : null
    },
  },
]

function getCurrentVersion() {
  const versionJsonContent = safeReadFile('version.json')
  if (versionJsonContent) {
    try {
      const json = JSON.parse(versionJsonContent)
      return {
        version: json.version || '1.0.0',
        buildNumber: json.buildNumber || 1,
      }
    } catch {}
  }
  return { version: '1.0.0', buildNumber: 1 }
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number)

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      return current
  }
}

function isValidVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(version)
}

// Commands
function checkVersions() {
  log('\n📋 Checking version consistency across all platforms...\n', 'cyan')

  const versions = []

  for (const file of versionFiles) {
    const content = safeReadFile(file.path)
    if (content) {
      const version = file.extract(content)
      versions.push({ file: file.path, version })
      const status = version ? `v${version}` : 'N/A'
      const color = version ? 'green' : 'yellow'
      log(`  ${file.path}: ${status}`, color)
    } else {
      versions.push({ file: file.path, version: null })
      log(`  ${file.path}: ${colors.dim}(file not found)${colors.reset}`, 'yellow')
    }
  }

  // Check consistency
  const validVersions = versions.filter((v) => v.version !== null)
  const uniqueVersions = [...new Set(validVersions.map((v) => v.version))]

  console.log('')

  if (uniqueVersions.length === 0) {
    log('⚠️  No version files found!', 'yellow')
    return false
  } else if (uniqueVersions.length === 1) {
    log(`✅ All platforms are consistent at v${uniqueVersions[0]}`, 'green')
    return true
  } else {
    log(`❌ Version mismatch detected!`, 'red')
    log(`   Found versions: ${uniqueVersions.join(', ')}`, 'red')
    return false
  }
}

function updateAllVersions(newVersion, incrementBuild = true) {
  const current = getCurrentVersion()
  const newBuildNumber = incrementBuild ? current.buildNumber + 1 : current.buildNumber

  log(`\n🚀 Updating version: ${current.version} → ${newVersion}`, 'cyan')
  log(`   Build number: ${current.buildNumber} → ${newBuildNumber}\n`, 'dim')

  let success = true

  for (const file of versionFiles) {
    const content = safeReadFile(file.path)
    if (content) {
      const updated = file.update(content, newVersion, newBuildNumber)
      if (safeWriteFile(file.path, updated)) {
        log(`  ✓ ${file.path}`, 'green')
      } else {
        success = false
      }
    } else {
      log(`  - ${file.path} ${colors.dim}(skipped, file not found)${colors.reset}`, 'yellow')
    }
  }

  console.log('')

  if (success) {
    log(`✅ Successfully updated to v${newVersion} (build ${newBuildNumber})`, 'green')
    log(`\n📝 Next steps:`, 'cyan')
    log(`   git add -A`, 'dim')
    log(`   git commit -m "chore: release v${newVersion}"`, 'dim')
    log(`   git tag v${newVersion}`, 'dim')
    log(`   git push && git push --tags`, 'dim')
  } else {
    log('❌ Some files failed to update', 'red')
  }

  return success
}

// Main
function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
BookLibrio Version Management Tool

Usage:
  node scripts/bump-version.js <command>

Commands:
  patch         Bump patch version (1.0.0 → 1.0.1)
  minor         Bump minor version (1.0.0 → 1.1.0)
  major         Bump major version (1.0.0 → 2.0.0)
  <version>     Set specific version (e.g., 1.2.3)
  --check       Check version consistency across platforms
  --help        Show this help message

Examples:
  node scripts/bump-version.js patch
  node scripts/bump-version.js 2.0.0
  node scripts/bump-version.js --check
`)
    process.exit(0)
  }

  const command = args[0]

  if (command === '--check' || command === '-c') {
    const consistent = checkVersions()
    process.exit(consistent ? 0 : 1)
  }

  const current = getCurrentVersion()

  let newVersion

  if (command === 'patch' || command === 'minor' || command === 'major') {
    newVersion = bumpVersion(current.version, command)
  } else if (isValidVersion(command)) {
    newVersion = command
  } else {
    log(`❌ Invalid command or version: ${command}`, 'red')
    log('   Use --help for usage information', 'dim')
    process.exit(1)
  }

  const success = updateAllVersions(newVersion)
  process.exit(success ? 0 : 1)
}

main()
