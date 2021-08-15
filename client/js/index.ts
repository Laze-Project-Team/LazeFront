// Materialize Init
const instances = M.Sidenav.init(document.querySelectorAll('.sidenav'), {
	edge: 'right',
	inDuration: 100,
	outDuration: 100,
});

// スムーススクロール
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
	anchor.addEventListener('click', function (e) {
		e.preventDefault();
		// @ts-ignore
		document.querySelector(this.getAttribute('href')).scrollIntoView({
			behavior: 'smooth',
		});

		// ページ内リンクでサイドバーオーバーレイを閉じる
		document.querySelectorAll('.sidenav-overlay').forEach((element) => {
			// @ts-ignore
			element.click();
			console.log('clicked');
		});
	});
});
