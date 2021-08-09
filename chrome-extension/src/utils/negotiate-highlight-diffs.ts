import { DiffEntry } from "@diffx/core/dist/internals";
import jsonClone from './jsonClone';
import { DecoratedDiffEntryType } from './decorated-diff-entry-type';

export function negotiateHighlightDiffs(diffs: DiffEntry[], ids: string[]): DecoratedDiffEntryType[] {
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