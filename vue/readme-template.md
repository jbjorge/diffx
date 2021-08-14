<!-- #header -->
# @diffx/vue
<!-- end -->

<!-- #watchState().prepend -->
> Diffx works natively with Vue, and the state can be considered (and used) as a readonly `reactive` object.
> This means that the state can be used directly in `<template>` and `computed()`.
>
> It also works well with Vue's `watch`/`watchEffect`, but `watchState` is preferred as explained in [watchState vs watch/watchEffect](#watchstate-vs-watch-watchEffect) below.

<!-- end -->

<!-- #watchState().details.prepend -->
<details id="watchstate-vs-watch-watchEffect">
    <summary><strong>watchState vs watch/watchEffect</strong></summary>

Diffx works well with regular `watch`/`watchEffect`, but there are a few advantages to using `watchState` instead:

1. If `watchState` runs `setState`, the origin of the trigger [will be tracked in devtools](#tracing-state-changed-in-watchstate)
2. Changes to the state can be watched with different levels of granularity (see *Controlling how state is watched* below).
</details>

<!-- end -->