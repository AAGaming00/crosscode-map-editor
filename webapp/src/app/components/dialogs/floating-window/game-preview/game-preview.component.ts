import {
	Component,
	ComponentRef,
	ElementRef,
	OnDestroy,
	OnInit,
	ViewChild,
	ViewEncapsulation,
} from '@angular/core';
import { EventManager } from '@angular/platform-browser';
import { NavigationStart, Router } from '@angular/router';
import { Globals } from '../../../../services/globals';
import { StateHistoryService } from '../history/state-history.service';
import { Subscription } from 'rxjs';
import { FloatingWindowComponent } from '../floating-window.component';

// import { Helper } from '../../../../services/phaser/helper';

@Component({
	selector: 'app-game-preview',
	templateUrl: './game-preview.component.html',
	styleUrls: ['./game-preview.component.scss'],
	encapsulation: ViewEncapsulation.None,
})
export class GamePreviewComponent implements OnDestroy {
	@ViewChild('gameFrame', { static: false }) frame?: ElementRef<HTMLIFrameElement>;

	private eventHandler?: Function;

	// states: HistoryState[] = [];
	// selected?: HistoryStateContainer;
	selectedIndex = 0;
	hide = false;
	handler = this.reloadMap.bind(this);
	statesSubscription: Subscription;
	selectedStateSubscription: Subscription;

	constructor(
		private stateHistory: StateHistoryService,
		private eventManager: EventManager,
		router: Router
	) {
		this.statesSubscription = this.stateHistory.states.subscribe(this.handler);
		this.selectedStateSubscription = this.stateHistory.selectedState.subscribe(this.handler);

		// TODO: floating windows should be handled globally
		router.events.subscribe((event) => {
			if (event instanceof NavigationStart) {
				this.hide = event.url === '/3d';
				this.postMessage({ type: 'visibilityChange', visibility: !this.hide })
			}
		});
	}

	// TODO maybe trigger game unfocused mode instead?
	onVisibilityChange(visibility: boolean): void {
		this.postMessage({ type: 'visibilityChange', visibility })
	}

	ngOnDestroy(): void {
		this.statesSubscription.unsubscribe();
		this.selectedStateSubscription.unsubscribe();
	}

	postMessage(msg: any): void {
		this.frame?.nativeElement.contentWindow?.postMessage(
			msg,
			'*'
		);
	}

	reloadMap(): void {
		if (!Globals.map) {
			return;
		}
		const map = Globals.map.exportMap();
		this.postMessage({ type: 'updateMap', name: Globals.map.name, map });
	}
}
