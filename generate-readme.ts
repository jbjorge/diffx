import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const sectionRegex = /^(#+)\s([^<!--]+)(?:<!--\s(\w+)(?::(.+))?\s-->)?/;

const readmePath = './README.md';
const toBeMerged = process.argv.slice(2);
if (!toBeMerged?.length) {
	throw new Error('No files to merge specified.');
}

const readmeLines = toBeMerged
	.reduce((fileContents, filename) => {
		return fileContents + readFileSync(filename, { encoding: 'utf-8' });
	}, '')
	.split('\n');

let currentPath = process.cwd().split('/');
const currentDir = currentPath[currentPath.length - 1];

const readmeBaseLines = readFileSync('../README.md', { encoding: 'utf-8' }).split('\n');
const overrides = getReadmeMap(readmeLines);
const generated = '<!-- autogenerated by generate-readme.ts, do not edit -->\n' + mergeReadmes(readmeBaseLines, readmeLines, overrides)
	.replace(/'@diffx\/core'/g, `'@diffx/${currentDir}'`);
writeFileSync(join(process.cwd(), 'README.md'), generated, {encoding: 'utf-8'});

function mergeReadmes(baseLines: string[], overrideLines: string[], overrides: MapEntry[]) {
	if (!overrides?.length) {
		return baseLines.join('\n');
	}
	const baseMap = getReadmeMap(baseLines);
	const change = overrides[0];

	if (change?.action === 'replaceLine') {
		const baseEntry = baseMap.find(x => x.section === change.target && x.level === change.level);
		if (!baseEntry) {
			throw new Error(`Unable to find section ${change.section}`);
		}
		baseLines = baseLines
			.slice(0, baseEntry.start - 1)
			.concat(overrideLines[change.start - 1])
			.concat(baseLines.slice(baseEntry.start))
	}
	if (change?.action === 'removeSection') {
		const baseEntry = baseMap.find(x => x.section === change.section && x.level === change.level);
		if (!baseEntry) {
			throw new Error(`Unable to find section ${change.section}`);
		}
		baseLines = baseLines
			.slice(0, baseEntry.start - 1)
			.concat(baseLines.slice(baseEntry.stop))
	}
	if (change?.action === 'replaceSection') {
		const baseEntry = baseMap.find(x => x.section === change.section && x.level === change.level);
		if (!baseEntry) {
			throw new Error(`Unable to find section ${change.section}`);
		}
		baseLines = baseLines
			.slice(0, baseEntry.start - 1)
			.concat(overrideLines.slice(change.start - 1, change.stop))
			.concat(baseLines.slice(baseEntry.stop))
	}
	if (change?.action === 'append') {
		const baseEntry = baseMap.find(x => x.section === change.target);
		if (!baseEntry) {
			throw new Error(`Unable to find section ${change.target}`);
		}
		baseLines = baseLines
			.slice(0, baseEntry.stop)
			.concat(overrideLines.slice(change.start - 1, change.stop).concat(''))
			.concat(baseLines.slice(baseEntry.stop))
	}
	if (change?.action === 'prependSection') {
		const baseEntry = baseMap.find(x => x.section === change.target);
		if (!baseEntry) {
			throw new Error(`Unable to find section ${change.target}`);
		}

		baseLines = baseLines
			.slice(0, baseEntry.start - 2)
			.concat(overrideLines.slice(change.start - 1, change.stop).concat(''))
			.concat(baseLines.slice(baseEntry.start - 1))
	}

	return mergeReadmes(baseLines, overrideLines, overrides.slice(1));
}

interface MapEntry {
	match: string;
	level: number;
	section: string;
	action: 'replaceLine' | 'replaceSection' | 'append' | 'removeSection' | 'prependSection' | undefined;
	target: string;
	start: number;
	stop: number;
}

interface ReadmeMap {
	[level: string]: MapEntry[]
}

function getReadmeMap(readmeLines: string[]): MapEntry[] {
	const sMap = {} as ReadmeMap;
	readmeLines
		.forEach((line, lineNumber, lines) => {
			const matches = line.match(sectionRegex);
			if (matches) {
				const match = matches[0];
				const level = matches[1].length;
				const section = matches[2].trim();
				const action = matches[3]?.trim();
				const target = matches[4]?.trim();

				// close open counters
				sMap[level] = (sMap[level] || []).map(x => {
					return (x.stop == null) ? { ...x, stop: lineNumber } : x;
				})

				// add the new entry
				sMap[level] = sMap[level].concat({
					match,
					level,
					section,
					action,
					target,
					start: lineNumber + 1
				} as MapEntry);
			}
		})

// close all open counters
	for (const level in sMap) {
		sMap[level] = sMap[level].map(x => {
			return (x.stop == null) ? { ...x, stop: readmeLines.length - 1 } : x;
		})
	}
	return Object.keys(sMap).reduce((flattened, level) => {
		return flattened.concat(sMap[level]);
	}, []);
}
