import './setup';
import { createState, setState, watchState } from '@diffx/core';

interface Order {
	id: string,
	price: number,
	quantity: number,
}

interface Trade {
	order1: Order,
	order2: Order
}

const ordersState = createState('orders', { orders: [] as Order[] })
const tradesState = createState('trades', { trades: [] as Trade[] })
const tradesCounter = createState('trades counter', { count: 0 });
const errorCount = createState('async error counter', { count: 0 })

watchState(
	() => ordersState.orders.length % 2 == 0,
	isMatch => {
		if (!isMatch) {
			return;
		}
		addTrade(ordersState.orders.slice(-2));
	}
)

for (let i = 0; i < 10; i++) {
	setState('add order', () => {
		ordersState.orders.push({ id: i.toString(), price: i * 2, quantity: i * 3 });
		if (ordersState.orders.length % 3 == 0) {
			setState(
				'doing something async',
				() => {
					return Math.random() > 0.5 ? Promise.resolve() : Promise.reject()
				},
				() => tradesCounter.count = tradesCounter.count * 2,
				() => errorCount.count++
			)
		}
	})
}

setInterval(() => {
	setState(`incrementing counter to ${tradesCounter.count + 1}`, () => {
		tradesCounter.count++;
	})
}, 1000);

function addTrade(orders: Order[]) {
	setState('add trade', () => {
		tradesState.trades.push({
			order1: orders[0],
			order2: orders[1]
		})
		if (tradesState.trades.length % 2 == 0) {
			tradesCounter.count++;
		}
		if (ordersState.orders.length % 3 == 0) {
			setState(
				'doing something async',
				() => {
					return Math.random() > 0.5 ? Promise.resolve() : Promise.reject()
				},
				() => tradesCounter.count = tradesCounter.count * 2,
				() => errorCount.count++
			)
		}
	})
}