import device;
import AudioManager;
import ui.View as View;
import ui.TextView as TextView;
import ui.ViewPool as ViewPool;
import ui.ImageView as ImageView;
import ui.SpriteView as SpriteView;

import plugins.ouya.ouya as ouya;

exports = Class(GC.Application, function () {

	const BACKGROUND_WIDTH  = 600;
	const BACKGROUND_HEIGHT = 385;

	const FLOOR_HEIGHT = 60;

	const GROUND = device.height - FLOOR_HEIGHT;

	const GRAVITY = -0.5;

	const OBJECTS = [
		"resources/images/coint.png",
		"resources/images/enemies/flower1.png",
		"resources/images/enemies/turtle1.png",	
	];

	var distance = 0,
		coints = 0,
		velocity = 0,
		jump_level = 0;

	this.initUI = function () {
		this.initBackground();
		this.initObjects();

		this.gameOver = new TextView({
			superview: this.view,
			layout: "box",
			text: "Game Over",
			color: "#ff0000",
			horizontalAlign: "center",
			x: 0,
			y: device.height / 2 - 40,
			width: device.width,
			height: 60,
			size: 40,
			visible: false,
			fontFamily: "Arial Black"
		});

		this.sounds = new AudioManager({
      		path: "resources/sounds/",
	      	files: {
	        	overworld: {
	          		volume: 0.7,
	          		background: true
		        },
		        coint: {
	          		volume: 1
		        },
		        jump: {
		        	volume: 1
		        },
		        gameover: {
		        	volume: 1
		        }
	      	}
	    });
	    this.sounds.play('overworld');
	};

	this.initObjects = function() {

		var mario = this.marioSprite = new SpriteView({
			superview: this.view,
			x: 30,
			autoSize: true,
			url: "resources/images/mario/mario",
			defaultAnimation: 'run',
			autoStart: true,
			frameRate: 8
		});

		var rand = 0, maxObjects = 20,
			objects = [], views = [];

		var imageViewPool = new ViewPool({
			ctor: ImageView,
			initCount: maxObjects
		});

		for(var i = 0; i < maxObjects; i++) {
			var view = imageViewPool.obtainView();
			view.updateOpts({
				superview: this.backgroundView,
				autoSize: true,
				visible: true
			});
			views.push(view);
		}

		this.tick = function() {
			if (jump_level == 0) {
				mario.style.y = GROUND - mario.style.height;
			} else {
				velocity += GRAVITY;
				mario.style.y -= velocity;
			}

			if (mario.style.y > GROUND - mario.style.height) {
				jump_level = 0;
				mario.startAnimation('run', {loop: true});
			}

			if (rand == 0 || distance % rand == 0) {
				if (views.length > 0) {
					//Choose an image at random.
					var view = views.pop();
					view.index = Math.floor(Math.random() * OBJECTS.length);
					view.setImage(OBJECTS[view.index]);
					view.style.visible = true;
					view.style.x = this.backgroundView.style.width;
					view.style.y = GROUND - view.style.height - (
						view.index == 0 ? 40 : //coint
						0
					);
					objects.push(view);
					rand = Math.round((Math.random() * 3) + 3) + distance;
				}
			}

			for (var i = 0; i < objects.length; i++) {
				var view = objects[i];
				view.style.x -= 2;
				if(view.style.x + view.style.width <= 0) {
					views.push(objects.shift());
				} else if ( (mario.style.x + mario.style.width > view.style.x) &&
						    (mario.style.x < view.style.x + view.style.width) &&
						    (mario.style.y + mario.style.height > view.style.y) &&
						    (mario.style.y < view.style.y + view.style.height) ){
					if (view.index == 0) {
						coints++; //add extra points
						view.style.visible = false;
						views.push(objects.shift());
						this.sounds.play("coint");
					} else {
						mario.style.visible = false;
						this.tick = this.backgroundView.tick = null;
						this.gameOver.show();
						this.sounds.stop("overworld");
						this.sounds.play("gameover");
					}
				}
			}
		};
	};

	this.initBackground = function() {

		this.backgroundView = new View({
			superview: this.view,
			x: 0,
			y: 0,
			width: this.view.style.width,
			height: this.view.style.height,
		});

		var distanceTextView = new TextView({
			superview: this.view,
			layout: "box",
			text: "0",
			color: "#000000",
			horizontalAlign: "right",
			x: this.view.style.width - 120,
			y: 10,
			width: 100,
			height: 30,
			size: 20,
			fontFamily: "Arial Black"
	    });

		var max = Math.ceil(this.backgroundView.style.width / BACKGROUND_WIDTH) + 1,
			bg_views = [], pixels = 0;

		var imageViewPool = new ViewPool({
			ctor: ImageView,
			initCount: max
		});

		for (var i = 0; i < max; i++) {
			var view = imageViewPool.obtainView();
			view.updateOpts({
				superview: this.backgroundView,
				width: BACKGROUND_WIDTH,
				height: BACKGROUND_HEIGHT,
				x: i * BACKGROUND_WIDTH,
				y: this.backgroundView.style.height - BACKGROUND_HEIGHT,
				image: "resources/images/overworld_bg.png",
				visible: true
			});

			bg_views.push(view);
		}

		this.backgroundView.tick = function() {
			for (var i = 0; i < max; i++) {
				bg_views[i].style.x--;
			}
			if (bg_views[0].style.x < 0 - BACKGROUND_WIDTH) {
				for (var i = 0; i < max; i++) {
					bg_views[i].style.x += BACKGROUND_WIDTH;
				}
			}

			if(pixels++ % 33 == 0) {
				distanceTextView.setText(++distance + (coints * 100));
			}
		};

		ouya.onDigitalInput = function(evt) {
			console.log(jump_level)
			if (evt.code == ouya.BUTTON.O) {
				this.lastAction = evt.action;
				if (evt.action == ouya.ACTION.DOWN) {
					this.onJump();
				}
			}
		}.bind(this);

		this.backgroundView.on("InputStart", this.onJump.bind(this));
	};

	this.onJump = function() {
		if (jump_level == 0) {
			velocity = 8;
			jump_level = 1;
			this.marioSprite.startAnimation('jump', {loop: true});
		} else if (jump_level == 1) { // double click
			velocity = 12;
			jump_level = 2;
			this.marioSprite.startAnimation('fly', {loop: true});
		}
		this.sounds.play("jump");
	};
	
	this.launchUI = function () {};
});
