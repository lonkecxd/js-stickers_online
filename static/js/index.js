var socket = io.connect('http://127.0.0.1:5200');
// var socket = io.connect('http://104.236.67.17:5200');

var c=$("#myCanvas")[0];
var ctx = c.getContext("2d");

var ww,wh;
var center = {x:0,y:0};
var deg_to_pi= Math.PI/180;
function getWindowSize(){
    ww = $(window).outerWidth();
    wh = $(window).outerHeight();
    c.width = ww;
    c.height = wh;
    center={x:ww/2,y:wh/2};
    ctx.restore();
    ctx.translate(0,0);
}
getWindowSize();
$(window).resize(getWindowSize);
setInterval(draw,10);
setInterval(function () {
    vm.postits.map((postit)=>{
        if(Math.random()>0.5) {
            postit.status = -postit.status;
        }
        return postit;
    })
}, 2000);
var time = 0;
function draw(){
    time+=1;
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.rect(-2000,-2000,4000,4000);
    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = "5";
    if (vm.lines.length) {
        vm.lines.forEach((line, i) => {
            var start_p = vm.postits.filter((o) => (o._id === line.startId))[0];
            var end_p = vm.postits.filter((o) => (o._id === line.endId))[0];
            ctx.moveTo(start_p.pos.x, start_p.pos.y);
            ctx.lineTo(end_p.pos.x, end_p.pos.y);
        });
    }
    ctx.stroke();
    if(vm.first_click) {
        ctx.beginPath();
        ctx.strokeStyle = "white";
        ctx.lineWidth = "5";
        ctx.moveTo(vm.postits[vm.first_index].pos.x, vm.postits[vm.first_index].pos.y);
        ctx.lineTo(vm.mousepos.x, vm.mousepos.y);
        ctx.stroke();
    }
}

(function () {
    socket.on("output", data => {
        console.log("便利贴个数：",data.length);
        if (data.length) {
            vm.postits=data;
        }else {
            vm.postits = [];
        }
    });
    socket.on("lines", data => {
        console.log("拓扑图线条个数：",data.length);
        if (data.length) {
            vm.lines=data;
        }else {
            vm.lines = [];
        }
    });
    socket.on("status", data => {
        alertify.reset();
        if(typeof data==='object') {
            switch (data.type){
                case 'error':
                    alertify.error(data.message);
                    break;
                case 'success':
                    alertify.success(data.message);
            }
        }else{
            alertify.success(data);
        }
        // vm.status = ((typeof data==='object')?data.message:data);
    });
})();

var vm = new Vue({
  el: "#app",
  data:{
    postits: [],
    lines:[],
    now_id:-1,
    first_index:-1,
    mousepos:{x:0,y:0},
    startMousePos:{x:0,y:0},
    status:'',
    first_click:false,
    img_css:'',
    scale: 1
  },
  watch:{
    mousepos(){
      if(this.now_id!==-1){
          let now_positit = this.postits[this.now_id];
          this.postits[this.now_id].pos.x = this.mousepos.x-this.startMousePos.x;
          this.postits[this.now_id].pos.y = this.mousepos.y-this.startMousePos.y;
        socket.emit('update',this.postits[this.now_id]);
      }
    },
    scale(){
        ctx.scale(vm.scale,vm.scale);
    }
  },
  methods:{
    posCss(p) {
      return {
        left: p.pos.x+"px",
        top: p.pos.y+"px",
        fontSize: ((240)/p.text.length-5)+"px"
      }
    },
    addline(index){
        this.first_click = true;
        this.first_index = index;
    },
    changeStyle(evt,pid){
        if(this.first_click&&this.first_index!==pid) {
            $('#img'+pid)[0].setAttribute('style','box-shadow: 0px 0px 10px lightblue;');
        }
    },
    restoreStyle(evt,pid){
        if(this.first_click&&this.first_index!==pid) {
            $('#img'+pid)[0].removeAttribute('style');
        }
    },
    selectId(evt,pid){
      if(!evt.srcElement.classList.contains('img')){
          if(this.first_click&&this.first_index!==pid) {
              this.first_click = false;
              socket.emit('connectline',
                  {   startId:this.postits[this.first_index]._id,
                      endId:this.postits[pid]._id
                  });
              $('#img'+pid)[0].removeAttribute('style');
          }else {
              this.now_id = pid;
              this.startMousePos = {
                  x: evt.offsetX,
                  y: evt.offsetY,
              }
          }
      }else{
        this.now_id = -1;
      }
    },
    addPostit(){
      socket.emit('addpostit',{text:"基金"+(Math.random()*1000+1000).toFixed(0),src:"/top_img/router.jpg",status:1,pos:{x:300+Math.random()*300,y:150+Math.random()*150}});
    },
    setText(index){
      alertify
          .okBtn('确认')
          .cancelBtn('取消')
          .defaultValue(this.postits[index].text)
          .prompt("请输入新的文字",(text,evt)=>{
              evt.preventDefault();
              if(text){
                  var pat=new RegExp("[^a-zA-Z0-9\_\u4e00-\u9fa5]","i");
                  if(pat.test(text))
                  {
                      alertify.error('含有非法字符，如：，。');
                  }
                  else if(text.length>20) {
                      text = text.slice(0,20);
                      alertify.error('长度超过20。');
                  }else {
                      this.postits[index].text = text;
                      socket.emit('update',this.postits[index])
                  }
              }
          },function (evt) {
              evt.preventDefault();
          });
      // let text = prompt("请输入新的文字",this.postits[index].text);

    },

    deleteit(index){
        var postit = this.postits[index];
        this.lines = this.lines.filter((o) =>
            (o.startId !== postit._id && o.startId !== postit._id));
        this.postits.splice(index,1);
        socket.emit('delete',postit);

    },
    deleteAll(){
        alertify
            .okBtn('确认')
            .cancelBtn('取消')
            .confirm('删除所有设备吗？',()=>{
                socket.emit('deleteAll');
            },()=>{
                alertify.error('您取消了操作。');
            });
    },
    onFileChange(e,pid) {
          var files = e.target.files || e.dataTransfer.files;
          if (!files.length)
              return;
          this.createImage(files[0],pid);
    },
    createImage(file,pid) {
          var image = new Image();
          var reader = new FileReader();
          var vm = this;

          reader.onload = (e) => {
              $('#img'+pid).attr('src',e.target.result)
              // vm.postits[pid].src = e.target.result;
          };
          reader.readAsDataURL(file);
    }
  }
});

window.onmousemove = (event)=>{
  vm.mousepos = {x: event.pageX,y: event.pageY}
};

window.onmouseup = (evt)=>{
  vm.now_id = -1
};

window.ondblclick = (evt)=>{
    if(vm.first_click) {
        vm.first_click = false;
        socket.emit('addpostit',{text:"基金"+(Math.random()*1000+1000).toFixed(0),src:"/top_img/router.jpg",status:1,pos:{x:event.pageX,y: event.pageY}});
        socket.emit('addline',
            {   start:vm.postits[vm.first_index],
                endpos:{x:event.pageX,y: event.pageY}
            });
    }
};