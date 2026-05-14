import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import type {
  AuthStartLoginResponse,
  AuthSubmitCookiesResponse,
  AuthSubmitUserInputResponse,
  AuthWaitForStepResponse,
} from '@beeper/desktop-api/resources/matrix/bridges/auth.js'
import type BeeperDesktop from '@beeper/desktop-api'

export type BridgeLoginStep =
  | AuthStartLoginResponse
  | AuthSubmitCookiesResponse
  | AuthSubmitUserInputResponse
  | AuthWaitForStepResponse

type CommonStep = {
  instructions?: string
  login_id?: string
  step_id?: string
  type: string
}

export function printBridgeLoginStep(step: BridgeLoginStep): void {
  const common = step as CommonStep
  process.stdout.write(`step: ${common.type}\n`)
  if (common.instructions) process.stdout.write(`${common.instructions}\n`)
  if (common.login_id) process.stdout.write(`login_id: ${common.login_id}\n`)
  if (common.step_id) process.stdout.write(`step_id: ${common.step_id}\n`)

  if ('display_and_wait' in step) {
    const display = step.display_and_wait
    process.stdout.write(`display: ${display.type}\n`)
    if (display.data) process.stdout.write(`${display.data}\n`)
    if (display.image_url) process.stdout.write(`image: ${display.image_url}\n`)
  } else if ('user_input' in step) {
    for (const field of step.user_input.fields) {
      const details = [field.type, field.description, field.options?.length ? `options: ${field.options.join(', ')}` : undefined]
        .filter(Boolean)
        .join(' | ')
      process.stdout.write(`field ${field.id}: ${field.name}${details ? ` (${details})` : ''}\n`)
    }
  } else if ('cookies' in step) {
    process.stdout.write(`url: ${step.cookies.url}\n`)
    if (step.cookies.user_agent) process.stdout.write(`user_agent: ${step.cookies.user_agent}\n`)
    if (step.cookies.wait_for_url_pattern) process.stdout.write(`wait_for_url_pattern: ${step.cookies.wait_for_url_pattern}\n`)
    for (const field of step.cookies.fields) process.stdout.write(`cookie field ${field.name}: ${field.type}\n`)
    if (step.cookies.extract_js) process.stdout.write(`extract_js:\n${step.cookies.extract_js}\n`)
  } else if ('complete' in step) {
    process.stdout.write(`complete: ${step.complete.user_login_id ?? 'yes'}\n`)
  }
}

export async function runGuidedBridgeLogin(client: BeeperDesktop, bridgeID: string, initialStep: BridgeLoginStep): Promise<BridgeLoginStep> {
  let step = initialStep
  for (;;) {
    printBridgeLoginStep(step)
    if ('complete' in step) return step

    const loginProcessID = (step as CommonStep).login_id
    const stepID = (step as CommonStep).step_id
    if (!loginProcessID || !stepID) throw new Error('Bridge login step did not include login_id and step_id.')

    if ('display_and_wait' in step) {
      await promptText('Press Enter after completing this step in the browser/app.')
      step = await client.matrix.bridges.auth.waitForStep(stepID, { bridgeID, loginProcessID })
      continue
    }

    if ('user_input' in step) {
      const body: Record<string, string> = {}
      for (const field of step.user_input.fields) {
        const fallback = field.default_value ? ` [${field.default_value}]` : ''
        const value = await promptText(`${field.name}${fallback}: `)
        body[field.id] = value || field.default_value || ''
      }
      step = await client.matrix.bridges.auth.submitUserInput(stepID, { bridgeID, loginProcessID, body })
      continue
    }

    if ('cookies' in step) {
      const body: Record<string, string> = {}
      for (const field of step.cookies.fields) body[field.name] = await promptText(`${field.name}: `)
      step = await client.matrix.bridges.auth.submitCookies(stepID, { bridgeID, loginProcessID, body })
      continue
    }

    throw new Error(`Unsupported bridge login step: ${(step as CommonStep).type}`)
  }
}

async function promptText(label: string): Promise<string> {
  const rl = createInterface({ input, output })
  try {
    return (await rl.question(label)).trim()
  } finally {
    rl.close()
  }
}
