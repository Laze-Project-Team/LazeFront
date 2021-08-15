/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./client/js/index.ts":
/*!****************************!*\
  !*** ./client/js/index.ts ***!
  \****************************/
/***/ (() => {

eval("\r\n// Materialize Init\r\nvar instances = M.Sidenav.init(document.querySelectorAll('.sidenav'), {\r\n    edge: 'right',\r\n    inDuration: 100,\r\n    outDuration: 100,\r\n});\r\n// スムーススクロール\r\ndocument.querySelectorAll('a[href^=\"#\"]').forEach(function (anchor) {\r\n    anchor.addEventListener('click', function (e) {\r\n        e.preventDefault();\r\n        // @ts-ignore\r\n        document.querySelector(this.getAttribute('href')).scrollIntoView({\r\n            behavior: 'smooth',\r\n        });\r\n        // ページ内リンクでサイドバーオーバーレイを閉じる\r\n        document.querySelectorAll('.sidenav-overlay').forEach(function (element) {\r\n            // @ts-ignore\r\n            element.click();\r\n            console.log('clicked');\r\n        });\r\n    });\r\n});\r\n\n\n//# sourceURL=webpack://lazefront/./client/js/index.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./client/js/index.ts"]();
/******/ 	
/******/ })()
;