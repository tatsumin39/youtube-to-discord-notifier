# YouTube Channel Feed Automation

English follows Japanese.

## 概要
このGoogle Apps Script（GAS）は、YouTubeチャンネルの動画投稿や配信情報（配信予定、配信中、アーカイブ動画つまり配信終了）をDiscordチャンネルに通知することができます。配信情報には、配信予定時刻や配信タイトルの変更も含まれ、これらが変更された際にも通知を行います。

## 機能
- YouTubeチャンネルのRSSフィードから最新の動画情報を取得
- 取得した動画情報をGoogleスプレッドシートに保存
- 新しい動画がある場合、Discordに通知を送信
- チャンネルのアイコンURL更新機能

## 使い方
### Discord Webhookの設定
1. Discordで、通知を送信したいチャンネルを選択します。
2. チャンネルの設定（歯車アイコン）を開き、「統合」タブを選択します。
3. 「Webhooks」セクションで「新しいWebhook」をクリックします。
4. Webhookの名前を設定し、「Webhook URL」をコピーします。

### Googleスプレッドシートの準備
1. 新しいGoogleスプレッドシートを作成し、「channels」と「videoData」の2つのシートを準備します。
   - 「channels」シートで見出し行として、`CHANNEL_NAME`、`CHANNEL_ID`、`CHANNEL_ICON_URL`を設定します。
   - 「videoData」シートで見出し行として、`title`、`published`、`updated`、`videoId`、`channel`、`live`、`scheduledStartTime`、`actualStartTime`を設定します。

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

### How to Use
#### Setting Up Discord Webhook
1. In Discord, select the channel where you want to send notifications.
2. Open the channel settings (gear icon) and select the 'Integrations' tab.
3. In the 'Webhooks' section, click on 'New Webhook'.
4. Set the name for the Webhook and copy the 'Webhook URL'.

#### Preparing Google Spreadsheet
1. Create a new Google Spreadsheet and prepare two sheets: 'channels' and 'videoData'.
   - In the 'channels' sheet, set the header row with `CHANNEL_NAME`, `CHANNEL_ID`, `CHANNEL_ICON_URL`.
   - In the 'videoData' sheet, set the header row with `title`, `published`, `updated`, `videoId`, `channel`, `live`, `scheduledStartTime`, `actualStartTime`.

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

### Notes and Considerations

#### Real-time Notifications
- This system does not guarantee real-time notifications. There may be delays in notifications due to the reflection delay of YouTube's update information feed and the timing of trigger execution.

#### Adding Channel Information and Notifications
- Adding new channel information to the 'channels' sheet in the spreadsheet will retrieve past video information (about 5 items) of that channel and make them the subject of notifications.
- Especially during the initial execution, a large number of notifications may be generated, which may conflict with Discord's message limits. Consider this when adding channel information and managing the timing of script execution.

#### Handling Scheduled Broadcasts
- If a scheduled broadcast is set but does not take place, the status of that broadcast will remain as 'upcoming' in the `Live` column of the 'videoData' sheet. This is because the YouTube feed is not updated, and the script does not automatically update the status.

### Special Note
The `youtubeToDiscord.js` script uses Japanese for notification messages to Discord, comments, and debugging console.log statements. As the Japanese used is basic, please feel free to replace it with your preferred language as needed.

### Language Note
The `youtubeToDiscord.js` script uses Japanese for notification messages to Discord, comments, and debugging console.log statements. As the Japanese used is basic, please feel free to replace it with your preferred language as needed.


## License
[MIT License](LICENSE)

