import { lockState, unlockState } from '../../src/internals/stateAccess';
import { setState } from '../../src';
import { pausedStateMessage } from '../../src/console-messages';
import { createTestContext, TestContext } from '../create-test-context';

let ctx = {} as TestContext;
beforeEach(() => {
	ctx = createTestContext()
});

test('.lockState() should disable changing the state with a message', () => {
	const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
	lockState();
	setState('1', () => ctx.state.a = 10);
	expect(consoleSpy.mock.calls).toEqual([[pausedStateMessage('1')]]);
	expect(ctx.state.a).not.toEqual(10);
	consoleSpy.mockRestore();
})

test('.unlockState() should enable changes to the state after .lockState()', () => {
	expect(() => unlockState()).not.toThrow();
	// lock and set some state
	const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
	lockState();
	setState('1', () => ctx.state.a = 10);
	expect(ctx.state.a).not.toEqual(10);

	unlockState();
	setState('2', () => ctx.state.a = 5);
	expect(ctx.state.a).toEqual(5);
	expect(consoleSpy.mock.calls).toEqual([[pausedStateMessage('1')]]);
	consoleSpy.mockRestore();
})

test.todo('pauseState');
test.todo('unpauseState');