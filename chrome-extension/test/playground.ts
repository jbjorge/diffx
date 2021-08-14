import './setup';
import { createState, setState } from '../../core';

interface PriceArea {
	id: string;
	name: string;
	country: string;
}

const priceAreaState = createState('priceArea', {
	isLoading: false,
	priceAreas: [] as PriceArea[],
	errorMessage: ''
});

console.log(priceAreaState.isLoading);

function getPriceAreas() {
	return Promise.resolve([{ id: 'hei', country: 'NO', name: 'mitt price area' }] as PriceArea[]);
}

setState(
	'last inn priceAreas',
	() => {
		priceAreaState.isLoading = true;
		return getPriceAreas();
	},
	priceAreas => {
		priceAreaState.isLoading = false;
		priceAreaState.priceAreas = priceAreas;
	}
)

setState('hihihi', () => {});
