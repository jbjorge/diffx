# @diffx/core <!-- replaceLine:Diffx -->

### Watch state for changes <!-- replaceSection:Watch state for changes -->
```javascript
const unwatchFunc = watchState(() => state.meat, {
    onChanged: (meatCount) => {
        console.log(meatCount); // --> 1
    }
})
```