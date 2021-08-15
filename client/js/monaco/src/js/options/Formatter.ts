import * as monaco from 'monaco-editor';

const capitalPair = [
	['＝', '='],
	['（', '('],
	['）', ')'],
	['｛', '{'],
	['｝', '}'],
	['［', '['],
	['］', ']'],
	['＜', '<'],
	['＞', '>'],
	['＋', '+'],
	['＊', '*'],
	['＆', '&'],
	['　', ' '],
	['’', "'"],
	['”', '"'],
	['：', ':'],
	['、', ','],
	['。', '.'],
];

const stackTokens: { [key: string]: string } = {
	scopeStart: '[\\{｛]',
	scopeEnd: '[\\}｝]',
	bracketStart: '[\\(（]',
	bracketEnd: '[\\)）]',
	lineComment: '\\/\\/',
	newLine: '\n',
	blockCommentStart: '\\/\\*',
	blockCommentEnd: '\\*\\/',
	char: "[\\'’]",
	string: '[\\"”]',
	japaneseStart: '「',
	japaneseEnd: '」',
};
const stackTokenRegexp = new RegExp(`(${Object.values(stackTokens).join('|')})`, 'g');

monaco.languages.registerDocumentFormattingEditProvider('Laze', {
	provideDocumentFormattingEdits: (model) => {
		let result = model.getValue();

		let stacks = {
			lineComment: false,
			blockComment: false,
			char: false,
			string: false,
			japanese: false,
		};
		let stackList: { index: number; stack: string }[] = [];
		for (let match: RegExpExecArray | null = null; (match = stackTokenRegexp.exec(result)); ) {
			for (const stackToken of Object.keys(stackTokens)) {
				if (match![0].match(new RegExp(stackTokens[stackToken]))) {
					if (stackToken === 'lineComment' && !stacks.lineComment && !stacks.blockComment) {
						// ラインコメント開始
						stackList.push({
							index: match.index,
							stack: 'commentStart',
						});
						stacks.lineComment = true;
					} else if (stackToken === 'blockCommentStart' && !stacks.lineComment && !stacks.blockComment) {
						// ブロックコメント開始
						stackList.push({
							index: match.index,
							stack: 'commentStart',
						});
						stacks.blockComment = true;
					} else if (stackToken === 'newLine' && stacks.lineComment) {
						// ラインコメント終了
						stackList.push({
							index: match.index,
							stack: 'commentEnd',
						});
						stacks.lineComment = false;
					} else if (stackToken === 'blockCommentEnd' && stacks.blockComment) {
						// ブロックコメント終了
						stackList.push({
							index: match.index,
							stack: 'commentEnd',
						});
						stacks.blockComment = false;
					} else if (stacks.lineComment || stacks.blockComment) {
					} else if (stackToken === 'string' && !stacks.string && !stacks.japanese && !stacks.char) {
						// ""文字列開始
						stackList.push({
							index: match.index,
							stack: 'stringStart',
						});
						stacks.string = true;
					} else if (stackToken === 'string' && stacks.string) {
						// ""文字列終了
						stackList.push({
							index: match.index,
							stack: 'stringEnd',
						});
						stacks.string = false;
					} else if (stackToken === 'char' && !stacks.string && !stacks.japanese && !stacks.char) {
						// ''文字開始
						stackList.push({
							index: match.index,
							stack: 'charStart',
						});
						stacks.char = true;
					} else if (stackToken === 'char' && stacks.char) {
						// ''文字終了
						stackList.push({
							index: match.index,
							stack: 'charEnd',
						});
						stacks.char = false;
					} else if (stackToken === 'newLine' && stacks.char) {
						// ''文字終了 (閉じられていない)
						stackList.push({
							index: match.index,
							stack: 'charEnd',
						});
						stacks.char = false;
					} else if (stackToken === 'japaneseStart' && !stacks.string && !stacks.japanese && !stacks.char) {
						// 「」文字列開始
						stackList.push({
							index: match.index,
							stack: 'stringStart',
						});
						stacks.japanese = true;
					} else if (stackToken === 'japaneseEnd' && stacks.japanese) {
						// 「」文字列終了
						stackList.push({
							index: match.index,
							stack: 'stringEnd',
						});
						stacks.japanese = false;
					} else if (stacks.string || stacks.char || stacks.japanese) {
					} else if (stackToken === 'scopeStart') {
						stackList.push({
							index: match.index,
							stack: 'scopeStart',
						});
					} else if (stackToken === 'scopeEnd') {
						stackList.push({
							index: match.index,
							stack: 'scopeEnd',
						});
					} else if (stackToken === 'bracketStart') {
						stackList.push({
							index: match.index,
							stack: 'bracketStart',
						});
					} else if (stackToken === 'bracketEnd') {
						stackList.push({
							index: match.index,
							stack: 'bracketEnd',
						});
					}
				}
			}
		}

		console.log(stackList);

		return [
			{
				text: result,
				range: model.getFullModelRange(),
			},
		];
	},
});
