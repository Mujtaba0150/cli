import assert from 'node:assert/strict'
import { Config } from '@oclif/core/config'
import { versionIsGreaterThan } from '../dist/lib/cloudflared.js'

const config = await Config.load({ root: new URL('..', import.meta.url).pathname })
const commandIDs = [...config.commands].map(command => command.id)

assert.deepEqual(commandIDs, ['targets:tunnel'])
assert.equal(versionIsGreaterThan('2024.8.2', '2024.8.1'), true)
assert.equal(versionIsGreaterThan('2024.8.2', '2024.8.2'), false)
assert.equal(versionIsGreaterThan('2024.8.2', '2024.9.0'), false)
