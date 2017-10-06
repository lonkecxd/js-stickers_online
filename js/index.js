var socket = io.connect('http://127.0.0.1:5200');

(function () {
    socket.on("output", data => {
        console.log("便利贴个数：",data.length);
        if (data.length) {
            vm.postits=data;
        }else {
            vm.postits = [];
        }
    });
    socket.on("status", data => {
        vm.status = ((typeof data==='object')?data.message:data);
    });
})();

var vm = new Vue({
  el: "#app",
  data:{
    postits: [],
    colorlist:[
      {name:'yellow',color:'#ffffcc'},
      {name:'blue',color:'#ccffff'},
      {name:'green',color:'#ccffcc'},
      {name:'red',color:'#ffccff'},
    ],
    now_id:-1,
    mousepos:{x:0,y:0},
    startMousePos:{x:0,y:0},
    status:''
  },
  watch:{
    mousepos(){
      if(this.now_id!==-1){
          let now_positit = this.postits[this.now_id];
          this.postits[this.now_id].pos.x = this.mousepos.x-this.startMousePos.x;
          this.postits[this.now_id].pos.y = this.mousepos.y-this.startMousePos.y;
        socket.emit('update',this.postits[this.now_id]);
      }
    }
  },
  methods:{
    getColor(name){
      return this.colorlist.find(o=>o.name===name).color;
    },
    posCss(p) {
      return {
        left: p.pos.x+"px",
        top: p.pos.y+"px",
        fontSize: ((240)/p.text.length-5)+"px",
        backgroundColor: this.getColor(p.color)
      }
    },
    selectId(evt,pid){
      if(!evt.srcElement.classList.contains('block')&&
           !evt.srcElement.classList.contains('btn')){
        this.now_id = pid;
        this.startMousePos = {
          x: evt.offsetX,
          y: evt.offsetY,
        }
      }else{
        this.now_id = -1;
      }
    },
    addPostit(){
      socket.emit('addpostit',{text:"文字",color:"yellow",pos:{x:300+Math.random()*300,y:150+Math.random()*150}});
    },
    setText(index){
      let text = prompt("请输入新的文字",this.postits[index].text);
      if(text){
          var pat=new RegExp("[^a-zA-Z0-9\_\u4e00-\u9fa5]","i");
          if(pat.test(text)===true)
          {
              text = this.postits[index].text;
              alert('含有非法字符，如：，。');
          }
          if(text.length>20) {
              text = text.slice(0,20);
          }
          this.postits[index].text = text;
          socket.emit('update',this.postits[index])
      }
    },
    setColor(index,colorname){
        this.postits[index].color = colorname;
        socket.emit('update',this.postits[index])
    },
    deleteit(index){
        socket.emit('delete',this.postits[index],function (res) {
            console.log("删除我了", res);
        })
    }
  }
});

window.onmousemove = (event)=>{
  vm.mousepos = {x: event.pageX,y: event.pageY}
}

window.onmouseup = (evt)=>{
  vm.now_id = -1
}