/**
 * Created by jasonchen on 2017.10.6.
 */
const express=  require('express');
const path = require('path');
const app = express();
app.listen(4000,function () {
    console.log('App started');
});
app.set('views', path.join(__dirname,'views'));
app.use(express.static(path.join(__dirname, 'static')));
app.set('view engine', 'pug');


app.get('/',(req,res)=>{
    res.render('index');
});

const credentials = require('./credentials');
var ObjectID = require('mongodb').ObjectID;


const mongo = require('mongodb').MongoClient;
const client = require('socket.io').listen(5200).sockets;

mongo.connect(credentials.Mongo,function (err, db) {
    if (err) throw err;

    console.log("MongoDB Connected.");
    client.on('connection',function(socket) {
        console.log('Socket connected.');
        let postits = db.collection('postits');
        let lines = db.collection('lines');
        let sendStatus = function (s) {
            socket.emit('status', s);
        };
        sendStatus('连接成功！');
        postits.find({}).toArray(function (err, res) {
            if (err) throw err;
            if(res.length>0) {
                socket.emit('output', res);
            }else {
                //初始化一些数据，可删除
                // var initdata = [ {
                //     "color" : "yellow",
                //     "pos" : {
                //         "x" : 489,
                //         "y" : 55
                //     },
                //     "text" : "路由1"
                // },  {
                //     "color" : "blue",
                //     "pos" : {
                //         "x" : 690,
                //         "y" : 252
                //     },
                //     "text" : "路由2"
                // }, {
                //     "color" : "red",
                //     "pos" : {
                //         "x" : 393,
                //         "y" : 354
                //     },
                //     "text" : "路由3"
                // } ];
                // postits.insertMany(initdata);
                // //初始化 结束
                // socket.emit('output', initdata);
                socket.emit('output', []);
            }
        });

        lines.find({}).toArray(function (err, res) {
            if (err) throw err;
            socket.emit('lines', res);
        });

        socket.on('addpostit', function (newpostit) {
            postits.insertOne(newpostit,function (err, res) {
                if (err) throw err;
                postits.find({}).limit(20).toArray(function (err, res) {
                    if (err) throw err;
                    socket.emit('output', res);
                });
            });
        });

        socket.on('update', function (newpostit) {
            let _id = ObjectID(newpostit._id);
            delete newpostit['_id'];
            postits.updateOne({_id:_id},newpostit,function (err, res) {
                if (err) throw err;
                // console.log(res);
            });
        });

        socket.on('delete', function (newpostit) {
            if (newpostit._id === null) return;
            let _id = ObjectID(newpostit._id);
            console.log("_id",_id,"type",typeof _id);
            lines.deleteMany({$or:[{startId:newpostit._id},{endId:newpostit._id}]},function (err, res) {
                if (err) throw err;
                lines.find({}).toArray(function (err, res) {
                    if (err) throw err;
                    socket.emit('lines', res);
                });
            });

            postits.deleteOne({_id:_id},function (err, res) {
                if (err) throw err;
                sendStatus('删除成功！');
            });
        });

        socket.on('addline', function (newline) {
            //此时的_id是string类型
            console.log(newline);
            var start = newline.start;
            var endpos = newline.endpos;
            console.log(start);
            console.log(endpos);
            postits.find({pos:endpos}).toArray(function (err,res) {
                if (err) throw err;
                var endId = res[0]._id.toString();
                lines.insertOne({startId:start._id,endId:endId},function (err, res) {
                    if (err) throw err;
                    lines.find({}).toArray(function (err, res) {
                        if (err) throw err;
                        socket.emit('lines', res);
                    });
                });
            });

        });

        socket.on('connectline', function (newline) {
            //此时的_id是string类型
            var startId = newline.startId;
            var endId = newline.endId;
            lines.insertOne({startId:startId,endId:endId},function (err) {
                if (err) throw err;
                lines.find({}).toArray(function (err, res) {
                    if (err) throw err;
                    socket.emit('lines', res);
                });
            });
        });

        socket.on('deleteAll', function () {

            lines.deleteMany({},function (err) {
                if (err) throw err;
                socket.emit('lines', []);
            });

            postits.deleteMany({},function (err) {
                if (err) throw err;
                socket.emit('output', []);
                sendStatus('删除成功！');
            });
        });


        socket.on('disconnect', function () {
            sendStatus({message:'失去连接！',type:'error'});
            console.log('Disconnected');
        });
    });
});