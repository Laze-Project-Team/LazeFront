import * as monaco from 'monaco-editor';
import './options/Configuration';
import './options/Theme';
import './options/TokenProvider';
import './options/Formatter';

const includeCapitals = (val: string | string[], respectOrder = false) => {
	const capitalPair: { [key: string]: string } = {
		'=': '＝',
		'(': '（',
		')': '）',
		'{': '｛',
		'}': '｝',
		'[': '［',
		']': '］',
		'<': '＜',
		'>': '＞',
		'+': '＋',
		'*': '＊',
		'&': '＆',
		' ': '　',
		"'": '’',
		'"': '”',
		':': '：',
		',': '、',
		'.': '。',
	};
	const includeCaptialForString = (val: string) => {
		const charTest = (val: string, stack = '') => {
			if (val.length) {
				const char = val[0];
				if (Object.keys(capitalPair).includes(char)) {
					charTest(val.substr(1), stack + capitalPair[char]);
				}
				charTest(val.substr(1), stack + char);
			} else {
				result.push(stack);
			}
		};
		let result: string[] = [];
		charTest(val);
		return result;
	};
	if (respectOrder) {
		if (typeof val === 'string') {
			return includeCaptialForString(val);
		} else if (typeof val === 'object') {
			let result: string[] = [];
			val.forEach((item) => result.push(...includeCaptialForString(item)));
			return result;
		}
	} else {
		let result = val;
		for (let i = 0; i < val.length; i++) {
			const char = val[i];
			if (Object.keys(capitalPair).includes(char)) result += capitalPair[char];
		}
		return result;
	}
};

import code from './options/code';

const editor = monaco.editor.create(document.getElementById('editor')!, {
	value: code,
	language: 'Laze',
	theme: 'LazeThemeWithBrackets',
	// @ts-ignore
	wordSeparators: includeCapitals('`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?「」'),
	fontFamily: 'Consolas',
	autoClosingBrackets: 'always',
	autoClosingOvertype: 'always',
	'semanticHighlighting.enabled': true,
});
editor.getModel()!.updateOptions({ tabSize: 2 });
window.onresize = () => editor.layout();

export default editor;
