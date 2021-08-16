const jaKeywordList = {
	keywords: {
		true: '真',
		false: '偽',
		function: '関数',
		class: 'クラス',
	},
	functions: {
		loadJS: 'js読み込み',
		sizeof: 'バイト数',
	},
	control: {
		end: '終了',
		if: 'もし',
		then: 'ならば',
		else: 'でなければ',
		from: 'から',
		until: 'まで',
		break: '抜ける',
		continue: '次へ',
		loop: '無限ループ',
		include: '#include',
		private: '非公開',
		public: '公開',
	},
	typeKeywords: {
		void: '無',
		boolean: '真偽',
		int32: '整数32',
		int64: '整数',
		double: '実数',
		char: '文字',
		string: '文字列',
	},
};

const tokens = (() => {
	let result: {
		[key: string]: string | string[] | undefined;
		colon: string;
		number: string;
		char: string;
		charnum: string;
		separators: string;
		operator: string;
		typeKeywords?: string[];
		keywords?: string[];
		functions?: string[];
		control?: string[];
	} = {
		colon: '[:：]',
		number: '[0-9]',
		char: '㐀-龯ぁ-んァ-ヶa-zA-Zー#＃_＿',
		charnum: '㐀-龯ぁ-んァ-ヶa-zA-Z0-9ー#＃_＿',
		separators: '~!@\\$%\\^&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\|;\\:\'\\",\\.\\<\\>/\\?＆＊（）＝＋［｛］｝：’”、。＞\\s\\t',
		operator: '＝|=|＋＝|＋=|\\+＝|\\+=|-＝|-=|＊＝|＊=|\\*＝|\\*=|/＝|/=|＞\\＞|\\>|＞＝|＞=|\\<＝|\\<=|＞＝|＞=|>＝|>=|＝＝|＝=|=＝|==|＆＆|＆&|&＆|&&|\\|\\||＋＋|＋\\+|\\+＋|\\+\\+|--',
	};
	Object.keys(jaKeywordList).forEach((key) => {
		// @ts-ignore
		result[key] = Object.values(jaKeywordList[key]);
	});
	return result;
})();

const tokenPatternDefine = {
	types: `((?:${tokens.typeKeywords!.join('|')})\\s*${tokens.colon}\\s*)`,
	name: `[${tokens.char}][${tokens.charnum}]*`,
	separator: `(?:[${tokens.separators}]|^)`,
};
const tokenPatterns = {
	function: new RegExp(`${tokenPatternDefine.types}?(${jaKeywordList.keywords.function}${tokens.colon})?(${tokenPatternDefine.name})(?=\\s*[\\(（])`, 'g'),
	class: new RegExp(`${jaKeywordList.keywords.class}${tokens.colon}(${tokenPatternDefine.name})`, 'g'),
	keyword: new RegExp(`[${tokens.char}][${tokens.charnum}]*`, 'g'),
	types: new RegExp(`(${tokens.typeKeywords!.join('|')})\\s*(?=${tokens.colon})`, 'g'),
	variable: new RegExp(
		`((?:[${tokens.separators.replace('\\:', '').replace('\\s', '')}]|^)\\s*(${tokenPatternDefine.name})(?=\\s+[^\\(\\{（｛\\s\\:]|[^${tokens.char}\\(\\{（｛\\s\\:]|\\s*$)|${
			tokenPatternDefine.separator
		}${tokenPatternDefine.types}(${tokenPatternDefine.name}))`,
		'g'
	),
	number: new RegExp(`${tokenPatternDefine.separator}((0b|0x)?${tokens.number}(?:${tokens.number}|\\.)*)`, 'g'),
	operator: new RegExp(`(${tokens.operator})`, 'g'),
	scope: new RegExp('[\\{\\}｛｝]', 'g'),
	bracketsAll: new RegExp('[\\{\\}｛｝\\(\\)（）\\[\\]［］]', 'g'),
	brackets: new RegExp('[\\(\\)（）]', 'g'),
	syntax: {
		function: new RegExp('[\\(（](.*)[\\)）](\\s*\\=\\>\\s*)[\\(（](.*?)[\\)）](\\s*[\\=＝].*?(?:;|$))?'),
		for: new RegExp('[\\(（](.*)[）\\)](\\s*から\\s*)[\\(（](.*)[）\\)](\\s*まで\\s*)[\\(（](.*)[）\\)](?:\\s*[{｛}])', 'g'),
	},
	comment: {
		line: new RegExp('\\/\\/.*', 'g'),
		block: new RegExp('/\\*|\\*/', 'g'),
	},
	string: {
		char: new RegExp("\\'.*\\'", 'g'),
		charInvalid: new RegExp("\\'[^\\']*?\n", 'g'),
		string: new RegExp('\\"', 'g'),
		japanese: new RegExp('[「」]', 'g'),
	},
};

// tokenPatterns.variable = new RegExp(
// 	`((?:[${tokens.separators.replace('\\:', '').replace('\\s', '')}]|^)\\s*(${tokenPatternDefine.name})(?=\\s+[^\\(\\{（｛\\s\\:]|[^${tokens.char}\\(\\{（｛\\s\\:]|\\s*$)|${
// 		tokenPatternDefine.separator
// 	}${tokenPatternDefine.types}(${tokenPatternDefine.name}))`,
// 	'g'
// );

const regexpToString = (regexp: RegExp) => regexp.toString().match(/\/(.*)\/[igmsuy]*/)![1];

const htmls = /\<span\sclass\=\"code\-\w+\"\>|\<\/span\>/g;

function highlight(code: string) {
	// ラインコメント
	code = (() => {
		let content = code;
		let indexOffset = 0;
		for (let match = null; (match = tokenPatterns.comment.line.exec(code)); ) {
			content = `${content.substr(0, match.index + indexOffset)}<span class="code-comment">${match[0]}</span>${content.substr(match.index + match[0].length + indexOffset)}`;
			indexOffset += 34;
		}
		return content;
	})();
	// ブロックコメント
	code = (() => {
		let content = code;
		let indexOffset = 0;
		let blockStack: number | null = null;
		for (let match = null; (match = tokenPatterns.comment.block.exec(code)); ) {
			if (match[0] === '/*') {
				// start
				if (blockStack === null) {
					blockStack = match.index;
				}
			} else {
				// end
				if (blockStack !== null) {
					content = `${content.substr(0, blockStack + indexOffset)}<span class="code-comment">${content.substring(blockStack + indexOffset, match.index + 2 + indexOffset)}</span>${content.substr(
						match.index + 2 + indexOffset
					)}`;
					indexOffset += 34;
					blockStack = null;
				}
			}
		}
		return content;
	})();
	// 文字 ''
	code = (() => {
		let codeEdited = removeOthers(code, 'comment');

		let content = code;
		let indexOffset = 0;
		for (let match = null; (match = tokenPatterns.string.char.exec(codeEdited)); ) {
			content = `${content.substr(0, match.index + indexOffset)}<span class="code-string">${match[0]}</span>${content.substr(match.index + match[0].length + indexOffset)}`;
			indexOffset += 33;
		}
		return content;
	})();
	// 文字列 ""
	code = (() => {
		let codeEdited = removeOthers(code, 'comment');
		let content = code;
		let indexOffset = 0;
		let stringStack: number | null = null;
		for (let match = null; (match = tokenPatterns.string.string.exec(codeEdited)); ) {
			if (stringStack !== null) {
				content = `${content.substring(0, stringStack + indexOffset)}<span class="code-string">${content.substring(stringStack + indexOffset, match.index + 1 + indexOffset)}</span>${content.substr(
					match.index + 1 + indexOffset
				)}`;
				indexOffset += 33;
				stringStack = null;
			} else {
				stringStack = match.index;
			}
		}
		return content;
	})();
	// 文字列 「」
	code = (() => {
		let codeEdited = removeOthers(code, 'comment');
		let content = code;
		let indexOffset = 0;
		let japaneseStack: number | null = null;
		for (let match = null; (match = tokenPatterns.string.japanese.exec(codeEdited)); ) {
			if (match[0] === '「') {
				if (japaneseStack === null) {
					japaneseStack = match.index;
				}
			} else {
				if (japaneseStack !== null) {
					content = `${content.substr(0, japaneseStack + indexOffset)}<span class="code-string">${content.substring(japaneseStack + indexOffset, match.index + 1 + indexOffset)}</span>${content.substr(
						match.index + 1 + indexOffset
					)}`;
					indexOffset += 33;
					japaneseStack = null;
				}
			}
		}
		return content;
	})();
	// クラス
	code = (() => {
		let codeEdited = removeOthers(code, 'string');
		let content = code;
		let indexOffset = 0;
		let classes: string[] = [];
		for (let match = null; (match = tokenPatterns.class.exec(codeEdited)); ) {
			content = `${content.substr(0, match.index + match[0].length - match[1].length + indexOffset)}<span class="code-class">${match[1]}</span>${content.substr(
				match.index + match[0].length + indexOffset
			)}`;
			classes.push(match[1]);
			indexOffset += 32;
		}

		classes.push('シーン', 'ベクトル3D', 'モデル', '配列', '行列4x4', '文字列', 'カメラ');

		// 型書き換え
		let tokenPatternDefineEdit = tokenPatternDefine;
		tokenPatternDefineEdit.types = tokenPatternDefine.types.replace(tokens.typeKeywords!.join('|') + ')', tokens.typeKeywords!.concat(classes).join('|') + ')');
		let tokenPatternsEdit = tokenPatterns;
		tokenPatternsEdit.types = new RegExp(regexpToString(tokenPatterns.types).replace(tokens.typeKeywords!.join('|') + ')', tokens.typeKeywords!.concat(classes).join('|') + ')'), 'g');
		tokenPatternsEdit.variable = new RegExp(regexpToString(tokenPatterns.variable).replace(tokens.typeKeywords!.join('|') + ')', tokens.typeKeywords!.concat(classes).join('|') + ')'), 'g');
		tokenPatternsEdit.function = new RegExp(regexpToString(tokenPatterns.function).replace(tokens.typeKeywords!.join('|') + ')', tokens.typeKeywords!.concat(classes).join('|') + ')'), 'g');

		return content;
	})();
	// キーワード
	code = (() => {
		let codeEdited = removeOthers(code, 'string');
		let content = code;
		let indexOffset = 0;
		for (let match = null; (match = tokenPatterns.keyword.exec(codeEdited)); ) {
			if (tokens.control!.includes(match[0])) {
				content = `${content.substr(0, match.index + indexOffset)}<span class="code-control">${match[0]}</span>${content.substr(match.index + match[0].length + indexOffset)}`;
				indexOffset += 34;
			}
			if (tokens.keywords!.includes(match[0])) {
				content = `${content.substr(0, match.index + indexOffset)}<span class="code-keyword">${match[0]}</span>${content.substr(match.index + match[0].length + indexOffset)}`;
				indexOffset += 34;
			}
		}
		return content;
	})();
	// 関数
	code = (() => {
		let codeEdited = removeOthers(code, 'string');
		let content = code;
		let indexOffset = 0;
		for (let match = null; (match = tokenPatterns.function.exec(codeEdited)); ) {
			if (!tokens.control!.includes(match[3]) && !match[1]) {
				if (tokens.functions!.includes(match[3])) {
					content = `${content.substr(0, match.index + indexOffset + match[0].length - match[3].length)}<span class="code-keyword">${match[3]}</span>${content.substr(
						match.index + match[0].length + indexOffset
					)}`;
					indexOffset += 34;
				} else {
					content = `${content.substr(0, match.index + indexOffset + match[0].length - match[3].length)}<span class="code-function">${match[3]}</span>${content.substr(
						match.index + match[0].length + indexOffset
					)}`;
					indexOffset += 35;
				}
			}
		}
		return content;
	})();
	// 変数
	code = (() => {
		let codeEdited = removeOthers(code, 'all');

		let content = code;
		let indexOffset = 0;
		for (let match = null; (match = tokenPatterns.variable.exec(codeEdited)); ) {
			console.log(match);

			if (!tokens.control!.concat(tokens.keywords!, tokens.typeKeywords!).includes(match[1])) {
				content = `${content.substr(0, match.index + indexOffset)}${
					match[2] ? match[0].substr(0, match[0].length - match[2].length) : match[0].substr(0, match[0].length - match[4].length)
				}<span class="code-variable">${match[2] ? match[2] : match[4]}</span>${content.substr(match.index + match[0].length + indexOffset)}`;
				indexOffset += 35;
			}
		}
		return content;
	})();
	// 数字
	code = (() => {
		let codeEdited = removeOthers(code, 'all');
		let content = code;
		let indexOffset = 0;
		for (let match = null; (match = tokenPatterns.number.exec(codeEdited)); ) {
			content = `${content.substr(0, match.index + indexOffset)}${match[0].slice(0, -match[1].length)}<span class="code-number">${match[1]}</span>${content.substr(
				match.index + match[0].length + indexOffset
			)}`;
			indexOffset += 33;
		}
		return content;
	})();
	// 型
	code = (() => {
		let codeEdited = removeOthers(code, 'all');
		let content = code;
		let indexOffset = 0;
		for (let match = null; (match = tokenPatterns.types.exec(codeEdited)); ) {
			content = `${content.substr(0, match.index + indexOffset)}<span class="code-type">${match[1]}</span>${content.substr(match.index + match[1].length + indexOffset)}`;
			indexOffset += 31;
		}
		return content;
	})();
	return code;
}

function removeOthers(code: string, option: 'tag' | 'comment' | 'string' | 'all') {
	let codeEdited = code;
	for (let match = null; (match = htmls.exec(code)); ) {
		codeEdited = `${codeEdited.substr(0, match.index)}${' '.repeat(match[0].length)}${codeEdited.substr(match.index + match[0].length)}`;
	}
	if (option === 'tag') return codeEdited;
	let codeNoTags = codeEdited;
	for (let match = null; (match = tokenPatterns.comment.line.exec(codeNoTags)); ) {
		codeEdited = `${codeEdited.substr(0, match.index)}${' '.repeat(match[0].length)}${codeEdited.substr(match.index + match[0].length)}`;
	}
	let blockStack: number | null = null;
	for (let match = null; (match = tokenPatterns.comment.block.exec(codeNoTags)); ) {
		if (match[0] === '/*') {
			// start
			if (!blockStack) {
				blockStack = match.index;
			}
		} else {
			// end
			if (blockStack) {
				codeEdited = `${codeEdited.substr(0, blockStack)}${' '.repeat(match.index - blockStack + 2)}${codeEdited.substr(match.index + 2)}`;
				blockStack = null;
			}
		}
	}
	if (option === 'comment') return codeEdited;
	for (let match = null; (match = tokenPatterns.string.char.exec(codeNoTags)); ) {
		codeEdited = `${codeEdited.substr(0, match.index)}${' '.repeat(match[0].length)}${codeEdited.substr(match.index + match[0].length)}`;
	}
	let stringStack: number | null = null;
	for (let match = null; (match = tokenPatterns.string.string.exec(codeNoTags)); ) {
		if (stringStack) {
			codeEdited = `${codeEdited.substring(0, stringStack)}${' '.repeat(match.index - stringStack + 1)}${codeEdited.substr(match.index + 1)}`;
			stringStack = null;
		} else {
			stringStack = match.index;
		}
	}
	let japaneseStack: number | null = null;
	for (let match = null; (match = tokenPatterns.string.japanese.exec(codeNoTags)); ) {
		if (match[0] === '「') {
			if (!japaneseStack) {
				japaneseStack = match.index;
			}
		} else {
			if (japaneseStack) {
				codeEdited = `${codeEdited.substring(0, japaneseStack)}${' '.repeat(match.index - japaneseStack + 1)}${codeEdited.substr(match.index + 1)}`;
				japaneseStack = null;
			}
		}
	}
	if (option === 'string') return codeEdited;
	for (let match = null; (match = tokenPatterns.function.exec(codeNoTags)); ) {
		if (!tokens.control!.includes(match[3]) && !match[1])
			codeEdited = `${codeEdited.substr(0, match.index + match[0].length - match[3].length)}${' '.repeat(match[3].length)}${codeEdited.substr(match.index + match[0].length)}`;
	}
	if (option === 'all') return codeEdited;
	return codeEdited;
}
export default highlight;
