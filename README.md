<img src="https://motionpicture.jp/images/common/logo_01.svg" alt="motionpicture" title="motionpicture" align="right" height="56" width="98"/>

# SSKTS API web application

[![CircleCI](https://circleci.com/gh/motionpicture/sskts-api.svg?style=svg&circle-token=9a0b1ea029ad57360986a0e17fdc74948e78575e)](https://circleci.com/gh/motionpicture/sskts-api)

## Getting Started

### インフラ
基本的にnode.jsのウェブアプリケーション。
ウェブサーバーとしては、AzureのWebApps or GCPのAppEngine or AWSのelastic beanstalkを想定。
全てで動くように開発していくことが望ましい。

### 言語
実態としては、linuxあるいはwindows上でのnode.js。プログラミング言語としては、TypeScript。

* [TypeScript](https://www.typescriptlang.org/)

### 開発方法
npmでパッケージをインストール。

```shell
npm install
```
* [npm](https://www.npmjs.com/)

typescriptをjavascriptにコンパイル。

```shell
npm run build -- -w
```

npmでローカルサーバーを起動。

```shell
npm start
```


### Environment variables

| Name                                      | Required              | Value                 | Purpose                           
|-------------------------------------------|-----------------------|-----------------------|-----------------------------------
| `DEBUG`                                   | false                 | sskts-api:*           | Debug
| `NPM_TOKEN`                               | true                  |                       | NPM auth token
| `NODE_ENV`                                | true                  |                       | environment name
| `MONGOLAB_URI`                            | true                  |                       | MongoDB connection URI
| `SENDGRID_API_KEY`                        | true                  |                       | SendGrid API Key
| `GMO_ENDPOINT`                            | true                  |                       | GMO API endpoint
| `GMO_SITE_ID`                             | true                  |                       | GMO SiteID
| `GMO_SITE_PASS`                           | true                  |                       | GMO SitePass
| `COA_ENDPOINT`                            | true                  |                       | COA API endpoint
| `COA_REFRESH_TOKEN`                       | true                  |                       | COA API refresh token
| `SSKTS_DEVELOPER_EMAIL`                   | true                  |                       | 開発者通知用メールアドレス
| `REDIS_HOST`                              | true                  |                       | 在庫状況保管用Redis Cache host
| `REDIS_PORT`                              | true                  |                       | 在庫状況保管用Redis Cache port
| `REDIS_KEY`                               | true                  |                       | 在庫状況保管用Redis Cache key
| `TRANSACTIONS_COUNT_UNIT_IN_SECONDS`      | true                  |                       | 取引数制限ユニット(秒)
| `NUMBER_OF_TRANSACTIONS_PER_UNIT`         | true                  |                       | ユニットあたりの最大取引数
| `RESOURECE_SERVER_IDENTIFIER`             | true                  |                       | リソースサーバーとしての固有識別子
| `TOKEN_ISSUER`                            | true                  | https://cognito-idp.ap-northeast-1.amazonaws.com/***** | Access token issuer(Cognito)
| `SSKTS_API_BASIC_AUTH_NAME`               | false                 |                       | Basic authentication user name
| `SSKTS_API_BASIC_AUTH_PASS`               | false                 |                       | Basic authentication user password
| `WEBSITE_NODE_DEFAULT_VERSION`            | only on Azure WebApps |                       | Node.js version
| `WEBSITE_TIME_ZONE`                       | only on Azure WebApps | Tokyo Standard Time   |


## tslint

コード品質チェックをtslintで行う。
* [tslint](https://github.com/palantir/tslint)
* [tslint-microsoft-contrib](https://github.com/Microsoft/tslint-microsoft-contrib)

`npm run check`でチェック実行。


## パッケージ脆弱性のチェック

* [nsp](https://www.npmjs.com/package/nsp)


## clean
`npm run clean`で不要なソース削除。


## テスト
`npm test`でテスト実行。


## ドキュメント
`npm run doc`でjsdocが作成されます。
