$(() => {
	let validFlags = {
		id: false,
		email: false,
		password: false,
		password_check: false,
	};
	const feedback = (input: JQuery<Element>, success: boolean, value: string) => {
		// @ts-ignore
		validFlags[input.prop('name')] = success;
		refreshSubmit();

		const form = input.parent();
		if (success) {
			if (form.hasClass('invalid')) form.removeClass('invalid');
			if (!form.hasClass('valid')) form.addClass('valid');
		} else {
			if (form.hasClass('valid')) form.removeClass('valid');
			if (!form.hasClass('invalid')) form.addClass('invalid');
		}
		input.nextAll('.feedback').html(value);
		input.nextAll('.feedback').css('display', 'block');
	};
	const resetFeedback = (input: JQuery<Element>) => {
		const form = input.parent();
		if (form.hasClass('valid')) form.removeClass('valid');
		if (form.hasClass('invalid')) form.removeClass('invalid');
		input.nextAll('.feedback').html('');
		input.nextAll('.feedback').css('display', 'none');
	};
	const refreshSubmit = () => {
		const button = $('#register-submit');
		if (Object.values(validFlags).every((item) => item)) {
			button.prop('disabled', false);
		} else {
			button.prop('disabled', true);
		}
	};
	// ユーザー名
	let idTimer: NodeJS.Timeout | undefined;
	$('#id').on('keyup', () => {
		$('#username').attr('placeholder', $('#id')?.val()?.toString() || '');
		if (idTimer) clearTimeout(idTimer);
		idTimer = setTimeout(() => {
			// 入力終了
			const id = $('#id').val()?.toString();
			const form = $('#id');
			if (id) {
				if (!id.match(/[^a-zA-Z0-9_]+/)) {
					fetch(`/register_check/id?id=${encodeURI(id)}`)
						.then((res) => res.json())
						.then((result: { success: boolean }) => {
							if (result.success) {
								feedback(form, result.success, '');
							} else {
								feedback(form, result.success, `<strong>${id}</strong>は利用できません`);
							}
						});
				} else {
					feedback(form, false, '使用不可能な文字が含まれています');
				}
			} else {
				resetFeedback(form);
			}
		}, 500);
	});
	// Eメールアドレス
	let emailTimer: NodeJS.Timeout | undefined;
	$('#email').on('keyup', () => {
		if (emailTimer) clearTimeout(emailTimer);
		emailTimer = setTimeout(() => {
			// 入力終了
			const email = $('#email').val()?.toString();
			const form = $('#email');
			if (email) {
				if (email.match(/^[^\s]+@[^\s]+$/)) {
					fetch(`/register_check/email?email=${encodeURI(email)}`)
						.then((res) => res.json())
						.then((result: { success: boolean }) => {
							if (result.success) {
								feedback(form, result.success, '');
							} else {
								feedback(form, result.success, `<strong>${email}</strong>は既に利用されています`);
							}
						});
				} else {
					feedback(form, false, `<strong>${email}</strong>は不正な形式です`);
				}
			} else {
				resetFeedback(form);
			}
		}, 500);
	});
	// パスワード
	let passTimer: NodeJS.Timeout | undefined;
	$('#password').on('keyup', () => {
		if (passTimer) clearTimeout(passTimer);
		passTimer = setTimeout(() => {
			// 入力終了
			const password = $('#password').val()?.toString();
			const form = $('#password');
			if (password) {
				if (password.length < 8) {
					feedback(form, false, 'パスワードは8文字以上である必要があります');
				} else if (password.length > 72) {
					feedback(form, false, 'パスワードは72文字以下である必要があります');
				} else if (password.match(/[A-Z]/) === null) {
					feedback(form, false, 'パスワードは大文字を1文字以上含んでいる必要があります');
				} else if (password.match(/[0-9]/) === null) {
					feedback(form, false, 'パスワードは数字を1文字以上含んでいる必要があります');
				} else {
					feedback(form, true, '');
				}
			} else {
				resetFeedback(form);
			}
		}, 500);
	});

	// パスワードの確認
	let passCheckTimer: NodeJS.Timeout | undefined;
	$('#password-check').on('keyup', () => {
		if (passCheckTimer) clearTimeout(passCheckTimer);
		passCheckTimer = setTimeout(() => {
			// 入力終了
			const password = $('#password-check').val()?.toString();
			const form = $('#password-check');
			if (password) {
				if (password == $('#password').val()) {
					feedback(form, true, '');
				} else {
					feedback(form, false, 'パスワードが一致しません');
				}
			} else {
				resetFeedback(form);
			}
		}, 500);
	});
});
