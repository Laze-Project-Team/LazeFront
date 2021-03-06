# 関数

Lazeは関数を宣言して呼び出すことで様々な処理を行うため、関数の理解は非常に重要です。	

## 宣言

以下の形で関数の宣言を行います。

```
関数:<関数名> ( <引数> ) => ( <戻り値> ) {
	<処理>
}
```

`<関数名>`にはその関数の関数名が入ります。

`<引数>`にはその関数の引数が入ります（省略可能）。引数とはその関数の処理に必要な値を関数の呼び出しの時に要求するものです。詳しくは[引数](#引数)をご覧ください。

`<戻り値>`にはその関数の戻り値が入ります（省略可能）。戻り値にはその関数の処理を終えた後に返ってくる値が入ります。詳しくは[戻り値](#戻り値)をご覧ください。

※現在は戻り値を複数指定することはできません

`<処理>`にはその関数で行う具体的な処理が入ります。

## 呼び出し

以下の形で関数の呼び出しを行います。

```
<関数名>( <引数> );
```

`<関数名>`にはその関数の関数名が入ります。

`<引数>`にはその関数を呼び出す際に指定する引数が入ります（省略可能）。

戻り値を受け取る場合は変数に入れるか、そのまま他の関数の引数として入力してください。

## 引数

関数には`引数`と呼ばれる値を渡すことができます。以下の例を見てみましょう。

```
関数:足し算 (整数:変数A, 整数:変数B) => (整数:結果) {
	結果 = 整数A + 整数B;
}
```

引数に`整数A`と`整数B`を取ってその和を返す関数`足し算`を宣言しています。引数は変数の宣言と同じ`<型>:<名前>`の形で左側の括弧内で宣言します。引数は何個でも持つことができます。

## 戻り値

引数と同じく`<型>:<名前>`の形で右側の括弧内に宣言します。引数とは異なり、戻り値は1つしか宣言することはできません。上のコードにあるように、変数の代入と同じ形で値を返します。