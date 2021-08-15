import * as monaco from 'monaco-editor';

const theme = {
	base: 'vs-dark',
	inherit: true,
	colors: {},
	rules: [
		{ token: 'function', foreground: 'DCDCAA' },
		// { token: 'function.declaration', foreground: 'FFFF99' },
		{ token: 'keyword', foreground: '569CD6' },
		{ token: 'variable', foreground: '9CDCFE' },
		{ token: 'control', foreground: 'C586C0' },
		{ token: 'string.invalid', foreground: 'F44747' },
		{ token: 'char', foreground: 'CE9178' },
		{ token: 'char.invalid', foreground: 'F44747' },
		{ token: 'default', foreground: '569CD6' },
		{ token: 'class', foreground: '4EC9B0' },
		// { token: 'operator', foreground: '99ff99' },
	],
} as monaco.editor.IStandaloneThemeData;

const withBrackets = [
	{ token: 'scope0', foreground: 'FFD700' },
	{ token: 'scope1', foreground: 'DA70D6' },
	{ token: 'scope2', foreground: '87CEFA' },
];

// Lazeテーマの定義
monaco.editor.defineTheme('LazeTheme', theme);
let editedTheme = JSON.parse(JSON.stringify(theme));
editedTheme.rules = editedTheme.rules.concat(withBrackets);
monaco.editor.defineTheme('LazeThemeWithBrackets', editedTheme);
