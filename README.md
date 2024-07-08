# MQTT_Chat
Vue.jsとHTMLを用いたチャットアプリケーション
![chat_kansei](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/1010d2df-ebcd-4281-8bc0-375c01e0e917)

# 目標
- MQTTの特徴の一つである **「多対多の通信」** を利用したチャットアプリケーションを作成すること．
- MQTTだけでなく，**Webアプリケーション開発**の知識も取得すること．

# MQTT とは

**MQTT（Message Queuing Telemetry Transport）** とは，Publish/Subscribe型のメッセージングプロトコルであり、メッセージの送信者であるPublisher，メッセージの受信者であるSubscriber，メッセージの仲介役であるBrokerの3つの要素で構成される．

- Publisherはトピック名を指定してメッセージを送信し，Subscriberは購読したいトピック名を指定することで，該当するメッセージのみを受け取ることができる．

![1_mqtt_setumei](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/89df1c6c-561a-4a72-8cfd-3cd6a1602ee0)

- 例えば，上側のSubscriberがtopicAを購読し，下側のSubscriberがtopicAとtopicBを購読しているとき，PublisherがtopicAを指定してメッセージを送信すると，**両方のSubscriberがメッセージを受け取る**．また，PublisherがtopicBを指定してメッセージを送信すると，下**側のSubscriberのみがメッセージを受け取る**．

#  MQTT を用いたチャットアプリケーション作成
メッセージをpublishする入力フォームと，自分も含む誰かが送信したメッセージを受け取るsubscribeの機能を作り，ブラウザで動作することを目標とする．

> [!WARNING]
> Note: 以降の作業では個人PCを用いるため必ず同ネットワークに繋いでおくこと．

## 実施内容
- （前提）MQTT Brokerをインストール
1.  **ローカルで動作確認**
2.  **Webデザインの改善**
3.  **プライベートチャット（一対一）の実装**
4.  **グループチャット（多対多）の実装**
5.  **発展**

# シンプルなチャットアプリケーション
## MQTT Broker をインストール
以下はオープンソースのMQTT Brokerの例である．
- Mosquitto
- EMQX
- NanoMQ
- HiveMQ　　　など

今回は，高性能でスケーラブルなMQTT Brokerとして知られている`EMQX`を使用する．
従って，[Install EMQX on Ubuntu](https://emqx.io/docs/en/latest/deploy/install-ubuntu.html#amd64)の`Install with Apt Source`の手順通りに以下のコマンドをラズパイ(Ubuntu 22.04 LTS)で実行する．
1. EMQXのリポジトリをダウンロード（少し時間がかかります）
```
curl -s https://assets.emqx.com/scripts/install-emqx-deb.sh | sudo bash
```
2. EMQXをインストール
```
sudo apt-get install emqx
```
3. EMQXを開始
```
sudo systemctl start emqx
```

これにより，ラズパイでEMQXが立ち上げられる．正しくインストール出来ているか確認するために，個人PCのブラウザで`http://XXX.XXX.XXX.XXX:18083/`にアクセスする．
> [!NOTE]
> `XXX.XXX.XXX.XXX`はEMQXをインストールした端末に割り当てられたIPアドレス

![3_emqx_setup](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/aa747d8b-0c97-454c-a079-56339e31833c)

初期ユーザ名と初期パスワードを求められるため，以下のように入力する．
- Username：**admin**
- Password：**public**

> [!WARNING]
> Note: `Change Password`で初期パスワードを変更するよう言われるが，`Skip`でもok

![3_emqx_setup_complete](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/35fb30c4-5158-4aaa-b3a9-e7f3734f3b37)

この画面のようになればEMQXのインストールは完了．
## MQTT Client の準備
- **Paho**とは，MQTTのクライアント(Publisher/Subscriber)を実装するためのライブラリであり，さまざまな言語で実装されている（Java, Python, JavaScript, C, C++, C#, Goなど）

今回はブラウザベースで使えるJavaScript版の使い方を説明する．JavaScript版Paho（[Eclipse Paho JavaScript Client](https://eclipse.dev/paho/index.php?page=clients/js/index.php)）はMQTT over WebSocketプロトコルを使用してMQTT Brokerとの通信を行う．

- **WebSocket**とは，ブラウザとWebサーバとの間で双方向通信を行うための仕組みであり，リアルタイムに通信ができる．この技術は，オンラインゲーム，チャットアプリケーション，株式取引システムなど，リアルタイムでの反応が求められるアプリケーションに非常に適している．

**MQTT over WebSocket**は，MQTTをWebSocketを使って行う技術である．これにより，ウェブブラウザや他のWebSocketをサポートするクライアントから直接，MQTTメッセージを送受信することが可能になる．

> [!NOTE]
> JavaScript版Pahoを利用するには，MQTT BrokerがMQTT over WebSocketに対応している必要がある．

##  MQTT Broker との通信
まず，pahoライブラリを使ってMQTT Brokerに接続するところ，メッセージを配信するところ，メッセージを受信するところを実装する．

個人PCでテキストエディタを開き，以下のコードをコピペして`test.html`として保存する．
```html:test.html
<html>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html">
</head>

<script src="https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js" type="text/javascript"></script>

<script>
    clientID = '自分の名前'; // 自由に付けられるが，他の人と被らないようにすること
    topic = 'test'; // トピックを任意に作成

    // クライアントインスタンスを作成(XXXは自分のラズパイに割り当てられたIPアドレス)
    client = new Paho.MQTT.Client("emqx@10.20.22.XXX", 8083, clientID);

    // コールバックハンドラを設定
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // クライアントをEMQXに接続させる（購読者になる）
    client.connect({ onSuccess: onConnect });

    // EMQXと接続できなかったら
    function failConnect(e) {
        console.log('failed!');
        console.log(e);
    }

    // クライアントがEMQXに接続したときに呼び出される
    function onConnect() {
        // Once a connection has been made, make a subscription and send a message.
        console.log("onConnect");
        subscribe();
        publish('Hello');
    }

    // EMQXにメッセージを送信
    function publish(msg){
        message = new Paho.MQTT.Message(msg);
        message.destinationName = topic;
        client.send(message);
    }

    // EMQXからトピック「test」を購読
    function subscribe() {
        console.log('subscribe:'+topic);
        client.subscribe(topic);
    }

    // クライアントがEMQXからメッセージを受け取ったときに呼び出される
    function onMessageArrived(message) {
        console.log('onMessageArrived:'+message.payloadString);
    }

    //　EMQXとの接続が切れたときに呼び出される
    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:"+responseObject.errorMessage);
        }
    }

</script>

</html>
```

保存したファイルをブラウザで開く．すると，真っ白な画面が出るがEMQXブローカにはちゃんとメッセージが送られている．それを確認するために，右クリックで`検証`を押し，`Console`タブを開く．

![3_paho_confirm](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/0699180c-dfa3-41f8-9e43-dfddc91f97d1)

> [!TIP]
> `onConnect`
> `onMessageArrived:Hello`
> と出ていればok

EMQXでも以下のようになっていることを確認する．

![3_paho_confirm_emqx](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/bbccc951-5dab-4837-ae13-d24877ada667)

### 小テスト１
Consoleタブに`onMessageArrived:Hello`と表示されている部分が`onMessageArrived:Test1`になるよう変更してください．
- <span style="color: red;">**Point**</span>: どこでpublish関数が呼び出されているか考える．

##  データと UI の結び付け
- **データバインディング**：アプリケーションのUIと，そこに表示されるデータとの間の接続を確立する処理

今回は`Vue.js`を使用してデータバインディングを行う．Vue.jsとはWebアプリケーションのUI部分などを開発する際に使われる，オープンソースのJavaScriptフレームワークでありデータバインディングを含む多くの機能を提供する．

- 基本的な使い方
- index.html
```html
<div id="app">{{ message }}</div>
<script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
<script src="script.js"></script>
```
- script.js
```js
var app = new Vue({
    el: '#app',
    data: {
      	message: 'Hello Vue!'
    }
})
```
- scriptの記述を解説
```js
var app = new Vue({
		…
})
```
ここでは`app`と命名したスクリプトは，Vueを実行することを宣言しており，new Vue({…})というVueクラスの中に，使用するデータや処理内容（メソッド）を定義する．
```js
el: '#app',
```
左側の文字列をプロパティ，右側の文字列を値と呼ぶ．
`elプロパティ`は，右に記述した要素が《Vue.jsが動作する範囲であること》を表す．
この場合，htmlからappと命名されたIDを探し，そのなかでVue.jsを動かすこと表す．
```js
data: {
		...
}
```
dataプロパティはVue.jsで扱うデータを記述する．また，データが変更されると，その変更内容が即時に画面に反映される．
```js
message: 'Hello Vue!'
```
messageという変数に，”Hello Vue!”という文字列を値として定義している．

これによりhtmlで`{{ message }}`と記述した箇所には，”Hello Vue!”という文字列が入った結果を得ることができる．

次に，フォームに名前を入れて，内容を送信するところを実装する．
inputのエンターを押した時点で，イベントを発火させ，メッセージをEMQXに送信する．
送信すると，EMQXは接続している全ての購読者にメッセージを配信する．ただ，今は自分の個人PCしか購読者になっていないためメッセージを受け取るのは自分自身のみ．（他の人にメッセージは送れない）

`test.html`を以下のように修正し，新たに`form.js`を作成し同じディレクトリ内に配置する．

### test.html
```html:test.html
<html>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html">
</head>

<body>
    <div id="input" class="input">
        <input @keyup.enter="submit" v-model="msg.c">
    </div>

    <div id="user" class="name">
        <input v-model="uName">{{ uName }}
    </div>

    <div id="msgView" class="msg-view">
        <div v-for="message in msg" v-bind:class="message.classname">
            <p class="from">
                <span>{{ message.from }}</span>
            </p>
            <div class="message">
                <span class="baloon">{{ message.c }}</span>
                <span class="date">{{ message.read }}
                    <br>{{ message.date }}</span>
            </div>
        </div>
    </div>
</body>

<script src="https://cdn.jsdelivr.net/npm/vue/dist/vue.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js" type="text/javascript"></script>
<script src="form.js"></script>
<script>
    clientID = '自分の名前'; // 自由に付けられるが，他の人と被らないようにすること
    topic = 'test'; // トピックを任意に作成

    // クライアントインスタンスを作成(XXXは自分のラズパイに割り当てられたIPアドレス)
    client = new Paho.MQTT.Client("emqx@10.20.22.XXX", 8083, clientID);

    // コールバックハンドラを設定
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // クライアントをEMQXに接続させる（購読者になる）
    client.connect({ onSuccess: onConnect });

    // EMQXと接続できなかったら
    function failConnect(e) {
        console.log('failed!');
        console.log(e);
    }

    // クライアントがEMQXに接続したときに呼び出される
    function onConnect() {
        // Once a connection has been made, make a subscription and send a message.
        console.log("onConnect");
        subscribe();
    }

    // EMQXにメッセージを送信
    function publish(msg){
        message = new Paho.MQTT.Message(msg);
        message.destinationName = topic;
        client.send(message);
    }

    // EMQXからトピック「test」を購読
    function subscribe() {
        console.log('subscribe:'+topic);
        client.subscribe(topic);
    }

    // クライアントがEMQXからメッセージを受け取ったときに呼び出される
    function onMessageArrived(message) {
        console.log('onMessageArrived:'+ message.payloadString);
        msgView.update(message.payloadString); //vue.jsのメソッド
    }

    //　EMQXとの接続が切れたときに呼び出される
    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:"+responseObject.errorMessage);
        }
    }
</script>

</html>
```

#### form.js
```js:form.js
var user = new Vue({
    el: '#user',
    data: {
        uName: 'なまえ'
    }
});

var input = new Vue({
    el: '#input',
    data: {
        msg: {
            c: '',
            from: '',
            date: '',
            read: '',
            classname: ''
        }
    },
    methods: {
        submit: function(e){
            e.stopPropagation();
            // console.log(this.msg);
            if (this.msg.c.length > 0) {
                var now = new Date();
                var hour = now.getHours();
                var min = ("0"+ now.getMinutes()).slice(-2);
                this.msg.from = user.uName;
                this.msg.date = hour+ ':'+ min;
                publish(JSON.stringify(this.msg));
                this.msg = {};
            }
            // subscribe(); // onConnectで一回でいい
         }
    }
});

var msgView = new Vue({
    el: '#msgView',
    data: {
        msg: []
    },
    methods: {
        update: function(msg) {
            var received = JSON.parse(msg);
            var _msg = {};
            _msg.c = received.c;
            _msg.from = received.from;
            _msg.date = received.date;
            _msg.read = '既読';
            var classname = '';
            var regexp = new RegExp('^'+ user.uName, 'g');
            console.log(msg.match(regexp));
            if (_msg.from.match(regexp) !== null) {
                // 自分が送ったメッセージ
                classname = 'right_balloon';
            } else {
                // 自分以外の誰かが送ったメッセージ
                classname = 'left_balloon';
            }
            _msg.classname = classname;
            this.msg.push(_msg);
        }
    }
});
```
###
- 名前入力フォーム
```html
<div id="user" class="name">
		<input v-model="uName">{{uName}}
</div>
```
```js
var user = new Vue({
    el: '#user',
    data: {
        uName: 'なまえ'
    }
});
```
ここでは`user`と命名したスクリプトは，Vueを実行することを宣言しており，new Vue({…})というVueクラスの中に，使用するデータや処理内容（メソッド）を定義する．
```js
el: '#user',
```
左側の文字列をプロパティ，右側の文字列を値と呼ぶ．
`elプロパティ`は，右に記述した要素が《Vue.jsが動作する範囲であること》を表す．
この場合，htmlからuserと命名されたIDを探し，そのなかでVue.jsを動かすこと表す．
```js
data: {
		...
}
```
dataプロパティはVue.jsで扱うデータを記述する．また，データが変更されると，その変更内容が即時に画面に反映される．
```js
uName: 'なまえ'
```
uNameという変数に，”なまえ”という文字列を値として定義している．

これによりhtmlで`{{ uName }}`と記述した箇所には，”Hello Vue!”という文字列が入った結果を得ることができる．
また，`v-model`を使用すると双方向バインディングを実装でき，**htmlで入力された値とVueのdataプロパティを紐づけ，どちらかが変更されたら他方も変更されるようにすることができる．**

- **メッセージ入力フォーム：input**
ユーザーがメッセージを入力し，「Enter」キーを押すと，submitメソッドが呼び出され，入力されたメッセージが処理されてサーバーに送信される．
双方向バインディングは`{{ msg.c }}`で行われている．

- **メッセージ表示：msgView**
`v-bind`をHTML要素に使用すると，属性を動的に設定することができる．ここではmsg配列の各要素をmessageという一時変数に割り当て，それを使ってHTMLの構造を繰り返し生成している．
ユーザーがメッセージを入力し，「Enter」キーを押すと，submitメソッドが呼び出され，入力されたメッセージが処理されてサーバーに送信される．
双方向バインディングは`{{ msg.c }}`で行われている．

- methodsプロパティはVue内で扱える，データの処理・操作内容（=メソッド）を定義する場所．

# ローカルで動作確認
まずはローカルで動作を確認する．先程作成した`test.html`を複製し，`local.html`と名前を変更する．また，`loacl.html`で以下の行の`clientID`を`test.html`の`clientID`と異なるように設定する．
```
clientID = '自分の名前'; // `test.html`の`clientID`と異なるように設定する．
```

> [!WARNING]
> Note: `clientID`が同じままだと正しく動作しないため必ず変更しておく．

`test.html`と`local.html`の両方をブラウザで開き，`test.html`の方で以下の動作を確認する．

2つの入力ボックスが表示されている．それぞれ以下の役割を持つ．
- 上：Brokerに送信するメッセージ
- 下：メッセージと一緒に表示される名前
早速自分の名前書いて，メッセージを入力しEnterを押してみよう．するとすぐに自分の名前と一緒にメッセージが表示されるはず．
ここで，`local.html`を見ると`test.html`に表示されたメッセージと同じものが届いている．

![4_name_input](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/d2d0ebce-7500-45b9-9aa1-7ddb11a4d746)

![4_local_confirm](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/c93b1ae2-198b-4baa-9870-6479ab7806db)

> [!NOTE]
> メッセージを送信すると，EMQXは接続している全ての購読者にメッセージを配信する．ただ，今は自分の個人PCしか購読者になっていないためメッセージを受け取るのは自分自身のみ．（他の人にメッセージは送れない）

# Webデザインの改善
現状のチャットアプリケーションはシンプルすぎて味気が無いため，`HTML`と`CSS`を組み合わせて見た目を改善させる．
- **HTML（HyperText Markup Language）**：Webページの基本構造を定義するためのマークアップ言語
- **CSS（Cascading Style Sheets）**：HTMLで定義された要素の見た目をスタイリングするための言語

今回は詳しい説明を割愛するが，以降の発展でUI系の課題に取り組む人は以下のサイトを参考にすることを勧める．
> URL：[【図解たっぷり】Chrome検証ツール入門！コーディングの“崩れる”“直せない”を解決](https://skillhub.jp/blogs/269)

`test.html`を以下のように修正&新たに`styles.css`を作成し同じディレクトリ内に配置する．

#### test.html
```html:test.html
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html">
    <link rel="stylesheet" href="styles.css">
</head>

<body>
    <div id="user" class="name">
        <input v-model="uName" class="name-input">{{ uName }}</div>

    <div class="chat-container">
        <div id="msgView" class="message-container">
            <div id="msgView" class="msg-view">
                <div v-for="message in msg" v-bind:class="message.classname">
                    <p class="from">
                        <span>{{ message.from }}</span>
                    </p>
                    <div class="message">
                        <span class="baloon">{{ message.c }}</span>
                        <div class="date-container">
                            <span class="date">{{ message.read }}
                                <br>{{ message.date }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="bottom">
        <div class="input-container" id="input" class="input">
            <input type="text" @keyup.enter="submit" v-model="msg.c" placeholder="メッセージを入力してください" class="message-input">
        </div>
    </div>
</body>

<script src="https://cdn.jsdelivr.net/npm/vue/dist/vue.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js" type="text/javascript"></script>
<script src="form.js"></script>
<script>
    clientID = '自分の名前'; // 自由に付けられるが，他の人と被らないようにすること
    topic = 'test'; // トピックを任意に作成

    // クライアントインスタンスを作成(XXXは自分のラズパイに割り当てられたIPアドレス)
    client = new Paho.MQTT.Client("emqx@10.20.22.XXX", 8083, clientID);

    // コールバックハンドラを設定
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // クライアントをEMQXに接続させる（購読者になる）
    client.connect({ onSuccess: onConnect });

    // EMQXと接続できなかったら
    function failConnect(e) {
        console.log('failed!');
        console.log(e);
    }

    // クライアントがEMQXに接続したときに呼び出される
    function onConnect() {
        // Once a connection has been made, make a subscription and send a message.
        console.log("onConnect");
        subscribe();
    }

    // EMQXにメッセージを送信
    function publish(msg){
        message = new Paho.MQTT.Message(msg);
        message.destinationName = topic;
        client.send(message);
    }

    // EMQXからトピック「test」を購読
    function subscribe() {
        console.log('subscribe');
        client.subscribe(topic);
    }

    // クライアントがEMQXからメッセージを受け取ったときに呼び出される
    function onMessageArrived(message) {
        console.log('onMessageArrived:'+ message.payloadString);
        msgView.update(message.payloadString); //vue.jsのメソッド
    }

    //　EMQXとの接続が切れたときに呼び出される
    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:"+responseObject.errorMessage);
        }
    }
</script>

</html>
```

#### styles.css
```css:styles.css
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f4f4f4;
}

.name {
    position: fixed;
    z-index: 1000;
}

.name-input {
    border: none;
    height: 30px;
    outline: none; /* 黒枠を消す */
}

.chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.message-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background-image: url("https://github.com/labnet-member/24-practice6-template/blob/main/kumo.png?raw=true");
    border-bottom: 40px solid rgba(0, 0, 0, 0);
}

/* 左の吹き出し */
.left_balloon {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
}

/* 右の吹き出し */
.right_balloon {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
}

.baloon {
    position: relative;
    display: inline-block;
    margin: 10px 20px;
    padding: 10px 20px;
    background: #ccffcc;
    text-align: left;
    border-radius: 12px;
    word-wrap: break-word;
}

.baloon::after {
    content: "";
    border: 15px solid transparent;
    border-top-color: #ccffcc;
    position: absolute;
    top: 10px;
}

.left_balloon .baloon::after {
    left: -15px;
}

.right_balloon .baloon::after {
    right: -15px;
}

.input-container {
    width: 100%;
    display: flex;
    align-items: center;
}

.message-input {
    border: none;
    height: 30px;
    width: 80%;
    outline: none;
}

.message {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.left_balloon .message {
    align-items: flex-start;
}

.right_balloon .message {
    align-items: flex-end;
}

.date-container {
    margin-top: 5px;
    font-size: 12px;
    color: #666;
    display: flex;
    justify-content: flex-end;
    width: 100%;
}

.right_balloon .date-container {
    justify-content: flex-start;
    text-align: left;
}

.left_balloon .date-container {
    justify-content: flex-end;
    text-align: right;
}

.bottom {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: #fff;
    border-top: 1px solid #ccc;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
}

```

###

そして`test.html`を再読み込みするとLINE風のチャットアプリケーションに見た目が変わり，メッセージ表示部分が吹き出しになる．

![5_local_complete](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/0726b5ca-b594-46e4-8352-3936a4068604)

以上でローカルでの動作確認が完了し，チャットアプリケーションを使っているという実感が湧いたはず．次は実際に他の人とチャットできるようにする．

# プライベートチャット（一対一）の実装
※研究室など複数のメンバーで実施する際は以下のトピック名を使ってみてください

| グループ番号 | トピック名  |
| ---------- | ---------- |
| 1 | Elephant　|
| 2 | Giraffe |
| 3 | Penguin |
| 4 | Kangaroo |
| 5 | Otter |
| 6 | Dog   |

`test.html`の`clientID`，`topic`，`client`を以下のように修正する．
```html
clientID = '自分の名前'; // 他の人と被らないようにすること
topic = 'トピック名'; // 自分のグループ番号に対応したトピック名を使用すること

// クライアントインスタンスを作成
client = new Paho.MQTT.Client("emqx@XXX.XXX.XXX.XXX", 8083, clientID);
```
![6_private_setumei](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/e24d4299-ed2a-4401-aecf-6d0bd10d98e5)

MQTTを用いた一対一の通信はかなり単純で，通信したい相手と同じBroker，トピック名を指定することで実現できる．

![6_private_confirm](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/f9d4777e-3f95-492f-a210-5a3535c275eb)

# グループチャット（多対多）の実装
※研究室など複数のメンバーで実施する際は以下のトピック名を使ってみてください

| グループ番号 | トピック名  |
| ---------- | ---------- |
| 1，2，3 | Sushi　|
| 4，5，6 | Takoyaki |

先程と同様に，`test.html`の`clientID`，`topic`，`client`を以下のように修正する．
```html
clientID = '自分の名前'; // 他の人と被らないようにすること
topic = 'トピック名'; // 自分のグループ番号に対応したトピック名を使用すること
```

![7_group_setumei](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/def9acd4-8f28-45e1-ac41-aa18eb061d97)

MQTTを用いた多対多の通信も同様に，複数人が同じBroker，トピック名を指定することで実現できる．

![7_group_confirm](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/9f934f08-4021-4a13-9682-47f7e41882b2)

### 小テスト２
多対多の通信をMQTTで行うにはどうすればよいでしょうか．考えてみてください．
- <span style="color: red;">**Point**</span>: 先程の図を多対多の通信にさせて考える．

---
# 発展
## UI系
### 課題①：吹き出しの最大幅を設定（★☆☆）
実は，メッセージに長い文字列を入力して送信すると画面の横幅いっぱいに表示されてしまい，非常に見栄えが悪い．

先程紹介したGoogle Chromeの「検証」で吹き出し部分に対応する要素にどんなクラス名が割り当てられているか調べ，対応するCSSに吹き出しの最大幅を設定するCSSプロパティを設定しよう．

<details><summary>ヒント</summary>
用いるCSSプロパティは以下の通り
<code>
max-width: 900px;
</code>
</details>

![8_ui_1](https://github.com/SumireDoi/MQTT_Chat/assets/115055083/d77c930d-dbfb-4811-98ac-48efa3a97a0e)

> 長い文章の入力例：[走れメロス 太宰治](https://www.aozora.gr.jp/cards/000035/files/1567_14913.html)

### 課題②：相手からのメッセージは白色に設定（★★☆）

今回のソースコードでは，吹き出し用の三角形を作成し，適切な場所に配置することで吹き出しに見えるようにしている．

そのため，「相手からのメッセージ部分に対応する要素」と「吹き出し用の三角形」の2つの要素に対して，白色にするCSSプログラムを設定する．

<details><summary>ヒント</summary>
用いるCSSプロパティは以下の通り<br>
・ 相手からのメッセージ部分に対応する要素：<code>background: #fff;</code> <br>
・ 吹き出し用の三角形：<code>border-top-color: #fff;</code>
</details>

![](/実習ゼミ/第6回_mqtt/8_ui_2.png)

## 機能系
### 課題①：スタンプの実装（★★★）
以下のように「スタンプを送信」ボタンを作成し，ボタンが押されたら画像を送信&表示するようにしよう．

:one: htmlでボタンを作成
:two: ↑で作成したhtmlタグは`id="image"`として，対応するVueを作成
:three: Vueの中身はinputのものとほぼ同じだが，以下が異なっている
- 送信するメッセージが画像ならtrueになる変数`isImage`をmsgに新たに作成（それと同時に，今までのinputにも変数`isImage`をmsgに作成しておく）
- `this.msg.c = "https://github.com/labnet-member/24-practice6-template/blob/main/dog_ok2.jpg?raw=true";`を追加

:four: htmlのメッセージを表示する部分において，「message.isImage」がtrue/falseの場合で分岐させる
- 「message.isImage」がtrueの場合
`<span class="baloon">{{ message.c }}</span>`
↓
`<img :src=message.c alt="Message Image" class="message-image" width="300" height="300">`
に変更する．

<details><summary>ヒント</summary>
・ ボタンの作成：<code>&lt;button&gt; @click="sendImage" id="image" class="send-image-button">スタンプを送信&lt;/button&gt;</code> <br>
</details>

![](/実習ゼミ/第6回_mqtt/8_kinou_1.png)

### 課題②：特定のキーワードによる隠し演出の実装（★★☆）
メッセージ（自分から／相手からの両方）に「夏」という文字が含まれていたら背景を変え，3秒後に元に戻すように変更しよう．

<details><summary>ヒント</summary>
メッセージを受け取る関数内で，受け取ったメッセージに「夏」が含まれていたら以下のchangeBackground関数を呼び出してやればよい．<br>
<code>
function changeBackground() { <br>
&nbsp;&nbsp;var url_k = "https://github.com/labnet-member/24-practice6-template/blob/main/kumo.png?raw=true"; <br>
&nbsp;&nbsp;var url_s = "https://github.com/labnet-member/24-practice6-template/blob/main/summer.jpg?raw=true";<br>
&nbsp;&nbsp;var div = document.getElementById("msgView");<br>
&nbsp;&nbsp;div.style.backgroundImage = `url(${url_s})`;<br>
&nbsp;&nbsp;setTimeout(() => {<br>
&nbsp;&nbsp;&nbsp;&nbsp;div.style.backgroundImage = `url(${url_k})`;<br>
&nbsp;&nbsp;}, 3000);<br>
}<br>
</code>
</details>

![](/実習ゼミ/第6回_mqtt/8_kinou_2.png)

これらの他にも，このアプリケーションにはまだまだたくさんの課題がある．時間が余った人は以下にも挑戦してみよう．
- 画像付き吹き出しデザイン（★★☆）
- スクロール時に相手のメッセージが名前と重ならないようにする（★★★）

# 参考
[MQTTブローカーサービス「sango」を使ってJavaScriptだけでチャットを作ってみた](https://liginc.co.jp/web/js/153707)
[Vue.js](https://vuejs.org/)
[HTMLとCSSで画像付きのチャット風吹き出しを作ってみよう！](https://blog.frankul.net/2022/03/30/html-css-chat/)
