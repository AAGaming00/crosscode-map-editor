import {CCEntity, EntityAttributes, ScaleSettings} from '../cc-entity';
import {Point, Point3} from '../../../../models/cross-code-map';
import {Helper} from '../../helper';

interface ScalablePropSheet {
	DOCTYPE: string;
	entries: {
		[key: string]: ScalablePropDef;
	};
	jsonTEMPLATES?: {
		[key: string]: ScalablePropDef;
	};
}

export interface ScalablePropDef {
	baseSize: Point3;
	terrain: string;
	scalableX: boolean;
	scalableY: boolean;
	scalableStep: number;
	renderHeight?: number;
	renderMode: string;
	collType: string;
	gfx: string;
	gfxBaseX: number;
	gfxBaseY: number;
	patterns: {
		x: number;
		y: number;
		w: number;
		h: number;
		xCount: number;
		yCount: number;
	};
	timePadding: Point;
	effects: {
		sheet: string;
		show: string;
		hide: string;
	};
	pivot: Point;
	jsonINSTANCE?: string;
	srcX?: number;
	srcY?: number;
	width?: number;
}

export class ScalableProp extends CCEntity {
	
	private attributes: EntityAttributes = {
		propConfig: {
			type: 'ScalablePropConfig',
			description: 'Type of Scalable Prop'
		},
		patternOffset: {
			type: 'Vec2',
			description: 'Start offset of the repeating pattern in pixels'
		},
		timeOffset: {
			type: 'Number',
			description: 'Time offset of the animation'
		},
		spawnCondition: {
			type: 'VarCondition',
			description: 'Condition for prop to appear',
			bd: true
		},
		HL: {
			type: 'VarName',
			description: 'Variable to be changed when prop is touched',
			R: true
		},
		blockNavMap: {
			type: 'Boolean',
			description: 'If true, block path map and update when destroyed'
		},
		hideCondition: {
			type: 'VarCondition',
			description: 'Condition for entity to become transparent',
			R: true
		}
	};
	
	// don't allow scaleSettings ref to be changed, allows realtime update of size vec2 widget
	private readonly scaleSettings: ScaleSettings = {
		scalableX: false,
		scalableY: false,
		baseSize: {x: 16, y: 16},
		scalableStep: 1
	};
	
	public getAttributes(): EntityAttributes {
		return this.attributes;
	}
	
	getScaleSettings(): ScaleSettings | undefined {
		return this.scaleSettings;
	}
	
	protected async setupType(settings: any) {
		if (!settings.propConfig) {
			console.warn('scalable prop without prop config');
			this.resetScaleSettings();
			return this.generateErrorImage();
		}
		const sheet = await Helper.getJsonPromise('data/scale-props/' + settings.propConfig.sheet) as ScalablePropSheet;
		if (!sheet) {
			console.error('sheet not found: ' + settings.propConfig.sheet);
			this.resetScaleSettings();
			return this.generateErrorImage();
		}
		let prop: ScalablePropDef = sheet.entries[settings.propConfig.name];
		if (!prop) {
			console.error('scale-prop not found: ' + settings.propConfig.name);
			this.resetScaleSettings();
			return this.generateErrorImage();
		}
		
		this.entitySettings = <any>{};
		if (prop.jsonINSTANCE && sheet.jsonTEMPLATES) {
			const jsonInstance = sheet.jsonTEMPLATES[prop.jsonINSTANCE];
			// TODO: patterns currently ignored
			//const p = jsonInstance.patterns;
			this.replaceJsonParams(jsonInstance, prop);
			prop = jsonInstance;
		}
		
		if (prop.gfx) {
			await Helper.loadTexture(prop.gfx, this.scene);
			this.entitySettings.sheets = {
				fix: [{
					gfx: prop.gfx,
					x: prop.gfxBaseX + prop.patterns.x,
					y: prop.gfxBaseY + prop.patterns.y,
					w: prop.patterns.w,
					h: prop.patterns.h,
					renderHeight: prop.renderHeight
				}],
				renderMode: prop.renderMode,
				flipX: false,
			};
		}
		
		this.scaleSettings.scalableX = prop.scalableX;
		this.scaleSettings.scalableY = prop.scalableY;
		this.scaleSettings.scalableStep = prop.scalableStep;
		this.scaleSettings.baseSize = prop.baseSize;
		
		if (!this.scaleSettings.scalableX) {
			this.details.settings.size.x = this.scaleSettings.baseSize.x;
		}
		if (!this.scaleSettings.scalableY) {
			this.details.settings.size.y = this.scaleSettings.baseSize.y;
		}
		
		Object.assign(this.entitySettings, this.scaleSettings);
		this.entitySettings.collType = prop.collType;
		this.entitySettings.pivot = prop.pivot;
		this.updateSettings();
	}
	
	private resetScaleSettings() {
		this.scaleSettings.scalableX = true;
		this.scaleSettings.scalableY = true;
		this.scaleSettings.scalableStep = 1;
		this.scaleSettings.baseSize = {x: 1, y: 1};
	}
}
