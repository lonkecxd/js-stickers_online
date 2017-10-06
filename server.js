/**
 * Created by jasonchen on 2017.10.6.
 */
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
        let sendStatus = function (s) {
            socket.emit('status', s);
        };

        postits.find({}).limit(20).toArray(function (err, res) {
            if (err) throw err;
            if(res.length>0) {
                socket.emit('output', res);
            }else {
                //初始化一些数据，可删除
                var initdata = [ {
                    "color" : "yellow",
                    "pos" : {
                        "x" : 489,
                        "y" : 55
                    },
                    "text" : "波杰克"
                },  {
                    "color" : "blue",
                    "pos" : {
                        "x" : 690,
                        "y" : 252
                    },
                    "text" : "我喜欢"
                }, {
                    "color" : "red",
                    "pos" : {
                        "x" : 393,
                        "y" : 354
                    },
                    "text" : "马男"
                } ];
                postits.insertMany(initdata);
                //初始化 结束
                socket.emit('output', initdata);
            }
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
            console.log('别开枪', newpostit);
            let _id = ObjectID(newpostit._id);
            delete newpostit['_id'];
            postits.updateOne({_id:_id},newpostit,function (err, res) {
                if (err) throw err;
                // console.log(res);
            });
        });

        socket.on('delete', function (newpostit) {
            let _id = ObjectID(newpostit._id);
            postits.deleteOne({_id:_id},function (err, res) {
                if (err) throw err;
                postits.find({}).limit(20).toArray(function (err, res) {
                    if (err) throw err;
                    socket.emit('output', res);
                });
            });
        });


        socket.on('disconnect', function () {
            sendStatus('失去连接');
            console.log('Disconnected');
        });
    });
});