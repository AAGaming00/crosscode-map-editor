import {Component, OnChanges, SimpleChanges} from '@angular/core';
import {AbstractWidget} from '../abstract-widget';
import {OverlayRefControl} from '../../overlay/overlay-ref-control';
import {OverlayService} from '../../overlay/overlay.service';
import {Overlay} from '@angular/cdk/overlay';
import {EventWindowComponent} from './event-window/event-window.component';
import {EventType} from './event-registry/abstract-event';

@Component({
	selector: 'app-event-widget',
	templateUrl: './event-widget.component.html',
	styleUrls: ['./event-widget.component.scss', '../widget.scss']
})
export class EventWidgetComponent extends AbstractWidget implements OnChanges {
	
	private ref?: OverlayRefControl;
	
	constructor(
		private overlayService: OverlayService,
		private overlay: Overlay
	) {
		super();
	}
	
	ngOnChanges(changes?: SimpleChanges): void {
		super.ngOnChanges(changes);
		if (!this.settings[this.key] && !this.attribute.optional) {
			this.settings[this.key] = [];
		}
	}
	
	open() {
		if (this.ref && this.ref.isOpen()) {
			return;
		}
		const obj = this.overlayService.open(EventWindowComponent, {
			positionStrategy: this.overlay.position().global()
				.left('23vw')
				.top('calc(64px + 6vh / 2)'),
			hasBackdrop: true,
			disablePhaserInput: true
		});
		this.ref = obj.ref;
		
		obj.instance.event = this.settings[this.key] || [];
		
		obj.instance.exit.subscribe((v: EventType[]) => {
			this.close();
			this.settings[this.key] = v;
			if (v && v.length === 0 && this.attribute.optional) {
				this.settings[this.key] = undefined;
			}
			this.updateType();
			
		}, () => this.close());
	}
	
	private close() {
		if (this.ref) {
			this.ref.close();
		}
	}
}
