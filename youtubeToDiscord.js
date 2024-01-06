// YouTubeのRSS URLのプレフィックス
const youtubeRssUrlPrefix = "https://www.youtube.com/feeds/videos.xml?channel_id=";

// XML名前空間の定義
const youtubeNamespace = XmlService.getNamespace('yt', 'http://www.youtube.com/xml/schemas/2015');
const atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');

// 日付をフォーマットする関数
function formatDate(dateString, format = 'YYYY/MM/DDTHH:mm:ss') {
  return dateString ? dayjs.dayjs(dateString).format(format) : '';
}

// スプレッドシートから特定の範囲のデータを取得する関数
function getSpreadsheetData(sheet, range) {
  return sheet.getRange(range).getValues();
}

// スプレッドシートの設定
const spreadsheetId = PropertiesService.getScriptProperties().getProperty('sheetId');
const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
const videoDataSheetName = 'videoData';
const videoDataSheet = spreadsheet.getSheetByName(videoDataSheetName);

// スプレッドシートのデータを一度取得して保持
const globalSheetData = getSpreadsheetData(videoDataSheet, videoDataSheet.getDataRange().getA1Notation());

// URLがアクセス可能かどうかを確認する関数
function isUrlAccessible(url) {
  try {
    const response = UrlFetchApp.fetch(url, { method: 'GET', muteHttpExceptions: true });
    return response.getResponseCode() == 200;
  } catch (e) {
    return false;
  }
}

// YouTube APIを使用してチャンネル情報を取得する関数
function fetchChannelInfo(channelId) {
  const response = YouTube.Channels.list('snippet', {
    id: channelId,
    maxResults: 1
  });

  if (!response || !response.items || response.items.length === 0) {
    console.log(`チャンネルID ${channelId} の情報が見つかりませんでした。`);
    return null;
  }

  return response.items[0].snippet;
}

// スプレッドシート内のチャンネルアイコンURLを更新する関数
function updateChannelIcon(channelId) {
  try {
    const snippet = fetchChannelInfo(channelId);
    if (!snippet) {
      console.log(`チャンネルID ${channelId} の情報が見つかりませんでした。`);
      return null;
    }

    // アイコンURLの更新
    const channelIconUrl = snippet.thumbnails.default.url;
    const channelsSheet = spreadsheet.getSheetByName('channels');
    const channels = getSpreadsheetData(channelsSheet, 'A:C');

    for (let i = 0; i < channels.length; i++) {
      if (channels[i][1] === channelId) {
        channelsSheet.getRange(i + 1, 3).setValue(channelIconUrl);
        break;
      }
    }
  } catch (e) {
    console.log(`チャンネルID ${channelId} のアイコン更新中にエラーが発生しました: ${e.message}`);
  }
}

// スプレッドシートからYouTube APIを使用してチャンネルアイコンを取得または更新する関数
function getChannelIcon(channelId) {
  const channelsSheet = spreadsheet.getSheetByName('channels');
  const channelDataValues = getSpreadsheetData(channelsSheet, 'A:C');

  let rowIndex = -1;

  for (let i = 0; i < channelDataValues.length; i++) {
    if (channelDataValues[i][1] === channelId) {
      rowIndex = i;
      if (channelDataValues[i][2]) {
        return channelDataValues[i][2];
      }
      break;
    }
  }

  const channelInfo = fetchChannelInfo(channelId);

  if (channelInfo && rowIndex !== -1) {
    const iconUrl = channelInfo.thumbnails.default.url;
    channelsSheet.getRange(rowIndex + 1, 3).setValue(iconUrl);
    return iconUrl;
  } else {
    return null;
  }
}

// Discordへの投稿テキストを生成する関数
function description_text(apiLiveBroadcastContent, time, specialMessage = '') {
  if (specialMessage) {
    return specialMessage;
  }
  
  switch (apiLiveBroadcastContent) {
    case 'upcoming':
      return formatDate(time, 'MM/DD HH:mm') + 'から配信予定！';
    case 'live':
      return formatDate(time, 'HH:mm') + 'から配信中！';
    case 'none':
    case 'archive':
      return 'アーカイブはこちら';
    case 'video':
      return '動画が投稿されました';
    default:
      return 'new content!';
  }
}

// スプレッドシートからチャンネル情報を初期化する関数
function loadAndVerifyChannelData() {
  const channelsSheet = spreadsheet.getSheetByName('channels');
  const lastRow = channelsSheet.getLastRow();
  const channelsData = [];

  for (let i = 2; i <= lastRow; i++) {
    const row = getSpreadsheetData(channelsSheet, `${i}:${i}`)[0];
    const channelId = row[1];
    const channelIconUrl = row[2];
    
    if (!isUrlAccessible(channelIconUrl)) {
      const updatedIconUrl = updateChannelIcon(channelId);
      channelsSheet.getRange(i, 3).setValue(updatedIconUrl);
      channelsData.push([row[0], channelId, updatedIconUrl]);
    } else {
      channelsData.push(row);
    }
  }
  
  channels = channelsData;
  return channelsData;
}

// チャンネルの更新とフィード取得を処理するメイン関数
function processChannelFeed(channelName, channelId, channels, channelIcon) {
  console.log(`処理を開始: チャンネル名 ${channelName}`);
  let return_info = false;
  let channelArray = channels.find(channelArray => channelArray[1] === channelId);

  if (!channelArray) {
    return false;
  }
  
  const channel = channelArray[0];
  const videoDataSheet = spreadsheet.getSheetByName('videoData');
  const channelRssUrl = youtubeRssUrlPrefix + channelId;
  const xml = UrlFetchApp.fetch(channelRssUrl).getContentText();
  const docs = XmlService.parse(xml);
  const root = docs.getRootElement();
  const items = root.getChildren('entry', atom).slice(0, 5);
  let newVideoDataRows = [];

  for (let i = 0; i < items.length; i++) {
    const feedTitle = items[i].getChildText('title', atom);
    const feedUpdated = formatDate(items[i].getChildText('updated', atom));
    const feedPublished = formatDate(items[i].getChildText('published', atom));
    const feedVideoId = items[i].getChildText('videoId', youtubeNamespace);
    const [isNewVideo, liveBroadcastContent, scheduledStartTime, actualStartTime] = getVideoInfoFromSheet(globalSheetData, feedVideoId);

    if (isNewVideo) {
      let formattedScheduledStartTime = scheduledStartTime ? formatDate(scheduledStartTime) : '';
      let formattedActualStartTime = actualStartTime ? formatDate(actualStartTime) : '';
      let APILiveBroadcastContent = liveBroadcastContent;

      newVideoDataRows.push([
        feedTitle, 
        feedPublished, 
        feedUpdated, 
        feedVideoId, 
        channel, 
        APILiveBroadcastContent, 
        formattedScheduledStartTime, 
        formattedActualStartTime
      ]);

      postToDiscord({
        channel: channel,
        title: feedTitle,
        videoId: feedVideoId,
        description_text: description_text(liveBroadcastContent, formattedActualStartTime || formattedScheduledStartTime)
      }, channelIcon);
    } else {
      let SheetLiveBroadcastContent = liveBroadcastContent;
      const data = [feedTitle, feedPublished, feedUpdated, feedVideoId, channel, SheetLiveBroadcastContent, scheduledStartTime ? scheduledStartTime : ''];
      
      updateChecker(data, channelIcon);
    }
  }

  if (newVideoDataRows.length > 0) {
    videoDataSheet.getRange(videoDataSheet.getLastRow() + 1, 1, newVideoDataRows.length, newVideoDataRows[0].length).setValues(newVideoDataRows);
  }
  return return_info;
}

// チャンネルデータを保存し、更新する関数
function updateAllChannels() {
  let update = false;

  channels.forEach((channelArray) => {
    const channelName = channelArray[0];
    const channelId = channelArray[1];
    const channelIcon = getChannelIcon(channelId);
    update = processChannelFeed(channelName, channelId, channels, channelIcon) || update;
  });
  console.log('completed!');
}

// スプレッドシートからビデオ情報を見つける関数
function getVideoInfoFromSheet(sheetData, videoId) {
  var sheetVideoIds = sheetData.map(row => row[3]);
  var index = sheetVideoIds.indexOf(videoId);

  if (index === -1) {
    // スプレッドシートに情報がない場合、fetchVideoInfoを使用して情報を取得
    const videoInfo = fetchVideoInfo(videoId);
    if (!videoInfo) {
      console.log(`ビデオ情報が見つかりませんでした - ビデオID: ${videoId}`);
      return [false, null, null, null, false];
    }

    // APIから取得した情報を使用
    var apiLiveBroadcastContent = videoInfo.liveBroadcastContent;
    var apiScheduledStartTime = videoInfo.scheduledStartTime;
    var apiActualStartTime = videoInfo.actualStartTime;

    return [true, apiLiveBroadcastContent, apiScheduledStartTime, apiActualStartTime, false];
  } else {
    // スプレッドシートから情報を取得
    const rowData = sheetData[index];
    var sheetLastUpdated = formatDate(rowData[2]);
    var sheetLiveBroadcastContent = rowData[5];
    var sheetScheduledStartTime = rowData[6];

    return [false, sheetLiveBroadcastContent, sheetScheduledStartTime, null, sheetLastUpdated];
  }
}

// YouTube APIを使用してビデオ情報を取得する関数
function fetchVideoInfo(videoId) {
  try{
    // YouTube APIを使用してビデオの詳細情報を取得
    const videoApiResponse = YouTube.Videos.list('id, snippet, liveStreamingDetails',{
      id: videoId,
      fields: 'items(id, snippet(liveBroadcastContent, title), liveStreamingDetails(scheduledStartTime, actualStartTime, actualEndTime))'
    });

    if(!videoApiResponse || videoApiResponse.items.length === 0) {
      throw new Error('ビデオ情報が見つかりませんでした');
    }
    
    const apiVideoInfo = videoApiResponse.items[0];
    console.log('YouTube.Videos.list API実行:' + apiVideoInfo.snippet.title);

    // レスポンスから必要なビデオ情報を抽出
    let liveBroadcastContent = 'none';
    if('liveStreamingDetails' in apiVideoInfo) {
      if('actualStartTime' in apiVideoInfo.liveStreamingDetails && !('actualEndTime' in apiVideoInfo.liveStreamingDetails)) {
        liveBroadcastContent = 'live';
      } else if(!('actualStartTime' in apiVideoInfo.liveStreamingDetails) && 'scheduledStartTime' in apiVideoInfo.liveStreamingDetails) {
        liveBroadcastContent = 'upcoming';
      } else if('actualEndTime' in apiVideoInfo.liveStreamingDetails) {
        liveBroadcastContent = 'archive';
      }
    } else{
      // liveStreamingDetailsが存在しない場合は、通常の動画投稿と見なす
      liveBroadcastContent = 'video';
    }

    return{
      liveBroadcastContent: liveBroadcastContent,
      title: apiVideoInfo.snippet.title,
      scheduledStartTime: 'liveStreamingDetails' in apiVideoInfo ? apiVideoInfo.liveStreamingDetails.scheduledStartTime : false,
      actualStartTime: 'liveStreamingDetails' in apiVideoInfo && 'actualStartTime' in apiVideoInfo.liveStreamingDetails ? apiVideoInfo.liveStreamingDetails.actualStartTime : false,
      actualEndTime: 'liveStreamingDetails' in apiVideoInfo && 'actualEndTime' in apiVideoInfo.liveStreamingDetails ? apiVideoInfo.liveStreamingDetails.actualEndTime : false
    };
  } catch(error) {
    // API呼び出し中にエラーが発生した場合、コンソールにエラー情報を出力
    console.log(`fetchVideoInfoでエラーが発生しました - ビデオID: ${videoId}, エラーメッセージ: ${error.message}`);

    // フォールバック処理: デフォルトのビデオ情報を返す
    return{
      liveBroadcastContent: 'none',
      title: false,
      scheduledStartTime: false,
      actualStartTime: false,
      actualEndTime: false
    };
  }
}


// スプレッドシートに最新のビデオ情報を更新する関数
function updateVideoInfoInSheet(title, feedPublished, feedUpdated, videoId, apiLiveBroadcastContent, scheduledStartTime, actualStartTime) {
  const videoDataSheet = spreadsheet.getSheetByName(videoDataSheetName);
  const lr = videoDataSheet.getLastRow();
  const videoIdColumnData = getSpreadsheetData(videoDataSheet, `D1:D${lr}`);
  const rowIndex = videoIdColumnData.findIndex(row => row[0] == videoId) + 1;
  
  // 各値をフォーマットしてスプレッドシートに設定
  const formattedScheduledStartTime = formatDate(scheduledStartTime);
  const formattedActualStartTime = formatDate(actualStartTime);
  const formattedFeedPublished = formatDate(feedPublished);
  const formattedFeedUpdated = formatDate(feedUpdated);

  videoDataSheet.getRange(rowIndex, 1).setValue(title);
  videoDataSheet.getRange(rowIndex, 2).setValue(formattedFeedPublished);
  videoDataSheet.getRange(rowIndex, 3).setValue(formattedFeedUpdated);
  videoDataSheet.getRange(rowIndex, 6).setValue(apiLiveBroadcastContent);
  videoDataSheet.getRange(rowIndex, 7).setValue(formattedScheduledStartTime);
  videoDataSheet.getRange(rowIndex, 8).setValue(formattedActualStartTime);
}

// ビデオ情報の更新を確認し、必要に応じてDiscordに投稿する関数
function updateChecker(data, channelIcon) {
  const [feedTitle, feedPublished, feedUpdated, feedVideoId, channel, sheetLiveBroadcastContent, sheetScheduledStartTime, sheetActualStartTime] = data;
  
  if (sheetLiveBroadcastContent == 'upcoming' || sheetLiveBroadcastContent == 'live') {
    try {
      const videoDataSheet = spreadsheet.getSheetByName(videoDataSheetName);
      const videoIdsFromSheet = videoDataSheet.getRange(1, 4, videoDataSheet.getLastRow()).getValues(); 
      const index = videoIdsFromSheet.flat().indexOf(feedVideoId);
      const sheetVideoLastUpdated = formatDate(videoDataSheet.getRange(index + 1, 3).getValue());
      const sheetTitle = videoDataSheet.getRange(index + 1, 1).getValue();

      if (feedUpdated !== sheetVideoLastUpdated) {
        const apiVideoInfo = fetchVideoInfo(feedVideoId);
        if (!apiVideoInfo) {
          console.log(`ビデオ情報が見つかりませんでした - ビデオID: ${feedVideoId}`);
          return;
        }

        const formattedSheetScheduledStartTime = formatDate(sheetScheduledStartTime);
        const apiLiveBroadcastContent = apiVideoInfo.liveBroadcastContent;
        const apiScheduledStartTime = formatDate(apiVideoInfo.scheduledStartTime);
        const apiActualStartTime = formatDate(apiVideoInfo.actualStartTime);
        const apiTitle = apiVideoInfo.title;
        
        let description;
        let isChanged = false; 

        if (sheetLiveBroadcastContent != apiLiveBroadcastContent) {
          description = description_text(apiLiveBroadcastContent, apiActualStartTime);
          console.log(`Live状態が${sheetLiveBroadcastContent}から${apiLiveBroadcastContent}に変更されました。`);
          isChanged = true;
        } else if (apiLiveBroadcastContent == 'upcoming' && formattedSheetScheduledStartTime !== apiScheduledStartTime) {
          description = description_text(apiLiveBroadcastContent, apiActualStartTime, `配信予定が${formatDate(apiScheduledStartTime, 'MM/DD HH:mm')}に変更されました。`);
          console.log(`配信予定が${formattedSheetScheduledStartTime}から${apiScheduledStartTime}に変更されました。`);
          isChanged = true;
        } else if (sheetTitle !== apiTitle) {
          description = description_text(apiLiveBroadcastContent, apiActualStartTime, `配信タイトルが${apiTitle}に更新されました。`);
          console.log(`配信タイトルが${sheetTitle}から、${apiTitle}に変更されました。`);
          isChanged = true;
        }

        // 最新の情報をスプレッドシートのビデオ情報を常に更新
        updateVideoInfoInSheet(apiTitle, feedPublished, feedUpdated, feedVideoId, apiLiveBroadcastContent, apiScheduledStartTime, apiActualStartTime);

        if (isChanged) {
          // 変更がある場合の処理
          postToDiscord({
            channel: channel,
            title: apiTitle,
            videoId: feedVideoId,
            description_text: description
          }, channelIcon);
          Utilities.sleep(400);
        }
      } else {
        // 変更がない場合の処理
        console.log(`${sheetTitle} ビデオID ${feedVideoId}のステータスは変更されませんでした: ${sheetLiveBroadcastContent}`);
      }
    } catch (error) {
      console.error(`updateCheckerでエラーが発生しました - ビデオID: ${feedVideoId}, エラーメッセージ: ${error.message}`);
    }
  }
}

// Discordにメッセージを投稿する関数
function postToDiscord(data, channelIcon) {
  const type = 'application/json'
  const discordWebhookUrl = PropertiesService.getScriptProperties().getProperty('discordWebhookUrl');
  const youtube_url = 'https://www.youtube.com/watch?v='

  var message ={
    username: data.channel,
    avatar_url: channelIcon || "https://www.youtube.com/s/desktop/28b0985e/img/favicon_144x144.png",
    tts: false,
    title: data.title,
    content: `[${data.description_text}](${youtube_url}${data.videoId})`,
  }
  var options ={
    'method' : 'post',
    'contentType': type,
    'payload': JSON.stringify(message),
  }
  try{
    UrlFetchApp.fetch(discordWebhookUrl, options)
  } catch(e) {
    console.log(`エラーが発生しました - 関数名: ${e.functionName}, エラーメッセージ: ${e.message}`);
  }
}

// スクリプトの実行開始点
function fetchUpdateAndNotify() {
    // チャンネル情報の初期化やメイン処理の呼び出し
    loadAndVerifyChannelData();
    updateAllChannels();
}
