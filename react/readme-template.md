# @diffx/react <!-- replaceLine:Diffx -->

## Notice <!-- removeSection -->

### `useDiffx` <!-- append:`createState` -->

`useDiffx(getterFunc)` is a React hook that enables reading the state in Diffx.

* `getterFunc` - a function that returns state or a projection of state.

```javascript
import { counterState } from './store';
import { setState, useDiffx } from '@diffx/react';

export default function App() {
	const count = useDiffx(() => counterState.count);

	function incrementCounter() {
		setState('Incremented counter', () => {
			counterState.count++
		});
	}

	return (
		<div>
			<div>Current count: {count}</div>
			<button onClick={incrementCounter}>Increment</button>
		</div>
	);
}

```
