// 待機中のアニメーション
{
	const lastDiv = <HTMLDivElement>document.querySelector('#waiting-screen .animation div:last-child');
	lastDiv.addEventListener('animationend', () => document.querySelectorAll('#waiting-screen .animation div').forEach((div) => div.classList.toggle('load')));

	const ripples = <NodeListOf<HTMLDivElement>>document.querySelectorAll('.ripples > div');
	ripples.forEach((ripple) => {
		ripple.addEventListener('animationend', () => {
			ripple.style.animation = 'none';
			ripple.offsetHeight;
			// @ts-ignore
			ripple.style.animation = null;
			ripple.style.top = `${Math.random() * 100}%`;
			ripple.style.left = `${Math.random() * 100}%`;
		});
	});
}

// ボタン類
{
	const games = require('./game/main.js');

	const btnStart = document.getElementById('start')!;
	const btnHowToPlay = document.getElementById('how-to-play')!;
	const btnReturn = document.getElementById('return')!;
	const btnCancel = document.getElementById('cancel')!;
	const screen = document.querySelector('.game-screen')!;
	const sceneTransition = (before: string, after: string) => {
		screen.classList.add('scene-transition');
		setTimeout(() => screen.classList.replace(before, after), 500);
		setTimeout(() => screen.classList.remove('scene-transition'), 1000);
	};
	btnStart.addEventListener('click', () => {
		sceneTransition('scene-title', 'scene-waiting');
		(document.querySelectorAll('#waiting-screen .animation div') as NodeListOf<HTMLDivElement>).forEach((div) => {
			div.style.animation = 'none';
			div.offsetHeight;
			// @ts-ignore
			div.style.animation = null;
		});
		games.connect4(() => sceneTransition('scene-waiting', 'scene-game'));
	});
	btnHowToPlay.addEventListener('click', () => sceneTransition('scene-title', 'scene-how-to-play'));
	btnReturn.addEventListener('click', () => sceneTransition('scene-how-to-play', 'scene-title'));
	btnCancel.addEventListener('click', () => {
		sceneTransition('scene-waiting', 'scene-title');
		// games.cancel();
	});
}
