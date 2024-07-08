// ファイルを読み込む関数
function readFile(file) {
    const reader = new FileReader();
  
    // 読み込みが完了したら、結果を表示
    reader.onload = function (event) {
      console.log(event.target.result);
    };
  
    // ファイルをテキストとして読み込む
    reader.readAsText(file);
}

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
            classname: '',
            isImage: false
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

                this.msg.isImage = false;

                publish(JSON.stringify(this.msg));
                this.msg = {};
            }
            // subscribe(); //onConnectで一回でいい
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
            _msg.isImage = received.isImage;
            var classname = '';
            var regexp = new RegExp('^'+ user.uName, 'g');
            console.log(msg.match(regexp));
            if (_msg.from.match(regexp) !== null) {
                classname = 'right_balloon';
            } else {
                classname = 'left_balloon';
            }
            _msg.classname = classname;
            this.msg.push(_msg);
        }
    }
});

var sendImage = new Vue({
    el: '#image',
    data: {
        msg: {
            c: '',
            from: '',
            date: '',
            read: '',
            classname: '',
            isImage: ''
        }
    },
    methods: {
        sendImage: function(e) {
            e.stopPropagation();
            var now = new Date();
            var hour = now.getHours();
            var min = ("0" + now.getMinutes()).slice(-2);
            // this.msg.c = "https://github.com/labnet-member/24-practice6-template/blob/main/dog_ok2.jpg?raw=true";
            this.msg.c = "https://www.hiroshima-u.ac.jp/system/files/138803/hiroty230.png";
            
            this.msg.date = hour + ':' + min;
            this.msg.from = user.uName;

            this.msg.isImage = true;

            publish(JSON.stringify(this.msg));
            this.msg = {};
        }
    }
});