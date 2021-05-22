import {
	ChangeDetectorRef,
	NgZone,
	OnDestroy,
	Pipe,
	PipeTransform,
	Type,
	ɵstringify as stringify
} from '@angular/core';
import { Observable, OperatorFunction, Unsubscribable } from 'rxjs';

function invalidPipeArgumentError(type: Type<any>, value: any): Error {
	return Error(`InvalidPipeArgument: '${value}' for pipe '${stringify(type)}'`);
}

function runInZone<T>(zone: NgZone): OperatorFunction<T, T> {
	return (source) => {
		return new Observable(observer => {
			const onNext = (value: T) => zone.run(() => observer.next(value));
			const onError = (e: any) => zone.run(() => observer.error(e));
			const onComplete = () => zone.run(() => observer.complete());
			return source.subscribe(onNext, onError, onComplete);
		});
	};
}

Pipe({ name: 'diffx', pure: false })
export class DiffxPipe implements OnDestroy, PipeTransform {
	private latestValue: any = null;
	private subscription: Unsubscribable | null = null;
	private obj: Observable<any> | null = null;

	constructor(private ref: ChangeDetectorRef, private zone: NgZone) {
	}

	transform<T>(obj: Observable<T>): T | null {
		if (!this.obj) {
			if (obj) {
				this._subscribe(obj);
			}
			return this.latestValue;
		}

		if (obj !== this.obj) {
			this._dispose();
			return this.transform(obj);
		}

		return this.latestValue;
	}

	ngOnDestroy(): void {
		if (this.subscription) {
			this._dispose();
		}
	}

	private _subscribe(obj: Observable<any>): void {
		this.obj = obj;
		this.subscription = obj
			.pipe(
				runInZone(this.zone)
			)
			.subscribe({
				next: (value) => this._updateLatestValue(obj, value),
				error: (e: any) => {
					throw e;
				}
			});
	}

	private _dispose(): void {
		this.subscription.unsubscribe();
		this.latestValue = null;
		this.subscription = null;
		this.obj = null;
	}

	private _updateLatestValue(async: any, value: any): void {
		if (async === this.obj) {
			this.latestValue = value;
			this.ref.markForCheck();
		}
	}
}
