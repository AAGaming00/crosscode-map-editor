/* eslint-disable no-undef */
module.exports = {
	js: `(${(() => {
		console.log('INJECTED INTO GAME');

		Object.defineProperty(window, 'IG_KEEP_WINDOW_FOCUS', {
			get: () => true,
			set: () => {},
		});

		let injectedMapName;
		let mapData;
		let crossCodeInstance;

		let oldSoundVolume;
		let oldMusicVolume;
		let volumeState = true;
		function setSoundEnabled(enabled) {
			if (volumeState == enabled) return;
			volumeState = enabled;
			console.log("setting volume", enabled)
			if (enabled) {
				ig.soundManager.setSoundVolume(oldSoundVolume);
				ig.soundManager.setMusicVolume(oldMusicVolume);
				ig.soundManager.volume = oldSoundVolume;
				ig.music.volume = oldMusicVolume;
			} else {
				oldSoundVolume = ig.soundManager.volumes.sound.gain.value;
				oldMusicVolume = ig.soundManager.volumes.music.gain.value;
				ig.soundManager.setSoundVolume(0);
				ig.soundManager.volume = 0;
				ig.music.volume = 0;
			}
		}
		async function handleMessage(msg) {
			console.log('got message', msg);
			let pos;
			let prevName;

			switch (msg.data.type) {
				case 'visibilityChange':
					setSoundEnabled(msg.data.visibility);
					break;
				case 'updateMap':
					prevName = injectedMapName;
					injectedMapName = msg.data.name;
					mapData = msg.data.map;
					if (prevName === injectedMapName) {
						pos = new ig.TeleportPosition();
						const player = ig.game.playerEntity;
						pos.setFromData(
							null,
							ig.copy(player.coll.pos),
							player.face,
							player.coll.level,
							player.coll.baseZPos,
							player.coll.size
						);
					} else {
						pos = new ig.TeleportPosition('start');
					}
					console.log('teleport guhhh', injectedMapName);
					crossCodeInstance.setTeleportTime(0, 0);
					crossCodeInstance.teleport(injectedMapName, pos, 'NEW');
					break;
			}
		}
		window.addEventListener('message', handleMessage);

		window.addEventListener('load', () => {
			// no-op this so the title screen never loads
			let firstLoad = true;
			sc.GameModel.inject({
				enterTitle: function (...args) {
					if (firstLoad) {
						// Call this too early and volume gets set to max
						setSoundEnabled(false);
						firstLoad = false;
					}
				},
			});

			// Hook this to grab the game instance, there is probably a better way to do this
			sc.CrossCode.inject({
				init: function (...args) {
					crossCodeInstance = this;
					console.log('got sc.CrossCode instance');
					return this.parent(...args);
				},
			});

			ig.Game.inject({
				preloadLevel: function (levelName) {
					// Edited from what's in the bundle
					if (levelName === injectedMapName) {
						crossCodeInstance.teleporting.levelData = null;

						crossCodeInstance.currentLoadingResource =
							'LOADING MAP: ' + levelName;
						window.IS_IT_CUBAUM =
							Math.random() <
							(sc.gameCode.isEnabled('regularTrees') ? 1 : 1e-4);
						console.log(
							'ran custom map loader',
							crossCodeInstance.teleporting,
							mapData
						);

						// Clear the map cache every load
						// reloadCache reloads all used assets, but is very slow
						// crossCodeInstance.teleporting.reloadCache = true;
						crossCodeInstance.teleporting.clearCache = true;
						crossCodeInstance.teleporting.levelData = mapData;
						//   error: function (b, c, e) {
						// 	ig.system.error(
						// 	  Error(
						// 		"Loading of Map '" +
						// 		  a +
						// 		  "' failed: " +
						// 		  b +
						// 		  " / " +
						// 		  c +
						// 		  " / " +
						// 		  e,
						// 	  ),
						// 	);
						//   },
					} else {
						return this.parent(levelName);
					}
				},
			});

			startCrossCode();
		});
	}).toString()})();`,
	// Modified CrossCode HTML
	// TODO dont inline the game html
	html: `
	<!DOCTYPE html>
	<html>
	<head>
	  <title>Map Editor Preview - CrossCode Min</title>
	  <link rel="stylesheet" type="text/css" href="impact/page/css/style.css"/>
	  <link rel="stylesheet" type="text/css" href="impact/page/css/ui-darkness/jquery-ui-1.10.2.custom.min.css"/>
	  <link rel="stylesheet" type="text/css" href="game/page/game-base.css"/>
	
	  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
	  <meta name="apple-mobile-web-app-capable" content="yes" />
	  <meta name="viewport" content="width=320, initial-scale=0.5, maximum-scale=0.5, user-scalable=0"/>

	  <!-- Inject the script inside the gameInject file -->
	  <script type="text/javascript" src="inject.js" charset="utf-8"></script>
	
	  <script type="text/javascript" src="impact/page/js/aes.js" charset="utf-8"></script>
	  <script type="text/javascript" src="impact/page/js/seedrandom.js" charset="utf-8"></script>
	  <script type="text/javascript" src="impact/page/js/jquery-1.11.1.min.js" charset="utf-8"></script>
	  <script type="text/javascript" src="impact/page/js/jquery-ui-1.10.2.custom.min.js" charset="utf-8"></script>
	  <script type="text/javascript" src="game/page/game-base.js" charset="utf-8"></script>
	<script>
	  var IG_GAME_SCALE = 2;
	  var IG_GAME_CACHE = "";
	  var IG_ROOT = "crosscode://";
	  var IG_WIDTH = 568;
	  var IG_HEIGHT = 320;
	  var IG_HIDE_DEBUG = false;
	  var IG_SCREEN_MODE_OVERRIDE = 2;
	  var IG_WEB_AUDIO_BGM = false;
	  var IG_FORCE_HTML5_AUDIO = false;
	  var LOAD_LEVEL_ON_GAME_START = null;
	</script>
	<script>
	  var IG_GAME_DEBUG = false;
	  var IG_GAME_BETA  = false;
	</script>
	<script type="text/javascript" src="js/game.compiled.js"></script>
	<script type="text/javascript" src="impact/page/js/options.js" charset="utf-8"></script>
	
	</head>
	<body style="overflow: hidden">
	
	
	<div id="options" class="toggleMenu" style="display: none" >
		<a class="trigger" ><span>Options</span></a>
		<ul class="optionList"></ul>
	</div>
	
	
	<div id="game" >
		<canvas id="canvas"></canvas>
	</div>
	
<!--	<script type="text/javascript">
		window.startCrossCode();
	</script>-->
	</body>
	</html>		
`,
};
