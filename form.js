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
            this.msg.c = "画像のURL";
           
            this.msg.date = hour + ':' + min;
            this.msg.from = user.uName;
 
            this.msg.isImage = true;
           
            publish(JSON.stringify(this.msg));
            this.msg = {};
        }
    }
});