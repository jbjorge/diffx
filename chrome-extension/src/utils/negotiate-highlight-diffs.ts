import { DiffEntry } from "@diffx/core/dist/internals";
import jsonClone from './jsonClone';

export function negotiateHighlightDiffs(diffs: DiffEntry[], ids: string[]) {
	return diffs
		.map(diff => {
			let diffCopy = jsonClone(diff);
			if (diffCopy.subDiffEntries) {
				diffCopy.subDiffEntries = negotiateHighlightDiffs(diffCopy.subDiffEntries, ids);
			}
			return {
				...diffCopy,
				isHighlightedByTrace: ids.includes(diff.id)
			};
		});
}