class GameLiveCircleModel {

    public UI:GameDisplay;

    private flappy:SpriteEx;
    private ground:Ground;
    private score:egret.BitmapText;

    private obstacles = [];
    private obstacles_pass = [];
    private curr_top:number;
    private curr_bot:number;
    private disatace_listen:number = 0;
    private stage:egret.DisplayObjectContainer;

    private _lastTime:number = 0;

    public constructor(stage,controller) {
        //TODO:your code here
        this.stage = stage;//获得主场景
        this.UI = new GameDisplay();//初始化图像显示类
    }

    public pre(){
        this.UI.preloadBg();//预加载背景
        this.stage.addChild(this.UI);//加载游戏图像&UI
        //this.UI.addEventListener(FlappyEvents.GAME_RUN,this.run,this);//自定义时间GAME_RUN
    }

    public hell(){
        this.UI.helloPlay();//加载初始界面
    }

    //准备开始游戏
    public gameready(e){
        try{
            this.stage.removeEventListener(egret.Event.ENTER_FRAME,this._die,this);
        }catch(error){}

        Constant.trace('Ready!tab to start!');
        if(this.score){
            e.score_min.text = this.score.text = '0';
        }

        for(var i:number = 0;i<this.obstacles.length;i++){
            this.UI.removeChild(this.obstacles[i]);
        }
        for(var i:number = 0;i<this.obstacles_pass.length;i++){
            this.UI.removeChild(this.obstacles_pass[i]);
        }
        this.obstacles = [];
        this.obstacles_pass = [];

        this.flappy = e.flappy;
        this.ground = e.ground;

        e.score.x = GlobalVar.stage_width()>>1;
        e.score.y = 100;
        this.score = e.score;

        this._flappyfloat(1);
        this.stage.addEventListener(egret.Event.ENTER_FRAME,this._scene,this);
    }

    //正在游戏
    public playing(e){
        egret.Tween.removeTweens(this.flappy);
        Constant.trace('Flappy!');

        this.curr_top = 0;
        this.curr_bot = e.ground.level;

        this.flappy.velocity = -GlobalVar.stage_height()*0.016;
        this.stage.addEventListener(egret.Event.ENTER_FRAME,this.circle,this);
        this.UI.addEventListener(egret.TouchEvent.TOUCH_TAP,this._ontab,this);
    }

    //游戏结束
    public gameover(e){
        e.score_min.text = e.score.text;
        e.medal.toggle(GameVar.flappy_level());
        Constant.trace('Game Over!' + ' level:' +GameVar.flappy_level()+' mark:'+GameVar.obs_conut+' tap-counts:'+GameVar.tap_conut);

        this.stage.removeEventListener(egret.Event.ENTER_FRAME,this.circle,this);
        this.stage.removeEventListener(egret.Event.ENTER_FRAME,this._scene,this);
        this.UI.removeEventListener(egret.TouchEvent.TOUCH_TAP,this._ontab,this);

        this.curr_top = 0;
        this.curr_bot = e.ground.level;
        this.stage.addEventListener(egret.Event.ENTER_FRAME,this._die,this);

        GameVar.obs_conut = 0;
        GameVar.tap_conut = 0;
    }


    private _flappyfloat(direction:number){
        var flappy:egret.Tween = egret.Tween.get(this.flappy);
        flappy.to({x:100,y:(this.ground.level>>1)-direction*20},500,egret.Ease.sineIn).call(this._flappyfloat,this,[direction*-1]);
    }

    private _scene(){
        var nowTime:number = egret.getTimer();
        GlobalVar.FPS = 1000/(nowTime-this._lastTime);
        this._lastTime = nowTime;
        //Constant.trace(GlobalVar.FPmS);

        this.ground.animate();
    }

    //游戏主逻辑,正在游戏时执行
    private circle(){

        //初始化最高最底界限
        this.curr_top = 0;
        this.curr_bot = this.ground.level;

        //添加障碍物
        if(this.disatace_listen == 0){
            //GameVar.obs_conut++;

            var pos = GlobalFun.randRange(GlobalVar.stage_height()/5,GlobalVar.stage_height()/2);

            var obs:Obstacle = new Obstacle('obj_obstacle',GlobalVar.stage_width()+200,pos,GameVar.obs_vertic_space())
            this.obstacles.push(obs);
            this.UI.addChild(obs);

            this.flappy.parent.setChildIndex(this.flappy,this.flappy.parent.numChildren+1);
            this.ground.parent.setChildIndex(this.ground,this.ground.parent.numChildren+1);
            this.score.parent.setChildIndex(this.score,this.score.parent.numChildren+1);
        }

        //对障碍物进行判断
        //Constant.trace(GlobalVar.FPSoffset()+'  speed:'+GameVar.world_speed());
        for(var i:number = 0;i<this.obstacles.length;i++){
            this.obstacles[i].x -= GameVar.world_speed();
            var obs_x:number = this.obstacles[i].x+GlobalVar.stage_width()+200+(this.obstacles[i].Width>>1);

            //当障碍物来到flappy所在位置的时候，刷新最高最底界限
            if(obs_x>GameVar.flappy_pos && obs_x<(GameVar.flappy_pos+this.obstacles[i].Width+(this.flappy.height>>1))){
                this.curr_top = this.obstacles[i].top;
                this.curr_bot = this.obstacles[i].bot;
            }

            //把已经经过的障碍物加载到一个数组里，准备删除
            if(obs_x<GameVar.flappy_pos-(this.flappy.height>>1)){
                this.obstacles[i].x += 2*GameVar.world_speed();//0.0
                this.obstacles_pass.push(this.obstacles.shift());
                GameVar.obs_conut++;
                if(GameVar.obs_conut>=0){
                    this.score.text = GameVar.obs_conut+'';
                }
                break;
                //Constant.trace('pass one obs!');
            }
        }

        //删除已经离开场景的障碍物
        for(var i:number = 0;i<this.obstacles_pass.length;i++){
            this.obstacles_pass[i].x -= GameVar.world_speed();

            var obs_x:number = this.obstacles_pass[i].x+GlobalVar.stage_width()+200+(this.obstacles_pass[i].Width>>1);

            if(obs_x<-500){
                var obs:Obstacle = this.obstacles_pass.shift();
                this.UI.removeChild(obs);
                break;
                //Constant.trace('delete one obs!');
            }
        }

        //障碍物密度
        this.disatace_listen+=GameVar.world_speed();
        if(this.disatace_listen >= GameVar.obs_density()){
            this.disatace_listen =0;
        }

        //判断flappy
        if((this.flappy.y + (this.flappy.height>>1))<=this.curr_bot && (this.flappy.y-(this.flappy.height>>1) )>=this.curr_top){
            this._gravity(this.flappy);//简单的重力模拟
        }else{
            this.flappy.velocity = -this.flappy.velocity*0.3;
            this.UI.overPlay();//如果掉到地上则告诉UI游戏结束
        }
    }

    //flappy挂掉会掉到地上。
    private _die(dt:number){
        if((this.flappy.y + (this.flappy.height>>1))<=this.curr_bot && (this.flappy.y-(this.flappy.height>>1) )>=this.curr_top){
            this._gravity(this.flappy);
        }else{
            this.stage.removeEventListener(egret.Event.ENTER_FRAME,this._die,this);
        }
    }

    //点击屏幕，flappy往上飞
    private _ontab(){
        this.flappy.rotation = -20;//点击时flappy的角度
        this.flappy.velocity = -GlobalVar.stage_height()*0.018;//点击时flappy的速度
        //this.flappy.y -= 80;
        GameVar.tap_conut++;
    }

    //重力模拟
    private _gravity(obj:SpriteEx){
        var g:number;g = GameVar.world_g();
        obj.velocity += g;

        obj.rotation += GlobalVar.FPSoffset();
        obj.y += obj.velocity*GlobalVar.FPSoffset();
        //Constant.trace(obj.velocity);
    }
}