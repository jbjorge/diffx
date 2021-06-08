# @diffx/react <!-- replaceLine:Diffx -->

## Notice <!-- removeSection -->

### `useDiffx` <!-- append:`createState` -->

`useDiffx(getterFunc)` is a React hook that enables reading the state in Diffx.

* `getterFunc` - a function that returns state or a projection of state.

```javascript
import { servings } from './the-above-example';
import { useDiffx } from '@diffx/react';

export default function App() {
    const dinnerServingsCount = useDiffx(() => servings.count);

    return (
        <div>
            <div>Current servings count: {dinnerServingsCount}</div>
        </div>
    );
}
```
