"use strict";
$(function () {
    var validFlags = {
        id: false,
        email: false,
        password: false,
        password_check: false,
    };
    var feedback = function (input, success, value) {
        // @ts-ignore
        validFlags[input.prop('name')] = success;
        refreshSubmit();
        var form = input.parent();
        if (success) {
            if (form.hasClass('invalid'))
                form.removeClass('invalid');
            if (!form.hasClass('valid'))
                form.addClass('valid');
        }
        else {
            if (form.hasClass('valid'))
                form.removeClass('valid');
            if (!form.hasClass('invalid'))
                form.addClass('invalid');
        }
        input.nextAll('.feedback').html(value);
        input.nextAll('.feedback').css('display', 'block');
    };
    var resetFeedback = function (input) {
        var form = input.parent();
        if (form.hasClass('valid'))
            form.removeClass('valid');
        if (form.hasClass('invalid'))
            form.removeClass('invalid');
        input.nextAll('.feedback').html('');
        input.nextAll('.feedback').css('display', 'none');
    };
    var refreshSubmit = function () {
        var button = $('#register-submit');
        if (Object.values(validFlags).every(function (item) { return item; })) {
            button.prop('disabled', false);
        }
        else {
            button.prop('disabled', true);
        }
    };
    // ユーザー名
    var idTimer;
    $('#id').on('keyup', function () {
        var _a, _b;
        $('#username').attr('placeholder', ((_b = (_a = $('#id')) === null || _a === void 0 ? void 0 : _a.val()) === null || _b === void 0 ? void 0 : _b.toString()) || '');
        if (idTimer)
            clearTimeout(idTimer);
        idTimer = setTimeout(function () {
            var _a;
            // 入力終了
            var id = (_a = $('#id').val()) === null || _a === void 0 ? void 0 : _a.toString();
            var form = $('#id');
            if (id) {
                if (!id.match(/[^a-zA-Z0-9_]+/)) {
                    fetch("/register_check/id?id=" + encodeURI(id))
                        .then(function (res) { return res.json(); })
                        .then(function (result) {
                        if (result.success) {
                            feedback(form, result.success, '');
                        }
                        else {
                            feedback(form, result.success, "<strong>" + id + "</strong>\u306F\u5229\u7528\u3067\u304D\u307E\u305B\u3093");
                        }
                    });
                }
                else {
                    feedback(form, false, '使用不可能な文字が含まれています');
                }
            }
            else {
                resetFeedback(form);
            }
        }, 500);
    });
    // Eメールアドレス
    var emailTimer;
    $('#email').on('keyup', function () {
        if (emailTimer)
            clearTimeout(emailTimer);
        emailTimer = setTimeout(function () {
            var _a;
            // 入力終了
            var email = (_a = $('#email').val()) === null || _a === void 0 ? void 0 : _a.toString();
            var form = $('#email');
            if (email) {
                if (email.match(/^[^\s]+@[^\s]+$/)) {
                    fetch("/register_check/email?email=" + encodeURI(email))
                        .then(function (res) { return res.json(); })
                        .then(function (result) {
                        if (result.success) {
                            feedback(form, result.success, '');
                        }
                        else {
                            feedback(form, result.success, "<strong>" + email + "</strong>\u306F\u65E2\u306B\u5229\u7528\u3055\u308C\u3066\u3044\u307E\u3059");
                        }
                    });
                }
                else {
                    feedback(form, false, "<strong>" + email + "</strong>\u306F\u4E0D\u6B63\u306A\u5F62\u5F0F\u3067\u3059");
                }
            }
            else {
                resetFeedback(form);
            }
        }, 500);
    });
    // パスワード
    var passTimer;
    $('#password').on('keyup', function () {
        if (passTimer)
            clearTimeout(passTimer);
        passTimer = setTimeout(function () {
            var _a;
            // 入力終了
            var password = (_a = $('#password').val()) === null || _a === void 0 ? void 0 : _a.toString();
            var form = $('#password');
            if (password) {
                if (password.length < 8) {
                    feedback(form, false, 'パスワードは8文字以上である必要があります');
                }
                else if (password.length > 72) {
                    feedback(form, false, 'パスワードは72文字以下である必要があります');
                }
                else if (password.match(/[A-Z]/) === null) {
                    feedback(form, false, 'パスワードは大文字を1文字以上含んでいる必要があります');
                }
                else if (password.match(/[0-9]/) === null) {
                    feedback(form, false, 'パスワードは数字を1文字以上含んでいる必要があります');
                }
                else {
                    feedback(form, true, '');
                }
            }
            else {
                resetFeedback(form);
            }
        }, 500);
    });
    // パスワードの確認
    var passCheckTimer;
    $('#password-check').on('keyup', function () {
        if (passCheckTimer)
            clearTimeout(passCheckTimer);
        passCheckTimer = setTimeout(function () {
            var _a;
            // 入力終了
            var password = (_a = $('#password-check').val()) === null || _a === void 0 ? void 0 : _a.toString();
            var form = $('#password-check');
            if (password) {
                if (password == $('#password').val()) {
                    feedback(form, true, '');
                }
                else {
                    feedback(form, false, 'パスワードが一致しません');
                }
            }
            else {
                resetFeedback(form);
            }
        }, 500);
    });
});
