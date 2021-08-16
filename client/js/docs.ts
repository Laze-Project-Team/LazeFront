import marked from 'marked';
import highlight from './highlight/highlight';

// 要素
const doc = document.getElementById('document-content')!;
const main = document.querySelector('.main-content')!;

// ミラーリング
document.querySelector('#index-list .index-list')!.innerHTML = document.querySelector('.sidebar .index-list')!.innerHTML;
document.querySelector('.responsive-header .version-select')!.innerHTML = document.querySelector('.versions .version-select')!.innerHTML;

// version-select 同期
document.querySelectorAll('.version-select .input-field select').forEach((selectElement) => {
	selectElement.addEventListener('change', (event) => {
		document.querySelectorAll('.version-select .input-field select').forEach((element) => {
			// @ts-ignore
			element.value = event.target?.value;
		});
		document.querySelectorAll('.version-select .input-field input').forEach((element) => {
			// @ts-ignore
			element.value = event.target?.querySelector(`option[value=${event.target?.value}]`).innerHTML;
		});
	});
});

// Materialize Init
const instances = {
	collapsible: M.Collapsible.init(document.querySelectorAll('.collapsible'), {
		onOpenStart: function (el: Element) {
			const icon = el.querySelector('.collapsible-header > .material-icons');
			// icon!.innerHTML = 'keyboard_arrow_down';
			icon?.classList.add('open');
		},
		onCloseStart: function (el: Element) {
			const icon = el.querySelector('.collapsible-header > .material-icons');
			icon?.classList.remove('open');
		},
		accordion: false,
		inDuration: 200,
		outDuration: 200,
	}),
	formSelect: M.FormSelect.init(document.querySelectorAll('select')),
	sidenav: M.Sidenav.init(document.querySelectorAll('.sidenav')),
	featureDiscovery: M.TapTarget.init(document.querySelectorAll('.tap-target')),
};

// Markedのパーサー
const getLineNumber = (code: string) => {
	let html = '';
	for (let i = 0; i < code.split('\n').length; i++) {
		html += `<div>${i + 1}</div>`;
	}
	return html;
};
{
	const renderer = new marked.Renderer();
	renderer.code = (code, language) => `<pre><div class="line-number">${getLineNumber(code)}</div><code class="codeblock-laze">${highlight(code)}</code></pre>`;
	renderer.link = (href, text, string) => `<a href="${href}" class="mdlink">${string}</a>`;
	renderer.heading = (text, level) => {
		const div = document.createElement('div');
		div.innerHTML = text;
		let innerText = text;
		for (let element: HTMLElement | null = div; (element = element.querySelector('*')); ) {
			innerText = element.innerHTML;
		}
		return `<h${level} id="${innerText}">${text}${
			level >= 1 && level <= 2
				? '<a class="link-copy tooltipped" data-position="bottom" data-tooltip="' + 'ここへのリンクをコピー' + '" data-href="' + currentHref + '#' + text + '"><i class="material-icons">link</i></a>'
				: ''
		}</h${level}>`;
	};
	renderer.codespan = (code) => `<code class="inline-code">${code}</code>`;
	renderer.table = (header, body) => `<div class="table-wrapper"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;

	// Markedに設定
	marked.setOptions({
		renderer: renderer,
	});
}

function setMarkdownLink() {
	(document.querySelectorAll('a.mdlink') as NodeListOf<HTMLLinkElement>).forEach((link) => {
		if (link.host === location.host) {
			if (link.hash) link.addEventListener('click', smoothScroll);
			link.onclick = function () {
				if (link.hash) {
					link.addEventListener('click', smoothScroll);
					return true;
				} else {
					const baseHref = link.pathname;
					requestMarkdown(baseHref);

					// @ts-ignore
					document.querySelector('div.sidenav-overlay')!.click();
					return false;
				}
			};
		} else {
			link.setAttribute('target', '_blank');
			link.setAttribute('rel', 'noopener noreferrer');
		}
	});
}

const errorMessage = `
<div class="error-message">
	<h1><i class="material-icons">error_outline</i>エラーが発生しました</h1>
	<p>再読み込みしてみてください</p>
</div>
`;
const loadingMessage = `
<div class="progress-wrapper">
	<div class="progress">
		<div class="indeterminate"></div>
	</div>
</div>
`;

function getVersion(): string {
	// @ts-ignore
	return document.querySelector('.version-select .input-field select')?.value;
}

// Markdownをサーバーからリクエスト
let currentHref = '';
function requestMarkdown(href: string, hash?: string) {
	doc!.innerHTML = loadingMessage;
	document.querySelector('.document-outline > .content')!.innerHTML = '';
	// @ts-ignore
	fetch(`/docs/${getVersion()}${href}`)
		.then((res) => (res.status == 200 ? res.text() : null))
		.then((res) => {
			currentHref = href;
			if (res) {
				parseMarkdown(res);
				if (hash) {
					const target = document.getElementById(decodeURI(hash));
					if (target) {
						main.scrollTop = target.getBoundingClientRect().y;
					}
				}
			} else {
				doc.innerHTML = errorMessage;
				setMarkdownLink();
			}

			// query変更
			const newurl = location.origin + window.location.pathname + `?version=${getVersion()}&href=${currentHref}`;
			history.pushState({ path: newurl }, '', newurl);

			// active変更
			document.querySelectorAll('.actived').forEach((actived) => actived.classList.remove('actived'));
			document.querySelectorAll(`a[href="${href}"]`).forEach((actived) => {
				actived.classList.add('actived');
				if (actived.classList.contains('collection-item')) {
					for (let element: HTMLElement | null = actived as HTMLElement; (element = element.parentElement); ) {
						element.querySelector(':scope > .collapsible-header')?.classList.add('actived');
					}
				}
			});
		});
}

function loadDocumentation(location: Location = window.location) {
	if (location.search) {
		const queries = location.search.substr(1).split('&');
		const version = queries.filter((query) => query.startsWith('version='));
		if (version.length > 0) {
			const ver = version[0].replace('version=', '');
			document.querySelectorAll('.version-select .input-field select').forEach((element) => {
				// @ts-ignore
				element.value = ver;
			});
			document.querySelectorAll('.version-select .input-field input').forEach((element) => {
				// @ts-ignore
				element.value = document.querySelector(`.version-select .input-field select option[value=${ver}]`).innerHTML;
			});
		}
		const href = queries.filter((query) => query.startsWith('href='));
		if (href.length > 0) {
			requestMarkdown(href[0].replace('href=', ''), location.hash ? location.hash.substr(1) : '');
		} else {
			requestMarkdown('/first');
		}
	} else {
		requestMarkdown('/first');
	}
}
loadDocumentation();

// Markdownをパース
function parseMarkdown(content: string) {
	function headline(markdown: string) {
		const lines = markdown.split('\n');
		let headline = [];
		let inCode = false;
		for (const it in lines) {
			if (lines[it].match(/^\`\`\`.?/)) inCode = !inCode;
			if (lines[it].startsWith('## ') && !inCode) headline.push(lines[it].replace(/^#+/, '').trim());
		}
		return headline;
	}

	// 見出し一覧を表示
	document.querySelector('.document-outline > .content')!.innerHTML = headline(content)
		.map((head) => `<a href="#${head}">${head}</a>`)
		.join('');

	// 見出し一覧をスムーススクロールに
	document.querySelectorAll('.document-outline > .content > a')!.forEach((link) => {
		link.addEventListener('click', smoothScroll);
	});

	// 本体をパース
	doc.innerHTML = marked(content);

	// リンクを設定
	setMarkdownLink();

	// アンカーリンクの設定
	document.querySelectorAll('.link-copy').forEach((element) => {
		const link = element as HTMLLinkElement;
		element.addEventListener('click', (e) => {
			// コピー
			const dummyElement = document.createElement('textarea');
			document.getElementById('document-content')!.appendChild(dummyElement);
			// @ts-ignore
			dummyElement.innerText = `${location.origin}${location.pathname}?version=${getVersion()}&href=${element.dataset.href}`;
			dummyElement.select();
			document.execCommand('copy');
			dummyElement.remove();

			// tooltip変更
			let initialTooltip: string | undefined;
			if (!link.dataset.copied) {
				initialTooltip = link.dataset.tooltip;
				link.dataset.tooltip = 'リンクをコピーしました';
				link.dataset.copied = 'true';
				const instance = M.Tooltip.getInstance(link);

				// @ts-ignore
				(instance.tooltipEl as HTMLDivElement).classList.add('copied');
				instance.options.html = `${link.dataset.tooltip}`;
				// @ts-ignore
				instance._updateTooltipContent();
				link.addEventListener('mouseleave', mouseleave);
			}
			function mouseleave(e: Event) {
				const instance = M.Tooltip.getInstance(link);
				link.dataset.tooltip = initialTooltip;
				link.dataset.copied = '';
				setTimeout(() => {
					// @ts-ignore
					(instance.tooltipEl as HTMLDivElement).classList.remove('copied');
				}, instance.options.exitDelay + instance.options.outDuration);
				link.removeEventListener('mouseleave', mouseleave);
			}

			return false;
		});
	});
	const instance = M.Tooltip.init(document.querySelectorAll('.tooltipped'));
}

// 進む・戻る時に更新
window.onpopstate = (e: PopStateEvent) => {
	// @ts-ignore
	loadDocumentation(e.currentTarget!.location);
};

// lg未満ならdiscoveryを表示
if (!localStorage.getItem('disableMenuDiscovery')) {
	setTimeout(() => {
		if (innerWidth < 993) M.TapTarget.getInstance(document.querySelector('.tap-target[data-target="index-list-trigger"]')!).open();
	}, 1000);
}
const closeDiscovery = () =>
	setTimeout(() => {
		M.TapTarget.getInstance(document.querySelector('.tap-target[data-target="index-list-trigger"]')!).close();
	}, 1);
document.getElementById('close-discovery')!.addEventListener('click', closeDiscovery);
document.getElementById('disable-discovery')!.addEventListener('click', () => {
	closeDiscovery();
	localStorage.setItem('disableMenuDiscovery', '1');
});

// content-spy
main.addEventListener('scroll', () => {
	const contents = document.querySelectorAll('#document-content h2');
	let active: string | null = null;
	contents.forEach((content) => {
		if (content.getBoundingClientRect().y < 100) {
			active = content.id;
		}
	});
	document.querySelectorAll('.document-outline > .content > a').forEach((content) => content.classList.remove('active'));
	if (active) document.querySelector(`.document-outline > .content > a[href="#${active}"]`)?.classList.add('active');
});

// スムーススクロール用関数
function smoothScroll(this: HTMLLinkElement, e: Event) {
	e.preventDefault();

	document.querySelector(this.getAttribute('href')!)!.scrollIntoView({
		behavior: 'smooth',
	});
}
