import {CCEntity, EntityAttributes, Fix, ScaleSettings} from '../cc-entity';
import {Helper} from '../../helper';
import {Point3} from '../../../../models/cross-code-map';

interface JsonTemplate {
	name: string;
	tileOffset?: number;
	sheet?: string;
	offset?: Point3;
	renderMode?: string;
	framesAlpha?: number[];
}

interface JsonTemplates {
	[key: string]: JsonTemplate[];
}

interface SubJsonInstance {
	jsonINSTANCE?: keyof JsonTemplates;
}

interface PropSheet {
	DOCTYPE: string;
	jsonTEMPLATES: JsonTemplates;
	props: PropDef[];
}

export interface AnimSheet {
	src: string;
	width: number;
	height: number;
	offX?: number;
	offY?: number;
	xCount?: number;
}

export interface Anims {
	DOCTYPE?: string;
	SUB: {
		sheet?: string;
		offset?: Point3;
		frames?: number[];
		framesGfxOffset?: number[];
		time?: number;
		repeat?: boolean;
		renderMode?: string;
		framesAlpha?: number[];
		SUB?: SubJsonInstance | JsonTemplate[];
	}[];
	offset?: Point3;
	frames: any[];
	framesGfxOffset: any[];
	namedSheets: {
		[key: string]: AnimSheet;
	};
	renderMode?: string;
	repeat: boolean;
	shape: string;
	sheet: AnimSheet | string;
	time: number;
}

interface PropAttributes {
	propType: {
		sheet: string;
		name: string;
	};
	propAnim: string;
	condAnims: string;
	spawnCondition: string;
	touchVar: string;
	interact: string;
	showEffect: string;
	hideEffect: string;
	permaEffect: string;
	hideCondition: string;
}

export interface PropDef {
	name: string;
	size: {
		x: number;
		y: number;
		z: number;
	};
	collType: string;
	fix?: Fix;
	anims?: Anims;
	effects?: {
		hide: string;
		sheet: string;
		show: string;
	};
}

export class Prop extends CCEntity {
	
	private attributes: EntityAttributes = {
		propType: {
			type: 'PropType',
			description: 'Type of prop'
		},
		propAnim: {
			type: 'EntityAnim',
			description: 'Animation of prop'
		},
		condAnims: {
			type: 'CondAnims',
			description: 'Animations shown by conditions'
		},
		spawnCondition: {
			type: 'VarCondition',
			description: 'Condition for prop to appear',
			bd: true
		},
		touchVar: {
			type: 'VarName',
			description: 'Variable to be changed when prop is touched',
			R: true
		},
		interact: {
			type: 'PropInteract',
			description: 'Interaction for this property',
			bd: true,
			R: true
		},
		showEffect: {
			type: 'Effect',
			description: 'Effect to show when showing entity',
			R: true
		},
		hideEffect: {
			type: 'Effect',
			description: 'Effect to show when hiding entity',
			R: true
		},
		permaEffect: {
			type: 'Effect',
			description: 'Effect to be shown permanently',
			R: true
		},
		hideCondition: {
			type: 'VarCondition',
			description: 'Condition for entity to become transparent',
			R: true
		}
	};
	
	public getAttributes(): EntityAttributes {
		return this.attributes;
	}
	
	getScaleSettings(): ScaleSettings | undefined {
		return undefined;
	}
	
	protected async setupType(settings: PropAttributes) {
		if (!settings.propType) {
			console.warn('prop without prop type');
			return this.generateErrorImage();
		}
		const sheet = await Helper.getJsonPromise('data/props/' + settings.propType.sheet) as PropSheet;
		if (!sheet) {
			console.warn('prop without sheet', settings);
			return this.generateErrorImage();
		}
		
		let prop: PropDef | undefined;
		for (let i = 0; i < sheet.props.length; i++) {
			const p = sheet.props[i];
			if (settings.propType.name === p.name) {
				prop = p;
				break;
			}
		}
		if (!prop) {
			console.error('prop not found: ' + settings.propType.name);
			return this.generateErrorImage();
		}
		
		this.entitySettings = {sheets: {fix: []}} as any;
		if (prop.anims) {
			await this.setupAnims(settings, prop, sheet);
		} else if (prop.fix) {
			const exists = await Helper.loadTexture(prop.fix.gfx, this.scene);
			if (!exists) {
				console.error('prop image does not exist: ' + prop.fix.gfx);
				return this.generateErrorImage();
			}
			
			this.entitySettings.sheets.fix[0] = prop.fix;
			this.entitySettings.sheets.renderMode = prop.fix.renderMode;
		} else {
			console.error('failed to create prop: ' + prop.name);
			return this.generateErrorImage();
		}
		this.entitySettings.baseSize = prop.size;
		this.entitySettings.collType = prop.collType;
		this.updateSettings();
	}
	
	private async setupAnims(settings: PropAttributes, propDef: PropDef, sheetDef: PropSheet) {
		
		// console.log('------');
		// console.log(settings);
		// console.log('prop: ', propDef);
		// console.log('sheet: ', sheetDef);
		
		const anims = propDef.anims!;
		if (anims.DOCTYPE) {
			console.error('prop anim has DOCTYPE :/ ', propDef.name);
			return this.generateErrorImage();
		}
		
		const sprites: {
			sheet: AnimSheet;
			tileOffset: number;
			alpha: number;
			offset?: Point3;
			renderMode?: string;
		}[] = [];
		
		
		if (anims.sheet || anims.namedSheets) {
			this.setupAnim(settings, anims, sheetDef, propDef.name, sprites);
		} else {
			if (anims.SUB) {
				for (const anim of anims.SUB as Anims[]) {
					this.setupAnim(settings, anim, sheetDef, propDef.name, sprites);
				}
			}
		}
		
		
		if (sprites.length === 0) {
			console.warn('failed creating prop: ', settings);
			
			return this.generateErrorImage();
		}
		
		
		this.entitySettings.sheets.fix = [];
		for (const sprite of sprites) {
			
			if (!sprite.sheet) {
				console.error('prop sheet not found, ', propDef.name);
				return this.generateErrorImage();
			}
			
			await Helper.loadTexture(sprite.sheet.src, this.scene);
			
			const fix = {
				gfx: sprite.sheet.src,
				w: sprite.sheet.width,
				h: sprite.sheet.height,
				x: sprite.sheet.width * sprite.tileOffset + (sprite.sheet.offX || 0),
				y: sprite.sheet.offY || 0,
				alpha: sprite.alpha,
				offsetX: 0,
				offsetY: 0,
				renderMode: sprite.renderMode
			};
			
			if (sprite.offset) {
				fix.offsetX = sprite.offset.x || 0;
				fix.offsetY = (sprite.offset.y || 0) - (sprite.offset.z || 0);
			}
			this.entitySettings.sheets.fix.push(fix);
		}
	}
	
	private setupAnim(settings: PropAttributes, anims: Anims, sheetDef: PropSheet, pname: string, sprites: {
		sheet: AnimSheet;
		tileOffset: number;
		alpha: number;
		offset?: Point3;
		renderMode?: string;
	}[]) {
		if (anims.namedSheets) {
			let template: JsonTemplate | undefined;
			
			const sub = anims.SUB[0].SUB as SubJsonInstance | undefined;
			if (sub && sub.jsonINSTANCE) {
				
				const templates = sheetDef.jsonTEMPLATES[sub.jsonINSTANCE];
				template = templates.find(t => t.name === settings.propAnim);
				
				if (!template) {
					console.error(`prop json template with name ${settings.propAnim} not found, `, pname);
					return this.generateErrorImage();
				}
				const name = anims.sheet as string || anims.SUB[0].sheet!;
				sprites.push({
					sheet: anims.namedSheets[name],
					alpha: 1,
					offset: anims.SUB[0].offset,
					tileOffset: template.tileOffset || 0
				});
			} else {
				
				// sometimes anims.SUB is already an array of templates
				if (anims.SUB.length > 0 && (anims.SUB[0] as any).name) {
					const templates = anims.SUB as unknown as JsonTemplate[];
					anims.SUB = [{
						SUB: templates,
						renderMode: anims.renderMode
					}];
				}
				
				for (const sub of anims.SUB) {
					const templates = sub.SUB as JsonTemplate[] | undefined;
					if (!templates) {
						continue;
					}
					
					const filteredTemplates = templates.filter(t => t.name === settings.propAnim);
					
					for (const template of filteredTemplates) {
						const name = anims.sheet as string || anims.SUB[0].sheet || template.sheet!;
						
						const alpha = sub.framesAlpha || template.framesAlpha || [];
						const sprite = {
							sheet: anims.namedSheets[name],
							renderMode: sub.renderMode || template.renderMode,
							offset: sub.offset || template.offset,
							alpha: alpha[0] || 1,
							tileOffset: template.tileOffset || 0
						};
						
						sprites.push(sprite);
					}
				}
			}
		} else if (anims.sheet) {
			sprites.push({
				sheet: anims.sheet as AnimSheet,
				alpha: 1,
				tileOffset: 0,
				renderMode: anims.renderMode
			});
		} else {
			console.error('prop anim has no sheet: ', pname);
			return this.generateErrorImage();
		}
	}
}
