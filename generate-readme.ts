import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const insertionPointRegex = /^<!--\s#(.*)\s-->$/;
const insertionPointEndRegex = /^<!--\s(end)#?(:?.*)?\s-->$/;

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
const dirPackageJson = JSON.parse(readFileSync(join(currentDir, 'package.json'), {encoding: 'utf-8'}));

const baseTemplateLines = readFileSync('./readme-template.md', { encoding: 'utf-8' }).split('\n');
const overrideMap = getAnchorMap(overrideLines);
const generated = mergeReadmes(baseTemplateLines, { ...overrideMap })
	.join('\n')
	.replace(/'@diffx\/core'/g, `'@diffx/${currentDirName}'`)
	.replace(/<:pkg_version:>/g, dirPackageJson.version)
	.replace('npm install @diffx/core', `npm install @diffx/${currentDirName}`)
	.replace(/\.\/assets/g, '../assets')
	.replace(/<!--.*-->/g, '')
writeFileSync(join(process.cwd(), currentDir, 'README.md'), generated, {encoding: 'utf-8'});

function mergeReadmes(baseLines: string[], overrides: AnchorMap = {}) {
	const anchorId = Object.keys(overrides)[0];
	if (!anchorId) {
		return baseLines;
	}
	const baseTemplateMap = getAnchorMap(baseLines);
	const baseInfo = baseTemplateMap[anchorId];
	if (!baseInfo) {
		throw new Error(anchorId + ' does not exist in the base template');
	}
	baseLines = baseLines.slice(0, baseInfo.startIndex)
		.concat(overrides[anchorId].lines)
		.concat(baseLines.slice(baseInfo.endIndex + 1));
	delete overrides[anchorId];

	return mergeReadmes(baseLines, overrides);
}

interface AnchorMap {
	[anchor: string]: {
		startIndex: number;
		endIndex?: number;
		lines: string[];
	}
}

function getAnchorMap(readmeLines: string[]): AnchorMap {
	const anchors: AnchorMap = {};
	const openAnchors: string[] = [];
	readmeLines.forEach((line, lineNumber) => {
		const anchorMatch = line.match(insertionPointRegex);
		if (anchorMatch) {
			const anchorId = anchorMatch[1];
			if (openAnchors.includes(anchorId)) {
				throw new Error('Duplicate anchor id: ' + anchorId);
			}
			openAnchors.push(anchorId);
			anchors[anchorId] = {
				startIndex: lineNumber,
				lines: []
			};
			return;
		}
		const anchorEndMatch = line.match(insertionPointEndRegex);
		if (anchorEndMatch) {
			const anchorId = openAnchors.pop();
			if (!anchorId) {
				throw new Error('End tag with no start tag on line ' + lineNumber + 1);
			}
			anchors[anchorId].endIndex = lineNumber;
			return;
		}
		openAnchors.forEach(anchorId => {
			anchors[anchorId].lines.push(line);
		})
	})
	if (openAnchors.length) {
		throw new Error('Open anchors: ' + JSON.stringify(openAnchors));
	}
	return anchors;
}
