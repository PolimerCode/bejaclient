import type { Platform, Rule } from './types'

function osMatches(ruleOs: Rule['os'], platform: Platform): boolean {
  if (!ruleOs) return true
  if (ruleOs.name && ruleOs.name !== platform.name) return false
  if (ruleOs.arch && ruleOs.arch !== platform.arch) return false
  if (ruleOs.version && !new RegExp(ruleOs.version).test(platform.version)) return false
  return true
}

function featuresMatch(ruleFeatures: Rule['features'], features: Record<string, boolean>): boolean {
  if (!ruleFeatures) return true
  return Object.entries(ruleFeatures).every(([key, expected]) => Boolean(features[key]) === expected)
}

/**
 * Evaluates a Mojang version-JSON rule list. No rules => allowed. Otherwise the
 * LAST matching rule's action wins (not "any disallow wins") — some libraries ship
 * a base allow-all rule followed by a narrower disallow for one OS/arch.
 */
export function checkRules(
  rules: Rule[] | undefined,
  platform: Platform,
  features: Record<string, boolean> = {},
): boolean {
  if (!rules || rules.length === 0) return true
  let allowed = false
  for (const rule of rules) {
    if (!osMatches(rule.os, platform) || !featuresMatch(rule.features, features)) continue
    allowed = rule.action === 'allow'
  }
  return allowed
}
