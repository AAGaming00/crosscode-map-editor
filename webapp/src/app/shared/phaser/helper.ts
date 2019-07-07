import {Point} from '../../models/cross-code-map';
import {Globals} from '../globals';
import {CCMapLayer} from './tilemap/cc-map-layer';
import {Glob} from 'glob';

export class Helper {
	/**
	 * Transforms screen coordinates to world coordinates.
	 * Phaser already offers a way to get world coordinates but it's messed up when the camera scales
	 */
	public static screenToWorld(x: number | Point, y?: number): Point {
		if (y === undefined) {
			y = (x as Point).y;
			x = (x as Point).x;
		}
		const p: Point = {x: 0, y: 0};
		const cam = Globals.scene.cameras.main;
		p.x = (x as number + cam.x) / cam.zoom;
		p.y = (y as number + cam.y) / cam.zoom;
		
		return p;
	}
	
	/** Transforms phaser world coordinates to actual world coordinates (see {@link screenToWorld}) */
	public static phaserWorldtoWorld(p: Point): Point {
		const out: Point = {x: 0, y: 0};
		const cam = Globals.scene.cameras.main;
		out.x = p.x / cam.zoom;
		out.y = p.y / cam.zoom;
		return out;
	}
	
	public static worldToTile(x: number, y: number): Point {
		const p: Point = {x: 0, y: 0};
		
		p.x = Math.floor(x / Globals.TILE_SIZE);
		p.y = Math.floor(y / Globals.TILE_SIZE);
		
		return p;
	}
	
	public static screenToTile(x: number | Point, y?: number): Point {
		let p = this.screenToWorld(x, y);
		p = this.worldToTile(p.x, p.y);
		return p;
	}
	
	/** gets the position of the tile in the tilemap */
	public static getTilePos(tilesetSize: Point, index: number): Point {
		const tilesize = Globals.TILE_SIZE;
		const pos = {x: 0, y: 0};
		
		pos.x = index % tilesetSize.x;
		pos.y = Math.floor(index / tilesetSize.x);
		
		if (pos.x === 0) {
			pos.x = tilesetSize.x;
			pos.y--;
		}
		pos.x--;
		
		return pos;
	}
	
	public static getTilesetSize(scene: Phaser.Scene, tileset: string): Point {
		const img = scene.textures.get(tileset).source[0];
		return {
			x: Math.ceil(img.width / Globals.TILE_SIZE),
			y: Math.ceil(img.height / Globals.TILE_SIZE)
		};
	}
	
	public static clamp(val: number, min: number, max: number) {
		return Math.min(Math.max(val, min), max);
	}
	
	public static clampToBounds(layer: CCMapLayer, p: Point) {
		p.x = Helper.clamp(p.x, 0, layer.details.width - 1);
		p.y = Helper.clamp(p.y, 0, layer.details.height - 1);
	}
	
	public static isInBounds(layer: CCMapLayer, p: Point): boolean {
		return p.x >= 0 && p.y >= 0 && p.x < layer.details.width && p.y < layer.details.height;
	}
	
	public static isInBoundsP(bounds: Point, p: Point): boolean {
		return p.x >= 0 && p.y >= 0 && p.x < bounds.x && p.y < bounds.y;
	}
	
	public static drawRect(graphics: Phaser.GameObjects.Graphics, rect: Phaser.Geom.Rectangle, fillStyle: number, alpha: number, strokeStyle: number, strokeAlpha: number) {
		const o = new Phaser.Geom.Rectangle(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height);
		
		graphics.fillStyle(fillStyle, alpha);
		graphics.fillRect(o.x, o.y, o.width, o.height);
		
		graphics.lineStyle(1, strokeStyle, strokeAlpha);
		graphics.strokeRect(o.x, o.y, o.width, o.height);
	}
	
	public static deepFind(key: string, obj: any) {
		const paths = key.split('.');
		let current = obj;
		
		for (let i = 0; i < paths.length; ++i) {
			if (current[paths[i]] === undefined || current[paths[i]] === null) {
				return current[paths[i]];
			} else {
				current = current[paths[i]];
			}
		}
		return current;
	}
	
	/** copies obj via JSON.parse(JSON.stringify(obj)); */
	public static copy(obj: any) {
		return JSON.parse(JSON.stringify(obj));
	}
	
	public static getJson(key: string, callback: (json: any) => void) {
		const scene = Globals.scene;
		
		// get json from cache
		if (scene.cache.json.has(key)) {
			return callback(scene.cache.json.get(key));
		}
		
		// load json
		scene.load.json(key, Globals.URL + key + '.json');
		scene.load.once('complete', () => {
			return callback(scene.cache.json.get(key));
		});
		scene.load.start();
	}
	
	public static getJsonPromise(key: string): any {
		return new Promise(resolve => {
			this.getJson(key, json => resolve(json));
		});
	}
	
	/**
	 * every key listener should check this method and only proceed when
	 * false is returned, so the user can write everything into input fields
	 * without messing up the map
	 * */
	public static isInputFocused(): boolean {
		if (Globals.disablePhaserInput) {
			return true;
		}
		if (!document.activeElement) {
			return false;
		}
		const tag = document.activeElement.tagName.toLowerCase();
		
		return tag === 'input' || tag === 'textarea';
	}
}
