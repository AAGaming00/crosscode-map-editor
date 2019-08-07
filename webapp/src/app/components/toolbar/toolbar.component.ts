import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { LoaderService } from '../../services/loader.service';
import { MatDialog } from '@angular/material';
import { MapSettingsComponent } from '../dialogs/map-settings/map-settings.component';
import { NewMapComponent } from '../dialogs/new-map/new-map.component';
import { CCMap } from '../../renderer/phaser/tilemap/cc-map';
import { OffsetMapComponent } from '../dialogs/offset-map/offset-map.component';
import { environment } from '../../../environments/environment';
import { OverlayService } from '../../overlay/overlay.service';
import { NpcStatesComponent } from '../../renderer/widgets/npc-states-widget/npc-states/npc-states.component';
import { Overlay } from '@angular/cdk/overlay';
import { SettingsComponent } from '../dialogs/settings/settings.component';
import { FileChangeEvent } from '@angular/compiler-cli/src/perform_watch';
import { SettingsService } from '../../services/settings.service';
import { EventService } from '../../services/event.service';

@Component({
	selector: 'app-toolbar',
	templateUrl: './toolbar.component.html',
	styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {

	map?: CCMap;
	loaded = false;
	error = '';
	version = environment.version;

	@Output()
	public loadMapClicked = new EventEmitter<void>(false);

	constructor(
		private events: EventService,
		private dialog: MatDialog,
		private overlayService: OverlayService,
		private overlay: Overlay,
	) {
	}

	ngOnInit() {
		this.events.tileMap.subscribe(map => {
			this.map = map;
		});
		this.events.loadComplete.subscribe(
			() => this.loaded = true,
			err => this.error = 'Error: could not load CrossCode assets. Update path in edit/settings'
		);
	}

	saveMap() {
		if (!this.map) {
			throw new Error('no map loaded');
		}

		const file = new Blob([JSON.stringify(this.map.data, null, 2)], { type: 'application/json' });
		const a = document.createElement('a'),
			url = URL.createObjectURL(file);
		a.href = url;
		a.download = this.map.data.filename;
		document.body.appendChild(a);
		a.click();
		setTimeout(function () {
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		}, 0);
	}

	newMap() {
		this.overlayService.open(NewMapComponent, {
			positionStrategy: this.overlay.position().global()
				.left('23vw')
				.top('calc(64px + 6vh / 2)'),
			hasBackdrop: true
		});
	}

	openMapSettings() {
		this.overlayService.open(MapSettingsComponent, {
			positionStrategy: this.overlay.position().global()
				.left('23vw')
				.top('calc(64px + 6vh / 2)'),
			hasBackdrop: true
		});
	}

	generateHeights() {
		this.events.generateHeights.next();
	}

	offsetMap() {
		this.dialog.open(OffsetMapComponent, {
			data: this.map
		});
	}

	showSettings() {
		this.overlayService.open(SettingsComponent, {
			positionStrategy: this.overlay.position().global()
				.left('23vw')
				.top('calc(64px + 6vh / 2)'),
			hasBackdrop: true
		});
	}
}
