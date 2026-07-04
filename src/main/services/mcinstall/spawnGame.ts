import { ChildProcess, spawn, SpawnOptionsWithoutStdio } from 'child_process'

/**
 * Thin wrapper around child_process.spawn — @xmcl/core's launch() ultimately did
 * exactly this (generateArguments() + spawn()). launchService.ts's downstream
 * handling only depends on the standard Node ChildProcess contract, which spawn()
 * already provides natively, so no adapter/shim is needed here.
 */
export function spawnGame(
  javaPath: string,
  args: string[],
  gameDir: string,
  options: Omit<SpawnOptionsWithoutStdio, 'cwd'> = {},
): ChildProcess {
  return spawn(javaPath, args, { cwd: gameDir, ...options })
}
