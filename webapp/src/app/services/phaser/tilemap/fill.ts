import {Point} from '../../../models/cross-code-map';
import {CCMapLayer} from './cc-map-layer';

export class Filler {
	public static fill(layer: CCMapLayer, newTile: number, p: Point) {
		const phaserLayer = layer.getPhaserLayer();
		if (!phaserLayer) {
			return;
		}
		const prev = phaserLayer.getTileAt(p.x, p.y).index;
		if (newTile === prev) {
			return;
		}
		
		let toCheck: Point[] = [p];
		while (toCheck.length > 0) {
			const currP = toCheck.pop()!;
			const tile = phaserLayer.getTileAt(currP.x, currP.y);
			if (tile.index === prev) {
				phaserLayer.putTileAt(newTile, currP.x, currP.y, false);
				toCheck = toCheck.concat(this.getNeighbours(currP, layer));
			}
		}
	}
	
	private static getNeighbours(p: Point, layer: CCMapLayer): Point[] {
		const out: Point[] = [];
		
		if (p.x > 0) {
			out.push({x: p.x - 1, y: p.y});
		}
		if (p.x < layer.details.width - 1) {
			out.push({x: p.x + 1, y: p.y});
		}
		if (p.y > 0) {
			out.push({x: p.x, y: p.y - 1});
		}
		if (p.y < layer.details.height - 1) {
			out.push({x: p.x, y: p.y + 1});
		}
		
		return out;
	}
}
