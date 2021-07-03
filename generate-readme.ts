import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const sectionRegex = /^(#+)\s(.*)/;
const actionRegex = /<!--\s(\w+):(.+)\s-->/;
const actionEndRegex = /<!--\send\s-->/i;

const readmePath = './README.md';
const toBeMerged = process.argv.slice(2);
if (!toBeMerged?.length) {
	throw new Error('No files to merge specified.');
}

const overrideLines = toBeMerged
	.reduce((fileContents, filename) => {
		return fileContents + readFileSync(filename, { encoding: 'utf-8' });
	}, '')
	.split('\n');

let currentPath = toBeMerged[0].split('/').slice(0, -1);
const currentDir = currentPath.join('/');
const currentDirName = currentDir.match(/^\.\/(\w+)/)[1];

const baseTemplate = readFileSync('./readme-template.md', { encoding: 'utf-8' }).split('\n');
const overrideMap = getOverrideMap(overrideLines);
const generated = mergeReadmes(baseTemplate, overrideMap)
	.replace(/'@diffx\/core'/g, `'@diffx/${currentDirName}'`)
	.replace('npm install @diffx/core', `npm install @diffx/${currentDirName}`)
	.replace(/\.\/assets/g, '../assets')
	.replace(/<!--.*-->/g, '')
writeFileSync(join(process.cwd(), currentDir, 'README.md'), generated, {encoding: 'utf-8'});

function mergeReadmes(baseLines: string[], overrides: OverrideMap[]) {
	if (!overrides?.length) {
		return baseLines.join('\n');
	}
	const baseMap = getReadmeMap(baseLines);
	console.log(baseMap);
	console.log('-----------');
	const change = overrides[0];

	if (change?.action === 'replaceLine') {
		const baseEntry = baseMap.find(x => x.match === change.target);
		if (!baseEntry) {
			throw new Error(`replaceLine: Unable to find ${change.target}`);
		}
		baseLines = baseLines
			.slice(0, baseEntry.start)
			.concat(change.lines)
			.concat(baseLines.slice(baseEntry.start))
	}
	if (change?.action === 'removeSection') {
		const baseEntry = baseMap.find(x => x.match === change.target);
		if (!baseEntry) {
			throw new Error(`removeSection: Unable to find ${change.target}`);
		}
		baseLines = baseLines
			.slice(0, baseEntry.start)
			.concat(baseLines.slice(baseEntry.stop))
	}
	if (change?.action === 'replaceSection') {
		const baseEntry = baseMap.find(x => x.match === change.target);
		if (!baseEntry) {
			throw new Error(`replaceSection: Unable to find ${change.target}`);
		}
		baseLines = baseLines
			.slice(0, baseEntry.start)
			.concat(change.lines)
			.concat(baseLines.slice(baseEntry.stop))
	}
	if (change?.action === 'append') {
		const baseEntry = baseMap.find(x => x.match === change.target);
		if (!baseEntry) {
			throw new Error(`append: Unable to find ${change.target}`);
		}
		baseLines = baseLines
			.slice(0, baseEntry.stop)
			.concat(change.lines)
			.concat(baseLines.slice(baseEntry.stop))
	}
	if (change?.action === 'prependSection') {
		const baseEntry = baseMap.find(x => x.match === change.target);
		if (!baseEntry) {
			throw new Error(`prependSection: Unable to find ${change.target}`);
		}

		baseLines = baseLines
			.slice(0, baseEntry.start)
			.concat(change.lines)
			.concat(baseLines.slice(baseEntry.start))
	}
	if(change?.action === 'prepend') {
		const baseEntry = baseMap.find(x => x.match === change.target);
		if (!baseEntry) {
			throw new Error(`prepend: Unable to find ${change.target}`);
		}
		baseLines = baseLines
			.slice(0, baseEntry.start)
			.concat(change.lines)
			.concat(baseLines.slice(baseEntry.start))
	}

	return mergeReadmes(baseLines, overrides.slice(1));
}

interface OverrideMap {
	action: 'replaceLine' | 'replaceSection' | 'append' | 'prepend' | 'removeSection' | 'prependSection' | undefined;
	target: string;
	lines: string[];
}

function getOverrideMap(readmeLines: string[]): OverrideMap[] {
	const lineMap = [] as any;
	let currentIndex;
	readmeLines.forEach((line, lineNumber, lines) => {
		const isAction = line.match(actionRegex);
		const isActionEnd = line.match(actionEndRegex);
		if (isAction) {
			lineMap.push({
				action: isAction[1],
				target: isAction[2],
				lines: []
			});
			currentIndex = lineMap.length - 1;
		} else if (isActionEnd) {
			currentIndex = null;
		} else if (currentIndex != null) {
			lineMap[currentIndex].lines.push(line);
		} else {
			// spacing within the template, ignore
		}
	})
	return lineMap;
}

interface MapEntry {
	match: string;
	level: number;
	start: number;
	stop?: number;
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

				// close open counters
				sMap[level] = (sMap[level] || []).map(x => {
					return (x.stop == null) ? { ...x, stop: lineNumber } : x;
				})

				// add the new entry
				sMap[level] = sMap[level].concat({
					match,
					level,
					start: lineNumber
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
