<!-- #header -->

# @diffx/svelte

<!-- end -->

<!-- #setState().append -->

### Read state

#### Directly

When rendering state from the store as is (without any projections), it can be accessed directly:

```html
<script>
    import { setState } from '@diffx/core';
    import { clickCounter } from './createState-example';

    export function increment() {
        setState('increment', () => clickCounter.count++);
    }
</script>

<main>
    <button on:click={increment}>Increment counter to {clickCounter.count + 1}</button>
    <div>Current count: {clickCounter.count}</div>
</main>
```

#### Projected

`useDiffx(getterFunc)` returns a readonly value that will be kept updated.

* `getterFunc` - a function that returns state or a projection of state.

```html
<script>
    import { setState, useDiffx } from '@diffx/svelte';
    import { clickCounter } from './createState-example';

    export const isDivisibleByThree = useDiffx(() => clickCounter.count % 3 === 0);

    export function increment() {
        setState('increment', () => clickCounter.count++);
    }
</script>

<main>
    <button on:click={increment}>Increment counter to {clickCounter.count + 1}</button>
    <div>Current count: {clickCounter.count}</div>
    <div>Is divisible by three: {$isDivisibleByThree}</div>
</main>
```

<details>
  <summary><strong>Configuring useDiffx()</strong></summary>

`useDiffx(getterFunc, options)` returns a readonly value that will be kept updated.

* `getterFunc` - a function that returns state or a projection of state.
* `options` - an options object describing how the state should be watched

```javascript
const count = useDiffx(() => clickCounter.count, {
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
    hasChangedComparer: (newValue, oldValue) => true / false
});
```

</details>

<!-- end -->