// @ts-check
'use strict';

const {app, protocol, BrowserWindow, session} = require('electron');
const electronRemote = require('@electron/remote/main');
const windowStateKeeper = require('electron-window-state');
const path = require('path');
const url = require('url');
const {autoUpdater} = require('electron-updater');
const contextMenu = require('electron-context-menu');
const {IPC} = require('node-ipc');
const { html, js } = require('./gameInject');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
const args = process.argv.slice(1);
const dev = args.some(val => val === '--dev');
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';

electronRemote.initialize();

let openWindows = 0;

function openWindow() {
	let win;
	
	function createWindow() {
		
		const mainWindowState = windowStateKeeper({
			defaultWidth: 1000,
			defaultHeight: 800
		});
		
		win = new BrowserWindow({
			x: mainWindowState.x,
			y: mainWindowState.y,
			width: mainWindowState.width,
			height: mainWindowState.height,
			webPreferences: {
				webSecurity: false,
				nodeIntegration: true,
				contextIsolation: false,
				webviewTag: true
			}
		});
		electronRemote.enable(win.webContents);
		
		if (dev) {
			console.log('dev');
			contextMenu({
				showInspectElement: true
			});
			win.loadURL('http://localhost:4200/index.html');
			win.webContents.openDevTools();
		} else {
			console.log('prod');
			const indexPath = url.format({
				pathname: path.join(__dirname, 'distAngular', 'index.html'),
				protocol: 'file',
				slashes: true
			});
			console.log('path', indexPath);
			win.loadURL(indexPath);
			
			const log = require('electron-log');
			log.transports.file.level = 'debug';
			autoUpdater.logger = log;
			autoUpdater.checkForUpdatesAndNotify();
			// win.webContents.openDevTools();
			win.setMenu(null);
		}
		
		openWindows++;
		win.on('closed', () => {
			win = null;
			openWindows--;
			if (openWindows === 0) {
				app.quit();
			}
		});
		
		mainWindowState.manage(win);
	}
	
	app.on('activate', () => {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (win === null) {
			createWindow();
		}
	});
	
	createWindow();
}

protocol.registerSchemesAsPrivileged(["crosscode", "crosscode-launch"].map(e => ({
	scheme: e,
	privileges: {
		bypassCSP: true,
		standard: true,
		secure: true,
		supportFetchAPI: true
	}
})));

app.whenReady().then(() => {
	protocol.registerFileProtocol('file', (request, callback) => {
		const pathname = decodeURI(request.url.replace('file:///', ''));
		callback(pathname);
	});
	protocol.registerBufferProtocol('crosscode-launch', (request, callback) => {
		let pathname = decodeURI(request.url.replace('crosscode-launch://', '').replace(/\/$/, '').replace(/(%20)*?(\?.*)?$/, ""));
		console.log("1:", pathname)
		switch (pathname) {
			case ".":
				callback({ mimeType: "text/html", data: Buffer.from(html) });
				return
			case "./inject.js":
				callback({ mimeType: "text/javascript", data: Buffer.from(js) });
				return
			default:
				callback({statusCode: 302, headers: { "Location": `crosscode://${pathname}` }})
				return
		}
	});
	protocol.registerFileProtocol('crosscode', (request, callback) => {
		let pathname = decodeURI(request.url.replace('crosscode://', '').replace(/\/$/, '').replace(/(%20)*?(\?.*)?$/, ""));
		console.log("2:", pathname)
		callback(`/home/aa/.steam/steam/steamapps/common/CrossCode/assets/${pathname}`);
	});
	// session.defaultSession.webRequest.onBeforeRequest({ urls: ["crosscode://*"] }, (details, cb) => {
	// 	console.log("got req", details.url);
	// 	if (details.url == "crosscode://") {
	// 		cb()
	// 	}
	// })
// 	let pathname = decodeURI(request.url.replace('crosscode://', '').replace(/\/$/, ''));
// 	console.log(pathname)
// 	if (pathname.startsWith("./page/api/get-extension-list.php")) {
// 		// The game needs this when not running in nwjs for sound to properly work.
// 		const s = new stream.Readable();
// 		s.push("[]");
// 		s.push(null);
// 		callback({ statusCode: 200, mimeType: "application/json", data: s })
// 		return
// 	}
// 	if (pathname == ".") {
// 		// load game
// 		pathname = "game.html"
// 	}
// 	const fullPath = `/home/aa/.steam/steam/steamapps/common/CrossCode/assets/${pathname}`;
// 	// const s = await fs.createReadStream(fullPath);
// 	const s = new stream.Readable();
// 	s.push(await fs.readFile(fullPath));
// 	s.push(null);
// 	callback({mimeType: mime.getType(fullPath), data: s});
// 	// callback({ statusCode: 200, mimeType: mime.getType(fullPath), data: buf });
// 	return
// });
});

app.on('ready', openWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});


const sub = new IPC();
sub.config.silent = true;
sub.config.maxRetries = 1;
sub.connectTo('crosscode-map-editor', () => {
	sub.of['crosscode-map-editor'].on('connect', () => {
		sub.disconnect('crosscode-map-editor');
		app.quit();
	});
	sub.of['crosscode-map-editor'].on('error', () => {
		sub.disconnect('crosscode-map-editor');
		
		const master = new IPC();
		master.config.silent = true;
		master.config.id = 'crosscode-map-editor';
		master.serve(() => {
			master.server.on('connect', () => openWindow());
		});
		master.server.start();
	});
});

