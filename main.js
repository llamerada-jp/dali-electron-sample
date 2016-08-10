'use strict';

const electron = require('electron');
const net = require('net');

const app = electron.app;
const ipc = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;

// オフライン
const STATUS_OFFLINE = 0;
// 接続中
const STATUS_CONNECTING = 1;
// オンライン
const STATUS_ONLINE = 2;

let mainWindow = null;
let client = new net.Socket();
// 接続状態
let connectStatus = STATUS_OFFLINE;
// 送信待ちコマンド
let sendWait = '';

// 接続先情報
const DALI_IP = 'localhost';
const DALI_PORT = 8421;

// ウインドウを閉じたら、接続を切ってアプリケーションを終了する
app.on('window-all-closed', function() {
  client.destroy();
  app.quit();
});

// アプリケーションが起動したらウインドウを表示する
app.on('ready', function() {
  mainWindow = new BrowserWindow();
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});

// コマンドが来たら〜
ipc.on('cmd', function(event, cmd) {
  if (connectStatus === STATUS_OFFLINE) {
    // オフラインの場合、コマンドをバッファに格納して接続処理をする
    connectStatus === STATUS_CONNECTING;
    sendWait += cmd;

    // 接続開始
    client.connect(DALI_PORT, DALI_IP);

  } else if (connectStatus == STATUS_CONNECTING) {
    // 接続中の場合、バッファにコマンドを格納
    sendWait += cmd;

  } else {
    // オンラインの場合、内容をDALIへ送信
    console.log('Send: ' + cmd);
    client.write(cmd);
  }
});

// 接続したらバッファの内容をDALIへ送信
client.on('connect', function() {
  console.log('Connected');
  connectStatus = STATUS_ONLINE;
  if (sendWait !== '') {
    console.log('Send: ' + sendWait);
    client.write(sendWait);
    sendWait = '';
  }
});

// DALIからデータが来たらウインドウに送る
client.on('data', function(data) {
  console.log('Received: ' + data);
  mainWindow.webContents.send('recv', data);
});

// DALIから切断
client.on('close', function() {
  console.log('Connection closed');
  connectStatus = STATUS_OFFLINE;
});
