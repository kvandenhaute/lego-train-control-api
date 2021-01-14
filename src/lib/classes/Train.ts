import type { Locomotive } from './Locomotive';

export class Train {
	private locomotives: Array<Locomotive> = [];

	addLocomotive(locomotive: Locomotive): void {
		this.locomotives.push(locomotive);
	}
}
