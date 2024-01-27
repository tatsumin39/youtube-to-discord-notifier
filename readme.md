# YouTube Channel Feed Automation

English follows Japanese.

## 概要
このGoogle Apps Script（GAS）は、YouTubeチャンネルの動画投稿や配信情報（配信予定、配信中、アーカイブ動画つまり配信終了）をDiscordチャンネルに通知することができます。配信情報には、配信予定時刻や配信タイトルの変更も含まれ、これらが変更された際にも通知を行います。

## 機能
- YouTubeチャンネルのRSSフィードから最新の動画情報を取得
- 取得した動画情報をGoogleスプレッドシートに保存
- 新しい動画がある場合、Discordに通知を送信
- チャンネルのアイコンURL更新機能

#### オプション機能：複数のDiscordチャンネルに通知を送信

この機能を使用すると、複数のDiscordチャンネルに通知を行うことができます。スプレッドシートの「channels」シートに新たな列 `discordChannelId` を追加して、各YouTubeチャンネルに対応するDiscordチャンネルの識別子を記入します。

- `discordChannelId` 列は任意であり、この列が空の場合はGoogle Apps Scriptのセットアップの2. のプロパティ名: `discordWebhookUrl`のDiscord Webhook URLが使用されます。
- 特定のDiscordチャンネルのWebhook URLは、スクリプトの `PropertiesService` に登録する必要があります。

この機能により、異なるYouTubeチャンネルに対して異なるDiscordチャンネルに通知を送ることができるようになり、より柔軟な通知システムを実現できます。

## 使い方
### Discord Webhookの設定
1. Discordで、通知を送信したいチャンネルを選択します。
2. チャンネルの設定（歯車アイコン）を開き、「統合」タブを選択します。
3. 「Webhooks」セクションで「新しいWebhook」をクリックします。
4. Webhookの名前を設定し、「Webhook URL」をコピーします。

### Googleスプレッドシートの準備
1. 新しいGoogleスプレッドシートを作成し、「channels」と「videoData」の2つのシートを準備します。
   - 「channels」シートで見出し行として、`CHANNEL_NAME`、`CHANNEL_ID`、`CHANNEL_ICON_URL`、`discordChannelId`を設定します。
   - 「videoData」シートで見出し行として、`title`、`published`、`updated`、`videoId`、`channel`、`live`、`scheduledStartTime`、`actualStartTime`、`duration`を設定します。

### Google Apps Scriptのセットアップ
1. スプレッドシートの「拡張機能」メニューから「Apps Script」を選択します。
2. Apps Scriptのプロジェクトの設定を開き、スクリプト プロパティに以下の設定を追加します：
   - プロパティ名: `discordWebhookUrl`、値: Discordで発行したWebhook URL
   - プロパティ名: `sheetId`、値: 用意したGoogleスプレッドシートのID
3. 本プロジェクトのスクリプトファイル `youtubeToDiscord.js`をコピーしてスクリプトエディタにペーストします。
4. スクリプトエディタの「ライブラリ」セクションで、dayjsライブラリを追加します。ライブラリのIDは `1ShsRhHc8tgPy5wGOzUvgEhOedJUQD53m-gd8lG2MOgs-dXC_aCZn9lFB` です。
5. スクリプトエディタの「サービス」セクションでYouTube Data API v3を有効にします。
6. (任意) Google Cloud Platformで新しいプロジェクトを作成し、YouTube Data API v3を有効にします。これにより、APIの使用量を監視し、1日あたりの制限に抵触するリスクを管理できます。
7. (任意) Apps ScriptプロジェクトをGCPプロジェクトに紐づけるため、Apps Scriptの「プロジェクトの設定」から「Google Cloud Platform（GCP）プロジェクト」を選択し、GCPプロジェクトのIDを入力します。
8. スクリプトを初めて実行する際、画面上の指示に従ってYouTube Data API v3へのアクセス許可を与えます。

### トリガーの設定
1. Apps Scriptの「トリガー」メニューから、新しいトリガーを追加します。
2. 「実行する関数」で `fetchUpdateAndNotify` を選択します。
3. 「時間主導型」トリガーを選択し、実行間隔を「5分おき」に設定します。

#### オプション機能用の追加設定

オプション機能「複数のDiscordチャンネルに通知を送信する機能」を使用する場合、各Discordチャンネルに対応するWebhook URLをスクリプト プロパティに追加する必要があります。以下のように設定してください：

- `discordWebhookUrl` はデフォルトのDiscord Webhook URLを指定します。これは、`discordChannelId` 列が空の場合に使用されます。
- 各特定のDiscordチャンネルのWebhook URLは、それぞれ異なるプロパティ名で追加します。例えば、特定のチャンネルの識別子が `myDiscordChannel` の場合、そのプロパティ名を `myDiscordChannel` とし、値にはそのチャンネルのWebhook URLを設定します。

## 注意事項および留意事項

### リアルタイム通知について
- 本システムはリアルタイム通知を保証するものではありません。YouTubeの更新情報のフィードへの反映遅延やトリガー実行のタイミングにより、通知が遅れる可能性があります。

### チャンネル情報の追加と通知
- スプレッドシートの「channels」シートに新しいチャンネル情報を追加すると、そのチャンネルの過去の動画情報（約5件）が取得され、通知対象となります。
- 特に初回実行時は、通知が大量に発生する可能性があり、Discordのメッセージ制限に抵触することがあります。この点を考慮して、チャンネル情報の追加とスクリプトの実行タイミングを慎重に管理してください。

### 配信予定の取り扱い
- 配信予定が設定されているにもかかわらず配信が行われなかった場合、スプレッドシートの「videoData」シートにおいて、その配信のステータスは `Live` カラムに `upcoming` として残り続けます。これはYouTubeのフィードが更新されないためであり、スクリプトが自動的にステータスを更新しないためです。

## ライセンス
[MIT License](LICENSE)

## English Version

### Overview
This Google Apps Script (GAS) allows you to notify a Discord channel about new video postings and broadcast information (upcoming broadcasts, live broadcasts, and archived videos meaning broadcast ended) from YouTube channels. The broadcast information includes changes in scheduled times and titles, and notifications will be sent when these are changed.

### Features
- Retrieves the latest video information from the RSS feed of YouTube channels
- Saves the obtained video information to a Google Spreadsheet
- Sends notifications to Discord when new videos are available
- Updates channel icon URL functionality

#### Optional Feature: Sending Notifications to Multiple Discord Channels

By using this feature, you can send notifications to multiple Discord channels. Add a new column `discordChannelId` to the 'channels' sheet in the spreadsheet and enter the identifiers for the Discord channels corresponding to each YouTube channel.

- The `discordChannelId` column is optional, and if this column is empty, the Discord Webhook URL specified in 'Property name: `discordWebhookUrl`' under Google Apps Script Setup, point 2, will be used.
- The Webhook URL for each specific Discord channel needs to be registered in the script's `PropertiesService`.

This feature allows you to send notifications to different Discord channels for different YouTube channels, enabling a more flexible notification system.

### How to Use
#### Setting Up Discord Webhook
1. In Discord, select the channel where you want to send notifications.
2. Open the channel settings (gear icon) and select the 'Integrations' tab.
3. In the 'Webhooks' section, click on 'New Webhook'.
4. Set the name for the Webhook and copy the 'Webhook URL'.

#### Preparing Google Spreadsheet
1. Create a new Google Spreadsheet and prepare two sheets: 'channels' and 'videoData'.
   - In the 'channels' sheet, set the header row with `CHANNEL_NAME`, `CHANNEL_ID`, `CHANNEL_ICON_URL`.
   - In the 'videoData' sheet, set the header row with `title`, `published`, `updated`, `videoId`, `channel`, `live`, `scheduledStartTime`, `actualStartTime`, `duration`.

### Google Apps Script Setup
1. From the 'Extensions' menu in the spreadsheet, select 'Apps Script'.
2. Open the project settings in Apps Script and add the following script properties:
   - Property name: `discordWebhookUrl`, Value: The Webhook URL issued by Discord
   - Property name: `sheetId`, Value: The ID of the prepared Google Spreadsheet
3. Copy the script file `youtubeToDiscord.js` of this project and paste it into the script editor.
4. In the 'Library' section of the script editor, add the dayjs library. The library ID is `1ShsRhHc8tgPy5wGOzUvgEhOedJUQD53m-gd8lG2MOgs-dXC_aCZn9lFB`.
5. Enable YouTube Data API v3 in the 'Services' section of the script editor.
6. (Optional) Create a new project in Google Cloud Platform and enable YouTube Data API v3. This allows you to monitor API usage and manage the risk of hitting daily limits.
7. (Optional) To link the Apps Script project with the GCP project, select 'Google Cloud Platform (GCP) Project' in the 'Project Settings' of Apps Script and enter the ID of the GCP project.
8. When running the script for the first time, follow the on-screen instructions to grant access to YouTube Data API v3.

#### Setting Up Triggers
1. From the 'Triggers' menu in Apps Script, add a new trigger.
2. Select `fetchUpdateAndNotify` for 'Choose which function to run'.
3. Choose 'Time-driven' trigger and set the execution interval to 'Every 5 minutes'.

#### Additional Settings for the Optional Feature

When using the optional feature 'Sending Notifications to Multiple Discord Channels', you need to add the Webhook URL for each Discord channel to the script properties. Set it up as follows:

- `discordWebhookUrl` specifies the default Discord Webhook URL, which is used when the `discordChannelId` column is empty.
- The Webhook URL for each specific Discord channel should be added with a different property name. For example, if the identifier for a specific channel is `myDiscordChannel`, set the property name to `myDiscordChannel` and specify that channel's Webhook URL as its value.

### Notes and Considerations

#### Real-time Notifications
- This system does not guarantee real-time notifications. There may be delays in notifications due to the reflection delay of YouTube's update information feed and the timing of trigger execution.

#### Adding Channel Information and Notifications
- Adding new channel information to the 'channels' sheet in the spreadsheet will retrieve past video information (about 5 items) of that channel and make them the subject of notifications.
- Especially during the initial execution, a large number of notifications may be generated, which may conflict with Discord's message limits. Consider this when adding channel information and managing the timing of script execution.

#### Handling Scheduled Broadcasts
- If a scheduled broadcast is set but does not take place, the status of that broadcast will remain as 'upcoming' in the `Live` column of the 'videoData' sheet. This is because the YouTube feed is not updated, and the script does not automatically update the status.

### Language Note
The `youtubeToDiscord.js` script uses Japanese for notification messages to Discord, comments, and debugging console.log statements. As the Japanese used is basic, please feel free to replace it with your preferred language as needed.


## License
[MIT License](LICENSE)

