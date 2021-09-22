import { createPouchDbState } from '../src';

it('should do stuff', function () {
	const s = createPouchDbState('my-db', 'hihi', {});
	console.log(s);
}); 