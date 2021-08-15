import * as monaco from 'monaco-editor';

const legend = {
	tokenTypes: [
		'comment',
		'string',
		'keyword',
		'number',
		'regexp',
		'operator',
		'namespace',
		'type',
		'struct',
		'class',
		'interface',
		'enum',
		'typeParameter',
		'function',
		'member',
		'macro',
		'variable',
		'parameter',
		'property',
		'label',
		'control',
		'scope0',
		'scope1',
		'scope2',
		'bracket',
		'char',
		'default',
	],
	tokenModifiers: ['declaration', 'documentation', 'readonly', 'static', 'abstract', 'deprecated', 'modification', 'async', 'dec', 'hex', 'bin', 'start', 'end', 'invalid'],
};

function getType(type: string): number {
	return legend.tokenTypes.indexOf(type);
}

function getModifier(modifiers: string | string[]): number {
	if (typeof modifiers === 'string') {
		modifiers = [modifiers];
	}
	if (Array.isArray(modifiers)) {
		let nModifiers = 0;
		for (let modifier of modifiers) {
			const nModifier = legend.tokenModifiers.indexOf(modifier);
			if (nModifier > -1) {
				nModifiers |= (1 << nModifier) >>> 0;
			}
		}
		return nModifiers;
	} else {
		return 0;
	}
}

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
		repeat: '回繰り返す',
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
		`((?:[${tokens.separators.replace('\\:', '')}]|^)(${tokenPatternDefine.name})(?=\\s+[^\\(\\{（｛\\s\\:]|[^${tokens.char}\\(\\{（｛\\s\\:]|\\s*$)|${tokenPatternDefine.separator}${
			tokenPatternDefine.types
		}(${tokenPatternDefine.name}))`,
		'g'
	),
	number: new RegExp(`${tokenPatternDefine.separator}((0b|0x)?${tokens.number}(?:${tokens.number}|\\.)*)`, 'g'),
	operator: new RegExp(`(${tokens.operator})`, 'g'),
	scope: new RegExp('[\\{\\}｛｝]', 'g'),
	bracketsAll: new RegExp('[\\{\\}｛｝\\(\\)（）\\[\\]［］]', 'g'),
	brackets: new RegExp('[\\(\\)（）]', 'g'),
	syntax: {
		function: new RegExp('[\\(（](.*)[\\)）](\\s*\\=\\>\\s*)[\\(（](.*?)[\\)）](\\s*[\\=＝].*?(?:;|$))?'),
		for: new RegExp(`[\\(（](.*)[）\\)](\\s*${jaKeywordList.control.from}\\s*)[\\(（](.*)[）\\)](\\s*${jaKeywordList.control.until}\\s*)[\\(（](.*)[）\\)](?:\\s*[{｛}])`, 'g'),
		repeat: new RegExp(`${jaKeywordList.control.repeat}`, 'g'),
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

const regexpToString = (regexp: RegExp) => regexp.toString().match(/\/(.*)\/[igmsuy]*/)![1];

const indexToRowColumn = (content: string, i: number) => ({
	row: content.substring(0, i).split('\n').length - 1,
	column: content.substring(0, i).split('\n').slice(-1)[0].length,
});
const rowColumnToIndex = (content: string, row: number, column: number) => content.split('\n').slice(0, row).join('\n').length + column + 1;

// CompletionProvider用
interface classMember {
	type: string;
	name: string;
	accessType: string;
}
interface completion {
	type: string;
	name: string;
	row: number;
	column: number;
	varType?: string;
}
let completions: completion[] = [];

// セマンティックトークンプロバイダー
monaco.languages.registerDocumentSemanticTokensProvider('Laze', {
	getLegend: () => legend,
	provideDocumentSemanticTokens: (model: monaco.editor.IModel) => {
		let content = model.getValue();

		const data: number[] = [];

		let prevLine = 0;
		let prevChar = 0;

		completions = [{ type: 'scope', name: '@start_scope', row: 0, column: 0 }];

		const contentDatas: { index: number; length: number; type: string; modifier: string }[] = [];
		const completionDatas: { type: string; name: string; index: number; varType?: string }[] = [];

		//#region TokenProviders

		//#region コメント

		// ラインコメント //
		for (let match = null; (match = tokenPatterns.comment.line.exec(content)); ) {
			content = content.substring(0, match.index) + ' '.repeat(match[0].length) + content.substr(match.index + match[0].length);
			contentDatas.push({
				index: match.index,
				length: match[0].length,
				type: 'comment',
				modifier: '',
			});
		}
		// ブロックコメント /* */
		let blockStack: number | null = null;
		for (let match = null; (match = tokenPatterns.comment.block.exec(content)); ) {
			console.log(match);

			if (match[0] === '/*') {
				// start
				if (blockStack === null) {
					blockStack = match.index;
				}
			} else {
				// end
				if (blockStack !== null) {
					const inComment = content.substring(blockStack, match.index + 2).replace(/[^\n]/g, ' ');
					content = content.substring(0, blockStack) + inComment + content.substr(match.index + 2);
					let indexOffset = blockStack;
					for (const line of inComment.split('\n')) {
						contentDatas.push({
							index: indexOffset,
							length: line.length,
							type: 'comment',
							modifier: '',
						});
						indexOffset += line.length + 1;
					}
					blockStack = null;
				}
			}
		}

		//#endregion

		//#region 文字列

		// 文字 ''
		for (let match = null; (match = tokenPatterns.string.char.exec(content)); ) {
			const inComment = content.substring(match.index, match.index + match[0].length).replace(/[^\n]/g, ' ');
			content = content.substring(0, match.index) + inComment + content.substr(match.index + match[0].length);
			contentDatas.push({
				index: match.index,
				length: match[0].length,
				type: 'char',
				modifier: '',
			});
		}
		// 文字片方 ''
		for (let match = null; (match = tokenPatterns.string.charInvalid.exec(content)); ) {
			const inComment = content.substring(match.index, match.index + match[0].length).replace(/[^\n]/g, ' ');
			content = content.substring(0, match.index) + inComment + content.substr(match.index + match[0].length);
			contentDatas.push({
				index: match.index,
				length: match[0].length,
				type: 'char',
				modifier: 'invalid',
			});
		}
		// 文字列 ""
		let stringStack: number | null = null;
		for (let match = null; (match = tokenPatterns.string.string.exec(content)); ) {
			if (stringStack !== null) {
				const inString = content.substring(stringStack, match.index + 1).replace(/[^\n]/g, ' ');
				content = content.substring(0, stringStack) + inString + content.substr(match.index + 1);
				let indexOffset = stringStack;
				for (const line of inString.split('\n')) {
					contentDatas.push({
						index: indexOffset,
						length: line.length,
						type: 'string',
						modifier: '',
					});
					indexOffset += line.length + 1;
				}
				stringStack = null;
			} else {
				stringStack = match.index;
			}
		}
		// 文字列片方
		if (stringStack !== null) {
			const lineEnd = content.substr(stringStack).indexOf('\n');
			const inString = content.substring(stringStack, stringStack + lineEnd).replace(/[^\n]/g, ' ');
			content = content.substring(0, stringStack) + inString + content.substr(stringStack + lineEnd);
			contentDatas.push({
				index: stringStack,
				length: lineEnd,
				type: 'string',
				modifier: 'invalid',
			});
		}
		// 文字列「」
		let japaneseStack: number | null = null;
		for (let match = null; (match = tokenPatterns.string.japanese.exec(content)); ) {
			if (match[0] === '「') {
				if (japaneseStack === null) {
					japaneseStack = match.index;
				}
			} else {
				if (japaneseStack !== null) {
					const inString = content.substring(japaneseStack, match.index + 1).replace(/[^\n]/g, ' ');
					content = content.substring(0, japaneseStack) + inString + content.substr(match.index + 1);
					let indexOffset = japaneseStack;
					for (const line of inString.split('\n')) {
						contentDatas.push({
							index: indexOffset,
							length: line.length,
							type: 'string',
							modifier: '',
						});
						indexOffset += line.length + 1;
					}
					japaneseStack = null;
				}
			}
		}
		// 文字列片方 「」
		if (japaneseStack !== null) {
			const lineEnd = content.substr(japaneseStack).indexOf('\n');
			const inString = content.substring(japaneseStack, japaneseStack + lineEnd).replace(/[^\n]/g, ' ');
			content = content.substring(0, japaneseStack) + inString + content.substr(japaneseStack + lineEnd);
			contentDatas.push({
				index: japaneseStack,
				length: lineEnd,
				type: 'string',
				modifier: 'invalid',
			});
		}

		//#endregion

		//#region 括弧

		// スコープ {}
		for (let match = null; (match = tokenPatterns.scope.exec(content)); ) {
			completionDatas.push({
				type: 'scope',
				name: '{｛'.includes(match[0]) ? '@start_scope' : '@end_scope',
				index: match.index,
			});
		}
		// Bracket Colorize
		let stackNest = 0;
		for (let match = null; (match = tokenPatterns.bracketsAll.exec(content)); ) {
			if (!'{｛(（[［'.includes(match[0])) stackNest--;
			contentDatas.push({
				index: match.index,
				length: match[0].length,
				type: `scope${stackNest % 3}`,
				modifier: '{｛'.includes(match[0]) ? 'start' : 'end',
			});
			if ('{｛(（[［'.includes(match[0])) stackNest++;
		}

		//#endregion

		// クラス（宣言）
		let classes = [];
		for (let match = null; (match = tokenPatterns.class.exec(content)); ) {
			contentDatas.push({
				index: match.index + match[0].indexOf(match[1]),
				length: match[1].length,
				type: 'class',
				modifier: '',
			});

			classes.push(match[1]);
			completionDatas.push({
				type: 'class',
				name: match[1],
				index: match.index,
			});
		}
		// typeKeywordsにclassを追加
		// ちょっとハードコード感ある...
		let tokenPatternDefineEdit = tokenPatternDefine;
		tokenPatternDefineEdit.types = tokenPatternDefine.types.replace(tokens.typeKeywords!.join('|'), tokens.typeKeywords!.concat(classes).join('|'));
		let tokenPatternsEdit = tokenPatterns;
		tokenPatternsEdit.types = new RegExp(regexpToString(tokenPatterns.types).replace(tokens.typeKeywords!.join('|'), tokens.typeKeywords!.concat(classes).join('|')), 'g');
		tokenPatternsEdit.variable = new RegExp(regexpToString(tokenPatterns.variable).replace(tokens.typeKeywords!.join('|'), tokens.typeKeywords!.concat(classes).join('|')), 'g');
		tokenPatternsEdit.function = new RegExp(regexpToString(tokenPatterns.function).replace(tokens.typeKeywords!.join('|'), tokens.typeKeywords!.concat(classes).join('|')), 'g');

		// キーワード
		for (let match = null; (match = tokenPatterns.keyword.exec(content)); ) {
			if (tokens.control!.includes(match[0])) {
				contentDatas.push({
					index: match.index,
					length: match[0].length,
					type: 'control',
					modifier: '',
				});

				if (match[0] === jaKeywordList.control.private) {
					completionDatas.push({
						type: 'scope',
						name: '@private',
						index: match.index,
					});
				} else if (match[0] === jaKeywordList.control.public) {
					completionDatas.push({
						type: 'scope',
						name: '@public',
						index: match.index,
					});
				}
			} else if (tokens.keywords!.includes(match[0]))
				contentDatas.push({
					index: match.index,
					length: match[0].length,
					type: 'keyword',
					modifier: '',
				});
		}
		// 関数（宣言・呼び出し）
		for (let match = null; (match = tokenPatterns.function.exec(content)); ) {
			if (!tokens.control!.includes(match[3])) {
				if (tokens.functions!.includes(match[3]))
					contentDatas.push({
						index: match.index + match[0].indexOf(match[3]),
						length: match[3].length,
						type: 'default',
						modifier: '',
					});
				else
					contentDatas.push({
						index: match.index + match[0].indexOf(match[3]),
						length: match[3].length,
						type: 'function',
						modifier: match[2] ? 'declaration' : '',
					});
			}
			if (match[2]) {
				completionDatas.push({
					type: 'function',
					name: match[3],
					index: match.index,
				});

				// スコープ
				let indexOffset = match.index + match[0].length;
				const syntax = content.substr(indexOffset).match(tokenPatterns.syntax.function)!;

				completionDatas.push(
					{
						type: 'scope',
						name: '@start_func',
						index: (indexOffset += syntax.index!),
					},
					{
						type: 'scope',
						name: '@end_func',
						index: (indexOffset += 1 + syntax[1].length),
					},
					{
						type: 'scope',
						name: '@start_func',
						index: (indexOffset += 1 + syntax[2].length),
					},
					{
						type: 'scope',
						name: '@end_func',
						index: (indexOffset += 1 + syntax[3].length),
					}
				);
				if (syntax[4])
					completionDatas.push(
						{
							type: 'scope',
							name: '@start_scope',
							index: indexOffset + 1 + syntax[4].match(/[\=＝]/)!.index!,
						},
						{
							type: 'scope',
							name: '@end_scope',
							index: (indexOffset += syntax[4].length),
						}
					);
			}
		}
		// 変数
		for (let match = null; (match = tokenPatterns.variable.exec(content)); ) {
			if (!tokens.control!.concat(tokens.keywords!, tokens.typeKeywords!, classes).includes(match[1])) {
				// 呼び出し
				if (match[2])
					contentDatas.push({
						index: match.index + match[0].length - match[2].length,
						length: match[2].length,
						type: 'variable',
						modifier: '',
					});
				// 宣言
				else {
					contentDatas.push({
						index: match.index + 1 + match[3].length,
						length: match[4].length,
						type: 'variable',
						modifier: 'declaration',
					});

					completionDatas.push({
						type: 'variable',
						name: match[4],
						index: match.index + 1 + match[3].length,
						varType: match[3].slice(0, -1),
					});
				}
			}
		}
		// 型
		for (let match = null; (match = tokenPatterns.types.exec(content)); ) {
			contentDatas.push({
				index: match.index,
				length: match[1].length,
				type: 'type',
				modifier: '',
			});
		}
		// 数（BIN・DEC・HEX）
		for (let match = null; (match = tokenPatterns.number.exec(content)); ) {
			contentDatas.push({
				index: match.index + 1,
				length: match[1].length,
				type: 'number',
				modifier: match[2] === '0b' ? 'bin' : match[2] === '0x' ? 'hex' : 'dec',
			});
		}
		// オペレーター
		for (let match = null; (match = tokenPatterns.operator.exec(content)); ) {
			contentDatas.push({
				index: match.index,
				length: match[0].length,
				type: 'operator',
				modifier: '',
			});
		}
		// 特殊構文
		// からまで
		for (let match = null; (match = tokenPatterns.syntax.for.exec(content)); ) {
			let index = match.index;
			completionDatas.push(
				{
					type: 'scope',
					name: '@start_for_dec',
					index: index,
				},
				{
					type: 'scope',
					name: '@end_for_dec',
					index: (index += 1 + match[1].length),
				},
				{
					type: 'scope',
					name: '@start_for_condition',
					index: (index += 1 + match[2].length),
				},
				{
					type: 'scope',
					name: '@end_for_condition',
					index: (index += 1 + match[3].length),
				},
				{
					type: 'scope',
					name: '@start_for_loop',
					index: (index += 1 + match[4].length),
				},
				{
					type: 'scope',
					name: '@end_for_loop',
					index: (index += 1 + match[5].length),
				}
			);
		}
		// 回繰り返す
		for (let match = null; (match = tokenPatterns.syntax.repeat.exec(content)); ) {
			completionDatas.push({
				index: match.index,
				type: 'scope',
				name: '@repeat',
			});
		}

		//#endregion

		// トークン
		contentDatas.sort((a, b) => a.index - b.index);
		contentDatas.forEach((contentData) => {
			const { row, column } = indexToRowColumn(content, contentData.index);
			data.push(row - prevLine, prevLine === row ? column - prevChar : column, contentData.length, getType(contentData.type), contentData.modifier ? getModifier(contentData.modifier) : 0);
			prevLine = row;
			prevChar = column;
		});

		// スコープ
		completionDatas.sort((a, b) => a.index - b.index);
		completionDatas.forEach((completionData) => {
			const { row, column } = indexToRowColumn(content, completionData.index);
			completions.push({
				type: completionData.type,
				name: completionData.name,
				row: row,
				column: column,
				varType: completionData.varType,
			});
		});

		completions.push({ type: 'scope', name: '@end_scope', row: model.getLineCount(), column: 0 });

		return {
			data: new Uint32Array(data),
			resultId: undefined,
		};
	},
	releaseDocumentSemanticTokens: () => undefined,
});

const isCursorInRange = (r: number, c: number, br: number, bc: number, ar: number, ac: number, callback: Function) => {
	if ((br < r || (br === r && bc < c)) && (ar > r || (ar === r && ac >= c))) callback();
};

// インテリセンスの提供
monaco.languages.registerCompletionItemProvider('Laze', {
	provideCompletionItems: (model, position) => {
		const content = model.getValue();
		const lines = model.getLinesContent();

		const suggestions: monaco.languages.CompletionItem[] = [
			{
				label: '実行',
				kind: monaco.languages.CompletionItemKind.Snippet,
				insertText: ['関数:実行() => () {', '\t', '}'].join('\n'),
				insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
				documentation: ['メイン実行関数', '', '無：実行() = {', '\t', '}'].join('\n'),
			},
			{
				label: 'もし',
				kind: monaco.languages.CompletionItemKind.Snippet,
				insertText: ['もし( ${1:条件} )ならば{', '\t$0', '}'].join('\n'),
				insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
				documentation: ['条件分岐処理', '', 'もし ( 条件 ) {', '\t', '}'].join('\n'),
			},
			{
				label: 'からまで',
				kind: monaco.languages.CompletionItemKind.Snippet,
				insertText: ['(整数：${1:カウンタ} = 0;) から (${1:カウンタ} == ${2:回数}) まで (${1:カウンタ}++;) {', '\t$0', '}'].join('\n'),
				insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
				documentation: ['繰り返し処理', '', '(整数：カウンタ = 0;) から (カウンタ == 回数) まで (カウンタ++;) {', '\t', '}'].join('\n'),
			},
			{
				label: '関数',
				kind: monaco.languages.CompletionItemKind.Snippet,
				insertText: ['関数:${1:関数名} (${2:引数}) => (${3:戻り値}) {', '\t$0', '}'].join('\n'),
				insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
				documentation: ['関数の宣言', '', '関数:関数名 (引数) => (戻り値) {', '\t', '}'].join('\n'),
			},
			{
				label: 'クラス',
				kind: monaco.languages.CompletionItemKind.Snippet,
				insertText: ['クラス:${1:クラス名} {', '\t関数:${1:クラス名} () => () {', '\t\t$0', '\t}', '\t公開:', '\t非公開:', '}'].join('\n'),
				insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
				documentation: ['クラス定義', '', 'クラス:クラス名 {', '\t関数:クラス名 () => () {', '\t\t', '\t}', '\t公開:', '\t非公開:', '}'].join('\n'),
			},
		];

		let stack: { type: string; name: string; varType?: string; accessType?: string }[][] = [[]];
		let stackLevel = 0;
		let stackPos: { row: number; column: number }[] = [];
		let forPos: { row: number; column: number } = { row: 0, column: 0 };
		let classStack = {
			flag: false,
			name: '',
			level: 0,
			accessType: 'public',
		};
		let classMembers: { [key: string]: classMember[] } = {};
		completions.forEach((completion, index, array) => {
			if (completion.type === 'scope') {
				switch (completion.name) {
					case '@start_scope':
						stackLevel++;
						if (!stack[stackLevel]) stack[stackLevel] = [];
						stackPos[stackLevel] = { row: completion.row, column: completion.column };

						if (classStack.flag && classStack.level == 0) {
							classStack.level = stackLevel;
						}
						break;
					case '@end_scope':
						isCursorInRange(position.lineNumber, position.column, stackPos[stackLevel].row + 1, stackPos[stackLevel].column + 1, completion.row + 1, completion.column + 1, () => {
							stack[stackLevel].forEach((completionItem) => {
								suggestions.push({
									label: completionItem.name,
									kind: (() => {
										switch (completionItem.type) {
											case 'function':
												return monaco.languages.CompletionItemKind.Function;
											case 'variable':
												return monaco.languages.CompletionItemKind.Variable;
											case 'class':
												return monaco.languages.CompletionItemKind.Class;
											default:
												return monaco.languages.CompletionItemKind.Text;
										}
									})(),
									insertText: completionItem.name,
								});
							});

							// クラスのメンバー補完
							const offset = rowColumnToIndex(content, position.lineNumber - 1, position.column - 1) - 1;
							let periodFlag = false;
							let spaceFlag = false;
							let variable = '';
							for (let i = offset; true; i--) {
								if (!periodFlag) {
									if (/[^\s]/.test(content[i])) {
										if (content[i] == '.') periodFlag = true;
										else break;
									}
								} else if (!spaceFlag) {
									if (/[^\s]/.test(content[i])) {
										spaceFlag = true;
										variable = content[i];
									}
								} else {
									if (/[^\s]/.test(content[i])) {
										variable = `${content[i]}${variable}`;
									} else break;
								}
							}

							if (variable) {
								const comp = stack[stackLevel].filter((stack) => stack.name === variable && stack.type === 'variable');

								if (comp.length > 0) {
									console.log(comp[0]);

									if (comp[0].varType) {
										for (const member of classMembers[comp[0].varType]) {
											suggestions.push({
												label: member.name,
												kind: member.type === 'variable' ? monaco.languages.CompletionItemKind.Variable : monaco.languages.CompletionItemKind.Function,
												insertText: member.name,
											});
										}
									}
								}
							}
						});

						if (classStack.flag && classStack.level == stackLevel) {
							// @ts-ignore
							classMembers[classStack.name] = stack[stackLevel];
							classStack = {
								flag: false,
								name: '',
								level: 0,
								accessType: 'public',
							};
						}

						stack[stackLevel] = [];
						stackLevel--;
						break;
					case '@start_for_dec':
					case '@start_func':
						stackLevel++;
						if (!stack[stackLevel]) stack[stackLevel] = [];
						break;
					case '@end_for_dec':
					case '@end_func':
						stackLevel--;
						break;
					case '@start_for_condition':
					case '@start_for_loop':
						forPos = { row: completion.row, column: completion.column };
						break;
					case '@end_for_condition':
					case '@end_for_loop':
						isCursorInRange(position.lineNumber, position.column, forPos.row + 1, forPos.column + 1, completion.row + 1, completion.column + 1, () => {
							for (let i = index; i < array.length; i++) {
								if (array[i].name === '@start_scope') {
									position = position.with(array[i].row + 1, array[i].column + 2);
									break;
								}
							}
						});
						break;
					case '@repeat':
						if (!stack[stackLevel + 1]) stack[stackLevel + 1] = [];
						stack[stackLevel + 1].push({
							type: 'variable',
							name: 'カウンタ',
							varType: '整数',
							accessType: classStack.accessType,
						});
						break;
					case '@private':
						classStack.accessType = 'private';
						break;
					case '@protected':
						classStack.accessType = 'protected';
						break;
					case '@public':
						classStack.accessType = 'public';
						break;
				}
			} else {
				stack[stackLevel].push({
					type: completion.type,
					name: completion.name,
					varType: completion.varType,
					accessType: classStack.accessType,
				});
				if (completion.type === 'class') {
					classStack.flag = true;
					classStack.name = completion.name;
				}
			}
		});

		return { suggestions };
	},
});
