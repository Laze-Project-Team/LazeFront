import * as monaco from 'monaco-editor';

// Lazeを登録
monaco.languages.register({ id: 'Laze' });

// 言語設定
monaco.languages.setLanguageConfiguration('Laze', {
	brackets: [
		['{', '}'],
		['[', ']'],
		['(', ')'],
		['「', '」'],
	],
	autoClosingPairs: [
		{ open: '{', close: '}' },
		{ open: '[', close: ']' },
		{ open: '(', close: ')' },
		{ open: '「', close: '」' },
		{ open: '"', close: '"' },
		{ open: "'", close: "'" },
	],
	surroundingPairs: [
		{ open: '{', close: '}' },
		{ open: '[', close: ']' },
		{ open: '(', close: ')' },
		{ open: '「', close: '」' },
		{ open: '"', close: '"' },
		{ open: "'", close: "'" },
	],
	comments: {
		blockComment: ['/*', '*/'],
		lineComment: '//',
	},
});
