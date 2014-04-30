import animate;
import AudioManager;
import ui.View as View;
import ui.ViewPool as ViewPool;
import ui.ImageView as ImageView;
import menus.views.MenuView as MenuView;

exports = Class(GC.Application, function () {

	const BALL_WIDTH  = 20;
	const BALL_HEIGHT = 20;
	const INIT_ROWS   = 8;
	const BALLS = [
		"sphere-04.png",
		"sphere-05.png",
		"sphere-06.png",
		"sphere-07.png",
		"sphere-16.png",
		"sphere-23.png"
	];

	this.initUI = function () {

		this.mainMenu = new MenuView({
			superview: this,
			title: 'Game Over',
			modal: true,
			items: [],
			showTransitionMethod: 'SCALE',
			hideTransitionMethod: 'SCALE'
		});

		//Create a background View as a parent for our ImageViews.
		this.style.backgroundColor = "rgb(20, 20, 40)";

		this.backgroundView = new View({
			superview: this.view,
			x: 0,
			y: 0,
			width: this.view.style.width,
			height: this.view.style.height - BALL_HEIGHT - 3,
			backgroundColor: "#B2B2CC"
		});

		this.backgroundView.on('InputSelect', bind(this, this.shootEvent));

		this.shootBallView = new ImageView({
			parent: this,
			layout: 'box',
			width: BALL_WIDTH,
			height: BALL_HEIGHT,
			bottom: 0,
			centerX: true
		});

		new AudioManager({
      		path: "resources/audio/",
	      	files: {
	        	background: {
	          		volume: 1
		        }
	      	}
	    }).play("background");


		this.initMatrix();
		this.updateShootBall();
	};

	this.updateShootBall = function() {
		this.shootBallIndex = this.genColorIndex();
		this.updateBall(this.shootBallView, this.shootBallIndex);
		this.shootBallView.style.opacity = 1;
	};

	this.initMatrix = function() {

		this.matrix = [];

		var maxRows = ~~(this.backgroundView.style.height / BALL_HEIGHT),
		    maxCells = ~~(this.backgroundView.style.width / BALL_WIDTH),
		    r, c, index, view;

		this.imageViewPool = new ViewPool({
			ctor: ImageView,
			initCount: maxRows * maxCells
		});

		for (r = 0; r < maxRows; r++) {
			
			this.matrix[r] = [];

			for (c = 0; c < maxCells; c++) {

				index = this.shuffleBall(r, c);
				view = this.createBall(r, c);

				this.matrix[r][c] = view;

				if (r < INIT_ROWS) {
					this.updateBall(view, index);
				}
			}
		}
	};

	this.createBall = function(r, c) {
		var view = this.imageViewPool.obtainView();
		view.updateOpts({
			superview: this.backgroundView,
			x: c * BALL_WIDTH,
			y: r * BALL_HEIGHT,
			width: BALL_WIDTH,
			height: BALL_HEIGHT
		});
		return view;
	};

	this.updateBall = function(view, index) {
		view.index = index;
		view.style.opacity = 1;
		view.setImage("resources/images/coloredspheres/" + BALLS[index]);
		view.updateOpts({
			visible: true
		});
	};

	this.genColorIndex = function() {
		return ~~(Math.random() * BALLS.length);
	};

	this.shuffleBall = function(r, c) {
		var index = this.genColorIndex();
		var maxCells = this.matrix[r].length;

		//verify sibling balls with the same color
		if ( (r > 1 && (this.matrix[r - 1][c].index == index &&
			          this.matrix[r - 2][c].index == index)) || 
			 (c > 0 && this.matrix[r][c - 1].index == index) ||
			 (c < maxCells - 2 && this.matrix[r][c + 1].index == index)
			){
			return this.shuffleBall(r, c);
		}
		return index;
	};

	this.shootEvent = function (evt, pt) {
		var view, index,
			row, cell = ~~(pt.x / BALL_WIDTH);

		for(row = this.matrix.length - 1; row >= 0; row--) {
			view = this.matrix[row][cell];
			index = this.matrix[row][cell].index;

			if (view.style.visible && view.style.opacity) {
				if (this.shootBallIndex == index) {
					if (row > 0 && this.shootBallIndex == this.matrix[row - 1][cell].index) {

						var fadeBalls = function() {
							animate(view).now({
						      opacity: 0,
							}, 1000);
							animate(this.matrix[row - 1][cell]).now({
						      opacity: 0,
							}, 1000);
							animate(this.shootBallView).now({
						      opacity: 0,
							}, 1000).then(this.updateShootBall.bind(this));
						};

						animate(this.shootBallView).now({
						      x: cell * BALL_WIDTH,
						      y: (row + 1) * BALL_HEIGHT,
						}, 1000).then(fadeBalls.bind(this));
						return;
					}
				}

				if (row < this.matrix.length - 1) {

					var addBall = function() {
						this.updateBall(this.matrix[row + 1][cell], this.shootBallIndex);
						this.updateShootBall();
					};

					animate(this.shootBallView).now({
						      x: cell * BALL_WIDTH,
						      y: (row + 1) * BALL_HEIGHT,
					}, 1000).then(addBall.bind(this));
				} else {
					this.mainMenu.show();
				}

				break;
			}
		}
	};

	this.launchUI = function () {};
});