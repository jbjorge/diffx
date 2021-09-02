<!-- #header -->
# @diffx/react
<!-- end -->

<!-- #setState().append -->

### useDiffx() react hook

`useDiffx(getterFunc)` is a React hook that enables reading the state in Diffx and re-rendering when it changes.

* `getterFunc` - a function that returns state or a projection of state.

```jsx
import { setState, useDiffx } from '@diffx/react';
import { clickCounter } from './createState-example';

export default function App() {
    const count = useDiffx(() => counterState.count);

    function incrementCounter() {
        setState('Increment counter', () => counterState.count++);
    }

    return (
        <div>
            <div>Current click count: {count}</div>
            <button onClick={incrementCounter}>Increment to {count + 1}</button>
        </div>
    );
}

```

<details>
  <summary><strong>Configuring useDiffx()</strong></summary>

`useDiffx(getterFunc, options)` can be provided a second `options` argument to configure the watching.

* `getterFunc` - a function that returns state or a projection of state.
* `options` - an options object describing how the state should be watched

```javascript
const count = useDiffx(() => counterState.count, {
    /**
     * Whether to start with emitting the current value of the getter.
     *
     * Default: `true`
     */
    emitInitialValue: true,
    /**
     * Whether to emit each change to the state during .setState (eachValueUpdate),
     * the current state after each .setState and .setState nested within it (eachSetState),
     * or to only emit the final state after the outer .setState function has finished running (setStateDone).
     *
     * This can be used to optimize rendering if there e.g. is a need to render every value as it updates in Diffx.
     *
     * Default: `setStateDone`
     */
    emitOn: 'eachSetState' | 'setStateDone' | 'eachValueUpdate',
    /**
     * Custom comparer function to decide if the state has changed.
     * Receives newValue and oldValue as arguments and should return `true` for changed
     * and `false` for no change.
     */
    hasChangedComparer: (newValue, oldValue) => 'true / false'
});
```

</details>
<!-- end -->